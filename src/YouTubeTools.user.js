// ==UserScript==
// @name         YouTube Tools
// @namespace    http://tampermonkey.net/
// @version      2026-10-30_1.7.1
// @description  Keep opaque YouTube speed controls below the player, with a centered one-second fullscreen reveal and Edge-native fullscreen buttons hidden.
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
    const fullscreenStageClass = 'tm-yt-alternative-fullscreen-stage';
    const fullscreenActiveClass = 'tm-yt-alternative-fullscreen-active';
    let fullscreenButton = null;
    let fullscreenTarget = null;
    let fullscreenSession = null;
    let blockedGameButton = null;

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
            mountInlineToolbar();
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
        if (!overlay) return;
        const otherFullscreen = Boolean(document.fullscreenElement && !fullscreenSession);
        overlay.classList.toggle('tm-yt-speed-overlay--fullscreen', otherFullscreen);
        overlay.classList.toggle('tm-yt-toolbar--custom-fullscreen', Boolean(fullscreenSession));
        if (!fullscreenSession) overlay.classList.remove('tm-yt-toolbar--revealed');
        if (fullscreenButton) {
            const active = Boolean(document.fullscreenElement || fullscreenSession);
            fullscreenButton.hidden = active;
            fullscreenButton.setAttribute('aria-pressed', String(active));
        }
    }

    function getPlayerAnchor(video) {
        if (!video) return null;
        // Prefer the metadata element as the insertion point. Moving the
        // toolbar before the video changes its offset while the mobile native
        // control layer retains the old coordinates, so the gear overlaps.
        // Here the original video position stays untouched.
        const metadata = document.querySelector(
            'ytm-slim-video-metadata-section-renderer, ytm-watch-metadata, ' +
            'ytm-slim-video-information-renderer, ytd-watch-metadata'
        );
        if (metadata?.parentElement && !video.contains?.(metadata)) {
            return { element: metadata, before: true };
        }
        // If metadata is unavailable, place the row directly after the
        // outermost player-only host, never ahead of the video.
        const candidates = ['ytm-player', '#player-container-outer',
            '.player-container', '#player-container', '.html5-video-player'];
        for (const selector of candidates) {
            const node = video.closest?.(selector);
            if (node?.parentElement && node !== document.body) {
                return { element: node, before: false };
            }
        }
        const fallback = getYouTubePlayer();
        return fallback?.parentElement ? { element: fallback, before: false } : null;
    }

    function mountInlineToolbar() {
        if (!overlay || fullscreenSession || !isWatchPage()) return;
        const anchor = getPlayerAnchor(document.querySelector('video'));
        if (!anchor?.element?.parentElement) return;
        const host = anchor.element.parentElement;
        const following = anchor.before ? anchor.element : anchor.element.nextElementSibling;
        if (overlay.parentElement === host && overlay.nextElementSibling === following) return;
        host.insertBefore(overlay, following || null);
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
    top: 6px;
    right: 12px;
    width: 132px;
    max-width: calc(100vw - 70px);
    height: 62px;
    z-index: 2147483647;
    color: rgba(255, 255, 255, 0.6);
    font-family: "Roboto", "Arial", sans-serif;
    pointer-events: none;
    user-select: none;
    opacity: 1;
    transition: color 160ms ease, opacity 0s;
}

#${overlayId}.tm-yt-speed-overlay--android-edge {
    right: calc(50px + max(4px, env(safe-area-inset-right)));
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
    bottom: auto;
    width: 30px;
    height: 30px;
    padding: 0;
    border: none;
    border-radius: 5px;
    background: transparent;
    cursor: pointer;
    pointer-events: auto;
    touch-action: manipulation;
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
    inset: 0 0 auto;
    height: 30px;
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) 30px;
    align-items: center;
    pointer-events: none;
    text-shadow: 0 2px 5px rgba(0, 0, 0, 0.45);
    transition: text-shadow 160ms ease;
}

#${overlayId} .tm-yt-speed-overlay__icon {
    font-size: 17px;
    font-weight: 500;
    opacity: 0.55;
    padding: 0 5px;
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
    padding: 3px 5px;
    border-radius: 999px;
    font-size: 12px;
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
    top: 33px;
    display: flex;
    justify-content: center;
    gap: 3px;
}

#${overlayId} .tm-yt-speed-overlay__preset {
    border: none;
    border-radius: 999px;
    padding: 4px 6px;
    min-height: 25px;
    font-size: 11px;
    pointer-events: auto;
    touch-action: manipulation;
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
#tm-yt-alternative-fullscreen-button[hidden],
#tm-yt-alternative-fullscreen-button[aria-pressed="true"] {
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

/* Portrait viewport with a landscape source and no browser orientation lock. */
#tm-yt-alternative-fullscreen-root.tm-yt-alternative-fullscreen-rotated > .tm-yt-alternative-fullscreen-target {
    position: absolute !important;
    left: 100dvw !important;
    top: 0 !important;
    right: auto !important;
    bottom: auto !important;
    width: 100dvh !important;
    height: 100dvw !important;
    transform-origin: 0 0 !important;
    transform: rotate(90deg) !important;
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

/* In-flow controls: one row between the YouTube header and the player. */
#tm-yt-speed-overlay {
    all: revert;
    position: relative !important;
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 4px !important;
    box-sizing: border-box !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 52px !important;
    margin: 0 !important;
    padding: 4px 6px !important;
    border: 0 !important;
    border-radius: 0 !important;
    inset: auto !important;
    transform: none !important;
    opacity: 1 !important;
    background: #202020 !important;
    color: #f5f5f5 !important;
    z-index: 1 !important;
    font: 500 14px/1 Roboto, Arial, sans-serif !important;
    pointer-events: auto !important;
    user-select: none !important;
}

#tm-yt-speed-overlay.tm-yt-speed-overlay--fullscreen {
    display: none !important;
}

#tm-yt-speed-overlay .tm-yt-toolbar__controls {
    display: flex !important;
    flex: 1 1 auto !important;
    align-items: center !important;
    min-width: 0 !important;
    gap: 4px !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    scrollbar-width: none !important;
    touch-action: pan-x !important;
}
#tm-yt-speed-overlay .tm-yt-toolbar__controls::-webkit-scrollbar {
    display: none !important;
}

#tm-yt-speed-overlay button,
#tm-yt-speed-overlay .tm-yt-speed-overlay__preset {
    position: static !important;
    box-sizing: border-box !important;
    display: flex !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    justify-content: center !important;
    min-width: 43px !important;
    width: auto !important;
    height: 44px !important;
    min-height: 44px !important;
    margin: 0 !important;
    padding: 0 7px !important;
    border: none !important;
    border-radius: 7px !important;
    background: #3b3b3b !important;
    color: #f6f6f6 !important;
    font: 500 14px/1 Roboto, Arial, sans-serif !important;
    cursor: pointer !important;
    pointer-events: auto !important;
    touch-action: manipulation !important;
    text-decoration: none !important;
}
#tm-yt-speed-overlay button:active {
    background: #656565 !important;
}
#tm-yt-speed-overlay .tm-yt-speed-overlay__value {
    position: static !important;
    display: flex !important;
    flex: 0 0 47px !important;
    align-items: center !important;
    justify-content: center !important;
    min-height: 44px !important;
    padding: 0 !important;
    margin: 0 !important;
    color: #fff !important;
    background: transparent !important;
    font: 600 14px/1 Roboto, Arial, sans-serif !important;
}
#tm-yt-speed-overlay .tm-yt-speed-overlay__presets {
    position: static !important;
    display: flex !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    gap: 4px !important;
    inset: auto !important;
    margin: 0 !important;
    padding: 0 !important;
}
#tm-yt-speed-overlay .tm-yt-toolbar__fullscreen {
    position: static !important;
    flex: 0 0 44px !important;
    min-width: 44px !important;
    width: 44px !important;
    height: 44px !important;
    margin-left: auto !important;
    background: #505050 !important;
    font-size: 22px !important;
    z-index: auto !important;
}
#tm-yt-speed-overlay .tm-yt-toolbar__fullscreen[hidden],
#tm-yt-speed-overlay .tm-yt-toolbar__fullscreen[aria-pressed="true"] {
    display: none !important;
}

/* The fullscreen stage stacks the same toolbar above the unchanged player. */
#tm-yt-alternative-fullscreen-root > .tm-yt-alternative-fullscreen-stage {
    position: relative !important;
    display: flex !important;
    flex: 1 1 auto !important;
    flex-direction: column !important;
    box-sizing: border-box !important;
    width: 100% !important;
    height: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    background: #000 !important;
}

#tm-yt-alternative-fullscreen-root.tm-yt-alternative-fullscreen-rotated > .tm-yt-alternative-fullscreen-stage {
    position: absolute !important;
    left: 100dvw !important;
    top: 0 !important;
    right: auto !important;
    bottom: auto !important;
    width: 100dvh !important;
    height: 100dvw !important;
    transform-origin: 0 0 !important;
    transform: rotate(90deg) !important;
}

#tm-yt-alternative-fullscreen-root .tm-yt-alternative-fullscreen-target {
    position: relative !important;
    flex: 1 1 auto !important;
    inset: auto !important;
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    max-width: none !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
    background: #000 !important;
    overflow: hidden !important;
}


/* V1.5 normal layout: one compact speed stepper; no independent label cell. */
#tm-yt-speed-overlay {
    position: relative !important;
    display: flex !important;
    flex-flow: row nowrap !important;
    align-items: center !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    height: auto !important;
    min-height: 50px !important;
    margin: 0 !important;
    padding: 3px 5px !important;
    gap: 3px !important;
    inset: auto !important;
    transform: none !important;
    opacity: 1 !important;
    z-index: 1 !important;
    background: #202020 !important;
}
#tm-yt-speed-overlay .tm-yt-toolbar__controls {
    display: flex !important;
    align-items: center !important;
    flex: 1 1 auto !important;
    min-width: 0 !important;
    overflow: visible !important;
    gap: 3px !important;
}
#tm-yt-speed-overlay button {
    position: static !important;
    display: flex !important;
    flex: 0 0 auto !important;
    align-items: center !important;
    justify-content: center !important;
    box-sizing: border-box !important;
    height: 44px !important;
    min-height: 44px !important;
    min-width: 0 !important;
    width: auto !important;
    margin: 0 !important;
    padding: 0 3px !important;
    border: 0 !important;
    border-radius: 7px !important;
    font: 500 13px/1 Roboto, Arial, sans-serif !important;
    color: #fff !important;
    background: #3b3b3b !important;
    pointer-events: auto !important;
    touch-action: manipulation !important;
}
#tm-yt-speed-overlay button:active { background: #606060 !important; }
#tm-yt-speed-overlay .tm-yt-speed-overlay__stepper {
    position: relative !important;
    display: flex !important;
    flex: 0 0 88px !important;
    align-items: center !important;
    width: 88px !important;
    height: 44px !important;
    min-width: 0 !important;
    overflow: hidden !important;
    background: #343434 !important;
    border-radius: 7px !important;
}
#tm-yt-speed-overlay .tm-yt-speed-overlay__stepper button {
    flex: 0 0 50% !important;
    width: 50% !important;
    background: transparent !important;
    border-radius: 0 !important;
    font: 700 22px/1 Roboto, Arial, sans-serif !important;
}
#tm-yt-speed-overlay .tm-yt-speed-overlay__click--left {
    justify-content: flex-start !important;
    padding-left: 5px !important;
}
#tm-yt-speed-overlay .tm-yt-speed-overlay__click--right {
    justify-content: flex-end !important;
    padding-right: 5px !important;
}
#tm-yt-speed-overlay .tm-yt-speed-overlay__stepper button:active {
    background: rgba(255,255,255,.25) !important;
}
#tm-yt-speed-overlay .tm-yt-speed-overlay__value {
    position: absolute !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    left: 50% !important;
    top: 50% !important;
    width: 44px !important;
    height: 28px !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: translate(-50%, -50%) !important;
    border-radius: 5px !important;
    color: #fff !important;
    background: rgba(28,28,28,.93) !important;
    font: 600 12px/1 Roboto, Arial, sans-serif !important;
    white-space: nowrap !important;
    pointer-events: none !important;
    z-index: 2 !important;
}
#tm-yt-speed-overlay .tm-yt-speed-overlay__presets {
    position: static !important;
    display: flex !important;
    flex: 1 1 auto !important;
    min-width: 0 !important;
    align-items: center !important;
    gap: 3px !important;
    inset: auto !important;
    padding: 0 !important;
    margin: 0 !important;
}
#tm-yt-speed-overlay .tm-yt-speed-overlay__preset {
    flex: 1 1 0 !important;
    min-width: 0 !important;
    padding: 0 2px !important;
    font-size: 12px !important;
    white-space: nowrap !important;
}
#tm-yt-speed-overlay .tm-yt-toolbar__fullscreen {
    flex: 0 0 44px !important;
    width: 44px !important;
    min-width: 44px !important;
    height: 44px !important;
    margin-left: auto !important;
    background: #505050 !important;
    font-size: 22px !important;
}
#tm-yt-speed-overlay .tm-yt-toolbar__fullscreen[hidden],
#tm-yt-speed-overlay .tm-yt-toolbar__fullscreen[aria-pressed="true"] {
    display: none !important;
}
/* Fullscreen: player occupies 100%, speed buttons hover over the picture. */
#tm-yt-alternative-fullscreen-root .tm-yt-alternative-fullscreen-stage > .tm-yt-alternative-fullscreen-target {
    flex: 1 1 auto !important;
    height: 100% !important;
    min-height: 0 !important;
}
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen {
    position: absolute !important;
    display: flex !important;
    left: 12px !important;
    top: 56% !important;
    right: auto !important;
    bottom: auto !important;
    transform: translateY(-50%) !important;
    width: min(300px, calc(100% - 24px)) !important;
    max-width: calc(100% - 24px) !important;
    min-height: 0 !important;
    padding: 3px !important;
    border-radius: 8px !important;
    background: rgba(0,0,0,.24) !important;
    z-index: 2147483647 !important;
    opacity: .35 !important;
    transition: opacity .18s ease !important;
}
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen:hover,
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen:focus-within,
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen:active {
    opacity: .98 !important;
}
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen .tm-yt-toolbar__fullscreen {
    display: none !important;
}

/* The row follows the mobile player; its 50px height does not shift video. */
#tm-yt-speed-overlay:not(.tm-yt-toolbar--custom-fullscreen) {
    position: relative !important;
    margin: 0 !important;
    background: rgba(24,24,24,.78) !important;
    min-height: 50px !important;
    z-index: 1 !important;
}
#tm-yt-speed-overlay:not(.tm-yt-toolbar--custom-fullscreen) .tm-yt-toolbar__controls {
    overflow: visible !important;
}
/* Fullscreen uses the whole player host including YouTube native controls. */
#tm-yt-alternative-fullscreen-root .tm-yt-alternative-fullscreen-target .html5-video-player,
#tm-yt-alternative-fullscreen-root .tm-yt-alternative-fullscreen-target ytm-player,
#tm-yt-alternative-fullscreen-root .tm-yt-alternative-fullscreen-target .player-container {
    position: relative !important;
    width: 100% !important;
    height: 100% !important;
    max-width: none !important;
    max-height: none !important;
}
#tm-yt-alternative-fullscreen-root .ytp-chrome-bottom,
#tm-yt-alternative-fullscreen-root ytm-custom-control,
#tm-yt-alternative-fullscreen-root #player-controls {
    z-index: 10 !important;
}
/* Default: no visible speed buttons and no invisible tap blockers. */
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen {
    top: 12px !important;
    left: 12px !important;
    bottom: auto !important;
    transform: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
    transition: opacity .15s ease, visibility .15s ease !important;
}
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen * {
    pointer-events: none !important;
}
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen.tm-yt-toolbar--revealed {
    opacity: .95 !important;
    visibility: visible !important;
    pointer-events: auto !important;
}
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen.tm-yt-toolbar--revealed button {
    pointer-events: auto !important;
}
html.tm-yt-alternative-fullscreen-active #tm-fullscreen-game-view-button,
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen .tm-yt-toolbar__fullscreen {
    display: none !important;
}

/* Non-fullscreen watch page: the row is in normal flow and is opaque. */
#tm-yt-speed-overlay:not(.tm-yt-toolbar--custom-fullscreen) {
    background: #202020 !important;
}

/* The alternative fullscreen player uses real, separately sized step controls.
   Speed text is a normal center cell here, never laid over the arrow targets. */
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen {
    /* Center the entire expanded speed toolbar, clear of left-side mute. */
    left: 50% !important;
    right: auto !important;
    transform: translateX(-50%) !important;
    width: min(410px, calc(100% - 24px)) !important;
    background: rgba(0,0,0,.6) !important;
}
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen .tm-yt-toolbar__controls {
    gap: 5px !important;
}
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen .tm-yt-speed-overlay__stepper {
    display: flex !important;
    flex: 0 0 136px !important;
    width: 136px !important;
    height: 44px !important;
    gap: 0 !important;
    background: rgba(50,50,50,.9) !important;
}
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen .tm-yt-speed-overlay__stepper .tm-yt-speed-overlay__click {
    flex: 0 0 44px !important;
    width: 44px !important;
    height: 44px !important;
}
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen .tm-yt-speed-overlay__stepper .tm-yt-speed-overlay__click--left {
    order: 0 !important;
    justify-content: center !important;
}
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen .tm-yt-speed-overlay__stepper .tm-yt-speed-overlay__click--right {
    order: 2 !important;
    justify-content: center !important;
}
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen .tm-yt-speed-overlay__stepper .tm-yt-speed-overlay__value {
    position: static !important;
    order: 1 !important;
    transform: none !important;
    flex: 0 0 48px !important;
    width: 48px !important;
    height: 44px !important;
    border-radius: 0 !important;
    pointer-events: none !important;
}
#tm-yt-speed-overlay.tm-yt-toolbar--custom-fullscreen .tm-yt-speed-overlay__presets .tm-yt-speed-overlay__preset {
    min-width: 0 !important;
}

/* Keep YouTube's native play, volume, CC, gear and seek controls. Only hide
   its competing fullscreen/restore controls on Android Edge watch pages. */
html.tm-yt-edge-alt-fullscreen .ytp-fullscreen-button,
html.tm-yt-edge-alt-fullscreen ytm-player .fullscreen-button,
html.tm-yt-edge-alt-fullscreen ytm-player [class*="fullscreen-button"],
html.tm-yt-edge-alt-fullscreen ytm-player button[aria-label*="full screen" i],
html.tm-yt-edge-alt-fullscreen ytm-player button[aria-label*="fullscreen" i],
html.tm-yt-edge-alt-fullscreen ytm-player button[aria-label*="全螢幕"],
html.tm-yt-edge-alt-fullscreen ytm-player button[aria-label*="全屏"],
html.tm-yt-edge-alt-fullscreen ytm-player button:has(.fullscreen-icon),
html.tm-yt-edge-alt-fullscreen ytm-player button:has([class*="fullscreen-icon"]),
html.tm-yt-edge-alt-fullscreen ytm-player-controls button[aria-label*="full screen" i],
html.tm-yt-edge-alt-fullscreen ytm-custom-control button[aria-label*="full screen" i],
html.tm-yt-edge-alt-fullscreen ytm-custom-control button[aria-label*="fullscreen" i],
html.tm-yt-edge-alt-fullscreen ytm-custom-control [class*="fullscreen-button"],
html.tm-yt-edge-alt-fullscreen ytm-custom-control button:has(.fullscreen-icon),
html.tm-yt-edge-alt-fullscreen ytm-player [data-control="fullscreen"],
html.tm-yt-edge-alt-fullscreen ytm-player button[title*="full screen" i] {
    display: none !important;
}

`;
        document.head.appendChild(style);
    }

    function createOverlay() {
        if (overlay) return;
        injectStyles();
        overlay = document.createElement('div');
        overlay.id = overlayId;
        overlay.classList.add('tm-yt-inline-toolbar');
        overlay.setAttribute('role', 'group');
        overlay.setAttribute('aria-label', 'Playback speed controls');
        const controls = document.createElement('div');
        controls.className = 'tm-yt-toolbar__controls';
        const stepper = document.createElement('div');
        stepper.className = 'tm-yt-speed-overlay__stepper';

        function makeButton(text, label, className, action) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = className;
            button.textContent = text;
            button.setAttribute('aria-label', label);
            button.addEventListener('click', action);
            return button;
        }
        stepper.appendChild(makeButton('«', 'Decrease playback speed',
            'tm-yt-speed-overlay__click tm-yt-speed-overlay__click--left',
            () => setPlaybackRate(-1)));
        stepper.appendChild(makeButton('»', 'Increase playback speed',
            'tm-yt-speed-overlay__click tm-yt-speed-overlay__click--right',
            () => setPlaybackRate(1)));
        speedValue = document.createElement('span');
        speedValue.className = 'tm-yt-speed-overlay__value';
        speedValue.setAttribute('aria-label', 'Current playback speed');
        speedValue.setAttribute('aria-live', 'polite');
        stepper.appendChild(speedValue);
        controls.appendChild(stepper);
        const presets = document.createElement('div');
        presets.className = 'tm-yt-speed-overlay__presets';
        [0.5, 1, 1.5, 2].forEach((rate) => {
            presets.appendChild(makeButton(formatRate(rate),
                'Set playback speed to ' + formatRate(rate),
                'tm-yt-speed-overlay__preset', () => setAbsoluteRate(rate)));
        });
        controls.appendChild(presets);
        overlay.appendChild(controls);
        if (isAndroidEdge) {
            fullscreenButton = makeButton('⛶', 'Enter alternative fullscreen YouTube view',
                'tm-yt-toolbar__fullscreen', enterAlternativeFullscreen);
            fullscreenButton.id = fullscreenButtonId;
            fullscreenButton.title = 'Alternative fullscreen view';
            fullscreenButton.setAttribute('aria-pressed', 'false');
            overlay.appendChild(fullscreenButton);
        }
        mountInlineToolbar();
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
        fullscreenButton = null;
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

        // The mobile YouTube play/pause, CC, progress and settings elements can
        // live outside .html5-video-player. Moving just that element into our
        // fullscreen root loses the siblings. Find the smallest player-only
        // ancestor containing the native controls instead.
        const mobileHost = video.closest?.('ytm-player') ||
            video.closest?.('#player-container-outer') ||
            video.closest?.('.player-container') ||
            video.closest?.('#player-container');
        if (mobileHost?.parentElement && !mobileHost.querySelector?.(
            'ytm-slim-video-metadata-section-renderer, ytm-watch-metadata')) {
            return mobileHost;
        }
        const nativeControls = 'ytm-custom-control, #player-controls, ' +
            '.player-controls, .ytp-chrome-bottom, ytm-player-controls';
        const metadata = 'ytm-slim-video-metadata-section-renderer, ' +
            'ytm-watch-metadata, ytd-watch-metadata';
        let node = video.closest?.('.html5-video-player') || video.parentElement;
        let candidate = node;
        for (let depth = 0; node?.parentElement && depth < 7; depth++, node = node.parentElement) {
            if (node === document.body || node === document.documentElement ||
                node.matches?.('ytm-watch, ytm-watch-flexy, ytd-watch-flexy') ||
                node.querySelector?.(metadata)) break;
            if (node.matches?.('ytm-player, #player-container-outer, #player-container, .player-container')) {
                candidate = node;
            }
            if (node.querySelector?.(nativeControls)) {
                candidate = node;
                break;
            }
        }
        return candidate === document.body ? null : candidate;
    }

    function removeAlternativeFullscreenButton() {
        // The fullscreen button is a child of the in-flow toolbar.
        restoreGenericFullscreenButton();
        fullscreenButton = null;
        fullscreenTarget = null;
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
            try { document.exitFullscreen?.(); } catch (_error) { /* Already exiting. */ }
        }
        session.video?.removeEventListener('loadedmetadata', onAlternativeVideoMetadata);
        if (session.revealTimer != null) window.clearTimeout(session.revealTimer);
        overlay?.classList.remove('tm-yt-toolbar--revealed');
        if (session.orientationLocked) {
            try { window.screen?.orientation?.unlock?.(); } catch (_error) { /* Already unlocked. */ }
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
        if (overlay) {
            overlay.remove();
            if (session.barMarker.parentElement) {
                session.barMarker.parentElement.insertBefore(overlay, session.barMarker);
            } else if (session.barParent.isConnected) {
                session.barParent.appendChild(overlay);
            }
        }
        session.barMarker.remove();
        session.root.remove();
        if (fullscreenButton) {
            fullscreenButton.hidden = false;
            fullscreenButton.setAttribute('aria-pressed', 'false');
        }
        updateFullscreenState();
        restorePageScroll(session.scroll);
        if (session.historyAdded && !fromBack) window.history?.back?.();
    }

    function isLandscapeVideo(video) {
        return Boolean(video && video.videoWidth > 0 && video.videoHeight > 0 &&
            video.videoWidth > video.videoHeight);
    }

    function syncAlternativeOrientation() {
        const session = fullscreenSession;
        if (!session) return;
        const video = session.target.querySelector('video');
        // A portrait video retains the normal portrait display. Landscape
        // content rotates only while the actual viewport remains portrait.
        const rotate = isLandscapeVideo(video) && window.innerHeight > window.innerWidth;
        session.root.classList.toggle('tm-yt-alternative-fullscreen-rotated', rotate);
    }

    function tryLockLandscape(session) {
        if (fullscreenSession !== session || session.orientationRequested ||
            document.fullscreenElement !== session.root ||
            !isLandscapeVideo(session.video)) return;
        const orientation = window.screen?.orientation;
        if (typeof orientation?.lock !== 'function') return;
        session.orientationRequested = true;
        try {
            Promise.resolve(orientation.lock('landscape')).then(() => {
                if (fullscreenSession !== session) {
                    orientation.unlock?.();
                    return;
                }
                session.orientationLocked = true;
                syncAlternativeOrientation();
            }).catch(() => {
                // Browser denied the lock; keep CSS rotation as the fallback.
                if (fullscreenSession === session) syncAlternativeOrientation();
            });
        } catch (_error) {
            syncAlternativeOrientation();
        }
    }

    function onAlternativeVideoMetadata() {
        const session = fullscreenSession;
        if (!session) return;
        syncAlternativeOrientation();
        tryLockLandscape(session);
    }

    function onAlternativeViewportChange() {
        syncAlternativeOrientation();
    }

    function revealFullscreenSpeedControls() {
        const session = fullscreenSession;
        if (!session || !overlay) return;
        overlay.classList.add('tm-yt-toolbar--revealed');
        if (session.revealTimer != null) window.clearTimeout(session.revealTimer);
        session.revealTimer = window.setTimeout(() => {
            if (fullscreenSession === session) {
                overlay?.classList.remove('tm-yt-toolbar--revealed');
            }
            session.revealTimer = null;
        }, 1000);
    }

    function onFullscreenSurfacePress(event) {
        if (!fullscreenSession || !event) return;
        // Let YouTube receive exactly the same original gesture. This listener
        // only reveals our speed controls; it does not pause, seek or cancel it.
        if (overlay?.contains?.(event.target)) {
            revealFullscreenSpeedControls();
            return;
        }
        revealFullscreenSpeedControls();
    }

    function enterAlternativeFullscreen() {
        if (!isAndroidEdge || fullscreenSession || document.fullscreenElement || !overlay) return;
        const target = getYouTubePlayer();
        if (!target?.parentElement || !target.querySelector('video') || !overlay.parentElement) return;
        const parent = target.parentElement;
        const anchor = document.createElement('span');
        anchor.hidden = true;
        anchor.setAttribute('aria-hidden', 'true');
        parent.insertBefore(anchor, target);

        const barParent = overlay.parentElement;
        const barMarker = document.createElement('span');
        barMarker.hidden = true;
        barMarker.setAttribute('aria-hidden', 'true');
        barParent.insertBefore(barMarker, overlay);

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

        const stage = document.createElement('div');
        stage.className = fullscreenStageClass;
        overlay.remove();
        target.remove();
        stage.appendChild(overlay);
        stage.appendChild(target);
        root.appendChild(stage);
        document.body.appendChild(root);
        target.classList.add(fullscreenActiveClass);
        document.documentElement.classList.add(fullscreenActiveClass);
        root.addEventListener('pointerdown', onFullscreenSurfacePress, true);
        root.addEventListener('click', onFullscreenSurfacePress, true);
        const video = target.querySelector('video');
        fullscreenSession = { root, stage, target, parent, anchor, barParent, barMarker, scroll, video,
            historyAdded: false, nativeEntered: false, revealTimer: null,
            orientationRequested: false, orientationLocked: false };
        video.addEventListener('loadedmetadata', onAlternativeVideoMetadata);
        syncAlternativeOrientation();
        fullscreenButton.hidden = true;
        fullscreenButton.setAttribute('aria-pressed', 'true');
        updateFullscreenState();
        overlay.classList.remove('tm-yt-toolbar--revealed');
        try {
            window.history?.pushState?.({ tmYouTubeFullscreen: true }, '', window.location.href);
            fullscreenSession.historyAdded = Boolean(window.history?.pushState);
        } catch (_error) { /* The browser can still send popstate. */ }

        if (typeof root.requestFullscreen === 'function') {
            try {
                const session = fullscreenSession;
                const result = root.requestFullscreen({ navigationUI: 'hide' });
                result?.then?.(() => {
                    if (fullscreenSession !== session) return;
                    tryLockLandscape(session);
                    syncAlternativeOrientation();
                }).catch?.(() => {
                    if (fullscreenSession === session) syncAlternativeOrientation();
                });
                if (!result?.then && document.fullscreenElement === root) tryLockLandscape(session);
            } catch (_error) { /* CSS viewport-fill fallback is already active. */ }
        }
    }

    function handleAlternativeFullscreenEvent() {
        if (fullscreenSession) {
            if (document.fullscreenElement === fullscreenSession.root) {
                fullscreenSession.nativeEntered = true;
                tryLockLandscape(fullscreenSession);
                syncAlternativeOrientation();
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
            if (isAndroidEdge) document.documentElement.classList.add('tm-yt-edge-alt-fullscreen');
            createOverlay();
            mountInlineToolbar();
            hideGenericFullscreenButton();
        } else {
            document.documentElement.classList.remove('tm-yt-edge-alt-fullscreen');
            removeAlternativeFullscreenButton();
            removeOverlay();
        }
    }

    window.addEventListener('yt-navigate-finish', handleRouteChange);
    window.addEventListener('fullscreenchange', handleAlternativeFullscreenEvent);
    document.addEventListener('fullscreenchange', handleAlternativeFullscreenEvent);
    document.addEventListener('keydown', handleAlternativeFullscreenKeydown, true);
    window.addEventListener('popstate', handleAlternativeFullscreenNavigation);
    window.addEventListener('resize', onAlternativeViewportChange);
    window.addEventListener('orientationchange', onAlternativeViewportChange);
    window.screen?.orientation?.addEventListener?.('change', onAlternativeViewportChange);
    new MutationObserver(() => {
        if (overlay && !fullscreenSession) scheduleVideoCheck();
        hideGenericFullscreenButton();
    }).observe(document.documentElement, { childList: true, subtree: true });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleRouteChange, { once: true });
    } else {
        handleRouteChange();
    }
})();
