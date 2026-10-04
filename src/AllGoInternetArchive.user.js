// ==UserScript==
// @name         All Go InternetArchive Redirect
// @namespace    http://tampermonkey.net/
// @version      2026-10-04_1.4.0
// @description  Add a quick Internet Archive action in the shared floating menu and mark Archive Today links.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AllGoInternetArchive.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AllGoInternetArchive.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=web.archive.org
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
// @grant        none
// ==/UserScript==

(function() {
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

    // Ensure execution only in the top-level window
    if (window !== window.top) {
        return;
    }
    if (floatingMenuForbiddenHost()) return;

    const hostname = window.location.hostname.toLowerCase();
    const archiveTodayHosts = new Set([
        'archive.is',
        'archive.ph',
        'www.404media.co',
        'www.bloomberg.com',
        'www.economist.com',
        'www.ft.com',
        'www.nature.com',
        'www.newscientist.com',
        'www.newyorker.com',
        'www.nytimes.com',
        'www.theatlantic.com',
        'www.wired.com',
        'www.wsj.com',
    ]);
    const isArchiveTodayHost = archiveTodayHosts.has(hostname);
    const excludedHosts = new Set(['web.archive.org', 'archive.is', 'archive.ph']);

    if (excludedHosts.has(hostname)) {
        return;
    }

    const archiveTodayIconUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAABTVBMVEX///8AAADz8/Pr6+vj4+Pw8PD29vaB//94eHheXl5vb2++vr6lpaUvLy9HR0d6///Y2NhlZWWfn58RERGIiIh+fn5YWFgjIyNMTExRUVGWlpbHx8ewsLAcHBySfI4wKy8iRSwtSDlgS1TVztGgkKAFDQVKuFx9/6QZQCN4+a8xck1WvY1n7b0cSjk4Jip0aXQmbyV//4qF/5ssYzVawXiF/8gTLx6B/+Ne2bljzmJw5310/6Fs66skUjyN//Yra1wQOhA5gTkgSSASLBNMl1tp4YZn3o9p1aUPJBkva1Nj08Bh4M46Kzps9mx8/3xTtWM4fkhAk2RKn3tBkHIZQj1y/95d39tvV1lCmkKK/51Gn1KB/9MKMREaPzaVgZBd2HsmOztSpnR0/8BMODho375AkYI4jo4QJyFStKpWtJEpcnIYCg4jVFACGhhImJUNUiOiAAAB30lEQVQ4jW2T+1+aUBjGX0Q5igReV97KrQhwUaOGp8202sxLhVlJuzDdshmtWf//j6MUGpfnBz7nvOd7nsP7wAGwlCACBY6i4RDpVQSSznoqHexge1CxDNDgVSqcTcyr8Xg0Grz/lQ3QVNbnwFAsLMzHi6GlXNgjMr9QyNpAJMMGncDEk2Hbbsl3AkDR6qE0H9uRLK+UCeL1m9V5NeIQM2CNXxdEqfJ2Q96cVUPO0vNz652yvfNeUKsq3k1TNvDisMV/UD7uCDVpr97A+4QPWD1QDj99bh61Wu1OVz4+2fQCp5rWU8Szfr9/fnHZwGiQcAPkQU/T1g+3BUkaj+tYx1df3MDa157Wa54ptZog6dWGjrlFN7CsKcq370fWftVodJGlgRvI/xBFsVMVxXK5LPPD4WCQdgOjn4IgNVtjVTUwqj85/HIDBSuB2vX10ysaWEaY4248bfKS1UB33G7v/j6eoAZ3m/IAo3Njr0JUJpPbiWnecVzaF3Wp3t34c2ElgIbocWrGfQDwho47WOfu7zh0T/s/FsBfK2IZnUzR1UMGggAYlfan5sOjeUNBMABAFpliwal6AIqh2ViSpmNsLp/wAVSMTTKUPS9kc2zx+Z90APKFtiH473YHXv/8DPgHzf5GQr2yBUMAAAAASUVORK5CYII=';
    const archiveTodayIconSymbol = Symbol('archiveTodayIconElement');

    function createArchiveTodayIconWrapper() {
        const wrapper = document.createElement('span');
        wrapper.className = 'agi-archive-today-icon';
        wrapper.style.display = 'inline-block';
        wrapper.style.verticalAlign = 'middle';
        wrapper.style.lineHeight = '1';
        wrapper.style.margin = '0 4px';
        
        const icon = document.createElement('img');
        icon.src = archiveTodayIconUrl;
        icon.alt = 'Archive Today';
        icon.style.width = '16px';
        icon.style.height = '16px';
        icon.style.borderRadius = '2px';
        icon.style.display = 'block';
        icon.style.margin = '0';

        wrapper.appendChild(icon);
        return wrapper;
    }

    function removeArchiveTodayIcon(link) {
        const existing = link[archiveTodayIconSymbol];
        if (existing) {
            if (typeof existing.remove === 'function') {
                existing.remove();
            } else if (existing.parentNode) {
                existing.parentNode.removeChild(existing);
            }
            delete link[archiveTodayIconSymbol];
        }
    }

    function addArchiveTodayIcon(link) {
        if (link[archiveTodayIconSymbol]) {
            return;
        }

        const wrapper = createArchiveTodayIconWrapper();
        link.insertBefore(wrapper, link.firstChild);
        link[archiveTodayIconSymbol] = wrapper;
    }

    function updateArchiveTodayIcon(link) {
        if (!(link instanceof HTMLAnchorElement)) {
            return;
        }

        const href = link.getAttribute('href');
        if (!href) {
            removeArchiveTodayIcon(link);
            return;
        }

        let url;
        try {
            url = new URL(href, document.baseURI);
        } catch (error) {
            removeArchiveTodayIcon(link);
            return;
        }

        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            removeArchiveTodayIcon(link);
            return;
        }

        const linkHost = url.hostname.toLowerCase();
        if (archiveTodayHosts.has(linkHost)) {
            addArchiveTodayIcon(link);
        } else {
            removeArchiveTodayIcon(link);
        }
    }

    function updateArchiveTodayIconsInRoot(root) {
        if (!root || typeof root.querySelectorAll !== 'function') {
            return;
        }

        const links = root.querySelectorAll('a[href]');
        for (let i = 0; i < links.length; i += 1) {
            updateArchiveTodayIcon(links[i]);
        }
    }

    function processAddedNode(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        const element = node;
        const tagName = element.tagName ? element.tagName.toUpperCase() : '';
        if (tagName === 'A' && element.hasAttribute('href')) {
            updateArchiveTodayIcon(element);
        }

        updateArchiveTodayIconsInRoot(element);
    }

    function initializeArchiveTodayLinkIcons() {
        if (!document.body) {
            return;
        }

        updateArchiveTodayIconsInRoot(document);

        const observer = new MutationObserver((mutationsList) => {
            for (let i = 0; i < mutationsList.length; i += 1) {
                const mutation = mutationsList[i];
                if (mutation.type === 'childList') {
                    const addedNodes = mutation.addedNodes;
                    for (let j = 0; j < addedNodes.length; j += 1) {
                        processAddedNode(addedNodes[j]);
                    }
                } else if (mutation.type === 'attributes' &&
                           mutation.attributeName === 'href' &&
                           mutation.target &&
                           mutation.target.tagName &&
                           mutation.target.tagName.toUpperCase() === 'A') {
                    updateArchiveTodayIcon(mutation.target);
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href'],
        });
    }

    function onDocumentReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
        } else {
            callback();
        }
    }

    onDocumentReady(initializeArchiveTodayLinkIcons);

    if (floatingMenuDisabled()) return;

    function createFloatingGoButton() {
        if (!document.body) {
            return;
        }

        const goButton = document.createElement('button');
        goButton.type = 'button';
        goButton.textContent = '→';
        goButton.addEventListener('click', () => {
            const targetUrl = window.location.href;
            if (isArchiveTodayHost) {
                window.location.href = `https://archive.is/submit/?url=${targetUrl}`;
            } else {
                window.location.href = `https://web.archive.org/${targetUrl}`;
            }
        });
        registerFloatingButton('archive', goButton);
    }

    onDocumentReady(createFloatingGoButton);
})();
