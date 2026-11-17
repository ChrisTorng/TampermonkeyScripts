// ==UserScript==
// @name         Fullscreen Game View
// @namespace    http://tampermonkey.net/
// @version      2026-11-18_1.2.8
// @description  Native-first per-media fullscreen with external block controls, explicit fallback exit, and auto-orientation.
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


    // Fullscreen controls belong to individual media/game blocks, never to the page menu.
    // Position them outside the upper-right corner of their own visible surface.
    const fullscreenControlLayouts = new Set();
    const FULLSCREEN_WIDTH = 38;
    const FULLSCREEN_HEIGHT = 32;
    const isNitter = window.location.hostname === 'nitter.tiekoetter.com';
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

    function makeDockedFullscreenControl(button, target) {
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
            // Nitter media wrappers may be larger, zero-sized, or off-screen while
            // their video is actually visible. Dock to the real video rectangle.
            const visibleMedia = isNitter && (target.matches?.('video') ? target : target.querySelector?.('video'));
            const rect = (visibleMedia || target).getBoundingClientRect();
            return {
                left, right,
                visible: Math.min(rect.right, right) - Math.max(rect.left, left) >= FULLSCREEN_WIDTH &&
                    Math.min(rect.bottom, bottom) - Math.max(rect.top, 0) >= FULLSCREEN_HEIGHT,
                // Float ABOVE the media. Keep it accessible beside clipped players.
                minX: left,
                maxX: right - FULLSCREEN_WIDTH,
                minY: 0,
                maxY: bottom - FULLSCREEN_HEIGHT,
                anchorX: Math.min(rect.right, right) - FULLSCREEN_WIDTH,
                anchorY: rect.top - FULLSCREEN_HEIGHT - 4,
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
                    const inMedia = button.parentElement === target;
                    const originX = inMedia
                        ? rect.left + (target.clientLeft || 0) - (target.scrollLeft || 0)
                        : -(window.scrollX || 0);
                    const originY = inMedia
                        ? rect.top + (target.clientTop || 0) - (target.scrollTop || 0)
                        : -(window.scrollY || 0);
                    // For a body-level Nitter overlay, absolute coordinates are
                    // document-relative rather than video-container-relative.
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
            // Track this block's outer upper-right corner (not the viewport menu).
            place(clampFullscreen(placement ? placement.x : area.anchorX, area.minX, area.maxX),
                clampFullscreen(placement ? placement.y : area.anchorY, area.minY, area.maxY));
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
    const TARGET_POSITION_CLASS = 'tm-fullscreen-game-view-local-position';
    const FALLBACK_CLASS = 'tm-fullscreen-game-view-fallback';
    const VIDEO_DIALOG_ID = 'tm-fullscreen-video-dialog';
    const EXIT_BUTTON_ID = 'tm-fullscreen-game-view-exit-button';
    const VIDEO_PLACEHOLDER_CLASS = 'tm-fullscreen-video-placeholder';
    const STYLE_ID = 'tm-fullscreen-game-view-style';
    const GENERIC_MEDIA_SELECTOR = 'canvas, iframe, video, [role="application"]';

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
html.tm-fullscreen-game-view-active,
html.tm-fullscreen-game-view-active body {
    overflow: hidden !important;
}

.${TARGET_CLASS}.${TARGET_POSITION_CLASS} {
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

/* Visible fallback exit, even when Android Back does not dispatch popstate. */
#${EXIT_BUTTON_ID} {
    appearance: none !important;
    position: absolute !important;
    top: max(8px, env(safe-area-inset-top)) !important;
    right: max(8px, env(safe-area-inset-right)) !important;
    left: auto !important;
    bottom: auto !important;
    display: block !important;
    background: rgba(0,0,0,.78) !important;
    color: #fff !important;
    border: 1px solid rgba(255,255,255,.7) !important;
    border-radius: 6px !important;
    font: 600 24px/44px system-ui,sans-serif !important;
    text-align: center !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;
    min-height: 44px !important;
    max-width: 44px !important;
    z-index: 2147483647 !important;
    cursor: pointer !important;
    touch-action: manipulation !important;
}
#${EXIT_BUTTON_ID}:focus-visible {
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

/* Nitter can disable its native video control and reject the Fullscreen API.
   A modal dialog keeps only the original video above site stacking contexts. */
#${VIDEO_DIALOG_ID}[open] {
    align-items: center !important;
    background: #000 !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-sizing: border-box !important;
    display: flex !important;
    height: 100dvh !important;
    inset: 0 !important;
    justify-content: center !important;
    margin: 0 !important;
    max-height: none !important;
    max-width: none !important;
    overflow: hidden !important;
    padding: max(0px, env(safe-area-inset-top)) max(0px, env(safe-area-inset-right)) max(0px, env(safe-area-inset-bottom)) max(0px, env(safe-area-inset-left)) !important;
    position: fixed !important;
    width: 100dvw !important;
    z-index: 2147483647 !important;
}
#${VIDEO_DIALOG_ID}::backdrop { background: #000 !important; }
#${VIDEO_DIALOG_ID} > video {
    background: #000 !important;
    display: block !important;
    flex: 1 1 auto !important;
    height: 100% !important;
    max-height: 100% !important;
    max-width: 100% !important;
    min-height: 0 !important;
    min-width: 0 !important;
    object-fit: contain !important;
    width: 100% !important;
}
.${VIDEO_PLACEHOLDER_CLASS} { display: none !important; }
video.tm-fullscreen-game-view-media:fullscreen {
    background: #000 !important;
    height: 100dvh !important;
    max-height: none !important;
    max-width: none !important;
    object-fit: contain !important;
    width: 100dvw !important;
}
/* On Android Edge, rotate a landscape video visually if orientation.lock fails.
   Rotating the top-layer dialog, not its ancestor, preserves native controls. */
#${VIDEO_DIALOG_ID}[open].tm-fullscreen-game-view-landscape-rotated {
    inset: auto !important;
    top: 0 !important;
    left: 100dvw !important;
    width: 100dvh !important;
    height: 100dvw !important;
    transform-origin: top left !important;
    transform: rotate(90deg) !important;
}

/* A fullscreen <video> needs swapped dimensions too: the unrotated video rule
   has higher CSS specificity than the generic landscape fallback rule. */
video.tm-fullscreen-game-view-media.tm-fullscreen-game-view-landscape-rotated:fullscreen {
    width: 100dvh !important;
    height: 100dvw !important;
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

    // Plain article pages often contain advertising, analytics, and widget iframes.
    // Treat only identifiable media-player frames as fullscreen candidates.
    function isEmbeddedPlayer(frame) {
        if (!frame?.src) return false;
        if (youtubeFrame(frame)) return true;
        try {
            const host = new URL(frame.src, window.location.href).hostname.toLowerCase();
            return /^(?:player\.vimeo\.com|(?:www\.|geo\.)?dailymotion\.com|fast\.wistia\.(?:net|com)|(?:player\.)?twitch\.tv|players\.brightcove\.net|(?:www\.)?loom\.com|iframe\.mediadelivery\.net)$/.test(host);
        } catch (_error) {
            return false;
        }
    }

    function getTarget() {
        const arcGame = document.querySelector('#playground .game-page-inner');
        if (arcGame) {
            return arcGame;
        }

        const candidates = Array.from(document.querySelectorAll(GENERIC_MEDIA_SELECTOR))
            .filter((element) => element.tagName !== 'IFRAME' || isEmbeddedPlayer(element));
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

    // The original Full Screen PR used the actual Nitter <video> rather than
    // its tweet wrapper. This remains Nitter-specific to preserve other sites.
    function nitterVideo(target) {
        if (window.location.hostname !== 'nitter.tiekoetter.com' || !target) return null;
        return target.matches?.('video') ? target : target.querySelector?.('video') || null;
    }

    let videoFallback = null;

    function isFullscreen(target) {
        return document.fullscreenElement === target ||
            Boolean(nitterVideo(target) && document.fullscreenElement === nitterVideo(target)) ||
            Boolean(videoFallback?.target === target) ||
            target.classList.contains(FALLBACK_CLASS);
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
        const fallbackTarget = videoFallback?.dialog ||
            (savedPageState?.target?.classList?.contains(FALLBACK_CLASS)
                ? savedPageState.target : null);
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
        if ((!nativeTarget && !videoFallback) || session.requested) return;
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

    let fallbackExitButton = null;

    function removeFallbackExit() {
        fallbackExitButton?.remove();
        fallbackExitButton = null;
    }

    function addFallbackExit(host) {
        removeFallbackExit();
        const close = document.createElement('button');
        close.id = EXIT_BUTTON_ID;
        close.type = 'button';
        close.textContent = '×';
        close.title = 'Exit simulated fullscreen';
        close.setAttribute('aria-label', 'Exit simulated fullscreen');
        close.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation?.();
            exitFallback();
        });
        host.appendChild(close);
        fallbackExitButton = close;
    }

    function closeVideoFallback() {
        const session = videoFallback;
        if (!session) return;
        videoFallback = null;
        removeFallbackExit();
        const { dialog, video, marker, target, button } = session;
        dialog.removeEventListener('close', closeVideoFallback);
        if (dialog.open) dialog.close();
        if (marker.parentNode) {
            // Moving explicitly also keeps the lightweight DOM test harness faithful.
            video.parentNode?.removeChild(video);
            marker.parentNode.insertBefore(video, marker);
            marker.remove();
        }
        dialog.remove();
        syncMediaOrientation();
        document.documentElement.classList.remove('tm-fullscreen-game-view-active');
        updateButton(button, target);
        restorePageState(target);
        mountButtons();
    }

    function openVideoFallback(target, video, button) {
        if (videoFallback || !video?.parentNode) return;
        const parent = video.parentNode;
        const dialog = document.createElement('dialog');
        dialog.id = VIDEO_DIALOG_ID;
        dialog.setAttribute('aria-label', 'Expanded video');
        (document.body || document.documentElement).appendChild(dialog);
        try {
            if (typeof dialog.showModal === 'function') dialog.showModal();
            else dialog.setAttribute('open', '');
        } catch (_error) {
            dialog.remove();
            return;
        }

        const marker = document.createElement('span');
        marker.className = VIDEO_PLACEHOLDER_CLASS;
        parent.insertBefore(marker, video);
        video.parentNode?.removeChild(video);
        dialog.appendChild(video);
        videoFallback = { dialog, video, marker, target, button };
        addFallbackExit(dialog);
        dialog.addEventListener('close', closeVideoFallback);
        dialog.addEventListener('cancel', (event) => {
            event.preventDefault();
            closeVideoFallback();
        });
        document.documentElement.classList.add('tm-fullscreen-game-view-active');
        updateButton(button, target);
        syncMediaOrientation();
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
            refreshFullscreenControls();
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
        const video = nitterVideo(target);
        if (video) video.classList.add('tm-fullscreen-game-view-media');
        const surface = video || target;
        rememberPageState(target);
        // Call native fullscreen on a real click even when a policy hint says no.
        // The actual browser resolve/reject determines whether fallback is needed.
        if (typeof surface.requestFullscreen === 'function') {
            try {
                // Preserve the user-tested native Nitter video fullscreen route.
                await surface.requestFullscreen({ navigationUI: 'hide' });
            } catch (_error) {
                if (video) openVideoFallback(target, video, button);
                else {
                    target.classList.add(FALLBACK_CLASS);
                    addFallbackExit(target);
                }
            }
        } else if (video) {
            openVideoFallback(target, video, button);
        } else {
            target.classList.add(FALLBACK_CLASS);
            addFallbackExit(target);
        }

        if (!isFullscreen(target)) restorePageState(target);
        document.documentElement.classList.toggle('tm-fullscreen-game-view-active', isFullscreen(target));
        syncMediaOrientation();
        updateButton(button, target);
        refreshFullscreenControls();
        refreshFullscreenControls();
    }

    const mountedButtons = new Map();
    const watchedFrameSources = new WeakMap();
    const watchedFrames = new WeakSet();
    let additionalButtonNumber = 0;

    function mountButtonOnTarget(target) {
        if (!target?.isConnected || mountedButtons.has(target)) return;
        // Do not alter media wrapper positioning and shift the article's layout.
        target.classList.add(TARGET_CLASS);
        const button = document.createElement('button');
        button.id = document.getElementById(BUTTON_ID)
            ? `${BUTTON_ID}-${++additionalButtonNumber}` : BUTTON_ID;
        button.className = BUTTON_CLASS;
        button.type = 'button';
        updateButton(button, target);
        // A body overlay can sit OUTSIDE even clipping/transforming media wrappers.
        (document.body || document.documentElement).appendChild(button);
        makeDockedFullscreenControl(button, target);
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
        // The original video temporarily lives in a top-layer dialog; do not
        // remount or discard its button during this expected DOM reparenting.
        if (videoFallback) return;
        const targets = new Set();
        // On a Nitter thread, the largest video may be far below the viewport.
        // One selected fullscreen button then stays hidden even when another
        // video is on screen. Give every individual video its own control.
        const primary = isNitter ? null : getTarget();
        if (primary?.isConnected) targets.add(primary);
        if (isNitter) {
            for (const video of document.querySelectorAll('video')) {
                if (video.isConnected) targets.add(video.parentElement || video);
            }
        }

        // Keep one entry for EVERY distinct visible game or media block. The
        // primary container already owns its descendants (notably ARC games).
        const inside = (node, root) => {
            for (let current = node; current; current = current.parentElement) {
                if (current === root) return true;
            }
            return false;
        };
        if (!isNitter) {
            for (const media of document.querySelectorAll('canvas, video, [role="application"]')) {
                const rect = media.getBoundingClientRect();
                if (rect.width < 160 || rect.height < 120 || (primary && inside(media, primary))) continue;
                targets.add(media.parentElement || media);
            }
        }

        // Multiple embedded providers, including lazy YouTube players, each
        // deserve an independent button; advertising iframes are never included.
        for (const frame of document.querySelectorAll('iframe')) {
            if (!isEmbeddedPlayer(frame) || !frame.parentElement ||
                (primary && inside(frame, primary))) continue;
            targets.add(frame.parentElement);
        }

        for (const [target, button] of mountedButtons) {
            if (targets.has(target) && target.isConnected && button.isConnected) continue;
            mountedButtons.delete(target);
            button.remove();
            target.classList.remove(TARGET_CLASS, TARGET_POSITION_CLASS);
        }
        for (const target of targets) mountButtonOnTarget(target);
        updateFrameRequests();
        refreshFullscreenControls();
    }

    function exitFallback() {
        if (videoFallback) closeVideoFallback();
        for (const [target, button] of mountedButtons) {
            if (!target.classList.contains(FALLBACK_CLASS)) continue;
            removeFallbackExit();
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
    // An ARC game can hydrate after document-idle, without inserting a canvas.
    // Refresh when the page finishes loading as well as after relevant mutations.
    window.addEventListener('load', () => mountButtons());
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
        return Boolean(['iframe', 'video', 'canvas', '[role="application"]',
            '#playground', '.game-page-inner'].some(
            (selector) => node?.matches?.(selector)) ||
            node?.querySelector?.(GENERIC_MEDIA_SELECTOR + ', #playground, .game-page-inner'));
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
