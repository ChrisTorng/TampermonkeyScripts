// ==UserScript==
// @name         YouTube Tools
// @namespace    http://tampermonkey.net/
// @version      2025-12-28_1.0.4
// @description  Show a top-right YouTube tools overlay with « » speed controls and the current playback rate on watch pages.
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
        const isFullscreen = Boolean(document.fullscreenElement);
        overlay.classList.toggle('tm-yt-speed-overlay--fullscreen', isFullscreen);
        const host = document.fullscreenElement || document.body;
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
    width: clamp(96px, 22vw, 120px);
    height: 40px;
    z-index: 2147483647;
    color: rgba(255, 255, 255, 0.6);
    font-family: "Roboto", "Arial", sans-serif;
    pointer-events: auto;
    user-select: none;
    transition: color 160ms ease;
}

#${overlayId}.tm-yt-speed-overlay--fullscreen {
    position: absolute;
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

        overlay.appendChild(leftButton);
        overlay.appendChild(rightButton);
        overlay.appendChild(label);

        const host = document.fullscreenElement || document.body;
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

    function handleRouteChange() {
        if (isWatchPage()) {
            createOverlay();
        } else {
            removeOverlay();
        }
    }

    window.addEventListener('yt-navigate-finish', handleRouteChange);
    window.addEventListener('fullscreenchange', updateFullscreenState);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleRouteChange, { once: true });
    } else {
        handleRouteChange();
    }
})();
