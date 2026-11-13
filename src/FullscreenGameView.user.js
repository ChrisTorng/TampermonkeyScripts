// ==UserScript==
// @name         Fullscreen Game View
// @namespace    http://tampermonkey.net/
// @version      2026-11-13_1.2.3
// @description  Give embedded games and dynamic YouTube players fullscreen buttons with Android landscape rotation.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/FullscreenGameView.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/FullscreenGameView.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.tampermonkey.net
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // BEGIN SHARED TRANSIENT CONTROL
    // Shared source for draggable in-content controls. Run scripts/sync-transient-controls.js after editing.
    const transientControlLayouts = new Set();
    let transientControlFrame = null;
    function refreshTransientControls() {
        if (transientControlFrame !== null) return;
        transientControlFrame = window.requestAnimationFrame(() => {
            transientControlFrame = null;
            transientControlLayouts.forEach((layout) => layout());
        });
    }
    window.addEventListener('scroll', refreshTransientControls, { capture: true, passive: true });
    window.addEventListener('resize', refreshTransientControls);
    document.addEventListener('fullscreenchange', refreshTransientControls);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('scroll', refreshTransientControls);
        window.visualViewport.addEventListener('resize', refreshTransientControls);
    }

    function makeTransientControlDraggable(button, container, { bottom = false, size = 24, height = size, inset = 6,
        stationaryOnPinchZoom = false, avoidFloatingMenu = false } = {}) {
        let placement = null;
        let drag = null;
        let suppressClick = false;
        let observer;
        let positioned = false;
        let normalScale = Math.min(1, window.visualViewport?.scale || 1);
        const isPinchZoomed = () => {
            if (!window.visualViewport) return false;
            normalScale = Math.min(normalScale, window.visualViewport.scale);
            return window.visualViewport.scale > normalScale * 1.01;
        };
        const geometry = () => {
            const rect = container.getBoundingClientRect();
            const viewport = stationaryOnPinchZoom ? null : window.visualViewport;
            let left = viewport ? viewport.offsetLeft : 0;
            let top = viewport ? viewport.offsetTop : 0;
            let right = left + (viewport ? viewport.width : window.innerWidth);
            let lower = top + (viewport ? viewport.height : window.innerHeight);
            // A block may be wider than an ancestor's scrollport even when it fits the screen.
            // Intersect every clipping ancestor, excluding borders and scrollbar gutters.
            for (let ancestor = container; ancestor && ancestor !== document.documentElement; ancestor = ancestor.parentElement) {
                const css = window.getComputedStyle(ancestor);
                const clips = (axis) => /^(auto|scroll|hidden|clip|overlay)$/.test(
                    css[`overflow${axis}`] || css.getPropertyValue?.(`overflow-${axis.toLowerCase()}`) || css.overflow || '');
                if (!clips('X') && !clips('Y')) {
                    if (ancestor === document.fullscreenElement) break;
                    continue;
                }
                const bounds = ancestor.getBoundingClientRect();
                const innerLeft = bounds.left + (ancestor.clientLeft || 0);
                const innerTop = bounds.top + (ancestor.clientTop || 0);
                if (clips('X')) {
                    left = Math.max(left, innerLeft);
                    right = Math.min(right, innerLeft + ancestor.clientWidth);
                }
                if (clips('Y')) {
                    top = Math.max(top, innerTop);
                    lower = Math.min(lower, innerTop + ancestor.clientHeight);
                }
                // Native fullscreen content escapes clipping by ancestors outside the top layer.
                if (ancestor === document.fullscreenElement) break;
            }
            // Absolute child coordinates start at the container's inner border edge.
            const originX = rect.left + (container.clientLeft || 0) - (container.scrollLeft || 0);
            const originY = rect.top + (container.clientTop || 0) - (container.scrollTop || 0);
            const minX = Math.max(rect.left, left) - originX;
            const minY = Math.max(rect.top, top) - originY;
            const maxX = Math.min(rect.right, right) - originX - size;
            const maxY = Math.min(rect.bottom, lower) - originY - height;
            return { originX, originY, minX, minY, maxX, maxY };
        };
        const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
        const place = (x, y) => {
            button.style.setProperty('left', `${x}px`, 'important');
            button.style.setProperty('top', `${y}px`, 'important');
            button.style.setProperty('right', 'auto', 'important');
            button.style.setProperty('bottom', 'auto', 'important');
        };
        const avoidMenuOverlap = (x, y, area) => {
            if (!avoidFloatingMenu) return { x, y };
            const menu = document.getElementById('tm-shared-floating-menu');
            if (!menu || menu.hidden) return { x, y };
            const elements = [menu, menu.querySelector('[data-floating-close]'),
                menu.querySelector('[data-floating-dialog]')];
            const obstacles = elements.filter((element) => element && !element.hidden)
                .map((element) => element.getBoundingClientRect())
                .filter((rect) => rect.width > 0 && rect.height > 0);
            const gap = 4;
            const overlaps = (px, py) => obstacles.some((rect) =>
                area.originX + px < rect.right + gap && area.originX + px + size > rect.left - gap &&
                area.originY + py < rect.bottom + gap && area.originY + py + height > rect.top - gap);
            if (!overlaps(x, y)) return { x, y };
            const candidates = obstacles.flatMap((rect) => [
                { x: rect.left - area.originX - size - gap, y },
                { x: rect.right - area.originX + gap, y },
                { x, y: rect.top - area.originY - height - gap },
                { x, y: rect.bottom - area.originY + gap },
            ]);
            // Prefer placing the independent button beside the menu, never on top of it.
            candidates.sort((a, b) => (Number(a.x === x) - Number(b.x === x)) ||
                (Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y)));
            return candidates.find((candidate) =>
                candidate.x >= area.minX && candidate.x <= area.maxX &&
                candidate.y >= area.minY && candidate.y <= area.maxY &&
                !overlaps(candidate.x, candidate.y)) || { x, y };
        };
        const layout = () => {
            if (!button.isConnected) {
                transientControlLayouts.delete(layout);
                if (observer) observer.disconnect();
                return;
            }
            // Pinch zoom must neither reposition the button nor enlarge its screen footprint.
            const zoomed = stationaryOnPinchZoom && isPinchZoomed();
            if (zoomed) {
                button.style.setProperty('transform', `scale(${normalScale / window.visualViewport.scale})`, 'important');
                button.style.setProperty('transform-origin', 'top left', 'important');
                if (positioned) return;
            } else if (stationaryOnPinchZoom) {
                button.style.removeProperty('transform');
            }
            const area = geometry();
            const hidden = area.maxX < area.minX || area.maxY < area.minY;
            if (button.hidden !== hidden) button.hidden = hidden;
            if (hidden || drag) return;
            const x = clamp(placement ? placement.x : area.maxX - inset, area.minX, area.maxX);
            const y = clamp(placement ? placement.y : bottom ? area.maxY - inset : area.minY + inset, area.minY, area.maxY);
            const clear = avoidMenuOverlap(x, y, area);
            place(clear.x, clear.y);
            positioned = true;
        };
        button.style.setProperty('touch-action', 'none', 'important');
        button.style.setProperty('text-decoration', 'none', 'important');
        button.addEventListener('pointerdown', (event) => {
            if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
            suppressClick = false;
            drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
                left: parseFloat(button.style.left), top: parseFloat(button.style.top), moved: false };
            button.setPointerCapture?.(event.pointerId);
            event.stopPropagation?.();
        });
        button.addEventListener('pointermove', (event) => {
            if (!drag || event.pointerId !== drag.id) return;
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            if (!drag.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
            drag.moved = true;
            event.preventDefault();
            event.stopPropagation?.();
            const area = geometry();
            placement = { x: clamp(drag.left + dx, area.minX, area.maxX), y: clamp(drag.top + dy, area.minY, area.maxY) };
            place(placement.x, placement.y);
        });
        const finish = (event) => {
            if (!drag || event.pointerId !== drag.id) return;
            suppressClick = drag.moved;
            drag = null;
            if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId);
            layout();
        };
        button.addEventListener('pointerup', finish);
        button.addEventListener('pointercancel', finish);
        button.addEventListener('lostpointercapture', finish);
        // Register before the action handler so a drag never activates translation or fullscreen.
        button.addEventListener('click', (event) => {
            if (!suppressClick) return;
            suppressClick = false;
            event.preventDefault();
            event.stopImmediatePropagation();
        }, true);
        transientControlLayouts.add(layout);
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(refreshTransientControls);
            observer.observe(container);
        }
        layout();
        return layout;
    }
    // END SHARED TRANSIENT CONTROL


    // Keep the independent fullscreen entry as steady as the shared fixed-position menu.
    // The menu's default is top:70/right:0, so the entry defaults 42px to its left.
    const fullscreenControlLayouts = new Set();
    const FULLSCREEN_WIDTH = 38;
    const FULLSCREEN_HEIGHT = 32;
    const clampFullscreen = (value, low, high) => Math.max(low, Math.min(value, high));
    const fullscreenScrollY = () => {
        const viewport = window.visualViewport;
        return Math.max(0, window.scrollY || 0,
            document.scrollingElement?.scrollTop || 0,
            document.documentElement.scrollTop || 0,
            document.body?.scrollTop || 0,
            viewport && Number.isFinite(viewport.pageTop)
                ? viewport.pageTop - (viewport.offsetTop || 0) : 0);
    };
    function refreshFullscreenControls() {
        fullscreenControlLayouts.forEach((layout) => layout());
    }
    // Unlike animation-frame placement of in-block translation controls, a fixed
    // fullscreen entry docks synchronously and does not trail normal scrolling.
    window.addEventListener('scroll', refreshFullscreenControls, { passive: true });
    document.addEventListener('scroll', refreshFullscreenControls, { capture: true, passive: true });
    window.addEventListener('resize', refreshFullscreenControls);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('scroll', refreshFullscreenControls);
        window.visualViewport.addEventListener('resize', refreshFullscreenControls);
    }

    function makeDockedFullscreenControl(button, target, alignWithMenuDefault) {
        let placement = null;
        let drag = null;
        let suppressClick = false;
        let pinchAnchored = false;
        let pinchArmed = false;
        let normalScale = window.visualViewport?.scale || 1;
        let observer;
        const bounds = () => {
            const viewport = window.visualViewport;
            const width = Math.max(FULLSCREEN_WIDTH, Math.min(window.innerWidth || FULLSCREEN_WIDTH,
                document.documentElement.clientWidth || window.innerWidth || FULLSCREEN_WIDTH));
            const left = viewport ? viewport.offsetLeft : 0;
            const right = left + (viewport ? viewport.width : width);
            const bottom = viewport ? viewport.height : window.innerHeight;
            const rect = target.getBoundingClientRect();
            return {
                left, right,
                visible: Math.min(rect.right, right) - Math.max(rect.left, left) >= FULLSCREEN_WIDTH &&
                    Math.min(rect.bottom, bottom) - Math.max(rect.top, 0) >= FULLSCREEN_HEIGHT,
                minX: alignWithMenuDefault ? left : Math.max(rect.left, left),
                maxX: (alignWithMenuDefault ? right : Math.min(rect.right, right)) - FULLSCREEN_WIDTH,
                minY: alignWithMenuDefault ? 0 : Math.max(rect.top, 0),
                maxY: (alignWithMenuDefault ? bottom : Math.min(rect.bottom, bottom)) - FULLSCREEN_HEIGHT,
            };
        };
        const place = (x, y, fixed = true) => {
            button.style.setProperty('position', fixed ? 'fixed' : 'absolute', 'important');
            button.style.setProperty('left', `${x}px`, 'important');
            button.style.setProperty('top', `${y}px`, 'important');
            button.style.setProperty('right', 'auto', 'important');
            button.style.setProperty('bottom', 'auto', 'important');
        };
        const layout = () => {
            if (!button.isConnected || !target.isConnected) {
                fullscreenControlLayouts.delete(layout);
                observer?.disconnect();
                document.removeEventListener('touchstart', touchStart, true);
                document.removeEventListener('touchend', touchEnd, true);
                document.removeEventListener('touchcancel', touchEnd, true);
                return;
            }
            const scale = window.visualViewport?.scale || 1;
            if (!pinchAnchored && !pinchArmed) normalScale = scale;
            if ((pinchAnchored || pinchArmed) && scale > normalScale * 1.01) {
                if (!pinchAnchored) {
                    // The shared menu freezes its document position during a real pinch.
                    const rect = target.getBoundingClientRect();
                    const originX = rect.left + (target.clientLeft || 0) - (target.scrollLeft || 0);
                    const originY = rect.top + (target.clientTop || 0) - (target.scrollTop || 0);
                    // Absolute coordinates are relative to the media container;
                    // subtract its viewport origin to preserve document position.
                    place((parseFloat(button.style.left) || 0) - originX,
                        (parseFloat(button.style.top) || 0) - originY, false);
                    pinchAnchored = true;
                }
                button.style.setProperty('transform', `scale(${normalScale / scale})`, 'important');
                button.style.setProperty('transform-origin', 'top left', 'important');
                return;
            }
            if (pinchAnchored) {
                pinchAnchored = false;
                pinchArmed = false;
                button.style.removeProperty('transform');
                button.style.removeProperty('transform-origin');
            }
            if (drag) return;
            const area = bounds();
            const hidden = !area.visible || area.maxX < area.minX || area.maxY < area.minY;
            if (button.hidden !== hidden) button.hidden = hidden;
            if (hidden) return;
            // Only the DEFAULT coordinates account for the menu's DEFAULT position.
            // A moved menu or a manually dragged entry may overlap; never chase either.
            const defaultX = area.right - FULLSCREEN_WIDTH * 2 - 4;
            const defaultY = Math.max(70 - fullscreenScrollY(), 0);
            place(clampFullscreen(placement ? placement.x : defaultX, area.minX, area.maxX),
                clampFullscreen(placement ? placement.y : defaultY, area.minY, area.maxY));
        };
        const touchStart = (event) => {
            if (!pinchAnchored && event.touches?.length >= 2) {
                normalScale = window.visualViewport?.scale || 1;
                pinchArmed = true;
            }
        };
        const touchEnd = (event) => {
            if (!pinchAnchored && (!event.touches || event.touches.length < 2)) pinchArmed = false;
        };
        document.addEventListener('touchstart', touchStart, { capture: true, passive: true });
        document.addEventListener('touchend', touchEnd, { capture: true, passive: true });
        document.addEventListener('touchcancel', touchEnd, { capture: true, passive: true });
        button.addEventListener('pointerdown', (event) => {
            if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
            suppressClick = false;
            drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
                left: parseFloat(button.style.left), top: parseFloat(button.style.top), moved: false };
            button.setPointerCapture?.(event.pointerId);
            event.stopPropagation?.();
        });
        button.addEventListener('pointermove', (event) => {
            if (!drag || drag.id !== event.pointerId) return;
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            if (!drag.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
            drag.moved = true;
            event.preventDefault?.();
            event.stopPropagation?.();
            const area = bounds();
            placement = {
                x: clampFullscreen(drag.left + dx, area.minX, area.maxX),
                y: clampFullscreen(drag.top + dy, area.minY, area.maxY),
            };
            place(placement.x, placement.y);
        });
        const finish = (event) => {
            if (!drag || drag.id !== event.pointerId) return;
            suppressClick = drag.moved;
            drag = null;
            if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId);
            layout();
        };
        button.addEventListener('pointerup', finish);
        button.addEventListener('pointercancel', finish);
        button.addEventListener('lostpointercapture', finish);
        button.addEventListener('click', (event) => {
            if (!suppressClick) return;
            suppressClick = false;
            event.preventDefault();
            event.stopImmediatePropagation();
        }, true);
        fullscreenControlLayouts.add(layout);
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(layout);
            observer.observe(target);
        }
        layout();
    }

    const BUTTON_ID = 'tm-fullscreen-game-view-button';
    const BUTTON_CLASS = 'tm-fullscreen-game-view-button';
    const TARGET_CLASS = 'tm-fullscreen-game-view-target';
    const FALLBACK_CLASS = 'tm-fullscreen-game-view-fallback';
    const STYLE_ID = 'tm-fullscreen-game-view-style';
    const GENERIC_MEDIA_SELECTOR = 'canvas, iframe, video, [role="application"]';

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
html.tm-fullscreen-game-view-active,
html.tm-fullscreen-game-view-active body {
    overflow: hidden !important;
}

.${TARGET_CLASS} {
    position: relative !important;
}

.${BUTTON_CLASS} {
    appearance: none !important;
    background: rgba(0,0,0,.55) !important;
    border: 0 !important;
    border-radius: 5px !important;
    box-shadow: 0 2px 6px rgba(0,0,0,.25) !important;
    box-sizing: border-box !important;
    color: #f0f0f0 !important;
    cursor: pointer !important;
    display: block !important;
    font: 600 15px/32px system-ui,sans-serif !important;
    height: 32px !important;
    max-width: 38px !important;
    min-width: 38px !important;
    min-height: 32px !important;
    margin: 0 !important;
    padding: 0 !important;
    position: fixed !important;
    text-align: center !important;
    opacity: 1 !important;
    user-select: none !important;
    width: 38px !important;
    z-index: 2147483647 !important;
    touch-action: none !important;
    text-decoration: none !important;
}

.${BUTTON_CLASS}[hidden],
.${BUTTON_CLASS}[aria-pressed="true"] {
    display: none !important;
}

.${BUTTON_CLASS}:hover {
    background: rgba(0,0,0,.75) !important;
}
.${BUTTON_CLASS}:hover, .${BUTTON_CLASS}:focus, .${BUTTON_CLASS}:active {
    text-decoration: none !important;
}

.${BUTTON_CLASS}:focus-visible {
    outline: 3px solid #4da3ff !important;
    outline-offset: 2px !important;
}

.${TARGET_CLASS}:fullscreen,
.${TARGET_CLASS}.${FALLBACK_CLASS} {
    align-items: center !important;
    background: #000 !important;
    box-sizing: border-box !important;
    display: flex !important;
    height: 100dvh !important;
    justify-content: center !important;
    max-height: none !important;
    max-width: none !important;
    overflow: auto !important;
    padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left)) !important;
    width: 100dvw !important;
}

.${TARGET_CLASS}.${FALLBACK_CLASS} {
    inset: 0 !important;
    position: fixed !important;
    z-index: 2147483646 !important;
}

/* Rotate a landscape video's fullscreen surface only when the browser refuses
   orientation locking and the physical viewport remains portrait. */
.tm-fullscreen-game-view-landscape-rotated:fullscreen,
.tm-fullscreen-game-view-target.tm-fullscreen-game-view-fallback.tm-fullscreen-game-view-landscape-rotated {
    position: fixed !important;
    inset: auto !important;
    top: 0 !important;
    left: 100dvw !important;
    width: 100dvh !important;
    height: 100dvw !important;
    max-width: none !important;
    max-height: none !important;
    min-width: 0 !important;
    min-height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    transform-origin: top left !important;
    transform: rotate(90deg) !important;
    overflow: hidden !important;
}
.tm-fullscreen-game-view-landscape-rotated iframe,
.tm-fullscreen-game-view-landscape-rotated video {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    object-fit: contain !important;
}

/* ARC Prize tasks use a content-box handheld shell that can overflow narrow viewports. */
body:has(#task-detail-root) {
    overflow-x: hidden !important;
}

#playground,
#playground .game-page-inner,
#playground .shell-page,
#playground .shell-header,
#playground .shell-header-scale,
#playground .shell-header-content {
    box-sizing: border-box !important;
    max-width: 100% !important;
    width: 100% !important;
}

#playground .shell-root {
    box-sizing: border-box !important;
    max-width: min(540px, 100%) !important;
    overflow: visible !important;
}

/* The site's D-pad grid places its left button one grid column outside the shell. */
@media (max-width: 767px) {
    #playground .d-pad-grid {
        position: relative !important;
        transform: translateX(2rem) !important;
        z-index: 1 !important;
    }
}
`;
    (document.head || document.documentElement).appendChild(style);

    function getTarget() {
        const arcGame = document.querySelector('#playground .game-page-inner');
        if (arcGame) {
            return arcGame;
        }

        const candidates = Array.from(document.querySelectorAll(GENERIC_MEDIA_SELECTOR));
        if (!candidates.length) {
            return null;
        }

        const visibleCandidates = candidates.filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width >= 160 && rect.height >= 120;
        });
        const candidate = (visibleCandidates.length ? visibleCandidates : candidates)
            .sort((left, right) => {
                const leftRect = left.getBoundingClientRect();
                const rightRect = right.getBoundingClientRect();
                return (rightRect.width * rightRect.height) - (leftRect.width * leftRect.height);
            })[0];

        return candidate.parentElement || candidate;
    }

    function isFullscreen(target) {
        return document.fullscreenElement === target || target.classList.contains(FALLBACK_CLASS);
    }

    // A cross-origin YouTube iframe reports intrinsic video dimensions from its
    // own userscript. Do not assume a 16:9 iframe contains a landscape video.
    const youtubeDimensions = new WeakMap();
    const youtubeNativeFullscreen = new WeakMap();
    const rotatedClass = 'tm-fullscreen-game-view-landscape-rotated';
    const isAndroid = /Android/i.test(window.navigator?.userAgent || '');
    let orientationSession = null;

    function youtubeFrame(frame) {
        if (!frame?.src) return false;
        try {
            const host = new URL(frame.src, window.location.href).hostname;
            return /^(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)$/.test(host);
        } catch (_error) {
            return false;
        }
    }

    function requestFrameDimensions(root) {
        const frames = root?.matches?.('iframe') ? [root] : Array.from(root?.querySelectorAll?.('iframe') || []);
        for (const frame of frames) {
            if (!youtubeFrame(frame)) continue;
            try {
                frame.contentWindow?.postMessage?.({ tmYoutubeOrientationRequest: 1 }, new URL(frame.src, window.location.href).origin);
            } catch (_error) { /* The frame can navigate or disappear. */ }
        }
    }

    function videoShape(root) {
        if (!root) return null;
        const videos = root.matches?.('video') ? [root] : Array.from(root.querySelectorAll?.('video') || []);
        for (const video of videos) {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                return video.videoWidth > video.videoHeight ? 'landscape' : 'portrait';
            }
        }
        const frames = root.matches?.('iframe') ? [root] : Array.from(root.querySelectorAll?.('iframe') || []);
        for (const frame of frames) {
            if (!youtubeFrame(frame)) continue;
            const metadata = youtubeDimensions.get(frame);
            if (metadata?.src === frame.src && metadata.width > 0 && metadata.height > 0) {
                return metadata.width > metadata.height ? 'landscape' : 'portrait';
            }
        }
        return null;
    }

    function childOwnsFullscreen(root) {
        const frames = root?.matches?.('iframe') ? [root] : Array.from(root?.querySelectorAll?.('iframe') || []);
        return frames.some(frame => youtubeFrame(frame) && youtubeNativeFullscreen.get(frame) === true);
    }

    function releaseOrientation() {
        const session = orientationSession;
        orientationSession = null;
        if (!session) return;
        session.target.classList.remove(rotatedClass);
        if (session.locked) {
            try { window.screen?.orientation?.unlock?.(); } catch (_error) { /* Lock already released. */ }
        }
    }

    function syncMediaOrientation() {
        const nativeTarget = document.fullscreenElement;
        const fallbackTarget = savedPageState?.target?.classList?.contains(FALLBACK_CLASS)
            ? savedPageState.target : null;
        const target = nativeTarget || fallbackTarget;
        // The child YouTube document already controls its own native player.
        // Rotating both the iframe and its fullscreen player would rotate twice.
        if (!isAndroid || !target || (nativeTarget && childOwnsFullscreen(target)) ||
            videoShape(target) !== 'landscape') {
            releaseOrientation();
            return;
        }
        if (!orientationSession || orientationSession.target !== target) {
            releaseOrientation();
            orientationSession = { target, requested: false, locked: false };
            requestFrameDimensions(target);
        }
        const session = orientationSession;
        // CSS is a visual backup. The actual screen is rotated by the browser API
        // when permission is granted; resizing then removes this CSS rotation.
        target.classList.toggle(rotatedClass, window.innerHeight > window.innerWidth);
        if (!nativeTarget || session.requested) return;
        const orientation = window.screen?.orientation;
        if (typeof orientation?.lock !== 'function') return;
        session.requested = true;
        try {
            Promise.resolve(orientation.lock('landscape')).then(() => {
                if (orientationSession !== session) {
                    if (!orientationSession?.locked) orientation.unlock?.();
                    return;
                }
                session.locked = true;
                syncMediaOrientation();
            }).catch(() => {
                // Unsupported/rejected lock: CSS rotation remains available.
                if (orientationSession === session) syncMediaOrientation();
            });
        } catch (_error) { /* CSS fallback remains active. */ }
    }

    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data || (data.tmYoutubeVideoOrientation !== 1 && data.tmYoutubeNativeFullscreen !== 1) ||
            !/^https:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)$/.test(event.origin || '')) return;
        const frames = Array.from(document.querySelectorAll('iframe'));
        const frame = frames.find((candidate) => youtubeFrame(candidate) &&
            candidate.contentWindow === event.source &&
            new URL(candidate.src, window.location.href).origin === event.origin);
        if (!frame) return;
        if (data.tmYoutubeNativeFullscreen === 1) {
            if (typeof data.active !== 'boolean') return;
            youtubeNativeFullscreen.set(frame, data.active);
        } else {
            if (!Number.isFinite(data.width) || !Number.isFinite(data.height) ||
                data.width <= 0 || data.height <= 0) return;
            youtubeDimensions.set(frame, { src: frame.src, width: data.width, height: data.height });
        }
        syncMediaOrientation();
    });
    document.addEventListener('loadedmetadata', syncMediaOrientation, true);
    document.addEventListener('fullscreenchange', syncMediaOrientation);
    window.addEventListener('resize', syncMediaOrientation);
    window.addEventListener('orientationchange', syncMediaOrientation);
    window.screen?.orientation?.addEventListener?.('change', syncMediaOrientation);

    function updateButton(button, target) {
        const active = isFullscreen(target);
        button.textContent = '⛶';
        button.setAttribute('aria-label', 'Enter fullscreen game view');
        button.title = 'Fullscreen game view';
        button.setAttribute('aria-pressed', String(active));
        button.disabled = active;
    }

    let savedPageState = null;
    let restorationEpoch = 0;

    function rememberPageState(target) {
        restorationEpoch += 1;
        const ancestors = [];
        for (let element = target; element; element = element.parentElement) ancestors.unshift(element);
        const elements = new Set([...ancestors, ...target.querySelectorAll('*')]);
        savedPageState = {
            target,
            x: window.scrollX || 0,
            y: window.scrollY || 0,
            focus: document.activeElement,
            scroll: Array.from(elements).map((element) => ({
                element, left: element.scrollLeft || 0, top: element.scrollTop || 0,
            })),
        };
    }

    function restorePageState(target) {
        if (!savedPageState || savedPageState.target !== target) return;
        const saved = savedPageState;
        savedPageState = null;
        const epoch = restorationEpoch;
        if (saved.focus && saved.focus.isConnected) saved.focus.focus?.({ preventScroll: true });
        const restore = () => {
            if (epoch !== restorationEpoch || document.fullscreenElement || target.classList.contains(FALLBACK_CLASS)) return;
            saved.scroll.forEach(({ element, left, top }) => {
                if (!element.isConnected) return;
                if (typeof element.scrollTo === 'function') element.scrollTo({ left, top, behavior: 'instant' });
                else { element.scrollLeft = left; element.scrollTop = top; }
            });
            if (typeof window.scrollTo === 'function') window.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' });
            refreshTransientControls();
            refreshFullscreenControls();
        };
        // Fullscreen exit and overflow removal can reset scrolling after fullscreenchange.
        // Restore immediately and across two layout frames; a new entry invalidates old callbacks.
        restore();
        window.requestAnimationFrame(() => {
            restore();
            window.requestAnimationFrame(restore);
        });
    }

    async function enterFullscreen(target, button) {
        if (isFullscreen(target)) return;
        rememberPageState(target);
        if (typeof target.requestFullscreen === 'function') {
            try {
                await target.requestFullscreen({ navigationUI: 'hide' });
            } catch (_error) {
                target.classList.add(FALLBACK_CLASS);
            }
        } else {
            target.classList.add(FALLBACK_CLASS);
        }

        document.documentElement.classList.toggle('tm-fullscreen-game-view-active', isFullscreen(target));
        syncMediaOrientation();
        updateButton(button, target);
        refreshTransientControls();
        refreshFullscreenControls();
    }

    const mountedButtons = new Map();
    const watchedFrameSources = new WeakMap();
    const watchedFrames = new WeakSet();
    let additionalButtonNumber = 0;

    function mountButtonOnTarget(target, alignWithMenuDefault = false) {
        if (!target?.isConnected || mountedButtons.has(target)) return;
        target.classList.add(TARGET_CLASS);
        const button = document.createElement('button');
        button.id = document.getElementById(BUTTON_ID)
            ? `${BUTTON_ID}-${++additionalButtonNumber}` : BUTTON_ID;
        button.className = BUTTON_CLASS;
        button.type = 'button';
        updateButton(button, target);
        target.appendChild(button);
        makeDockedFullscreenControl(button, target, alignWithMenuDefault);
        requestFrameDimensions(target);
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation?.();
            void enterFullscreen(target, button);
        });
        mountedButtons.set(target, button);
    }

    function updateFrameRequests() {
        for (const frame of document.querySelectorAll('iframe')) {
            if (!youtubeFrame(frame)) continue;
            if (!watchedFrames.has(frame)) {
                watchedFrames.add(frame);
                // A lazy iframe may not have a loaded child when its src is set.
                frame.addEventListener('load', () => {
                    if (youtubeFrame(frame)) requestFrameDimensions(frame);
                });
            }
            if (watchedFrameSources.get(frame) !== frame.src) {
                watchedFrameSources.set(frame, frame.src);
                requestFrameDimensions(frame);
            }
        }
    }

    function mountButtons() {
        const targets = new Set();
        const primary = getTarget();
        if (primary?.isConnected) targets.add(primary);

        // Every YouTube iframe needs a control of its own, including players
        // created after clicking GIF/video posters or scrolling into view.
        for (const frame of document.querySelectorAll('iframe')) {
            if (!youtubeFrame(frame) || !frame.parentElement) continue;
            targets.add(frame.parentElement);
        }

        for (const [target, button] of mountedButtons) {
            if (targets.has(target) && target.isConnected && button.isConnected) continue;
            mountedButtons.delete(target);
            button.remove();
            target.classList.remove(TARGET_CLASS);
        }
        for (const target of targets) mountButtonOnTarget(target, target === primary);
        updateFrameRequests();
        refreshFullscreenControls();
    }

    function exitFallback() {
        for (const [target, button] of mountedButtons) {
            if (!target.classList.contains(FALLBACK_CLASS)) continue;
            target.classList.remove(FALLBACK_CLASS);
            syncMediaOrientation();
            document.documentElement.classList.remove('tm-fullscreen-game-view-active');
            updateButton(button, target);
            restorePageState(target);
        }
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') exitFallback();
    }, true);
    window.addEventListener('popstate', exitFallback);
    document.addEventListener('fullscreenchange', () => {
        const active = Array.from(mountedButtons).some(([target]) => isFullscreen(target));
        document.documentElement.classList.toggle('tm-fullscreen-game-view-active', active);
        for (const [target, button] of mountedButtons) {
            updateButton(button, target);
            if (!isFullscreen(target)) restorePageState(target);
            refreshFullscreenControls();
        }
    });

    mountButtons();
    // Do not repeatedly write to the document in our own mutation callback.
    // React to lazy iframe src updates and visibility changes as well as DOM swaps.
    let mediaRefreshPending = false;
    function scheduleMediaRefresh() {
        if (mediaRefreshPending) return;
        mediaRefreshPending = true;
        window.requestAnimationFrame(() => {
            mediaRefreshPending = false;
            mountButtons();
        });
    }
    function isMediaNode(node) {
        return Boolean(['iframe', 'video', 'canvas', '[role="application"]'].some(
            (selector) => node?.matches?.(selector)) ||
            node?.querySelector?.(GENERIC_MEDIA_SELECTOR));
    }
    new MutationObserver((changes) => {
        const relevant = changes.some((change) => {
            if (change.type === 'childList') {
                return Array.from(change.addedNodes || []).some(isMediaNode) ||
                    Array.from(change.removedNodes || []).some(isMediaNode);
            }
            if (change.type === 'attributes') {
                if (change.target?.classList?.contains(BUTTON_CLASS)) return false;
                return isMediaNode(change.target);
            }
            return false;
        });
        if (relevant) scheduleMediaRefresh();
    }).observe(document.documentElement, {
        childList: true, subtree: true, attributes: true,
        attributeFilter: ['src', 'data-src', 'class', 'style', 'hidden']
    });
})();
