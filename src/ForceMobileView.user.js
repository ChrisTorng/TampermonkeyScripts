// ==UserScript==
// @name         Force Mobile View
// @namespace    http://tampermonkey.net/
// @version      2026-10-08_2.0.2
// @description  Keep enabled pages within the viewport width and offer a shared-menu ↔ toggle with URL-based auto-enable.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceMobileView.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceMobileView.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.tampermonkey.net
// @match        https://news.ycombinator.com/item?*
// @match        https://archive.is/*
// @match        https://paulbourke.net/*
// @match        https://www.paulbourke.net/*
// @match        *://*/*
// @exclude      *://christorng.idv.tw/*
// @exclude      *://*.christorng.idv.tw/*
// @exclude      *://hackernews.betacat.io/*
// @exclude      *://*.hackernews.betacat.io/*
// @exclude      *://theneurondaily.com/*
// @exclude      *://*.theneurondaily.com/*
// @exclude      *://tam.gov.taipei/*
// @exclude      *://*.tam.gov.taipei/*
// @exclude      *://wiwi.*/*
// @exclude      *://*.wiwi.*/*
// @exclude      *://*.kagi.com/*
// @exclude      *://kagi.com/*
// @exclude      *://chatgpt.com/*
// @exclude      *://*.chatgpt.com/*
// @exclude      *://christorng.github.io/*
// @exclude      *://github.com/*
// @exclude      *://*.github.com/*
// @exclude      *://discord.com/*
// @exclude      *://*.discord.com/*
// @exclude      *://ebird.org/*
// @exclude      *://*.ebird.org/*
// @exclude      *://newsminimalist.com/*
// @exclude      *://*.newsminimalist.com/*
// @exclude      *://huggingface.co/*
// @exclude      *://*.huggingface.co/*
// @exclude      *://youtube.com/*
// @exclude      *://*.youtube.com/*
// @exclude      *://x.com/*
// @exclude      *://*.x.com/*
// @exclude      *://nitter.net/*
// @exclude      *://*.nitter.net/*
// @exclude      *://bing.com/*
// @exclude      *://*.bing.com/*
// @exclude      *://wikipedia.org/*
// @exclude      *://*.wikipedia.org/*
// @exclude      *://reddit.com/*
// @exclude      *://*.reddit.com/*
// @exclude      *://arxiv.org/*
// @exclude      *://*.arxiv.org/*
// @exclude      *://cht.com.tw/*
// @exclude      *://*.cht.com.tw/*
// @exclude      *://*.vercel.app/*
// @exclude      *://vercel.app/*
// @exclude      *://openai.com/*
// @exclude      *://*.openai.com/*
// @exclude      *://anthropic.com/*
// @exclude      *://*.anthropic.com/*
// @exclude      *://claude.ai/*
// @exclude      *://*.claude.ai/*
// @exclude      *://google.com/*
// @exclude      *://*.google.com/*
// @exclude      *://facebook.com/*
// @exclude      *://*.facebook.com/*
// @exclude      *://*.cwa.gov.tw/*
// @exclude      *://cwa.gov.tw/*
// @exclude      *://chrisrtxubuntu:*/*
// @exclude      *://microsoft.com/*
// @exclude      *://*.microsoft.com/*
// @exclude      *://instagram.com/*
// @exclude      *://*.instagram.com/*
// @grant        GM_info
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // BEGIN SHARED FLOATING MENU
    // Shared floating menu source. Run `node scripts/sync-floating-menu.js` after editing.
    const FLOATING_MENU_ID = 'tm-shared-floating-menu';
    const FLOATING_MENU_STORAGE = 'tm-floating-menu-v1:' + window.location.hostname.toLowerCase();
    const FLOATING_MENU_ORDER = ['archive', 'mobile', 'dark', 'translate'];

    function floatingMenuSettings() {
        try {
            return JSON.parse(window.localStorage.getItem(FLOATING_MENU_STORAGE)) || {};
        } catch (_) {
            return {};
        }
    }

    function floatingMenuSave(settings) {
        try {
            window.localStorage.setItem(FLOATING_MENU_STORAGE, JSON.stringify(settings));
        } catch (_) {
            // The menu still works when site storage is unavailable.
        }
    }

    function floatingMenuForbiddenHost() {
        const host = window.location.hostname.toLowerCase();
        return host === 'christorng.idv.tw' || host.endsWith('.christorng.idv.tw');
    }

    function floatingMenuDisabled() {
        return floatingMenuForbiddenHost() || floatingMenuSettings().disabled === true;
    }

    function floatingMenuRender(root) {
        const toggle = root.querySelector('[data-floating-toggle]');
        const close = root.querySelector('[data-floating-close]');
        const currentButtons = Array.from(root.querySelectorAll('[data-floating-tool]'));
        const buttons = [...currentButtons].sort((a, b) => FLOATING_MENU_ORDER.indexOf(a.getAttribute('data-floating-tool')) - FLOATING_MENU_ORDER.indexOf(b.getAttribute('data-floating-tool')));
        if (buttons.some((button, index) => button !== currentButtons[index])) {
            buttons.forEach((button) => {
                root.removeChild(button);
                root.appendChild(button);
            });
        }
        const available = buttons.some((button) => button.getAttribute('data-floating-available') === 'true');
        root.hidden = !available;
        const expanded = root.getAttribute('data-floating-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(expanded));
        close.hidden = !expanded;
        buttons.forEach((button) => {
            button.hidden = !expanded || button.getAttribute('data-floating-available') !== 'true';
        });
    }

    function floatingMenuRoot() {
        let root = document.getElementById(FLOATING_MENU_ID);
        if (root) {
            return root;
        }
        const style = document.createElement('style');
        style.id = FLOATING_MENU_ID + '-style';
        style.textContent = `
            #${FLOATING_MENU_ID} { position: absolute !important; top: 70px !important; right: 0 !important; left: auto !important; z-index: 2147483647 !important; width: 38px !important; display: flex !important; flex-direction: column !important; align-items: center !important; gap: 4px !important; margin: 0 !important; padding: 0 !important; }
            #${FLOATING_MENU_ID}[hidden], #${FLOATING_MENU_ID} button[hidden] { display: none !important; }
            #${FLOATING_MENU_ID} button { appearance: none !important; display: block !important; box-sizing: border-box !important; width: 38px !important; min-width: 38px !important; max-width: 38px !important; height: 32px !important; min-height: 32px !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 5px !important; box-shadow: 0 2px 6px rgba(0,0,0,.25) !important; background: rgba(0,0,0,.55) !important; color: #f0f0f0 !important; font: 600 15px/32px system-ui,sans-serif !important; text-align: center !important; cursor: pointer !important; opacity: 1 !important; user-select: none !important; touch-action: none !important; }
            #${FLOATING_MENU_ID} button[aria-pressed="true"] { background: rgba(34,139,34,.85) !important; color: white !important; }
            #${FLOATING_MENU_ID} [data-floating-close] { position: absolute !important; top: -36px !important; right: 0 !important; }
            #${FLOATING_MENU_ID} [data-floating-toggle] { cursor: move !important; }
        `;
        (document.head || document.documentElement).appendChild(style);
        root = document.createElement('div');
        root.id = FLOATING_MENU_ID;
        root.hidden = true;
        root.setAttribute('data-floating-expanded', 'false');
        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = '×';
        close.title = 'Disable floating tools on this site';
        close.setAttribute('aria-label', close.title);
        close.setAttribute('data-floating-close', 'true');
        close.hidden = true;
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.textContent = '≡';
        toggle.title = 'Floating tools';
        toggle.setAttribute('aria-label', toggle.title);
        toggle.setAttribute('data-floating-toggle', 'true');
        root.appendChild(close);
        root.appendChild(toggle);
        // Use document coordinates so pinch zoom does not anchor the menu to the visual viewport.
        document.documentElement.appendChild(root);

        const settings = floatingMenuSettings();
        let anchorX = Number.isFinite(settings.x) ? settings.x : null;
        let anchorY = Number.isFinite(settings.y) ? Math.max(36, settings.y) : 70;
        const scrollX = () => window.scrollX || 0;
        const scrollY = () => Math.max(0, window.scrollY || 0);
        // Pages without a mobile viewport declaration can start below scale 1.
        let normalScale = Math.min(1, window.visualViewport ? window.visualViewport.scale : 1);
        const zoomed = () => {
            if (!window.visualViewport) return false;
            normalScale = Math.min(normalScale, window.visualViewport.scale);
            return window.visualViewport.scale > normalScale * 1.01;
        };
        const place = (x, y) => {
            root.style.setProperty('position', 'absolute', 'important');
            root.style.setProperty('left', `${x}px`, 'important');
            root.style.setProperty('top', `${y}px`, 'important');
            root.style.setProperty('right', 'auto', 'important');
        };
        const position = () => {
            if (zoomed() || dragging) return;
            const x = anchorX === null ? window.innerWidth - 38 : anchorX;
            place(scrollX() + Math.max(0, Math.min(x, window.innerWidth - 38)), Math.max(anchorY, scrollY()));
        };

        let dragging = false;
        let moved = false;
        let startX = 0;
        let startY = 0;
        let originX = 0;
        let originY = 0;
        // Initialize even if the page loads with an already zoomed visual viewport.
        place(Math.max(0, anchorX === null ? window.innerWidth - 38 : anchorX), Math.max(anchorY, scrollY()));
        window.addEventListener('scroll', position, { passive: true });
        window.addEventListener('resize', position);
        if (window.visualViewport) window.visualViewport.addEventListener('resize', position);
        const pointer = (event) => event.touches ? event.touches[0] : event;
        const onMove = (event) => {
            if (!dragging) return;
            if (event.touches && event.touches.length !== 1) {
                dragging = false;
                moved = false;
                return;
            }
            const point = pointer(event);
            if (!moved && Math.abs(point.clientX - startX) < 3 && Math.abs(point.clientY - startY) < 3) return;
            moved = true;
            event.preventDefault();
            const x = Math.max(0, Math.min(originX + point.clientX - startX, window.innerWidth - 38));
            const y = Math.max(36, Math.min(originY + point.clientY - startY, window.innerHeight - 32));
            place(scrollX() + x, scrollY() + y);
        };
        const onEnd = () => {
            if (!dragging) return;
            dragging = false;
            if (moved) {
                const next = floatingMenuSettings();
                anchorX = parseFloat(root.style.left) - scrollX();
                // A drag sets the clearance at page top, even when dragged farther down the page.
                anchorY = parseFloat(root.style.top) - scrollY();
                next.x = anchorX;
                next.y = anchorY;
                floatingMenuSave(next);
                position();
            }
        };
        const onStart = (event) => {
            if (event.touches && event.touches.length !== 1) return;
            const point = pointer(event);
            dragging = true;
            moved = false;
            startX = point.clientX;
            startY = point.clientY;
            originX = parseFloat(root.style.left) - scrollX();
            originY = parseFloat(root.style.top) - scrollY();
        };
        toggle.addEventListener('mousedown', onStart);
        toggle.addEventListener('touchstart', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);
        document.addEventListener('touchcancel', () => { dragging = false; moved = false; position(); });
        toggle.addEventListener('click', (event) => {
            event.preventDefault();
            if (moved) { moved = false; return; }
            root.setAttribute('data-floating-expanded', String(root.getAttribute('data-floating-expanded') !== 'true'));
            floatingMenuRender(root);
        });
        close.addEventListener('click', () => {
            const next = floatingMenuSettings();
            next.disabled = true;
            floatingMenuSave(next);
            window.location.reload();
        });
        return root;
    }

    function registerFloatingButton(key, button, available = true) {
        if (floatingMenuDisabled()) return;
        const root = floatingMenuRoot();
        button.setAttribute('data-floating-tool', key);
        button.setAttribute('data-floating-available', String(available));
        root.appendChild(button);
        floatingMenuRender(root);
    }

    function setFloatingButtonAvailable(button, available) {
        if (!button.parentNode || button.parentNode.id !== FLOATING_MENU_ID) return;
        button.setAttribute('data-floating-available', String(available));
        floatingMenuRender(button.parentNode);
    }
    // END SHARED FLOATING MENU

    if (window !== window.top || floatingMenuDisabled()) return;

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
    const MIN_LINE_HEIGHT_ONLY_FLAG_ATTR = 'data-tm-force-width-min-line-height-only';
    const MIN_LINE_HEIGHT_ONLY_VALUE_ATTR = 'data-tm-force-width-min-line-height-only-value';
    const MIN_LINE_HEIGHT_ONLY_PRIORITY_ATTR = 'data-tm-force-width-min-line-height-only-priority';
    const SPACING_FLAG_ATTR = 'data-tm-force-width-spacing-trimmed';
    const SPACING_MARGIN_LEFT_ATTR = 'data-tm-force-width-margin-left';
    const SPACING_MARGIN_LEFT_PRIORITY_ATTR = 'data-tm-force-width-margin-left-priority';
    const SPACING_MARGIN_RIGHT_ATTR = 'data-tm-force-width-margin-right';
    const SPACING_MARGIN_RIGHT_PRIORITY_ATTR = 'data-tm-force-width-margin-right-priority';
    const SPACING_PADDING_LEFT_ATTR = 'data-tm-force-width-padding-left';
    const SPACING_PADDING_LEFT_PRIORITY_ATTR = 'data-tm-force-width-padding-left-priority';
    const SPACING_PADDING_RIGHT_ATTR = 'data-tm-force-width-padding-right';
    const SPACING_PADDING_RIGHT_PRIORITY_ATTR = 'data-tm-force-width-padding-right-priority';
    const SPACING_TARGET_SELECTOR = 'main, article, section, div, aside, header, footer, nav, ul, ol, li, p, blockquote, pre, figure, table';
    const MAX_SIDE_SPACING_PX = 2;
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
            `    body > * {\n` +
            `        margin-left: 0 !important;\n` +
            `        margin-right: 0 !important;\n` +
            `        padding-left: min(0.6vw, 2px) !important;\n` +
            `        padding-right: min(0.6vw, 2px) !important;\n` +
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
                                applyHorizontalSpacingNormalization(node);
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
        applyHorizontalSpacingNormalization(document.body || document.documentElement);
    }

    function disableForceWidth() {
        if (!isEnabled) {
            return;
        }
        isEnabled = false;
        removeStyle();
        stopObserver();
        clearMinimumFontSize();
        clearHorizontalSpacingNormalization();
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
        if (document.body && Number.isFinite(document.body.clientWidth)) {
            widths.push(document.body.clientWidth);
        }
        if (Number.isFinite(window.innerWidth)) {
            widths.push(window.innerWidth);
        }
        return Math.max(0, ...widths);
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
            clearHorizontalSpacingNormalization();
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
                applyHorizontalSpacingNormalization(document.body);
            });
            return;
        }
        applyMinimumFontSize(document.body, currentMinFontSizePx);
        applyHorizontalSpacingNormalization(document.body);
    }

    function getSidePixels(value) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function getElementsForSpacingNormalization(root) {
        const targets = [];
        if (!root || root.nodeType !== Node.ELEMENT_NODE) {
            return targets;
        }
        if (root.matches && root.matches(SPACING_TARGET_SELECTOR)) {
            targets.push(root);
        }
        targets.push(...root.querySelectorAll(SPACING_TARGET_SELECTOR));
        return targets;
    }

    function applyHorizontalSpacingNormalization(root) {
        if (!root || !shouldEnforceMinFontSize()) {
            return;
        }
        const elements = getElementsForSpacingNormalization(root);
        elements.forEach((element) => {
            if (element.hasAttribute(SPACING_FLAG_ATTR)) {
                return;
            }
            const computedStyle = window.getComputedStyle(element);
            const marginLeft = getSidePixels(computedStyle.marginLeft);
            const marginRight = getSidePixels(computedStyle.marginRight);
            const paddingLeft = getSidePixels(computedStyle.paddingLeft);
            const paddingRight = getSidePixels(computedStyle.paddingRight);
            const hasExcessiveSpacing = marginLeft > MAX_SIDE_SPACING_PX ||
                marginRight > MAX_SIDE_SPACING_PX ||
                paddingLeft > MAX_SIDE_SPACING_PX ||
                paddingRight > MAX_SIDE_SPACING_PX;
            if (!hasExcessiveSpacing) {
                return;
            }

            element.setAttribute(SPACING_FLAG_ATTR, 'true');
            element.setAttribute(SPACING_MARGIN_LEFT_ATTR, element.style.getPropertyValue('margin-left'));
            element.setAttribute(SPACING_MARGIN_LEFT_PRIORITY_ATTR, element.style.getPropertyPriority('margin-left'));
            element.setAttribute(SPACING_MARGIN_RIGHT_ATTR, element.style.getPropertyValue('margin-right'));
            element.setAttribute(SPACING_MARGIN_RIGHT_PRIORITY_ATTR, element.style.getPropertyPriority('margin-right'));
            element.setAttribute(SPACING_PADDING_LEFT_ATTR, element.style.getPropertyValue('padding-left'));
            element.setAttribute(SPACING_PADDING_LEFT_PRIORITY_ATTR, element.style.getPropertyPriority('padding-left'));
            element.setAttribute(SPACING_PADDING_RIGHT_ATTR, element.style.getPropertyValue('padding-right'));
            element.setAttribute(SPACING_PADDING_RIGHT_PRIORITY_ATTR, element.style.getPropertyPriority('padding-right'));

            element.style.setProperty('margin-left', '0px', 'important');
            element.style.setProperty('margin-right', '0px', 'important');
            element.style.setProperty('padding-left', `${MAX_SIDE_SPACING_PX}px`, 'important');
            element.style.setProperty('padding-right', `${MAX_SIDE_SPACING_PX}px`, 'important');
        });
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
        const enforcedAncestors = new Set();
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
            const minimumLineHeightPx = minFontSizePx * MIN_LINE_HEIGHT_RATIO;
            element.style.setProperty('line-height', `${minimumLineHeightPx}px`, 'important');
            let parent = element.parentElement;
            while (parent && parent !== document.documentElement) {
                if (!enforcedAncestors.has(parent)) {
                    enforceReadableLineHeight(parent);
                    enforcedAncestors.add(parent);
                }
                parent = parent.parentElement;
            }
        });
    }

    function enforceReadableLineHeight(element) {
        if (!element || element.hasAttribute(MIN_FONT_FLAG_ATTR) || element.hasAttribute(MIN_LINE_HEIGHT_ONLY_FLAG_ATTR)) {
            return;
        }
        const computedStyle = window.getComputedStyle(element);
        const computedFontSize = Number.parseFloat(computedStyle.fontSize);
        const computedLineHeight = Number.parseFloat(computedStyle.lineHeight);
        if (!Number.isFinite(computedFontSize) || !Number.isFinite(computedLineHeight)) {
            return;
        }
        const minimumLineHeightPx = computedFontSize * MIN_LINE_HEIGHT_RATIO;
        if (computedLineHeight >= minimumLineHeightPx) {
            return;
        }
        const lineHeightValue = element.style.getPropertyValue('line-height');
        const lineHeightPriority = element.style.getPropertyPriority('line-height');
        element.setAttribute(MIN_LINE_HEIGHT_ONLY_FLAG_ATTR, 'true');
        element.setAttribute(MIN_LINE_HEIGHT_ONLY_VALUE_ATTR, lineHeightValue);
        element.setAttribute(MIN_LINE_HEIGHT_ONLY_PRIORITY_ATTR, lineHeightPriority);
        element.style.setProperty('line-height', `${minimumLineHeightPx}px`, 'important');
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
        const lineHeightOnlyElements = document.querySelectorAll(`[${MIN_LINE_HEIGHT_ONLY_FLAG_ATTR}="true"]`);
        lineHeightOnlyElements.forEach((element) => {
            const lineHeightValue = element.getAttribute(MIN_LINE_HEIGHT_ONLY_VALUE_ATTR) || '';
            const lineHeightPriority = element.getAttribute(MIN_LINE_HEIGHT_ONLY_PRIORITY_ATTR) || '';
            if (lineHeightValue) {
                element.style.setProperty('line-height', lineHeightValue, lineHeightPriority);
            } else {
                element.style.removeProperty('line-height');
            }
            element.removeAttribute(MIN_LINE_HEIGHT_ONLY_FLAG_ATTR);
            element.removeAttribute(MIN_LINE_HEIGHT_ONLY_VALUE_ATTR);
            element.removeAttribute(MIN_LINE_HEIGHT_ONLY_PRIORITY_ATTR);
        });
    }

    function restoreInlineProperty(element, propertyName, valueAttr, priorityAttr) {
        const inlineValue = element.getAttribute(valueAttr) || '';
        const inlinePriority = element.getAttribute(priorityAttr) || '';
        if (inlineValue) {
            element.style.setProperty(propertyName, inlineValue, inlinePriority);
        } else {
            element.style.removeProperty(propertyName);
        }
        element.removeAttribute(valueAttr);
        element.removeAttribute(priorityAttr);
    }

    function clearHorizontalSpacingNormalization() {
        const elements = document.querySelectorAll(`[${SPACING_FLAG_ATTR}="true"]`);
        elements.forEach((element) => {
            restoreInlineProperty(element, 'margin-left', SPACING_MARGIN_LEFT_ATTR, SPACING_MARGIN_LEFT_PRIORITY_ATTR);
            restoreInlineProperty(element, 'margin-right', SPACING_MARGIN_RIGHT_ATTR, SPACING_MARGIN_RIGHT_PRIORITY_ATTR);
            restoreInlineProperty(element, 'padding-left', SPACING_PADDING_LEFT_ATTR, SPACING_PADDING_LEFT_PRIORITY_ATTR);
            restoreInlineProperty(element, 'padding-right', SPACING_PADDING_RIGHT_ATTR, SPACING_PADDING_RIGHT_PRIORITY_ATTR);
            element.removeAttribute(SPACING_FLAG_ATTR);
        });
    }

    function createFloatingToggleButton() {
        if (!document.body) return;
        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.textContent = '↔';
        function updateButtonAppearance() {
            toggleButton.setAttribute('aria-pressed', String(isEnabled));
            toggleButton.title = isEnabled ? 'Force Mobile View is ON (click to disable)' : 'Force Mobile View is OFF (click to enable)';
        }
        toggleButton.addEventListener('click', (event) => {
            event.preventDefault();
            toggleForceWidth();
            updateButtonAppearance();
        });
        updateButtonAppearance();
        registerFloatingButton('mobile', toggleButton);
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
