// ==UserScript==
// @name         Responsive Scroll Position Indicator
// @namespace    http://tampermonkey.net/
// @version      2026-11-06_1.3.13
// @description  Keep visible, persistent scroll markers for pages and actually visible nested scroll areas.
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
    const ROOT_RIGHT_INSET_PX = 10;
    const PAGE_SCROLLER_EDGE_TOLERANCE_PX = 24;
    const MIN_VIEWPORT_HEIGHT_PX = 12;
    const MIN_VISIBLE_TRACK_PX = 12;
    const PAINT_SAMPLE_COUNT = 9;
    const UPDATE_INTERVAL_MS = 100;
    const SCAN_INTERVAL_MS = 1000;
    const VISIBILITY_RATIO_THRESHOLD = 0.95;
    const SCROLLABLE_OVERFLOW_VALUES = new Set(['auto', 'scroll', 'overlay']);
    const CLIPPING_OVERFLOW_VALUES = new Set(['auto', 'scroll', 'overlay', 'hidden', 'clip']);

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

    // Indicators live in document.body, outside the scrollport's CSS clipping.
    // Calculate the painted viewport instead of trusting the target's own rectangle.
    function getVisibleScrollableRect(element) {
        if (isElementHidden(element)) {
            return null;
        }

        const rect = element.getBoundingClientRect();
        let left = Math.max(rect.left, viewportLeft);
        let right = Math.min(rect.right, viewportLeft + viewportWidth);
        let top = Math.max(rect.top, viewportTop);
        let bottom = Math.min(rect.bottom, viewportTop + viewportHeight);

        if (right <= left || bottom <= top) {
            return null;
        }

        for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
            const style = getComputedStyle(ancestor);
            if (ancestor.hidden || ancestor.inert
                || ancestor.getAttribute('aria-hidden') === 'true'
                || ancestor.getAttribute('data-state') === 'closed'
                || style.display === 'none'
                || style.visibility === 'hidden' || style.visibility === 'collapse'
                || style.contentVisibility === 'hidden'
                || (typeof style.opacity === 'string' && parseFloat(style.opacity) === 0)) {
                return null;
            }

            if (ancestor === element) {
                continue;
            }

            const paintContained = /(?:^|\s)(?:paint|content|strict)(?:\s|$)/.test(style.contain || '')
                || style.contentVisibility === 'auto';
            const clipX = paintContained || CLIPPING_OVERFLOW_VALUES.has(style.overflowX);
            const clipY = paintContained || CLIPPING_OVERFLOW_VALUES.has(style.overflowY);
            if (!clipX && !clipY) {
                continue;
            }

            const ancestorRect = ancestor.getBoundingClientRect();
            const scaleX = ancestor.offsetWidth > 0 ? ancestorRect.width / ancestor.offsetWidth : 1;
            const scaleY = ancestor.offsetHeight > 0 ? ancestorRect.height / ancestor.offsetHeight : 1;
            const clientLeft = ancestorRect.left + (ancestor.clientLeft || 0) * scaleX;
            const clientTop = ancestorRect.top + (ancestor.clientTop || 0) * scaleY;

            if (clipX) {
                left = Math.max(left, clientLeft);
                right = Math.min(right, clientLeft + ancestor.clientWidth * scaleX);
            }
            if (clipY) {
                top = Math.max(top, clientTop);
                bottom = Math.min(bottom, clientTop + ancestor.clientHeight * scaleY);
            }

            if (right <= left || bottom <= top) {
                return null;
            }
        }

        return bottom - top >= MIN_VISIBLE_TRACK_PX && right - left >= BAR_WIDTH
            ? { top, left, right, bottom }
            : null;
    }

    // CSS clip-path, masks and overlays can hide a menu without reducing the
    // scrollport's layout rectangle. Our fixed marker escapes that paint clipping,
    // so check which parts of the scrollport are actually reachable on screen.
    function restrictToPaintedArea(element, rect) {
        if (typeof document.elementFromPoint !== 'function'
            || viewportScale !== 1 || viewportLeft !== 0 || viewportTop !== 0) {
            return rect;
        }

        const height = rect.bottom - rect.top;
        const width = rect.right - rect.left;
        const rightInset = Math.min(16, width / 4);
        const xRight = rect.right - rightInset;
        const xMiddle = rect.left + width / 2;
        let firstHit = -1;
        let lastHit = -1;

        for (let i = 0; i < PAINT_SAMPLE_COUNT; i++) {
            const y = rect.top + height * (i + 0.5) / PAINT_SAMPLE_COUNT;
            let painted = false;
            for (const x of [xRight, xMiddle]) {
                const hit = document.elementFromPoint(x, y);
                for (let node = hit; node; node = node.parentNode || node.host) {
                    if (node === element) {
                        painted = true;
                        break;
                    }
                }
                if (painted) {
                    break;
                }
            }

            if (painted) {
                if (firstHit < 0) {
                    firstHit = i;
                }
                lastHit = i;
            }
        }

        if (firstHit < 0) {
            return null;
        }

        // Two samples prevent a tiny exposed sliver of a collapsed menu from
        // turning into a large floating indicator below its visible content.
        if (firstHit === lastHit && height > 2 * MIN_VISIBLE_TRACK_PX) {
            return null;
        }

        const top = rect.top + height * firstHit / PAINT_SAMPLE_COUNT;
        const bottom = rect.top + height * (lastHit + 1) / PAINT_SAMPLE_COUNT;
        return bottom - top >= MIN_VISIBLE_TRACK_PX ? { ...rect, top, bottom } : null;
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

    // Some mobile layouts scroll a full-viewport app container, while other
    // documents expose different scrollHeight values on body and html.
    // Only adopt a nested element as the page scroller when its visible
    // scrollport occupies the page edge and most of the viewport.
    function findPageScrollport() {
        let best = null;
        let bestScore = -Infinity;
        const rightEdge = viewportLeft + viewportWidth;

        for (const element of elementIndicators.keys()) {
            if (!element.isConnected || !isScrollableCandidate(element)) {
                continue;
            }

            const clipped = getVisibleScrollableRect(element);
            if (!clipped) {
                continue;
            }
            const width = clipped.right - clipped.left;
            const height = clipped.bottom - clipped.top;
            const edgeGap = rightEdge - clipped.right;

            if (width < viewportWidth * 0.85
                || height < viewportHeight * 0.55
                || clipped.left > viewportLeft + viewportWidth * 0.08
                || edgeGap < -2 || edgeGap > PAGE_SCROLLER_EDGE_TOLERANCE_PX) {
                continue;
            }

            const painted = restrictToPaintedArea(element, clipped);
            if (!painted || painted.bottom - painted.top < viewportHeight * 0.5) {
                continue;
            }

            const score = width / viewportWidth + height / viewportHeight
                - edgeGap / Math.max(1, viewportWidth);
            if (score > bestScore) {
                best = element;
                bestScore = score;
            }
        }

        return best;
    }

    function getPageScrollState() {
        const html = document.documentElement;
        const body = document.body;
        const scroller = document.scrollingElement || html || body;
        if (!scroller) {
            return null;
        }

        // Do not assume scrollingElement.scrollHeight is the entire page.
        // In standards and quirks layouts, body and html may disagree.
        const fullHeight = Math.max(
            scroller.scrollHeight || 0,
            html?.scrollHeight || 0,
            body?.scrollHeight || 0,
            viewportHeight, 1
        );
        const scrollTop = Math.max(
            0, window.scrollY || window.pageYOffset || 0,
            scroller.scrollTop || 0,
            html?.scrollTop || 0,
            body?.scrollTop || 0
        );

        const htmlOverflow = html && getComputedStyle(html).overflowY;
        const bodyOverflow = body && getComputedStyle(body).overflowY;
        const rootClipped = ['hidden', 'clip'].includes(htmlOverflow)
            || ['hidden', 'clip'].includes(bodyOverflow);
        const fallback = findPageScrollport();
        const hasDocumentRange = fullHeight - viewportHeight >= 2;
        if (fallback && (!hasDocumentRange || rootClipped)) {
            return {
                scrollTop: fallback.scrollTop,
                fullHeight: Math.max(fallback.scrollHeight, fallback.clientHeight),
                clientHeight: fallback.clientHeight,
                pageScrollport: fallback
            };
        }

        return {
            scrollTop,
            fullHeight,
            clientHeight: viewportHeight,
            pageScrollport: null
        };
    }

    function updateRootIndicator(pageScrollState) {
        if (!rootIndicator || !rootIndicator.container || !rootIndicator.track) {
            return;
        }

        const state = pageScrollState || getPageScrollState();
        if (!state) {
            hideIndicator(rootIndicator);
            return;
        }

        const fullHeight = state.fullHeight;
        const viewHeight = state.clientHeight;
        const maxScrollTop = Math.max(0, fullHeight - viewHeight);
        const viewportRatio = fullHeight > 0 ? viewHeight / fullHeight : 1;

        if (maxScrollTop <= 0 || viewportRatio >= VISIBILITY_RATIO_THRESHOLD) {
            hideIndicator(rootIndicator);
            return;
        }

        // Native Android overlay scrollbars are composited above page CSS.
        // Leave a gutter so the browser's fading thumb cannot cover ours.
        const rightEdge = viewportLeft + viewportWidth - ROOT_RIGHT_INSET_PX;
        rootIndicator.container.style.top = `${viewportTop}px`;
        rootIndicator.container.style.left = `${rightEdge}px`;
        rootIndicator.container.style.height = `${viewportHeight}px`;
        rootIndicator.container.style.setProperty('--tm-scroll-scale', `${viewportScale}`);
        showIndicator(rootIndicator);

        const scrollRatio = maxScrollTop > 0
            ? Math.min(1, Math.max(0, state.scrollTop / maxScrollTop))
            : 0;
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

        const clippedRect = getVisibleScrollableRect(element);
        const visibleRect = clippedRect && restrictToPaintedArea(element, clippedRect);
        if (!visibleRect) {
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

        indicator.container.style.top = `${Math.round(visibleRect.top)}px`;
        indicator.container.style.left = `${Math.round(visibleRect.right)}px`;
        indicator.container.style.height = `${Math.max(0, Math.round(visibleRect.bottom - visibleRect.top))}px`;
        indicator.container.style.setProperty('--tm-scroll-scale', `${viewportScale}`);
        showIndicator(indicator);

        const scrollRatio = maxScrollTop > 0 ? element.scrollTop / maxScrollTop : 0;
        updateViewportMarker(indicator, scrollRatio, viewportRatio);
    }

    function updateElementIndicators(pageScrollport) {
        for (const [element, indicator] of elementIndicators.entries()) {
            if (element === pageScrollport) {
                hideIndicator(indicator);
            } else {
                updateElementIndicator(element, indicator);
            }
        }
    }

    function updateAllIndicators() {
        refreshViewportMetrics();
        ensureRootIndicator();

        if (shouldScanScrollers()) {
            scanForScrollableElements();
        }

        const pageScrollState = getPageScrollState();
        updateRootIndicator(pageScrollState);
        updateElementIndicators(pageScrollState?.pageScrollport);
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

        const observer = new MutationObserver((records) => {
            if (!records.some((record) => {
                const target = record.target;
                return !target || !target.closest || !target.closest('[data-tm-scroll-indicator]');
            })) {
                return;
            }
            pendingScan = true;
            scheduleUpdate();
        });

        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style', 'hidden', 'open', 'inert', 'aria-hidden', 'data-state']
            });
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
