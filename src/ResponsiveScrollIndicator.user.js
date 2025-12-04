// ==UserScript==
// @name         Responsive Scroll Position Indicator
// @namespace    http://tampermonkey.net/
// @version      2025-12-04_1.2.0
// @description  Display a fixed horizontal indicator at the top of every page that highlights current vertical scroll position and visible height with a minimum visible width, optimized for touch-friendly layouts.
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
    const BAR_HEIGHT = 6;
    const MIN_VIEWPORT_WIDTH_PX = 24;
    const UPDATE_INTERVAL_MS = 80;

    let styleElement = null;
    let containerElement = null;
    let trackElement = null;
    let progressElement = null;
    let viewportElement = null;
    let rafToken = null;
    let scheduled = false;

    function ensureStyle() {
        if (styleElement && styleElement.isConnected) {
            return;
        }

        styleElement = document.createElement('style');
        styleElement.id = STYLE_ID;
        styleElement.textContent = `
            #${BAR_CONTAINER_ID} {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 2147483647;
                padding: env(safe-area-inset-top, 0px) calc(8px + env(safe-area-inset-right, 0px)) 0 calc(8px + env(safe-area-inset-left, 0px));
                box-sizing: border-box;
                pointer-events: none;
            }

            #${BAR_CONTAINER_ID} .tm-track {
                position: relative;
                width: 100%;
                height: ${BAR_HEIGHT}px;
                background: rgba(0, 0, 0, 0.22);
                border-radius: ${BAR_HEIGHT / 2}px;
                overflow: hidden;
                box-shadow: 0 0 2px rgba(0, 0, 0, 0.15);
            }

            #${BAR_CONTAINER_ID} .tm-progress {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: 0;
                background: linear-gradient(90deg, rgba(0, 122, 255, 0.38), rgba(0, 122, 255, 0.55));
            }

            #${BAR_CONTAINER_ID} .tm-viewport {
                position: absolute;
                top: 1px;
                height: ${BAR_HEIGHT - 2}px;
                width: ${MIN_VIEWPORT_WIDTH_PX}px;
                background: linear-gradient(90deg, rgba(255, 193, 7, 0.86), rgba(255, 160, 0, 0.92));
                border-radius: ${(BAR_HEIGHT - 2) / 2}px;
                box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
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

        progressElement = document.createElement('div');
        progressElement.className = 'tm-progress';

        viewportElement = document.createElement('div');
        viewportElement.className = 'tm-viewport';

        trackElement.appendChild(progressElement);
        trackElement.appendChild(viewportElement);
        containerElement.appendChild(trackElement);

        document.body.appendChild(containerElement);
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
        if (!trackElement || !viewportElement || !progressElement) {
            return;
        }

        const docEl = document.documentElement;
        const body = document.body;
        const trackWidth = trackElement.clientWidth;
        const fullHeight = Math.max(docEl.scrollHeight, body ? body.scrollHeight : 0, docEl.clientHeight);
        const maxScrollTop = Math.max(0, fullHeight - window.innerHeight);
        const currentScrollTop = window.pageYOffset || docEl.scrollTop || (body ? body.scrollTop : 0);
        const scrollRatio = maxScrollTop > 0 ? currentScrollTop / maxScrollTop : 0;
        const viewportRatio = fullHeight > 0 ? window.innerHeight / fullHeight : 1;
        const viewportWidthPx = Math.max(MIN_VIEWPORT_WIDTH_PX, Math.min(trackWidth, Math.round(viewportRatio * trackWidth)));
        const availableSpace = Math.max(0, trackWidth - viewportWidthPx);
        const viewportLeft = Math.min(availableSpace, Math.round(scrollRatio * availableSpace));

        progressElement.style.width = `${viewportLeft}px`;
        viewportElement.style.width = `${viewportWidthPx}px`;
        viewportElement.style.transform = `translateX(${viewportLeft}px)`;
    }

    function addListeners() {
        window.addEventListener('resize', scheduleUpdate, { passive: true });
        window.addEventListener('orientationchange', scheduleUpdate, { passive: true });
        document.addEventListener('scroll', scheduleUpdate, { passive: true });
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
