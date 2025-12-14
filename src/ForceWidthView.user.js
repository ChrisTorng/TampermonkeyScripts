// ==UserScript==
// @name         Force Width View
// @namespace    http://tampermonkey.net/
// @version      2025-12-14_1.0.0
// @description  Keep every page within the viewport width to prevent horizontal scrolling, improving readability on phones and small screens.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceWidthView.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceWidthView.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.tampermonkey.net
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const STYLE_ID = 'tm-force-width-view-style';
    let scheduled = false;

    function ensureBaseStyle() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            :root, body {
                max-width: 100vw !important;
                overflow-x: clip !important;
            }

            body {
                width: auto !important;
                margin-left: auto !important;
                margin-right: auto !important;
                padding-left: env(safe-area-inset-left, 0px);
                padding-right: env(safe-area-inset-right, 0px);
            }

            *, *::before, *::after {
                box-sizing: border-box;
            }

            img, video, canvas, svg, iframe, object {
                max-width: 100% !important;
                height: auto;
            }

            table {
                display: block;
                max-width: 100% !important;
                overflow-x: auto;
            }

            pre, code, textarea {
                white-space: pre-wrap;
                word-break: break-word;
            }
        `;

        document.head.appendChild(style);
    }

    function getViewportWidth() {
        const visualViewport = window.visualViewport;
        if (visualViewport) {
            return Math.max(1, Math.round(visualViewport.width));
        }
        return Math.max(1, Math.round(window.innerWidth || document.documentElement.clientWidth || 0));
    }

    function clampOversizedElements(viewportWidth) {
        const elements = document.body ? document.body.getElementsByTagName('*') : [];
        for (const element of elements) {
            if (!(element instanceof HTMLElement)) {
                continue;
            }
            const scrollWidth = element.scrollWidth;
            if (scrollWidth <= viewportWidth + 2) {
                continue;
            }

            element.style.maxWidth = '100%';
            if (element.tagName !== 'TABLE') {
                element.style.width = '100%';
            }
            if (!element.style.overflowX) {
                element.style.overflowX = 'auto';
            }
            if (!element.style.wordBreak) {
                element.style.wordBreak = 'break-word';
            }
            if (element.tagName === 'PRE' && element.style.whiteSpace !== 'pre-wrap') {
                element.style.whiteSpace = 'pre-wrap';
            }
        }
    }

    function applyFixes() {
        ensureBaseStyle();
        const viewportWidth = getViewportWidth();
        clampOversizedElements(viewportWidth);
    }

    function scheduleFixes() {
        if (scheduled) {
            return;
        }
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            applyFixes();
        });
    }

    function init() {
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', init, { once: true });
            return;
        }

        applyFixes();

        window.addEventListener('resize', scheduleFixes, { passive: true });
        window.addEventListener('orientationchange', scheduleFixes, { passive: true });

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', scheduleFixes, { passive: true });
            window.visualViewport.addEventListener('scroll', scheduleFixes, { passive: true });
        }

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    scheduleFixes();
                    break;
                }
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    init();
})();
