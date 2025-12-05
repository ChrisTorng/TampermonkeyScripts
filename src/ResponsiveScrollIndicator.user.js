// ==UserScript==
// @name         Responsive Scroll Position Indicator
// @namespace    http://tampermonkey.net/
// @version      2025-12-05_1.3.4
// @description  Display a fixed vertical indicator at the right of every page that highlights current vertical scroll position and viewport height with a minimum visible height, optimized for touch-friendly layouts.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ResponsiveScrollIndicator.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ResponsiveScrollIndicator.user.js
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const STYLE_ID = 'tm-scroll-indicator-style';
    const BAR_CONTAINER_ID = 'tm-scroll-indicator';
    const BAR_WIDTH = 3;
    const MIN_VIEWPORT_HEIGHT_PX = 12;
    const UPDATE_INTERVAL_MS = 100;

    let styleElement = null;
    let containerElement = null;
    let trackElement = null;
    let viewportElement = null;
    let rafToken = null;
    let scheduled = false;
    let viewportTop = 0;
    let viewportLeft = 0;
    let viewportHeight = 0;
    let viewportWidth = 0;
    let viewportScale = 1;

    function ensureStyle() {
        if (styleElement && styleElement.isConnected) {
            return;
        }

        styleElement = document.createElement('style');
        styleElement.id = STYLE_ID;
        styleElement.textContent = `
            #${BAR_CONTAINER_ID} {
                position: fixed !important;
                top: var(--tm-scroll-indicator-top, 0px);
                left: var(--tm-scroll-indicator-right-edge, 100%);
                right: auto;
                bottom: auto;
                width: auto;
                height: var(--tm-scroll-indicator-height, 100%);
                z-index: 2147483647;
                padding: calc(8px + env(safe-area-inset-top, 0px)) calc(env(safe-area-inset-right, 0px) + 1px) calc(8px + env(safe-area-inset-bottom, 0px)) 0;
                box-sizing: border-box;
                pointer-events: none !important;
                mix-blend-mode: normal;
                transform: translateX(-100%);
                will-change: transform;
                backface-visibility: hidden;
            }

            #${BAR_CONTAINER_ID} .tm-track {
                position: relative;
                height: 100%;
                width: calc(${BAR_WIDTH}px / var(--tm-scroll-scale, 1));
                border-radius: calc(${BAR_WIDTH / 2}px / var(--tm-scroll-scale, 1));
                overflow: hidden;
            }

            #${BAR_CONTAINER_ID} .tm-viewport {
                position: absolute;
                left: calc(1px / var(--tm-scroll-scale, 1));
                width: calc(${BAR_WIDTH - 2}px / var(--tm-scroll-scale, 1));
                height: ${MIN_VIEWPORT_HEIGHT_PX}px;
                background: linear-gradient(180deg, rgba(255, 193, 7, 0.82), rgba(255, 160, 0, 0.9));
                border-radius: calc(${(BAR_WIDTH - 2) / 2}px / var(--tm-scroll-scale, 1));
                box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
            }
        `;

        document.head.appendChild(styleElement);
    }

    function createBar() {
        if (containerElement && containerElement.isConnected) {
            return;
        }

        containerElement = document.createElement('div');
        containerElement.id = BAR_CONTAINER_ID;

        trackElement = document.createElement('div');
        trackElement.className = 'tm-track';

        viewportElement = document.createElement('div');
        viewportElement.className = 'tm-viewport';

        trackElement.appendChild(viewportElement);
        containerElement.appendChild(trackElement);

        document.body.appendChild(containerElement);

        refreshViewportMetrics();
    }

    function refreshViewportMetrics() {
        if (!containerElement) {
            return;
        }

        const visualViewport = window.visualViewport;
        const offsetTop = visualViewport ? Math.max(0, Math.round(visualViewport.offsetTop)) : 0;
        const offsetLeft = visualViewport ? Math.round(visualViewport.offsetLeft) : 0;
        const height = visualViewport
            ? Math.max(1, Math.round(visualViewport.height))
            : Math.max(1, Math.round(window.innerHeight || document.documentElement.clientHeight || 0));
        const width = visualViewport
            ? Math.max(1, Math.round(visualViewport.width))
            : Math.max(1, Math.round(window.innerWidth || document.documentElement.clientWidth || 0));
        const scale = visualViewport ? visualViewport.scale : 1;

        if (offsetTop === viewportTop && offsetLeft === viewportLeft && height === viewportHeight && width === viewportWidth && scale === viewportScale) {
            return;
        }

        viewportTop = offsetTop;
        viewportLeft = offsetLeft;
        viewportHeight = height;
        viewportWidth = width;
        viewportScale = scale;
        
        containerElement.style.setProperty('--tm-scroll-indicator-top', `${viewportTop}px`);
        containerElement.style.setProperty('--tm-scroll-indicator-height', `${viewportHeight}px`);
        containerElement.style.setProperty('--tm-scroll-indicator-right-edge', `${viewportLeft + viewportWidth}px`);
        containerElement.style.setProperty('--tm-scroll-scale', `${viewportScale}`);
    }

    function scheduleUpdate(forceImmediate = false) {
        if (scheduled && !forceImmediate) {
            return;
        }

        scheduled = true;
        if (rafToken) {
            cancelAnimationFrame(rafToken);
        }

        rafToken = requestAnimationFrame(() => {
            scheduled = false;
            updateBar();
        });
    }

    function updateBar() {
        if (!trackElement || !viewportElement) {
            return;
        }

        refreshViewportMetrics();

        const scroller = document.scrollingElement || document.documentElement;
        const trackHeight = trackElement.clientHeight;
        if (!trackHeight) {
            return;
        }
        const visualViewport = window.visualViewport;
        const viewportHeight = visualViewport
            ? Math.max(1, Math.round(visualViewport.height))
            : window.innerHeight;
        const fullHeight = Math.max(scroller.scrollHeight, scroller.clientHeight, viewportHeight, 1);
        const maxScrollTop = Math.max(0, fullHeight - viewportHeight);
        const scrollRatio = maxScrollTop > 0 ? scroller.scrollTop / maxScrollTop : 0;
        const viewportRatio = fullHeight > 0 ? viewportHeight / fullHeight : 1;

        const scale = viewportScale;
        let rawHeight = Math.min(trackHeight, Math.round(viewportRatio * trackHeight));
        
        const viewportHeightPx = Math.max(
            MIN_VIEWPORT_HEIGHT_PX / scale,
            rawHeight
        );

        const availableSpace = Math.max(0, trackHeight - viewportHeightPx);
        const viewportTop = Math.min(availableSpace, Math.round(scrollRatio * availableSpace));

        viewportElement.style.height = `${viewportHeightPx}px`;
        viewportElement.style.transform = `translateY(${viewportTop}px)`;
    }

    function handleVisualViewportChange() {
        refreshViewportMetrics();
        scheduleUpdate();
    }

    function addListeners() {
        window.addEventListener('resize', scheduleUpdate, { passive: true });
        window.addEventListener('orientationchange', scheduleUpdate, { passive: true });
        document.addEventListener('scroll', scheduleUpdate, { passive: true });

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleVisualViewportChange, { passive: true });
            window.visualViewport.addEventListener('scroll', handleVisualViewportChange, { passive: true });
        }
    }

    function initWhenReady() {
        ensureStyle();
        createBar();
        scheduleUpdate(true);
        addListeners();

        setInterval(() => scheduleUpdate(), UPDATE_INTERVAL_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWhenReady, { once: true });
    } else {
        initWhenReady();
    }
})();
