// ==UserScript==
// @name         Responsive Scroll Position Indicator
// @namespace    http://tampermonkey.net/
// @version      2026-01-04_1.3.10
// @description  Show thin, fixed vertical markers that track scroll position for every scrollable area on the page.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ResponsiveScrollIndicator.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ResponsiveScrollIndicator.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.tampermonkey.net
// @match        *://*/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const STYLE_ID = 'tm-scroll-indicator-style';
    const ROOT_BAR_ID = 'tm-scroll-indicator-root';
    const INDICATOR_CLASS = 'tm-scroll-indicator';
    const TRACK_CLASS = 'tm-track';
    const VIEWPORT_CLASS = 'tm-viewport';
    const BAR_WIDTH = 6;
    const MIN_VIEWPORT_HEIGHT_PX = 12;
    const UPDATE_INTERVAL_MS = 100;
    const SCAN_INTERVAL_MS = 1000;
    const VISIBILITY_RATIO_THRESHOLD = 0.95;
    const SCROLLABLE_OVERFLOW_VALUES = new Set(['auto', 'scroll', 'overlay']);

    let styleElement = null;
    let constructedStyleSheet = null;
    let styleReady = false;
    let rootIndicator = null;
    let rafToken = null;
    let scheduled = false;
    let viewportTop = 0;
    let viewportLeft = 0;
    let viewportHeight = 0;
    let viewportWidth = 0;
    let viewportScale = 1;
    let lastScanTime = 0;
    let pendingScan = false;

    const elementIndicators = new Map();

    function ensureStyle() {
        if (styleReady) {
            return;
        }

        const styleText = `
            .${INDICATOR_CLASS} {
                position: fixed !important;
                top: 0;
                left: 100%;
                right: auto;
                bottom: auto;
                width: auto;
                height: 100%;
                z-index: 2147483647;
                padding: 8px 1px 8px 0;
                box-sizing: border-box;
                pointer-events: none !important;
                mix-blend-mode: normal;
                transform: translateX(-100%);
                will-change: transform, top, left, height;
                backface-visibility: hidden;
            }

            .${INDICATOR_CLASS}.tm-root {
                padding: calc(8px + env(safe-area-inset-top, 0px)) calc(env(safe-area-inset-right, 0px) + 1px) calc(8px + env(safe-area-inset-bottom, 0px)) 0;
            }

            .${INDICATOR_CLASS} .${TRACK_CLASS} {
                position: relative;
                height: 100%;
                width: calc(${BAR_WIDTH}px / var(--tm-scroll-scale, 1));
                border-radius: calc(${BAR_WIDTH / 2}px / var(--tm-scroll-scale, 1));
                overflow: hidden;
            }

            .${INDICATOR_CLASS} .${VIEWPORT_CLASS} {
                position: absolute;
                left: calc(1px / var(--tm-scroll-scale, 1));
                width: calc(${BAR_WIDTH - 2}px / var(--tm-scroll-scale, 1));
                height: ${MIN_VIEWPORT_HEIGHT_PX}px;
                background: linear-gradient(180deg, rgba(255, 193, 7, 0.82), rgba(255, 160, 0, 0.9));
                border-radius: calc(${(BAR_WIDTH - 2) / 2}px / var(--tm-scroll-scale, 1));
                box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
            }
        `;

        if (typeof GM_addStyle === 'function') {
            GM_addStyle(styleText);
            styleReady = true;
            return;
        }

        if (typeof CSSStyleSheet !== 'undefined'
            && 'adoptedStyleSheets' in document
            && 'replaceSync' in CSSStyleSheet.prototype) {
            try {
                constructedStyleSheet = new CSSStyleSheet();
                constructedStyleSheet.replaceSync(styleText);
                document.adoptedStyleSheets = [...document.adoptedStyleSheets, constructedStyleSheet];
                styleReady = true;
                return;
            } catch (error) {
                constructedStyleSheet = null;
            }
        }

        if (styleElement && styleElement.isConnected) {
            styleReady = true;
            return;
        }

        styleElement = document.getElementById(STYLE_ID);
        if (styleElement) {
            styleReady = true;
            return;
        }

        styleElement = document.createElement('style');
        styleElement.id = STYLE_ID;
        styleElement.textContent = styleText;
        document.head.appendChild(styleElement);
        styleReady = true;
    }

    function createIndicatorElement(id, isRoot) {
        if (!document.body) {
            return null;
        }

        const container = document.createElement('div');
        container.className = INDICATOR_CLASS;
        if (isRoot) {
            container.classList.add('tm-root');
        }
        if (id) {
            container.id = id;
        }
        container.dataset.tmScrollIndicator = 'true';

        const track = document.createElement('div');
        track.className = TRACK_CLASS;

        const viewport = document.createElement('div');
        viewport.className = VIEWPORT_CLASS;

        track.appendChild(viewport);
        container.appendChild(track);
        document.body.appendChild(container);

        return {
            container,
            track,
            viewport
        };
    }

    function ensureRootIndicator() {
        if (rootIndicator && rootIndicator.container.isConnected) {
            return;
        }

        rootIndicator = createIndicatorElement(ROOT_BAR_ID, true);
    }

    function removeIndicator(indicator) {
        if (!indicator || !indicator.container) {
            return;
        }
        if (indicator.container.isConnected) {
            indicator.container.remove();
        }
    }

    function refreshViewportMetrics() {
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

        if (offsetTop === viewportTop
            && offsetLeft === viewportLeft
            && height === viewportHeight
            && width === viewportWidth
            && scale === viewportScale) {
            return;
        }

        viewportTop = offsetTop;
        viewportLeft = offsetLeft;
        viewportHeight = height;
        viewportWidth = width;
        viewportScale = scale;
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
            updateAllIndicators();
        });
    }

    function shouldScanScrollers() {
        const now = Date.now();
        if (pendingScan || now - lastScanTime >= SCAN_INTERVAL_MS) {
            pendingScan = false;
            lastScanTime = now;
            return true;
        }
        return false;
    }

    function isScrollableCandidate(element) {
        if (!(element instanceof HTMLElement)) {
            return false;
        }
        if (!element.isConnected) {
            return false;
        }
        if (element === document.body || element === document.documentElement) {
            return false;
        }
        if (element.dataset.tmScrollIndicator) {
            return false;
        }
        if (element.closest && element.closest('[data-tm-scroll-indicator]')) {
            return false;
        }

        const style = getComputedStyle(element);
        if (!SCROLLABLE_OVERFLOW_VALUES.has(style.overflowY)) {
            return false;
        }

        const clientHeight = element.clientHeight;
        const scrollHeight = element.scrollHeight;
        if (clientHeight <= 0) {
            return false;
        }
        if (scrollHeight - clientHeight < 2) {
            return false;
        }

        return true;
    }

    function scanForScrollableElements() {
        if (!document.body) {
            return;
        }

        const found = new Set();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
        let currentNode = walker.currentNode;

        while (currentNode) {
            if (isScrollableCandidate(currentNode)) {
                found.add(currentNode);
                if (!elementIndicators.has(currentNode)) {
                    const indicator = createIndicatorElement(null, false);
                    if (indicator) {
                        elementIndicators.set(currentNode, indicator);
                    }
                }
            }
            currentNode = walker.nextNode();
        }

        for (const [element, indicator] of elementIndicators.entries()) {
            if (!element.isConnected || !found.has(element)) {
                removeIndicator(indicator);
                elementIndicators.delete(element);
            }
        }
    }

    function hideIndicator(indicator) {
        if (!indicator || !indicator.container) {
            return;
        }
        indicator.container.style.display = 'none';
    }

    function showIndicator(indicator) {
        if (!indicator || !indicator.container) {
            return;
        }
        indicator.container.style.display = '';
    }

    function isElementHidden(element) {
        if (element.hidden) {
            return true;
        }

        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
            return true;
        }

        return element.getClientRects().length === 0;
    }

    function updateViewportMarker(indicator, scrollRatio, viewportRatio) {
        const trackHeight = indicator.track.clientHeight;
        if (!trackHeight) {
            return;
        }

        const scale = viewportScale;
        const rawHeight = Math.min(trackHeight, Math.round(viewportRatio * trackHeight));
        const viewportHeightPx = Math.max(MIN_VIEWPORT_HEIGHT_PX / scale, rawHeight);
        const availableSpace = Math.max(0, trackHeight - viewportHeightPx);
        const viewportTopPx = Math.min(availableSpace, Math.round(scrollRatio * availableSpace));

        indicator.viewport.style.height = `${viewportHeightPx}px`;
        indicator.viewport.style.transform = `translateY(${viewportTopPx}px)`;
    }

    function updateRootIndicator() {
        if (!rootIndicator || !rootIndicator.container || !rootIndicator.track) {
            return;
        }

        const scroller = document.scrollingElement || document.documentElement;
        if (!scroller) {
            return;
        }

        const fullHeight = Math.max(scroller.scrollHeight, scroller.clientHeight, viewportHeight, 1);
        const maxScrollTop = Math.max(0, fullHeight - viewportHeight);
        const viewportRatio = fullHeight > 0 ? viewportHeight / fullHeight : 1;

        if (maxScrollTop <= 0 || viewportRatio >= VISIBILITY_RATIO_THRESHOLD) {
            hideIndicator(rootIndicator);
            return;
        }

        showIndicator(rootIndicator);
        const rightEdge = viewportLeft + viewportWidth;
        rootIndicator.container.style.top = `${viewportTop}px`;
        rootIndicator.container.style.left = `${rightEdge}px`;
        rootIndicator.container.style.height = `${viewportHeight}px`;
        rootIndicator.container.style.setProperty('--tm-scroll-scale', `${viewportScale}`);

        const scrollRatio = maxScrollTop > 0 ? scroller.scrollTop / maxScrollTop : 0;
        updateViewportMarker(rootIndicator, scrollRatio, viewportRatio);
    }

    function updateElementIndicator(element, indicator) {
        if (!indicator || !indicator.container || !indicator.track) {
            return;
        }

        if (!element.isConnected) {
            hideIndicator(indicator);
            return;
        }

        if (isElementHidden(element)) {
            hideIndicator(indicator);
            return;
        }

        const rect = element.getBoundingClientRect();
        if (rect.height <= 0 || rect.width <= 0) {
            hideIndicator(indicator);
            return;
        }
        const visibleTop = viewportTop;
        const visibleBottom = viewportTop + viewportHeight;
        const visibleLeft = viewportLeft;
        const visibleRight = viewportLeft + viewportWidth;

        if (rect.bottom <= visibleTop || rect.top >= visibleBottom) {
            hideIndicator(indicator);
            return;
        }
        if (rect.right <= visibleLeft || rect.left >= visibleRight) {
            hideIndicator(indicator);
            return;
        }

        const scrollHeight = element.scrollHeight;
        const clientHeight = element.clientHeight;
        const maxScrollTop = Math.max(0, scrollHeight - clientHeight);
        const viewportRatio = scrollHeight > 0 ? clientHeight / scrollHeight : 1;

        if (maxScrollTop <= 0 || viewportRatio >= VISIBILITY_RATIO_THRESHOLD) {
            hideIndicator(indicator);
            return;
        }

        showIndicator(indicator);
        indicator.container.style.top = `${Math.round(rect.top)}px`;
        indicator.container.style.left = `${Math.round(rect.right)}px`;
        indicator.container.style.height = `${Math.max(0, Math.round(rect.height))}px`;
        indicator.container.style.setProperty('--tm-scroll-scale', `${viewportScale}`);

        const scrollRatio = maxScrollTop > 0 ? element.scrollTop / maxScrollTop : 0;
        updateViewportMarker(indicator, scrollRatio, viewportRatio);
    }

    function updateElementIndicators() {
        for (const [element, indicator] of elementIndicators.entries()) {
            updateElementIndicator(element, indicator);
        }
    }

    function updateAllIndicators() {
        refreshViewportMetrics();

        if (shouldScanScrollers()) {
            scanForScrollableElements();
        }

        updateRootIndicator();
        updateElementIndicators();
    }

    function handleVisualViewportChange() {
        refreshViewportMetrics();
        scheduleUpdate();
    }

    function addListeners() {
        window.addEventListener('resize', scheduleUpdate, { passive: true });
        window.addEventListener('orientationchange', scheduleUpdate, { passive: true });
        window.addEventListener('scroll', scheduleUpdate, { passive: true });
        document.addEventListener('scroll', scheduleUpdate, { passive: true, capture: true });

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleVisualViewportChange, { passive: true });
            window.visualViewport.addEventListener('scroll', handleVisualViewportChange, { passive: true });
        }

        const observer = new MutationObserver(() => {
            pendingScan = true;
            scheduleUpdate();
        });

        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    function initWhenReady() {
        ensureStyle();
        ensureRootIndicator();
        scanForScrollableElements();
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
