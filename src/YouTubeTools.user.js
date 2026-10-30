// ==UserScript==
// @name         YouTube Tools
// @namespace    http://tampermonkey.net/
// @version      2026-10-30_1.2.0
// @description  Show YouTube speed controls and an Android Edge alternative fullscreen button that avoids YouTube native fullscreen.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/YouTubeTools.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/YouTubeTools.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @grant        none
// ==/UserScript==

(function() {
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

    const overlayId = 'tm-yt-speed-overlay';
    const styleId = 'tm-yt-speed-overlay-style';
    const minRate = 0.25;
    const maxRate = 2;
    const rateStep = 0.25;
    const isAndroidEdge = /Android/i.test(window.navigator?.userAgent || '') &&
        /EdgA\//i.test(window.navigator?.userAgent || '');
    const fullscreenButtonId = 'tm-yt-alternative-fullscreen-button';
    const fullscreenRootId = 'tm-yt-alternative-fullscreen-root';
    const fullscreenTargetClass = 'tm-yt-alternative-fullscreen-target';
    const fullscreenActiveClass = 'tm-yt-alternative-fullscreen-active';
    let fullscreenButton = null;
    let fullscreenTarget = null;
    let fullscreenLayout = null;
    let fullscreenSession = null;
    let blockedGameButton = null;
    let menuObserver = null;
    let menuElement = null;

    let overlay = null;
    let speedValue = null;
    let currentVideo = null;
    let videoObserver = null;
    let videoCheckPending = false;

    function isWatchPage() {
        return window.location.pathname === '/watch';
    }

    function formatRate(rate) {
        const rounded = Math.round(rate * 100) / 100;
        return `${rounded.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}x`;
    }

    function clampRate(rate) {
        return Math.min(maxRate, Math.max(minRate, rate));
    }

    function getNearestStep(rate) {
        return Math.round(rate / rateStep) * rateStep;
    }

    function updateSpeedDisplay() {
        if (!speedValue) {
            return;
        }
        const rate = currentVideo ? currentVideo.playbackRate : null;
        speedValue.textContent = rate ? formatRate(rate) : '--';
    }

    function setPlaybackRate(direction) {
        const video = currentVideo || document.querySelector('video');
        if (!video) {
            return;
        }
        const baseRate = getNearestStep(video.playbackRate || 1);
        const nextRate = clampRate(baseRate + direction * rateStep);
        video.playbackRate = Number(nextRate.toFixed(2));
        updateSpeedDisplay();
    }

    function onRateChange() {
        updateSpeedDisplay();
    }

    function setAbsoluteRate(rate) {
        const video = currentVideo || document.querySelector('video');
        if (!video) {
            return;
        }
        video.playbackRate = clampRate(rate);
        updateSpeedDisplay();
    }

    function attachVideo(video) {
        if (currentVideo === video) {
            return;
        }
        if (currentVideo) {
            currentVideo.removeEventListener('ratechange', onRateChange);
        }
        currentVideo = video;
        if (currentVideo) {
            currentVideo.addEventListener('ratechange', onRateChange);
        }
        updateSpeedDisplay();
    }

    function scheduleVideoCheck() {
        if (videoCheckPending) {
            return;
        }
        videoCheckPending = true;
        window.requestAnimationFrame(() => {
            videoCheckPending = false;
            if (!overlay) {
                return;
            }
            const video = document.querySelector('video');
            if (video) {
                attachVideo(video);
            }
            mountAlternativeFullscreenButton();
            hideGenericFullscreenButton();
        });
    }

    function startVideoObserver() {
        if (videoObserver) {
            return;
        }
        videoObserver = new MutationObserver(() => {
            scheduleVideoCheck();
        });
        videoObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
        scheduleVideoCheck();
    }

    function stopVideoObserver() {
        if (!videoObserver) {
            return;
        }
        videoObserver.disconnect();
        videoObserver = null;
    }

    function updateFullscreenState() {
        if (!overlay) {
            return;
        }
        const isFullscreen = Boolean(document.fullscreenElement || fullscreenSession);
        overlay.classList.toggle('tm-yt-speed-overlay--fullscreen', isFullscreen);
        if (fullscreenButton) fullscreenButton.hidden = isFullscreen;
        const host = fullscreenSession?.root || document.fullscreenElement || document.body;
        if (host && overlay.parentElement !== host) {
            host.appendChild(overlay);
        }
    }

    function injectStyles() {
        if (document.getElementById(styleId)) {
            return;
        }
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
#${overlayId} {
    position: fixed;
    top: 40px;
    right: 12px;
    width: clamp(132px, 28vw, 170px);
    min-height: 76px;
    z-index: 2147483647;
    color: rgba(255, 255, 255, 0.6);
    font-family: "Roboto", "Arial", sans-serif;
    pointer-events: auto;
    user-select: none;
    opacity: 1;
    transition: color 160ms ease, opacity 0s;
}

#${overlayId}.tm-yt-speed-overlay--fullscreen {
    position: absolute;
    opacity: 0;
}

#${overlayId}.tm-yt-speed-overlay--fullscreen:hover {
    opacity: 1;
}

#${overlayId} .tm-yt-speed-overlay__click {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 50%;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: background-color 160ms ease;
}

#${overlayId} .tm-yt-speed-overlay__click--left {
    left: 0;
}

#${overlayId} .tm-yt-speed-overlay__click--right {
    right: 0;
}

#${overlayId} .tm-yt-speed-overlay__label {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    pointer-events: none;
    text-shadow: 0 2px 5px rgba(0, 0, 0, 0.45);
    transition: text-shadow 160ms ease;
}

#${overlayId} .tm-yt-speed-overlay__icon {
    font-size: clamp(18px, 5vw, 24px);
    font-weight: 500;
    opacity: 0.55;
    padding: 0 10px;
    transition: opacity 160ms ease;
}

#${overlayId} .tm-yt-speed-overlay__icon--left {
    justify-self: start;
}

#${overlayId} .tm-yt-speed-overlay__icon--right {
    justify-self: end;
}

#${overlayId} .tm-yt-speed-overlay__value {
    justify-self: center;
    background: rgba(0, 0, 0, 0.35);
    padding: 4px 8px;
    border-radius: 999px;
    font-size: clamp(12px, 3.5vw, 16px);
    font-weight: 500;
    letter-spacing: 0.2px;
    color: rgba(255, 255, 255, 0.7);
    transition: background-color 160ms ease, color 160ms ease;
}

#${overlayId}:hover {
    color: rgba(255, 255, 255, 0.9);
}

#${overlayId}:hover .tm-yt-speed-overlay__label {
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.55);
}

#${overlayId}:hover .tm-yt-speed-overlay__icon {
    opacity: 0.85;
}

#${overlayId}:hover .tm-yt-speed-overlay__value {
    background: rgba(0, 0, 0, 0.5);
    color: rgba(255, 255, 255, 0.95);
}

#${overlayId} .tm-yt-speed-overlay__click--left:hover,
#${overlayId} .tm-yt-speed-overlay__click--right:hover {
    background: rgba(255, 255, 255, 0.65);
}

#${overlayId} .tm-yt-speed-overlay__click--left:active,
#${overlayId} .tm-yt-speed-overlay__click--right:active {
    background: rgba(229, 9, 20, 0.38);
}

#${overlayId} .tm-yt-speed-overlay__presets {
    position: absolute;
    left: 0;
    right: 0;
    top: 44px;
    display: flex;
    justify-content: center;
    gap: 6px;
}

#${overlayId} .tm-yt-speed-overlay__preset {
    border: none;
    border-radius: 999px;
    padding: 4px 8px;
    font-size: clamp(11px, 2.8vw, 13px);
    font-weight: 600;
    color: rgba(255, 255, 255, 0.88);
    background: rgba(0, 0, 0, 0.48);
    cursor: pointer;
}

#${overlayId} .tm-yt-speed-overlay__preset:hover {
    background: rgba(255, 255, 255, 0.26);
}

#${overlayId} .tm-yt-speed-overlay__preset:active {
    background: rgba(229, 9, 20, 0.46);
}

html.tm-yt-alternative-fullscreen-active,
html.tm-yt-alternative-fullscreen-active body {
    overflow: hidden !important;
}
#tm-yt-alternative-fullscreen-button {
    align-items: center !important;
    background: rgba(0,0,0,.55) !important;
    border: 0 !important;
    border-radius: 5px !important;
    box-shadow: 0 2px 6px rgba(0,0,0,.25) !important;
    box-sizing: border-box !important;
    color: #f0f0f0 !important;
    cursor: pointer !important;
    display: flex !important;
    font: 600 15px/32px system-ui, sans-serif !important;
    height: 32px !important;
    justify-content: center !important;
    margin: 0 !important;
    padding: 0 !important;
    position: absolute !important;
    right: max(4px, env(safe-area-inset-right)) !important;
    top: max(4px, env(safe-area-inset-top)) !important;
    width: 38px !important;
    z-index: 2147483647 !important;
    touch-action: none !important;
    text-decoration: none !important;
}
#tm-yt-alternative-fullscreen-button[hidden] {
    display: none !important;
}
#tm-yt-alternative-fullscreen-button:hover {
    background: rgba(0,0,0,.75) !important;
}
#tm-yt-alternative-fullscreen-button:hover,
#tm-yt-alternative-fullscreen-button:focus,
#tm-yt-alternative-fullscreen-button:active {
    text-decoration: none !important;
}
#tm-yt-alternative-fullscreen-button:focus-visible {
    outline: 3px solid #4da3ff !important;
    outline-offset: 2px !important;
}
#tm-yt-alternative-fullscreen-root {
    position: fixed !important;
    inset: 0 !important;
    z-index: 2147483646 !important;
    width: 100vw !important;
    height: 100dvh !important;
    max-width: none !important;
    max-height: none !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #000 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}
#tm-yt-alternative-fullscreen-root:fullscreen {
    width: 100% !important;
    height: 100% !important;
}
#tm-yt-alternative-fullscreen-root > .tm-yt-alternative-fullscreen-target {
    position: relative !important;
    inset: auto !important;
    width: 100% !important;
    height: 100% !important;
    max-width: none !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
    background: #000 !important;
    overflow: hidden !important;
}
#tm-yt-alternative-fullscreen-root .html5-video-container,
#tm-yt-alternative-fullscreen-root .html5-video-container video,
#tm-yt-alternative-fullscreen-root video {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
}
#tm-yt-alternative-fullscreen-root video {
    object-fit: contain !important;
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    transform: none !important;
}
`;
        document.head.appendChild(style);
    }

    function createOverlay() {
        if (overlay) {
            return;
        }
        injectStyles();
        overlay = document.createElement('div');
        overlay.id = overlayId;
        overlay.setAttribute('role', 'group');
        overlay.setAttribute('aria-label', 'Playback speed controls');

        const leftButton = document.createElement('button');
        leftButton.type = 'button';
        leftButton.className = 'tm-yt-speed-overlay__click tm-yt-speed-overlay__click--left';
        leftButton.setAttribute('aria-label', 'Decrease playback speed');
        leftButton.addEventListener('click', () => setPlaybackRate(-1));

        const rightButton = document.createElement('button');
        rightButton.type = 'button';
        rightButton.className = 'tm-yt-speed-overlay__click tm-yt-speed-overlay__click--right';
        rightButton.setAttribute('aria-label', 'Increase playback speed');
        rightButton.addEventListener('click', () => setPlaybackRate(1));

        const label = document.createElement('div');
        label.className = 'tm-yt-speed-overlay__label';

        const leftIcon = document.createElement('span');
        leftIcon.className = 'tm-yt-speed-overlay__icon tm-yt-speed-overlay__icon--left';
        leftIcon.textContent = '«';

        speedValue = document.createElement('span');
        speedValue.className = 'tm-yt-speed-overlay__value';
        speedValue.setAttribute('aria-live', 'polite');

        const rightIcon = document.createElement('span');
        rightIcon.className = 'tm-yt-speed-overlay__icon tm-yt-speed-overlay__icon--right';
        rightIcon.textContent = '»';

        label.appendChild(leftIcon);
        label.appendChild(speedValue);
        label.appendChild(rightIcon);

        const presets = document.createElement('div');
        presets.className = 'tm-yt-speed-overlay__presets';

        [1, 1.5, 2].forEach((rate) => {
            const preset = document.createElement('button');
            preset.type = 'button';
            preset.className = 'tm-yt-speed-overlay__preset';
            preset.textContent = formatRate(rate);
            preset.setAttribute('aria-label', `Set playback speed to ${formatRate(rate)}`);
            preset.addEventListener('click', () => setAbsoluteRate(rate));
            presets.appendChild(preset);
        });

        overlay.appendChild(leftButton);
        overlay.appendChild(rightButton);
        overlay.appendChild(label);
        overlay.appendChild(presets);

        const host = fullscreenSession?.root || document.fullscreenElement || document.body;
        host.appendChild(overlay);
        updateSpeedDisplay();
        updateFullscreenState();
        startVideoObserver();
    }

    function removeOverlay() {
        if (overlay) {
            overlay.remove();
        }
        overlay = null;
        speedValue = null;
        if (currentVideo) {
            currentVideo.removeEventListener('ratechange', onRateChange);
        }
        currentVideo = null;
        stopVideoObserver();
    }


    function hideGenericFullscreenButton() {
        if (!isAndroidEdge || !isWatchPage()) return;
        const gameButton = document.getElementById('tm-fullscreen-game-view-button');
        if (!gameButton) return;
        if (gameButton !== blockedGameButton) {
            restoreGenericFullscreenButton();
            blockedGameButton = gameButton;
            blockedGameButtonWasHidden = gameButton.hidden;
        }
        gameButton.hidden = true;
    }

    let blockedGameButtonWasHidden = false;

    function restoreGenericFullscreenButton() {
        if (blockedGameButton) {
            blockedGameButton.hidden = blockedGameButtonWasHidden;
            blockedGameButton = null;
        }
    }

    function getYouTubePlayer() {
        const video = document.querySelector('video');
        if (!video) return null;
        const player = video.closest?.('.html5-video-player') ||
            video.closest?.('#movie_player') || video.parentElement;
        return player === document.body ? null : player;
    }

    function watchFloatingMenu() {
        if (!isAndroidEdge) return;
        const menu = document.getElementById('tm-shared-floating-menu');
        if (menu === menuElement) return;
        menuObserver?.disconnect();
        menuElement = menu;
        if (menu) {
            menuObserver = new MutationObserver(refreshTransientControls);
            menuObserver.observe(menu, {
                attributes: true,
                attributeFilter: ['style', 'hidden', 'data-floating-expanded'],
                childList: true,
                subtree: true
            });
        }
        refreshTransientControls();
    }

    function removeAlternativeFullscreenButton() {
        fullscreenButton?.remove();
        fullscreenButton = null;
        fullscreenTarget?.classList.remove(fullscreenTargetClass);
        fullscreenTarget = null;
        if (fullscreenLayout) transientControlLayouts.delete(fullscreenLayout);
        fullscreenLayout = null;
        restoreGenericFullscreenButton();
    }

    function mountAlternativeFullscreenButton() {
        if (!isAndroidEdge || !isWatchPage()) return;
        if (fullscreenSession) return;
        const target = getYouTubePlayer();
        if (!target) return;
        if (fullscreenButton && target === fullscreenTarget && fullscreenButton.isConnected) return;
        removeAlternativeFullscreenButton();
        fullscreenTarget = target;
        target.classList.add(fullscreenTargetClass);
        fullscreenButton = document.createElement('button');
        fullscreenButton.id = fullscreenButtonId;
        fullscreenButton.type = 'button';
        fullscreenButton.textContent = '⛶';
        fullscreenButton.title = 'Alternative fullscreen view';
        fullscreenButton.setAttribute('aria-label', 'Enter alternative fullscreen YouTube view');
        fullscreenButton.setAttribute('aria-pressed', 'false');
        target.appendChild(fullscreenButton);
        fullscreenLayout = makeTransientControlDraggable(fullscreenButton, target, {
            size: 38, height: 32, inset: 4,
            stationaryOnPinchZoom: true, avoidFloatingMenu: true
        });
        fullscreenButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation?.();
            enterAlternativeFullscreen();
        });
        watchFloatingMenu();
        hideGenericFullscreenButton();
    }

    function restorePageScroll(snapshot) {
        const restore = () => {
            if (fullscreenSession || !snapshot) return;
            for (const entry of snapshot.scroll) {
                if (!entry.element.isConnected) continue;
                if (typeof entry.element.scrollTo === 'function') {
                    entry.element.scrollTo({left: entry.left, top: entry.top, behavior: 'instant'});
                } else {
                    entry.element.scrollLeft = entry.left;
                    entry.element.scrollTop = entry.top;
                }
            }
            window.scrollTo?.({ left: snapshot.x, top: snapshot.y, behavior: 'instant' });
        };
        restore();
        window.requestAnimationFrame(() => {
            restore();
            window.requestAnimationFrame(restore);
        });
        if (snapshot.focus?.isConnected) snapshot.focus.focus?.({ preventScroll: true });
    }

    function exitAlternativeFullscreen(fromBack = false) {
        const session = fullscreenSession;
        if (!session) return;
        fullscreenSession = null;
        if (document.fullscreenElement === session.root) {
            try { document.exitFullscreen?.(); } catch (_error) { /* May already be exiting. */ }
        }
        session.target.classList.remove(fullscreenActiveClass);
        document.documentElement.classList.remove(fullscreenActiveClass);
        session.target.remove();
        if (session.anchor.parentElement) {
            session.anchor.parentElement.insertBefore(session.target, session.anchor);
        } else if (session.parent.isConnected) {
            session.parent.appendChild(session.target);
        }
        session.anchor.remove();
        session.root.remove();
        if (fullscreenButton) {
            fullscreenButton.hidden = false;
            fullscreenButton.setAttribute('aria-pressed', 'false');
        }
        updateFullscreenState();
        restorePageScroll(session.scroll);
        refreshTransientControls();
        if (session.historyAdded && !fromBack) {
            window.history?.back?.();
        }
    }

    function enterAlternativeFullscreen() {
        if (!isAndroidEdge || fullscreenSession || document.fullscreenElement) return;
        const target = fullscreenTarget;
        if (!target?.parentElement || !target.querySelector('video')) return;
        const parent = target.parentElement;
        const anchor = document.createElement('span');
        anchor.hidden = true;
        anchor.setAttribute('aria-hidden', 'true');
        parent.insertBefore(anchor, target);
        const elements = [target, ...target.querySelectorAll('*')];
        const scroll = {
            x: window.scrollX || 0,
            y: window.scrollY || 0,
            focus: document.activeElement,
            scroll: elements.map((element) => ({
                element, left: element.scrollLeft || 0, top: element.scrollTop || 0
            }))
        };
        const root = document.createElement('div');
        root.id = fullscreenRootId;
        root.setAttribute('role', 'region');
        root.setAttribute('aria-label', 'Alternative fullscreen YouTube player');
        target.remove();
        root.appendChild(target);
        document.body.appendChild(root);
        target.classList.add(fullscreenActiveClass);
        document.documentElement.classList.add(fullscreenActiveClass);
        fullscreenSession = { root, target, parent, anchor, scroll, historyAdded: false, nativeEntered: false };
        fullscreenButton.hidden = true;
        fullscreenButton.setAttribute('aria-pressed', 'true');
        updateFullscreenState();
        refreshTransientControls();
        try {
            window.history?.pushState?.({ tmYouTubeFullscreen: true }, '', window.location.href);
            fullscreenSession.historyAdded = Boolean(window.history?.pushState);
        } catch (_error) {
            // The browser's Back button can still be handled via popstate.
        }
        // Enter fullscreen on our own container, never through YouTube's player.
        // CSS viewport-fill mode remains active if the request is unavailable or rejected.
        if (typeof root.requestFullscreen === 'function') {
            try {
                const result = root.requestFullscreen({ navigationUI: 'hide' });
                result?.catch?.(() => {});
            } catch (_error) {
                // The CSS fallback is already active.
            }
        }
    }

    function handleAlternativeFullscreenEvent() {
        if (fullscreenSession) {
            if (document.fullscreenElement === fullscreenSession.root) {
                fullscreenSession.nativeEntered = true;
            } else if (fullscreenSession.nativeEntered) {
                exitAlternativeFullscreen();
            }
        }
        updateFullscreenState();
    }

    function handleAlternativeFullscreenKeydown(event) {
        if (event.key !== 'Escape' || !fullscreenSession) return;
        exitAlternativeFullscreen();
    }

    function handleAlternativeFullscreenNavigation() {
        if (fullscreenSession) exitAlternativeFullscreen(true);
    }

    function handleRouteChange() {
        if (fullscreenSession) exitAlternativeFullscreen(true);
        if (isWatchPage()) {
            createOverlay();
            mountAlternativeFullscreenButton();
        } else {
            removeAlternativeFullscreenButton();
            removeOverlay();
        }
    }

    window.addEventListener('yt-navigate-finish', handleRouteChange);
    window.addEventListener('fullscreenchange', handleAlternativeFullscreenEvent);
    document.addEventListener('fullscreenchange', handleAlternativeFullscreenEvent);
    document.addEventListener('keydown', handleAlternativeFullscreenKeydown, true);
    window.addEventListener('popstate', handleAlternativeFullscreenNavigation);
    window.addEventListener('resize', refreshTransientControls);
    new MutationObserver(() => {
        watchFloatingMenu();
        hideGenericFullscreenButton();
    }).observe(document.documentElement, { childList: true, subtree: true });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleRouteChange, { once: true });
    } else {
        handleRouteChange();
    }
})();
