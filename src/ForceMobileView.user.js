// ==UserScript==
// @name         Force Mobile View
// @namespace    http://tampermonkey.net/
// @version      2026-01-04_1.3.8
// @description  Keep pages within the viewport width, wrap long content, and expose a draggable top-right ↔ toggle button with auto-enable for matched URLs.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceMobileView.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceMobileView.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.tampermonkey.net
// @match        https://news.ycombinator.com/item?*
// @match        https://archive.is/*
// @match        *://*/*
// @grant        GM_info
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const STYLE_ID = 'tm-force-width-style';
    const DEFAULT_MIN_FONT_SIZE_PX = 12;
    const PORTRAIT_MAX_CHARS = 20;
    const LANDSCAPE_MAX_CHARS = 40;
    const MIN_LINE_HEIGHT_RATIO = 1.4;
    const MIN_FONT_FLAG_ATTR = 'data-tm-force-width-min-font';
    const MIN_FONT_VALUE_ATTR = 'data-tm-force-width-font-value';
    const MIN_FONT_PRIORITY_ATTR = 'data-tm-force-width-font-priority';
    const MIN_LINE_HEIGHT_VALUE_ATTR = 'data-tm-force-width-line-height-value';
    const MIN_LINE_HEIGHT_PRIORITY_ATTR = 'data-tm-force-width-line-height-priority';
    let isEnabled = false;
    let styleObserver;
    let isObserving = false;
    let currentMinFontSizePx = null;
    let resizeTimer;

    function buildStyleContent() {
        return `:root, body {\n` +
            `    width: auto !important;\n` +
            `    max-width: 100vw !important;\n` +
            `    overflow-x: auto !important;\n` +
            `}\n` +
        `body {\n` +
            `    margin-left: auto !important;\n` +
            `    margin-right: auto !important;\n` +
            `    padding-left: 0 !important;\n` +
            `    padding-right: 0 !important;\n` +
            `}\n` +
            `body, body * {\n` +
            `    box-sizing: border-box !important;\n` +
            `}\n` +
            `@media (max-width: 768px), (pointer: coarse) {\n` +
            `    :root, body {\n` +
            `        font-size: 16px !important;\n` +
            `        -webkit-text-size-adjust: 100% !important;\n` +
            `        text-size-adjust: 100% !important;\n` +
            `    }\n` +
            `}\n` +
            `body * {\n` +
            `    max-width: 100% !important;\n` +
            `    min-width: 0 !important;\n` +
            `    word-break: break-word !important;\n` +
            `    overflow-wrap: anywhere !important;\n` +
            `}\n` +
            `img, video, canvas, svg, iframe {\n` +
            `    max-width: 100% !important;\n` +
            `    height: auto !important;\n` +
            `}\n` +
            `table {\n` +
            `    width: 100% !important;\n` +
            `    max-width: 100vw !important;\n` +
            `    table-layout: auto !important;\n` +
            `    border-collapse: collapse !important;\n` +
            `    border-spacing: 0 !important;\n` +
            `}\n` +
            `td, th {\n` +
            `    word-break: break-word !important;\n` +
            `    overflow-wrap: anywhere !important;\n` +
            `}\n` +
            `pre, code, kbd, samp {\n` +
            `    white-space: pre-wrap !important;\n` +
            `}\n` +
            `textarea, input, select {\n` +
            `    max-width: 100% !important;\n` +
            `    width: 100% !important;\n` +
            `    box-sizing: border-box !important;\n` +
            `}`;
    }

    function insertStyle() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.type = 'text/css';
        style.textContent = buildStyleContent();

        const target = document.head || document.documentElement;
        target.appendChild(style);
    }

    function removeStyle() {
        const style = document.getElementById(STYLE_ID);
        if (style && style.parentNode) {
            style.parentNode.removeChild(style);
        }
    }

    function ensureObserver() {
        if (!styleObserver) {
            styleObserver = new MutationObserver((mutations) => {
                if (isEnabled && !document.getElementById(STYLE_ID)) {
                    insertStyle();
                }
                if (isEnabled && shouldEnforceMinFontSize()) {
                    const minFontSizePx = getActiveMinFontSizePx();
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                applyMinimumFontSize(node, minFontSizePx);
                            }
                        });
                    });
                }
            });
        }
        if (!isObserving) {
            styleObserver.observe(document.documentElement, { childList: true, subtree: true });
            isObserving = true;
        }
    }

    function stopObserver() {
        if (styleObserver && isObserving) {
            styleObserver.disconnect();
            isObserving = false;
        }
    }

    function enableForceWidth() {
        if (isEnabled) {
            return;
        }
        isEnabled = true;
        insertStyle();
        ensureObserver();
        applyMinimumFontSizeIfNeeded();
    }

    function disableForceWidth() {
        if (!isEnabled) {
            return;
        }
        isEnabled = false;
        removeStyle();
        stopObserver();
        clearMinimumFontSize();
        currentMinFontSizePx = null;
    }

    function toggleForceWidth() {
        if (isEnabled) {
            disableForceWidth();
        } else {
            enableForceWidth();
        }
    }

    function onDocumentReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
        } else {
            callback();
        }
    }

    function shouldEnforceMinFontSize() {
        return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    }

    function getMaxCharsPerLine() {
        const isPortrait = window.matchMedia('(orientation: portrait)').matches || window.innerHeight >= window.innerWidth;
        return isPortrait ? PORTRAIT_MAX_CHARS : LANDSCAPE_MAX_CHARS;
    }

    function getContentWidthPx() {
        const widths = [];
        if (window.visualViewport && Number.isFinite(window.visualViewport.width)) {
            widths.push(window.visualViewport.width);
        }
        if (document.documentElement && Number.isFinite(document.documentElement.clientWidth)) {
            widths.push(document.documentElement.clientWidth);
        }
        if (Number.isFinite(window.innerWidth)) {
            widths.push(window.innerWidth);
        }
        const validWidths = widths.filter((width) => Number.isFinite(width) && width > 0);
        if (validWidths.length === 0) {
            return 0;
        }
        return Math.min(...validWidths);
    }

    function calculateMinimumFontSizePx() {
        const contentWidth = getContentWidthPx();
        if (!Number.isFinite(contentWidth) || contentWidth <= 0) {
            return DEFAULT_MIN_FONT_SIZE_PX;
        }
        const maxChars = getMaxCharsPerLine();
        return Math.max(1, Math.floor(contentWidth / maxChars));
    }

    function getActiveMinFontSizePx() {
        if (currentMinFontSizePx === null) {
            currentMinFontSizePx = calculateMinimumFontSizePx();
        }
        return currentMinFontSizePx;
    }

    function refreshMinimumFontSize() {
        if (!shouldEnforceMinFontSize()) {
            if (currentMinFontSizePx !== null) {
                clearMinimumFontSize();
                currentMinFontSizePx = null;
            }
            return;
        }
        const nextMinFontSizePx = calculateMinimumFontSizePx();
        if (currentMinFontSizePx === nextMinFontSizePx) {
            return;
        }
        if (currentMinFontSizePx !== null) {
            clearMinimumFontSize();
        }
        currentMinFontSizePx = nextMinFontSizePx;
        if (!document.body) {
            onDocumentReady(() => {
                applyMinimumFontSize(document.body, currentMinFontSizePx);
            });
            return;
        }
        applyMinimumFontSize(document.body, currentMinFontSizePx);
    }

    function scheduleMinimumFontRefresh() {
        if (!isEnabled) {
            return;
        }
        if (resizeTimer) {
            clearTimeout(resizeTimer);
        }
        resizeTimer = setTimeout(() => {
            resizeTimer = null;
            refreshMinimumFontSize();
        }, 150);
    }

    function getUserScriptMatches() {
        if (typeof GM_info !== 'undefined' && GM_info && GM_info.script && Array.isArray(GM_info.script.matches)) {
            return GM_info.script.matches;
        }
        return [];
    }

    function isCatchAllMatch(matchPattern) {
        return matchPattern === '*://*/*';
    }

    function matchPatternToRegExp(matchPattern) {
        const escapedPattern = matchPattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        const regexPattern = escapedPattern.replace(/\*/g, '.*');
        return new RegExp(`^${regexPattern}$`);
    }

    function shouldAutoEnableForUrl() {
        const matches = getUserScriptMatches().filter((matchPattern) => !isCatchAllMatch(matchPattern));
        if (matches.length === 0) {
            return false;
        }
        const currentUrl = window.location.href;
        return matches.some((matchPattern) => matchPatternToRegExp(matchPattern).test(currentUrl));
    }

    function applyMinimumFontSizeIfNeeded() {
        refreshMinimumFontSize();
    }

    function applyMinimumFontSize(root, minFontSizePx) {
        if (!root || !Number.isFinite(minFontSizePx)) {
            return;
        }
        const elements = [];
        if (root.nodeType === Node.ELEMENT_NODE) {
            elements.push(root);
        }
        elements.push(...root.querySelectorAll('*'));
        elements.forEach((element) => {
            if (element.hasAttribute(MIN_FONT_FLAG_ATTR)) {
                return;
            }
            const computedSize = Number.parseFloat(window.getComputedStyle(element).fontSize);
            if (!Number.isFinite(computedSize) || computedSize >= minFontSizePx) {
                return;
            }
            const inlineValue = element.style.getPropertyValue('font-size');
            const inlinePriority = element.style.getPropertyPriority('font-size');
            const lineHeightValue = element.style.getPropertyValue('line-height');
            const lineHeightPriority = element.style.getPropertyPriority('line-height');
            element.setAttribute(MIN_FONT_FLAG_ATTR, 'true');
            element.setAttribute(MIN_FONT_VALUE_ATTR, inlineValue);
            element.setAttribute(MIN_FONT_PRIORITY_ATTR, inlinePriority);
            element.setAttribute(MIN_LINE_HEIGHT_VALUE_ATTR, lineHeightValue);
            element.setAttribute(MIN_LINE_HEIGHT_PRIORITY_ATTR, lineHeightPriority);
            element.style.setProperty('font-size', `${minFontSizePx}px`, 'important');
            element.style.setProperty('line-height', String(MIN_LINE_HEIGHT_RATIO), 'important');
        });
    }

    function clearMinimumFontSize() {
        const elements = document.querySelectorAll(`[${MIN_FONT_FLAG_ATTR}="true"]`);
        elements.forEach((element) => {
            const inlineValue = element.getAttribute(MIN_FONT_VALUE_ATTR) || '';
            const inlinePriority = element.getAttribute(MIN_FONT_PRIORITY_ATTR) || '';
            const lineHeightValue = element.getAttribute(MIN_LINE_HEIGHT_VALUE_ATTR) || '';
            const lineHeightPriority = element.getAttribute(MIN_LINE_HEIGHT_PRIORITY_ATTR) || '';
            if (inlineValue) {
                element.style.setProperty('font-size', inlineValue, inlinePriority);
            } else {
                element.style.removeProperty('font-size');
            }
            if (lineHeightValue) {
                element.style.setProperty('line-height', lineHeightValue, lineHeightPriority);
            } else {
                element.style.removeProperty('line-height');
            }
            element.removeAttribute(MIN_FONT_FLAG_ATTR);
            element.removeAttribute(MIN_FONT_VALUE_ATTR);
            element.removeAttribute(MIN_FONT_PRIORITY_ATTR);
            element.removeAttribute(MIN_LINE_HEIGHT_VALUE_ATTR);
            element.removeAttribute(MIN_LINE_HEIGHT_PRIORITY_ATTR);
        });
    }

    function createFloatingToggleButton() {
        if (!document.body) {
            return;
        }

        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.textContent = '↔';
        toggleButton.title = 'Toggle Force Mobile View';
        toggleButton.style.cssText = `
            position: absolute;
            z-index: 2147483647;
            padding: 6px 10px;
            background-color: rgba(0, 0, 0, 0.55);
            color: #f0f0f0;
            border: none;
            border-radius: 6px;
            cursor: move;
            font-size: 15px;
            user-select: none;
            touch-action: none;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
        `;
        document.body.appendChild(toggleButton);

        toggleButton.style.top = '104px';
        toggleButton.style.right = '0px';
        toggleButton.style.left = 'auto';
        toggleButton.style.bottom = 'auto';

        const dragThreshold = 3;
        let isDragging = false;
        let hasMoved = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let startClientX;
        let startClientY;
        let hasSwitchedToLeft = false;

        function updateButtonAppearance() {
            if (isEnabled) {
                toggleButton.style.backgroundColor = 'rgba(34, 139, 34, 0.85)';
                toggleButton.style.color = '#ffffff';
                toggleButton.setAttribute('aria-pressed', 'true');
                toggleButton.title = 'Force Mobile View is ON (click to disable)';
            } else {
                toggleButton.style.backgroundColor = 'rgba(0, 0, 0, 0.55)';
                toggleButton.style.color = '#f0f0f0';
                toggleButton.setAttribute('aria-pressed', 'false');
                toggleButton.title = 'Force Mobile View is OFF (click to enable)';
            }
        }

        function dragStart(e) {
            if (e.target !== toggleButton) {
                return;
            }

            isDragging = true;
            hasMoved = false;

            if (e.type === 'touchstart') {
                startClientX = e.touches[0].clientX;
                startClientY = e.touches[0].clientY;
                initialX = startClientX - toggleButton.offsetLeft;
                initialY = startClientY - toggleButton.offsetTop;
            } else {
                startClientX = e.clientX;
                startClientY = e.clientY;
                initialX = startClientX - toggleButton.offsetLeft;
                initialY = startClientY - toggleButton.offsetTop;
            }
            hasSwitchedToLeft = false;
        }

        function drag(e) {
            if (!isDragging) {
                return;
            }
            if (e.type === 'touchmove') {
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
            } else {
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
            }

            const deltaX = Math.abs((e.type === 'touchmove' ? e.touches[0].clientX : e.clientX) - startClientX);
            const deltaY = Math.abs((e.type === 'touchmove' ? e.touches[0].clientY : e.clientY) - startClientY);
            if (!hasMoved && deltaX < dragThreshold && deltaY < dragThreshold) {
                return;
            }

            if (!hasMoved) {
                hasMoved = true;
            }
            if (!hasSwitchedToLeft) {
                toggleButton.style.right = 'auto';
                toggleButton.style.bottom = 'auto';
                hasSwitchedToLeft = true;
            }
            e.preventDefault();

            const maxX = Math.max(document.documentElement.clientWidth, window.innerWidth) - toggleButton.offsetWidth;
            const maxY = Math.max(document.documentElement.clientHeight, window.innerHeight) - toggleButton.offsetHeight;

            currentX = Math.min(Math.max(currentX, 0), maxX);
            currentY = Math.min(Math.max(currentY, 0), maxY);

            toggleButton.style.left = `${currentX}px`;
            toggleButton.style.top = `${currentY}px`;
        }

        function dragEnd() {
            isDragging = false;
        }

        toggleButton.addEventListener('mousedown', dragStart);
        toggleButton.addEventListener('touchstart', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchend', dragEnd);

        toggleButton.addEventListener('click', (event) => {
            if (hasMoved) {
                hasMoved = false;
                return;
            }
            event.preventDefault();
            toggleForceWidth();
            updateButtonAppearance();
        });

        updateButtonAppearance();
    }

    if (shouldAutoEnableForUrl()) {
        enableForceWidth();
    }

    window.addEventListener('resize', scheduleMinimumFontRefresh);
    window.addEventListener('orientationchange', scheduleMinimumFontRefresh);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', scheduleMinimumFontRefresh);
    }

    onDocumentReady(createFloatingToggleButton);
})();
