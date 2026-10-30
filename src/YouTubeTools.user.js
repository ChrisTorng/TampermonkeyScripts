// ==UserScript==
// @name         YouTube Tools
// @namespace    http://tampermonkey.net/
// @version      2026-10-30_1.4.0
// @description  Insert a touch-friendly YouTube speed toolbar above the video, with Android Edge alternative landscape fullscreen.
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
        if (fullscreenButton) {
            const active = Boolean(document.fullscreenElement || fullscreenSession);
            fullscreenButton.hidden = active;
            fullscreenButton.setAttribute('aria-pressed', String(active));
        }
    }

    function getPlayerAnchor(video) {
        if (!video) return null;
        for (const selector of ['ytm-player', '#player-container-outer',
            '#player-container', '#player', '.html5-video-player']) {
            const anchor = video.closest?.(selector);
            if (anchor?.parentElement && anchor !== document.body) return anchor;
        }
        const fallback = getYouTubePlayer();
        return fallback?.parentElement ? fallback : null;
    }

    function mountInlineToolbar() {
        if (!overlay || fullscreenSession || !isWatchPage()) return;
        const anchor = getPlayerAnchor(document.querySelector('video'));
        if (!anchor?.parentElement) return;
        if (overlay.parentElement === anchor.parentElement &&
            overlay.nextElementSibling === anchor) return;
        anchor.parentElement.insertBefore(overlay, anchor);
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
        overlay.classList.add('tm-yt-inline-toolbar');
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

        [0.5, 1, 1.5, 2].forEach((rate) => {
            const preset = document.createElement('button');
            preset.type = 'button';
            preset.className = 'tm-yt-speed-overlay__preset';
            preset.textContent = formatRate(rate);
            preset.setAttribute('aria-label', `Set playback speed to ${formatRate(rate)}`);
            preset.addEventListener('click', () => setAbsoluteRate(rate));
            presets.appendChild(preset);
        });

        const controls = document.createElement('div');
        controls.className = 'tm-yt-toolbar__controls';
        controls.appendChild(leftButton);
        controls.appendChild(speedValue);
        controls.appendChild(rightButton);
        controls.appendChild(presets);
        overlay.appendChild(controls);
        if (isAndroidEdge) {
            fullscreenButton = document.createElement('button');
            fullscreenButton.id = fullscreenButtonId;
            fullscreenButton.className = 'tm-yt-toolbar__fullscreen';
            fullscreenButton.type = 'button';
            fullscreenButton.textContent = '⛶';
            fullscreenButton.title = 'Alternative fullscreen view';
            fullscreenButton.setAttribute('aria-label', 'Enter alternative fullscreen YouTube view');
            fullscreenButton.setAttribute('aria-pressed', 'false');
            fullscreenButton.addEventListener('click', enterAlternativeFullscreen);
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
        const player = video.closest?.('.html5-video-player') ||
            video.closest?.('#movie_player') || video.parentElement;
        return player === document.body ? null : player;
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
        const video = target.querySelector('video');
        fullscreenSession = { root, stage, target, parent, anchor, barParent, barMarker, scroll, video,
            historyAdded: false, nativeEntered: false,
            orientationRequested: false, orientationLocked: false };
        video.addEventListener('loadedmetadata', onAlternativeVideoMetadata);
        syncAlternativeOrientation();
        fullscreenButton.hidden = true;
        fullscreenButton.setAttribute('aria-pressed', 'true');
        updateFullscreenState();
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
            createOverlay();
            mountInlineToolbar();
            hideGenericFullscreenButton();
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
