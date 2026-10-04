// ==UserScript==
// @name         InternetArchive Redirect
// @namespace    http://tampermonkey.net/
// @version      2026-10-04_1.6.0
// @description  Send most paywall articles to Internet Archive for archiving, hide fixed titles, and offer an Archive Today fallback.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/InternetArchive.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/InternetArchive.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=web.archive.org
// @match        https://web.archive.org/*
// @exclude      *://christorng.idv.tw/*
// @exclude      *://*.christorng.idv.tw/*
// @match        https://fortune.com/*
// @match        https://nautil.us/*
// @match        https://www.australiangeographic.com.au/*
// @match        https://www.bbc.com/*
// @match        https://www.cnbc.com/*
/// @match        https://www.economist.com/*
/// @match        https://www.ft.com/*
// @match        https://www.lrb.co.uk/*
/// @match        https://www.newyorker.com/*
/// @match        https://www.nytimes.com/*
// @match        https://www.scientificamerican.com/*
// @match        https://www.rawstory.com/*
// @match        https://www.scmp.com/*
// @match        https://www.smh.com.au/*
/// @match        https://www.theatlantic.com/*
// @match        https://www.thetimes.com/*
// @match        https://www.theverge.com/*
// @match        https://www.washingtonpost.com/*
/// @match        https://www.wsj.com/*

/// from ArchiveToday.user.js, because of human check may loses target URL
// @match        https://www.404media.co/*
// @match        https://www.bloomberg.com/*
// @match        https://www.economist.com/*
// @match        https://www.ft.com/*
// @match        https://www.nature.com/*
// @match        https://www.newscientist.com/*
// @match        https://www.newyorker.com/*
// @match        https://www.nytimes.com/*
// @match        https://www.theatlantic.com/*
// @match        https://www.wired.com/*
// @match        https://www.wsj.com/*

// @grant        none
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

    if (window.location.hostname === 'web.archive.org') {
        const currentUrl = window.location.href;
        const match = currentUrl.match(/\/web\/\d+\*?\/(.*)/);
        if (match && !floatingMenuDisabled()) {
            const mountGoButton = () => {
                if (!document.body) return;
                const goButton = document.createElement('button');
                goButton.type = 'button';
                goButton.textContent = '→';
                goButton.addEventListener('click', () => {
                    window.location.href = `https://archive.is/submit/?url=${match[1]}`;
                });
                registerFloatingButton('archive', goButton);
            };
            if (document.body) {
                mountGoButton();
            } else {
                document.addEventListener('DOMContentLoaded', mountGoButton, { once: true });
            }
        }

        // 等待 DOM 完全載入後再執行
        window.addEventListener('load', function () {
            try {
                let timer;

                function handleWmIppBase() {
                    const wmIppBase = document.getElementById('wm-ipp-base');
                    if (wmIppBase) {
                        wmIppBase.style = 'display: none !important';
                        console.log('已成功隱藏標題列元素');
                        return true;
                    }
                    console.log('尚未找到標題列元素，繼續等待...');
                    return false;
                }

                // 設定 MutationObserver 監控 DOM 變化
                const observer = new MutationObserver((mutations, obs) => {
                    if (handleWmIppBase()) {
                        console.log('成功：停止監控 DOM 變化');
                        obs.disconnect(); // 成功後停止觀察
                        clearTimeout(timer);
                    }
                });

                observer.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });

                // 設定 10 秒後停止觀察
                timer = setTimeout(() => {
                    observer.disconnect();
                    console.log('觀察超時：停止監控 DOM 變化');
                }, 10000);

            } catch (error) {
                console.error('執行腳本時發生錯誤:', error);
            }
        });
        return;
    }

    // 其他網站的重定向邏輯
    const archiveUrl = `https://web.archive.org/${window.location.href}`;

    console.log(`重定向至 web.archive.org: ${archiveUrl}`);

    // 重定向到 Internet Archive 頁面
    window.location.replace(archiveUrl);
})();
