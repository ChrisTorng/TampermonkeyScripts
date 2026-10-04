// ==UserScript==
// @name         Force Dark Mode
// @namespace    http://tampermonkey.net/
// @version      2026-10-04_2.1.0
// @description  Force dark colors with a shared-menu ☽ toggle and URL-based auto-enable.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceDarkMode.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceDarkMode.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.tampermonkey.net
// @match        https://www.lesswrong.com/*
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
// @exclude      *://*ycombinator.com/*
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
    const FLOATING_MENU_STORAGE = 'tm-floating-menu-v2:' + window.location.hostname.toLowerCase();
    const FLOATING_MENU_ORDER = ['archive', 'mobile', 'dark', 'translate'];
    const FLOATING_MENU_INSET = 16;

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

    function floatingMenuFolderPath() {
        const path = window.location.pathname || '/';
        if (path.endsWith('/')) return path;
        const slash = path.lastIndexOf('/');
        return path.slice(0, slash + 1) || '/';
    }

    function floatingMenuPageKey() {
        return `${window.location.pathname}${window.location.search}`;
    }

    function floatingMenuDisabled() {
        const settings = floatingMenuSettings();
        return floatingMenuForbiddenHost()
            || settings.disabledDomain === true
            || (settings.disabledPaths || []).includes(floatingMenuFolderPath())
            || (settings.disabledPages || []).includes(floatingMenuPageKey());
    }

    function floatingMenuCollapse(root) {
        root.setAttribute('data-floating-expanded', 'false');
        floatingMenuRender(root);
    }

    function floatingMenuRender(root) {
        const toggle = root.querySelector('[data-floating-toggle]');
        const close = root.querySelector('[data-floating-close]');
        const dialog = root.querySelector('[data-floating-dialog]');
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
        close.hidden = !expanded || !dialog.hidden;
        root.setAttribute('data-floating-active', String(expanded || !dialog.hidden));
        buttons.forEach((button) => {
            button.hidden = !expanded || !dialog.hidden || button.getAttribute('data-floating-available') !== 'true';
        });
    }

    function floatingMenuRoot() {
        let root = document.getElementById(FLOATING_MENU_ID);
        if (root) return root;

        const style = document.createElement('style');
        style.id = FLOATING_MENU_ID + '-style';
        style.textContent = `
            #${FLOATING_MENU_ID} { --tm-control-size: 40px; --tm-control-height: 36px; position: fixed !important; top: 70px !important; right: ${FLOATING_MENU_INSET}px !important; left: auto !important; z-index: 2147483647 !important; width: var(--tm-control-size) !important; display: flex !important; flex-direction: column !important; align-items: center !important; gap: 5px !important; margin: 0 !important; padding: 0 !important; opacity: .42 !important; transition: opacity .16s ease !important; isolation: isolate !important; }
            #${FLOATING_MENU_ID}[data-floating-active="true"], #${FLOATING_MENU_ID}:hover, #${FLOATING_MENU_ID}:focus-within { opacity: 1 !important; }
            #${FLOATING_MENU_ID}[hidden], #${FLOATING_MENU_ID} button[hidden], #${FLOATING_MENU_ID} [data-floating-dialog][hidden] { display: none !important; }
            #${FLOATING_MENU_ID} button { appearance: none !important; display: block !important; box-sizing: border-box !important; width: var(--tm-control-size) !important; min-width: var(--tm-control-size) !important; max-width: var(--tm-control-size) !important; height: var(--tm-control-height) !important; min-height: var(--tm-control-height) !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 6px !important; box-shadow: 0 2px 6px rgba(0,0,0,.25) !important; background: rgba(0,0,0,.62) !important; color: #fff !important; font: 600 17px/var(--tm-control-height) system-ui,sans-serif !important; text-align: center !important; cursor: pointer !important; opacity: 1 !important; user-select: none !important; touch-action: none !important; }
            #${FLOATING_MENU_ID} button[aria-pressed="true"] { background: rgba(34,139,34,.92) !important; color: white !important; }
            #${FLOATING_MENU_ID} [data-floating-close] { position: absolute !important; top: calc(-1 * var(--tm-control-height) - 5px) !important; right: 0 !important; }
            #${FLOATING_MENU_ID} [data-floating-toggle] { cursor: move !important; }
            #${FLOATING_MENU_ID} [data-floating-dialog] { position: absolute !important; top: 0 !important; right: 0 !important; width: min(290px, calc(100vw - 24px)) !important; box-sizing: border-box !important; margin: 0 !important; padding: 14px !important; border: 1px solid #777 !important; border-radius: 9px !important; box-shadow: 0 5px 18px rgba(0,0,0,.4) !important; background: #fff !important; color: #111 !important; font: 15px/1.4 system-ui,sans-serif !important; }
            #${FLOATING_MENU_ID} [data-floating-dialog] p { margin: 0 0 10px !important; padding: 0 !important; }
            #${FLOATING_MENU_ID} [data-floating-dialog] button { width: 100% !important; max-width: none !important; margin-top: 7px !important; background: #444 !important; }
            @media (pointer: coarse) { #${FLOATING_MENU_ID} { --tm-control-size: 48px; --tm-control-height: 44px; } }
        `;
        (document.head || document.documentElement).appendChild(style);
        root = document.createElement('div');
        root.id = FLOATING_MENU_ID;
        root.hidden = true;
        root.setAttribute('data-floating-expanded', 'false');
        root.setAttribute('data-floating-active', 'false');

        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = '×';
        close.title = 'Hide floating tools';
        close.setAttribute('aria-label', close.title);
        close.setAttribute('data-floating-close', 'true');
        close.hidden = true;
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.textContent = '≡';
        toggle.title = 'Floating tools';
        toggle.setAttribute('aria-label', toggle.title);
        toggle.setAttribute('data-floating-toggle', 'true');
        const dialog = document.createElement('div');
        dialog.setAttribute('data-floating-dialog', 'true');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-label', 'Hide floating tools');
        dialog.hidden = true;
        const question = document.createElement('p');
        question.textContent = 'Where should floating tools be hidden?';
        dialog.appendChild(question);
        [
            ['page', 'This page'],
            ['path', 'This folder path'],
            ['domain', 'This entire domain'],
            ['cancel', 'Cancel'],
        ].forEach(([scope, label]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = label;
            button.setAttribute('data-floating-hide-scope', scope);
            dialog.appendChild(button);
        });
        root.appendChild(close);
        root.appendChild(toggle);
        root.appendChild(dialog);
        document.documentElement.appendChild(root);

        function viewportMetrics() {
            const viewport = window.visualViewport;
            return {
                left: viewport ? viewport.offsetLeft : 0,
                top: viewport ? viewport.offsetTop : 0,
                width: viewport ? viewport.width : window.innerWidth,
                height: viewport ? viewport.height : window.innerHeight,
                scale: viewport ? viewport.scale : 1,
            };
        }
        function controlWidth() {
            return root.offsetWidth || 40;
        }
        function keepInViewport() {
            const viewport = viewportMetrics();
            const width = controlWidth();
            const height = root.offsetHeight || 36;
            const currentLeft = root.style.left ? parseFloat(root.style.left) : viewport.left + viewport.width - width - FLOATING_MENU_INSET;
            const currentTop = root.style.top ? parseFloat(root.style.top) : viewport.top + 70;
            const x = Math.max(viewport.left + 4, Math.min(currentLeft, viewport.left + viewport.width - width - 4));
            const y = Math.max(viewport.top + 4, Math.min(currentTop, viewport.top + viewport.height - height - 4));
            root.style.setProperty('left', `${x}px`, 'important');
            root.style.setProperty('top', `${y}px`, 'important');
            root.style.setProperty('right', 'auto', 'important');
            const needsLargerControls = viewport.scale < 0.9 || window.devicePixelRatio < 0.9;
            root.style.setProperty('--tm-control-size', needsLargerControls ? '52px' : '40px', 'important');
            root.style.setProperty('--tm-control-height', needsLargerControls ? '48px' : '36px', 'important');
        }
        const settings = floatingMenuSettings();
        if (Number.isFinite(settings.x) && Number.isFinite(settings.y)) {
            root.style.setProperty('left', `${settings.x}px`, 'important');
            root.style.setProperty('top', `${settings.y}px`, 'important');
        }
        keepInViewport();

        let dragging = false;
        let moved = false;
        let startX = 0;
        let startY = 0;
        let originX = 0;
        let originY = 0;
        const pointer = (event) => event.touches ? event.touches[0] : event;
        const onMove = (event) => {
            if (!dragging) return;
            const point = pointer(event);
            if (!moved && Math.abs(point.clientX - startX) < 3 && Math.abs(point.clientY - startY) < 3) return;
            moved = true;
            event.preventDefault();
            const viewport = viewportMetrics();
            const x = Math.max(viewport.left + 4, Math.min(originX + point.clientX - startX, viewport.left + viewport.width - controlWidth() - 4));
            const y = Math.max(viewport.top + 4, Math.min(originY + point.clientY - startY, viewport.top + viewport.height - (root.offsetHeight || 36) - 4));
            root.style.setProperty('left', `${x}px`, 'important');
            root.style.setProperty('top', `${y}px`, 'important');
        };
        const onEnd = () => {
            if (!dragging) return;
            dragging = false;
            if (moved) {
                const next = floatingMenuSettings();
                next.x = parseFloat(root.style.left);
                next.y = parseFloat(root.style.top);
                floatingMenuSave(next);
            }
        };
        const onStart = (event) => {
            const point = pointer(event);
            dragging = true;
            moved = false;
            startX = point.clientX;
            startY = point.clientY;
            originX = parseFloat(root.style.left);
            originY = parseFloat(root.style.top);
        };
        toggle.addEventListener('mousedown', onStart);
        toggle.addEventListener('touchstart', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);
        toggle.addEventListener('click', (event) => {
            event.preventDefault();
            if (moved) { moved = false; return; }
            dialog.hidden = true;
            root.setAttribute('data-floating-expanded', String(root.getAttribute('data-floating-expanded') !== 'true'));
            floatingMenuRender(root);
        });
        close.addEventListener('click', (event) => {
            dialog.hidden = false;
            floatingMenuRender(root);
        });
        dialog.addEventListener('click', (event) => {
            const scope = event.target.getAttribute && event.target.getAttribute('data-floating-hide-scope');
            if (!scope) return;
            if (scope === 'cancel') {
                dialog.hidden = true;
                floatingMenuRender(root);
                return;
            }
            const next = floatingMenuSettings();
            if (scope === 'domain') next.disabledDomain = true;
            if (scope === 'path') next.disabledPaths = [...new Set([...(next.disabledPaths || []), floatingMenuFolderPath()])];
            if (scope === 'page') next.disabledPages = [...new Set([...(next.disabledPages || []), floatingMenuPageKey()])];
            floatingMenuSave(next);
            window.location.reload();
        });
        document.addEventListener('pointerdown', (event) => {
            if (root.getAttribute('data-floating-expanded') === 'true' && !root.contains(event.target)) floatingMenuCollapse(root);
        });
        window.addEventListener('resize', keepInViewport);
        window.addEventListener('scroll', keepInViewport);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', keepInViewport);
            window.visualViewport.addEventListener('scroll', keepInViewport);
        }
        return root;
    }

    function registerFloatingButton(key, button, available = true) {
        if (floatingMenuDisabled()) return;
        const root = floatingMenuRoot();
        button.setAttribute('data-floating-tool', key);
        button.setAttribute('data-floating-available', String(available));
        button.addEventListener('click', () => floatingMenuCollapse(root));
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

    const STYLE_ID = 'tm-force-dark-mode-style';
    let isEnabled = false;
    let styleObserver;
    let isObserving = false;

    function buildStyleContent() {
        return `:root {\n` +
            `    color-scheme: dark !important;\n` +
            `}\n` +
            `html, body {\n` +
            `    background-color: #121212 !important;\n` +
            `    color: #e6e6e6 !important;\n` +
            `}\n` +
            `body, body * {\n` +
            `    color: #e6e6e6 !important;\n` +
            `    background-color: transparent !important;\n` +
            `    border-color: #3a3a3a !important;\n` +
            `}\n` +
            `a {\n` +
            `    color: #8ab4f8 !important;\n` +
            `}\n` +
            `a:visited {\n` +
            `    color: #c58af9 !important;\n` +
            `}\n` +
            `button, input, select, textarea {\n` +
            `    background-color: #1e1e1e !important;\n` +
            `    color: #e6e6e6 !important;\n` +
            `    border-color: #4a4a4a !important;\n` +
            `}\n` +
            `pre, code, kbd, samp {\n` +
            `    background-color: #1a1a1a !important;\n` +
            `    color: #f1f1f1 !important;\n` +
            `}\n` +
            `table {\n` +
            `    background-color: #161616 !important;\n` +
            `}\n` +
            `th, td {\n` +
            `    background-color: #1a1a1a !important;\n` +
            `}\n` +
            `hr {\n` +
            `    border-color: #333333 !important;\n` +
            `}\n` +
            `::selection {\n` +
            `    background-color: #2b4f81 !important;\n` +
            `    color: #ffffff !important;\n` +
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
            styleObserver = new MutationObserver(() => {
                if (isEnabled && !document.getElementById(STYLE_ID)) {
                    insertStyle();
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

    function enableForceDarkMode() {
        if (isEnabled) {
            return;
        }
        isEnabled = true;
        insertStyle();
        ensureObserver();
    }

    function disableForceDarkMode() {
        if (!isEnabled) {
            return;
        }
        isEnabled = false;
        removeStyle();
        stopObserver();
    }

    function toggleForceDarkMode() {
        if (isEnabled) {
            disableForceDarkMode();
        } else {
            enableForceDarkMode();
        }
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

    function onDocumentReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
        } else {
            callback();
        }
    }

    function createFloatingToggleButton() {
        if (!document.body) return;
        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.textContent = '☽';
        function updateButtonAppearance() {
            toggleButton.setAttribute('aria-pressed', String(isEnabled));
            toggleButton.title = isEnabled ? 'Force Dark Mode is ON (click to disable)' : 'Force Dark Mode is OFF (click to enable)';
        }
        toggleButton.addEventListener('click', (event) => {
            event.preventDefault();
            toggleForceDarkMode();
            updateButtonAppearance();
        });
        updateButtonAppearance();
        registerFloatingButton('dark', toggleButton);
    }

    onDocumentReady(createFloatingToggleButton);

    if (shouldAutoEnableForUrl()) {
        enableForceDarkMode();
    }
})();
