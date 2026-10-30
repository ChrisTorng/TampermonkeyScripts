// ==UserScript==
// @name         Force Mobile View
// @namespace    http://tampermonkey.net/
// @version      2026-10-31_2.1.2
// @description  Detect unreadably small mobile pages, apply reversible readability fixes, and retain manual / URL-based ↔ controls.
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

    function floatingMenuFolderPath() {
        const path = window.location.pathname || '/';
        if (path.endsWith('/')) return path;
        return path.slice(0, path.lastIndexOf('/') + 1) || '/';
    }

    function floatingMenuPageKey() {
        return `${window.location.pathname}${window.location.search}`;
    }

    function floatingMenuDisabled() {
        const settings = floatingMenuSettings();
        return floatingMenuForbiddenHost()
            || settings.disabled === true
            || settings.disabledDomain === true
            || (settings.disabledPaths || []).includes(floatingMenuFolderPath())
            || (settings.disabledPages || []).includes(floatingMenuPageKey());
    }

    function floatingMenuCollapse(root) {
        root.setAttribute('data-floating-expanded', 'false');
        const dialog = root.querySelector('[data-floating-dialog]');
        if (dialog) dialog.hidden = true;
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
        buttons.forEach((button) => {
            button.hidden = !expanded || !dialog.hidden || button.getAttribute('data-floating-available') !== 'true';
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
            #${FLOATING_MENU_ID}[hidden], #${FLOATING_MENU_ID} button[hidden], #${FLOATING_MENU_ID} [data-floating-dialog][hidden] { display: none !important; }
            #${FLOATING_MENU_ID} button { appearance: none !important; display: block !important; box-sizing: border-box !important; width: 38px !important; min-width: 38px !important; max-width: 38px !important; height: 32px !important; min-height: 32px !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 5px !important; box-shadow: 0 2px 6px rgba(0,0,0,.25) !important; background: rgba(0,0,0,.55) !important; color: #f0f0f0 !important; font: 600 15px/32px system-ui,sans-serif !important; text-align: center !important; cursor: pointer !important; opacity: 1 !important; user-select: none !important; touch-action: none !important; }
            #${FLOATING_MENU_ID} button[aria-pressed="true"] { background: rgba(34,139,34,.85) !important; color: white !important; }
            #${FLOATING_MENU_ID} button, #${FLOATING_MENU_ID} button:hover, #${FLOATING_MENU_ID} button:focus, #${FLOATING_MENU_ID} button:active { text-decoration: none !important; }
            #${FLOATING_MENU_ID} button:hover { background: rgba(0,0,0,.75) !important; }
            #${FLOATING_MENU_ID} button[aria-pressed="true"]:hover { background: rgba(34,139,34,1) !important; }
            #${FLOATING_MENU_ID} [data-floating-close] { position: absolute !important; top: -36px !important; right: 0 !important; }
            #${FLOATING_MENU_ID} [data-floating-toggle] { cursor: move !important; }
            #${FLOATING_MENU_ID} [data-floating-dialog] { position: absolute !important; top: 0 !important; right: 0 !important; width: min(290px, calc(100vw - 24px)) !important; box-sizing: border-box !important; margin: 0 !important; padding: 14px !important; border: 1px solid #777 !important; border-radius: 9px !important; box-shadow: 0 5px 18px rgba(0,0,0,.4) !important; background: #fff !important; color: #111 !important; font: 15px/1.4 system-ui,sans-serif !important; }
            #${FLOATING_MENU_ID} [data-floating-dialog] p { margin: 0 0 10px !important; padding: 0 !important; }
            #${FLOATING_MENU_ID} [data-floating-dialog] button { width: 100% !important; max-width: none !important; margin-top: 7px !important; background: #444 !important; color: #fff !important; }
        `;
        (document.head || document.documentElement).appendChild(style);
        root = document.createElement('div');
        root.id = FLOATING_MENU_ID;
        root.hidden = true;
        root.setAttribute('data-floating-expanded', 'false');
        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = '×';
        close.title = 'Choose where to hide floating tools';
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
        // Use document coordinates so pinch zoom does not anchor the menu to the visual viewport.
        document.documentElement.appendChild(root);

        const settings = floatingMenuSettings();
        let anchorX = Number.isFinite(settings.x) ? settings.x : null;
        let anchorY = Number.isFinite(settings.y) ? Math.max(0, settings.y) : 70;
        const scrollX = () => window.scrollX || 0;
        const scrollY = () => Math.max(0, window.scrollY || 0);
        let documentY = anchorY;
        let previousScrollY = scrollY();
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
            const currentScrollY = scrollY();
            // A temporary placement returns smoothly to the saved clearance on the way up.
            if (currentScrollY < previousScrollY && previousScrollY > 0) {
                documentY = anchorY + (documentY - anchorY) * currentScrollY / previousScrollY;
            }
            if (currentScrollY >= Math.max(documentY, anchorY)) documentY = anchorY;
            previousScrollY = currentScrollY;
            const x = anchorX === null ? window.innerWidth - 38 : anchorX;
            place(scrollX() + Math.max(0, Math.min(x, window.innerWidth - 38)), Math.max(documentY, currentScrollY));
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
            const y = Math.max(0, Math.min(originY + point.clientY - startY, window.innerHeight - 32));
            place(scrollX() + x, scrollY() + y);
        };
        const onEnd = () => {
            if (!dragging) return;
            dragging = false;
            if (moved) {
                const next = floatingMenuSettings();
                anchorX = parseFloat(root.style.left) - scrollX();
                documentY = parseFloat(root.style.top);
                previousScrollY = scrollY();
                // Only a drag at page top changes the persistent top clearance.
                if (previousScrollY === 0) anchorY = documentY;
                next.x = anchorX;
                next.y = anchorY;
                floatingMenuSave(next);
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
            dialog.hidden = true;
            root.setAttribute('data-floating-expanded', String(root.getAttribute('data-floating-expanded') !== 'true'));
            floatingMenuRender(root);
        });
        document.addEventListener('click', (event) => {
            if (event.composedPath && event.composedPath().includes(root)) return;
            for (let target = event.target; target; target = target.parentNode) {
                if (target === root) return;
            }
            if (root.getAttribute('data-floating-expanded') !== 'true') return;
            floatingMenuCollapse(root);
        }, true);
        close.addEventListener('click', () => {
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
    let autoMode = false;
    let autoRestoreError = false;
    let autoTimer = null;
    const AUTO_STYLE_ID = 'tm-force-mobile-auto-style';
    const AUTO_STORAGE = 'tm-force-mobile-auto-v2:' + location.hostname.toLowerCase();
    const AUTO_FAILURE = 'tm-force-mobile-failed:' + location.pathname + location.search;

    const AUTO_FAILURE_V2 = 'tm-force-mobile-failed-v2:' + location.pathname + location.search;
    const isDataExplorer = location.hostname.toLowerCase() === 'data.stackexchange.com';
    let earlyReflow = false;

    function isAndroidBrowser() {
        return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');
    }

    function canStartEarlyReflow() {
        if (!isAndroidBrowser()) return false;
        try {
            if (localStorage.getItem(AUTO_STORAGE) === 'off'
                || sessionStorage.getItem(AUTO_FAILURE_V2) === 'failed') return false;
            return isDataExplorer;
        } catch (_) {
            return isDataExplorer;
        }
    }

    function installEarlyReflow() {
        if (!document.head) return false;
        // If Data Explorer adopts a genuine mobile layout later, leave that authored viewport alone.
        const authored = document.querySelector('meta[name="viewport"]');
        if (authored && !authored.hasAttribute('data-tm-force-mobile-auto')) return true;
        if (!authored) {
            const meta = document.createElement('meta');
            meta.setAttribute('name', 'viewport');
            meta.setAttribute('content', 'width=device-width, initial-scale=1');
            meta.setAttribute('data-tm-force-mobile-auto', 'true');
            document.head.appendChild(meta);
        }
        const style = document.createElement('style');
        style.id = AUTO_STYLE_ID;
        style.textContent = "\nhtml, body { max-width: 100% !important; min-width: 0 !important;\n  -webkit-text-size-adjust: 100% !important; text-size-adjust: 100% !important; }\nbody { font-size: 15px !important; line-height: 1.45 !important; }\nbody p, body li, body blockquote, body article, body section,\nbody h1, body h2, body h3, body h4, body h5, body h6 {\n  line-height: 1.45 !important; height: auto !important; max-height: none !important;\n  overflow-wrap: break-word !important; }\nbody img, body video { max-width: 100% !important; height: auto !important; }\nbody .page, body #topbar .page, body .footerwrap,\nbody #mainbar, body #mainbar-full, body #sidebar,\nbody #query, body #queryText, body #queryText #queryInfo,\nbody #query #aboutSite, body #queryText #aboutSite,\nbody #query-results, body #query-results .subheader .group, body #execution-stats,\nbody #resultsetStats, body #footer-menu, body #metadata .info, body #graph {\n  box-sizing: border-box !important; width: 100% !important;\n  min-width: 0 !important; max-width: 100% !important;\n  margin-left: 0 !important; margin-right: 0 !important; }\nbody .page { padding-left: 6px !important; padding-right: 6px !important; }\nbody #mainbar, body #mainbar-full, body #sidebar,\nbody #queryText #queryInfo, body #query #aboutSite, body #queryText #aboutSite {\n  float: none !important; clear: both !important; }\nbody #header, body #queryText, body #queryText .title,\nbody #query-results .subheader {\n  display: flow-root !important; height: auto !important; min-height: 0 !important; }\nbody #header #logo { max-width: 100% !important; }\nbody #header #menu, body #header .menu,\nbody #header .navigation-links, body #topbar .topbar-links {\n  max-width: 100% !important; height: auto !important; line-height: 1.45 !important;\n  white-space: normal !important; }\nbody #queryText .title h2, body #queryText .title p {\n  float: none !important; clear: both !important; max-width: 100% !important;\n  height: auto !important; line-height: 1.45 !important;\n  white-space: normal !important; overflow-wrap: anywhere !important; }\nbody #query-results .panel, body #query-results .slick-viewport,\nbody .CodeMirror, body .CodeMirror-wrapping, body #sql {\n  box-sizing: border-box !important; max-width: 100% !important; }\nbody pre, body .CodeMirror-scroll, body .slick-viewport {\n  max-width: 100% !important; overflow-x: auto !important; }\nbody .CodeMirror { font-size: 14px !important; line-height: 1.4 !important; }\nbody #graph { overflow-x: auto !important; }\nbody #topbar .page, body #topbar .topbar-links,\nbody #topbar .search-form, body #header #search { max-width: 100% !important; }\nbody #header #search, body #topbar .search-form { float: none !important; clear: both !important; }\nbody #topbar input[type=\"text\"], body #topbar input {\n  box-sizing: border-box !important; max-width: 100% !important; }\nbody #footer, body .footerwrap { overflow-wrap: anywhere !important; }\n#tm-shared-floating-menu#tm-shared-floating-menu {\n  width: 44px !important; gap: 6px !important; transform: translateX(-6px) !important; }\n#tm-shared-floating-menu#tm-shared-floating-menu > button {\n  width: 44px !important; min-width: 44px !important; max-width: 44px !important;\n  height: 44px !important; min-height: 44px !important;\n  font: 600 20px/44px system-ui,sans-serif !important; }\n#tm-shared-floating-menu#tm-shared-floating-menu > [data-floating-close] { top: -50px !important; }\n#tm-shared-floating-menu#tm-shared-floating-menu [data-floating-dialog] button {\n  min-height: 44px !important; height: auto !important; line-height: 1.4 !important; }\n\n/* Header CSS has an independent 710px-wide, floated navigation bar. */\nbody #header #logo {\n  float: none !important; clear: both !important;\n  width: min(230px, 100%) !important; max-width: 100% !important;\n  margin-top: 4px !important; margin-bottom: 4px !important;\n}\nbody nav.primary {\n  box-sizing: border-box !important; float: none !important; clear: both !important;\n  display: block !important; width: 100% !important; min-width: 0 !important;\n  max-width: 100% !important; padding: 0 !important; margin: 0 !important;\n}\nbody nav.primary .nav {\n  float: none !important; width: 100% !important; max-width: 100% !important;\n  font-size: 100% !important;\n}\nbody nav.primary .nav ul {\n  display: flex !important; flex-wrap: wrap !important; gap: 4px !important;\n  margin: 0 !important; padding: 0 !important; width: 100% !important;\n  line-height: normal !important;\n}\nbody nav.primary .nav li {\n  float: none !important; display: inline-block !important;\n  margin: 0 !important; line-height: 1.45 !important;\n  width: auto !important; max-width: 100% !important;\n}\nbody nav.primary .nav a {\n  display: block !important; height: auto !important; min-height: 0 !important;\n  font-size: 15px !important; line-height: 1.45 !important;\n  padding: 5px 8px !important; white-space: normal !important;\n}\nbody .subheader, body .subheader h2 {\n  height: auto !important; min-height: 0 !important; line-height: 1.45 !important;\n}\nbody .subheader h2, body #tabs, body .miniTabs { float: none !important; clear: both !important; }\nbody #tabs a, body .miniTabs a {\n  display: inline-block !important; float: none !important;\n  width: auto !important; height: auto !important; min-height: 0 !important;\n  line-height: 1.4 !important; margin: 3px !important; padding: 4px 6px !important;\n}\n/* Keep very long result table cells inside their own scrolling region. */\nbody #query-results .panel { max-width: 100% !important; overflow-x: auto !important; }\n\nbody #topbar .page { display: flow-root !important; }\n";
        document.head.appendChild(style);
        earlyReflow = true;
        autoMode = true;
        isEnabled = true;
        return true;
    }

    // Set the viewport before the first browser layout to avoid a second text-inflation pass.
    if (canStartEarlyReflow() && !installEarlyReflow()) {
        const earlyObserver = new MutationObserver(() => {
            if (installEarlyReflow()) earlyObserver.disconnect();
        });
        earlyObserver.observe(document, { childList: true, subtree: true });
    }



    // The automatic path deliberately avoids the legacy body * layout overrides.
    // A reversible viewport adjustment is only attempted for a scaled-down desktop layout.
    function mobileAutoEligible() {
        if (!shouldEnforceMinFontSize() || !document.body || document.hidden) return false;
        const agent = typeof navigator === 'undefined' ? '' : navigator.userAgent || '';
        return /Android/i.test(agent) || (!agent && window.innerWidth <= 1100);
    }

    function autoDisabledByUser() {
        try {
            return window.localStorage.getItem(AUTO_STORAGE) === 'off'
                || sessionStorage.getItem(AUTO_FAILURE) === 'failed';
        } catch (_) {
            return false;
        }
    }

    function setAutomaticPreference(disabled) {
        try {
            if (disabled) window.localStorage.setItem(AUTO_STORAGE, 'off');
            else window.localStorage.removeItem(AUTO_STORAGE);
        } catch (_) { /* Ignore unavailable site storage. */ }
    }

    function scaledPageMetrics() {
        const vv = window.visualViewport;
        const scale = vv && Number.isFinite(vv.scale) ? vv.scale : 1;
        const layoutWidth = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
        const physicalWidth = (window.screen && window.screen.width)
            || (vv && vv.width && vv.scale ? vv.width * vv.scale : 0)
            || layoutWidth;
        return { scale, layoutWidth, physicalWidth,
            legacy: scale < 0.85 && layoutWidth > physicalWidth * 1.4 };
    }

    function ownReadableText(element) {
        if (element.childNodes) {
            return Array.from(element.childNodes).filter((child) => child.nodeType === 3)
                .map((child) => child.textContent || '').join('').trim();
        }
        return (element.textContent || '').trim();
    }

    function isReadingElement(element) {
        if (!element || !element.tagName) return false;
        for (let parent = element; parent && parent !== document.body; parent = parent.parentElement) {
            const tag = parent.tagName;
            if (['NAV', 'FOOTER', 'BUTTON', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'CANVAS', 'IFRAME', 'INPUT', 'TEXTAREA'].includes(tag)) return false;
            if (parent.id === FLOATING_MENU_ID || parent.id === AUTO_STYLE_ID ||
                (parent.classList && (parent.classList.contains('CodeMirror') || parent.classList.contains('monaco-editor')))) return false;
        }
        const css = window.getComputedStyle(element);
        if (css.display === 'none' || css.visibility === 'hidden') return false;
        if (typeof element.getClientRects === 'function' && element.getClientRects().length === 0) return false;
        return true;
    }

    function sampleReadingText(scale) {
        const candidates = document.body.querySelectorAll('p, li, td, th, blockquote, pre, span, div, a, label, h1, h2, h3');
        let all = 0, tiny = 0, count = 0;
        for (const element of candidates) {
            if (count >= 260 || all >= 10000) break;
            if (!isReadingElement(element)) continue;
            const content = ownReadableText(element).replace(/\s+/g, ' ');
            if (content.length < 8) continue;
            const size = Number.parseFloat(window.getComputedStyle(element).fontSize);
            if (!Number.isFinite(size) || size <= 0) continue;
            const weight = Math.min(content.length, 300);
            all += weight;
            if (size * scale < 13.5) tiny += weight;
            count += 1;
        }
        return { all, tiny, count, ratio: all ? tiny / all : 0 };
    }

    function detectUnreadableMobilePage() {
        const geometry = scaledPageMetrics();
        const text = sampleReadingText(geometry.scale);
        // Desktop pages shrunk by the browser need less text to establish confidence.
        const legacy = geometry.legacy && text.all >= 60 && text.count >= 2 && text.ratio >= 0.55;
        // Normal mobile pages require sustained, text-heavy evidence; never trigger on a tiny caption.
        const tinyText = !geometry.legacy && geometry.scale >= 0.95
            && text.all >= 180 && text.count >= 3 && text.ratio >= 0.8;
        return { needed: legacy || tinyText, legacy, geometry, text };
    }

    function setAutomaticButtonState() {
        const button = document.querySelector('[data-floating-tool="mobile"]');
        if (!button) return;
        button.setAttribute('aria-pressed', String(isEnabled));
        button.title = isEnabled ? 'Force Mobile View is ON (click to disable)' : 'Force Mobile View is OFF (click to enable)';
    }

    function clearAutoFontOverrides() {
        clearMinimumFontSize();
    }

    function applyAutoTextSize(root) {
        if (!root) return;
        const elements = root.querySelectorAll('p, li, td, th, blockquote, span, div, a, label');
        const targets = [];
        for (const element of elements) {
            if (targets.length >= 300 || !isReadingElement(element) || ownReadableText(element).length < 8) continue;
            targets.push(element);
        }
        for (const element of targets) {
            if (element.hasAttribute(MIN_FONT_FLAG_ATTR)) continue;
            const current = Number.parseFloat(window.getComputedStyle(element).fontSize);
            if (!Number.isFinite(current) || current >= 15) continue;
            const lineHeight = window.getComputedStyle(element).lineHeight;
            element.setAttribute(MIN_FONT_FLAG_ATTR, 'true');
            element.setAttribute(MIN_FONT_VALUE_ATTR, element.style.getPropertyValue('font-size'));
            element.setAttribute(MIN_FONT_PRIORITY_ATTR, element.style.getPropertyPriority('font-size'));
            element.setAttribute(MIN_LINE_HEIGHT_VALUE_ATTR, element.style.getPropertyValue('line-height'));
            element.setAttribute(MIN_LINE_HEIGHT_PRIORITY_ATTR, element.style.getPropertyPriority('line-height'));
            element.style.setProperty('font-size', '15px', 'important');
            element.style.setProperty('line-height', '1.45', 'important');
        }
    }

    function applyAutomaticReadability(detection) {
        // Do not inject a viewport after rendering: browser font boosting can become enormous.
        // Unknown desktop-only layouts are intentionally left unchanged in this safe pilot.
        if (detection.legacy) return;
        autoMode = true;
        isEnabled = true;
        const style = document.createElement('style');
        style.id = AUTO_STYLE_ID;
        style.textContent = [
            'body p, body li, body blockquote, body article, body section,',
            'body h1, body h2, body h3, body h4, body h5, body h6 {',
            'line-height: 1.45 !important; height: auto !important; max-height: none !important;',
            'overflow-wrap: break-word !important; }',
            '#tm-shared-floating-menu#tm-shared-floating-menu { width: 44px !important; gap: 6px !important; transform: translateX(-6px) !important; }',
            '#tm-shared-floating-menu#tm-shared-floating-menu > button { width: 44px !important; min-width: 44px !important; max-width: 44px !important; height: 44px !important; min-height: 44px !important; font: 600 20px/44px system-ui,sans-serif !important; }',
            '#tm-shared-floating-menu#tm-shared-floating-menu > [data-floating-close] { top: -50px !important; }'
        ].join(String.fromCharCode(10));
        (document.head || document.documentElement).appendChild(style);
        applyAutoTextSize(document.body);
        setAutomaticButtonState();
        setTimeout(() => validateAutomaticReadability(detection), 700);
    }

    function undoAutomaticReadability(userDisabled = false) {
        if (earlyReflow) {
            // A navigation is required to restore the pre-viewport desktop layout.
            if (userDisabled) setAutomaticPreference(true);
            autoMode = false;
            isEnabled = false;
            window.location.reload();
            return;
        }
        autoMode = false;
        isEnabled = false;
        const style = document.getElementById(AUTO_STYLE_ID);
        if (style) style.remove();
        clearAutoFontOverrides();
        if (userDisabled) setAutomaticPreference(true);
        setAutomaticButtonState();
    }

    function validateAutomaticReadability(before = { legacy: false, text: { ratio: 0 } }) {
        if (!autoMode) return;
        // CodeMirror caches text and line geometry; refresh only when its API is available.
        for (const element of document.querySelectorAll('.CodeMirror')) {
            if (element.CodeMirror && typeof element.CodeMirror.refresh === 'function') {
                try { element.CodeMirror.refresh(); } catch (_) { /* Keep the rest of the page usable. */ }
            }
        }
        const after = scaledPageMetrics();
        const measuredText = sampleReadingText(after.scale);
        const viewport = Math.max(1, window.innerWidth || after.layoutWidth);
        const horizontalOverflow = document.documentElement.scrollWidth || 0;
        const overflowing = horizontalOverflow > viewport + Math.max(24, viewport * 0.05);
        const failedViewport = before.legacy && after.legacy &&
            measuredText.all >= 60 && measuredText.ratio > 0.55;
        const unreadableStill = !before.legacy && measuredText.all >= 180
            && measuredText.ratio > 0.8 && measuredText.ratio > before.text.ratio - 0.1;
        if (overflowing || failedViewport || unreadableStill) {
            if (earlyReflow) {
                try { sessionStorage.setItem(AUTO_FAILURE_V2, 'failed'); } catch (_) { /* Session only. */ }
                window.location.reload();
                return;
            }
            undoAutomaticReadability();
            try { sessionStorage.setItem(AUTO_FAILURE, 'failed'); } catch (_) { /* Session only. */ }
            autoRestoreError = true;
        }
    }

    function scheduleAutomaticDetection() {
        if (isEnabled || autoMode || !mobileAutoEligible() || autoDisabledByUser() || autoRestoreError) return;
        if (autoTimer) clearTimeout(autoTimer);
        autoTimer = setTimeout(() => {
            autoTimer = null;
            if (isEnabled || autoDisabledByUser() || !mobileAutoEligible()) return;
            const detection = detectUnreadableMobilePage();
            if (detection.needed) applyAutomaticReadability(detection);
        }, 250);
    }


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
            `}\n` +
            `@media (max-width: 768px), (pointer: coarse) {\n` +
            `  p, li, article, blockquote, h1, h2, h3, h4, h5, h6 {\n` +
            `    line-height: 1.45 !important; height: auto !important; max-height: none !important;\n` +
            `  }\n` +
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
        if (autoMode) {
            undoAutomaticReadability(true);
            return;
        }
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
        } else if (isDataExplorer && isAndroidBrowser()) {
            // Restore the early mobile viewport instead of running the destructive legacy CSS.
            setAutomaticPreference(false);
            try { sessionStorage.removeItem(AUTO_FAILURE_V2); } catch (_) { /* Optional. */ }
            window.location.reload();
        } else {
            setAutomaticPreference(false);
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
        if (autoMode) setAutomaticButtonState();
    }

    if (!autoMode && shouldAutoEnableForUrl()) {
        enableForceWidth();
    } else if (!autoMode) {
        onDocumentReady(scheduleAutomaticDetection);
        window.addEventListener('load', scheduleAutomaticDetection, { once: true });
    } else {
        onDocumentReady(() => {
            setAutomaticButtonState();
            setTimeout(validateAutomaticReadability, 1600);
        });
    }

    window.addEventListener('resize', scheduleMinimumFontRefresh);
    window.addEventListener('orientationchange', scheduleMinimumFontRefresh);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', scheduleMinimumFontRefresh);
    }

    onDocumentReady(createFloatingToggleButton);
})();
