// ==UserScript==
// @name         Translate Preformatted Text
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-11-08_1.5.21
// @description  Translate formatted text and offer a draggable, standalone reader for accessible embedded articles; improve Astro and Wikipedia.
// @author       Chris Torng
// @match        *://*/*
// @exclude      *://*.christorng.idv.tw/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @sandbox      raw
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';


    // BEGIN EMBEDDED READER BRIDGE
    // Runs in both top-level pages and their accessible iframes. A frame must
    // actively report readable content before any control is displayed.
    // Never reuse the iframe URL as the standalone reading URL.
    const readerBridgeChannel = 'tm-embedded-reader-v1';
    const readerBridgeUrl = 'https://christorng.idv.tw/TampermonkeyScripts/IframeViewer.html';
    const readerBridgeKey = 'tm-embedded-reader:';
    const readerHandoffLifetime = 10 * 60 * 1000; // GM storage is only a short handoff.
    const isReaderDocument = location.origin === 'https://christorng.idv.tw'
        && location.pathname === '/TampermonkeyScripts/IframeViewer.html';
    const isOwnerSite = /(^|\.)christorng\.idv\.tw$/i.test(location.hostname);
    const readerForbiddenTags = new Set([
        'SCRIPT', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT',
        'BUTTON', 'SELECT', 'TEXTAREA', 'META', 'BASE', 'LINK', 'STYLE',
        'TEMPLATE', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO'
    ]);
    const readerStyleProperties = [
        'display', 'font-family', 'font-size', 'font-weight', 'font-style',
        'line-height', 'letter-spacing', 'color', 'background-color',
        'text-align', 'text-decoration', 'white-space', 'word-break',
        'list-style-type', 'list-style-position', 'margin', 'padding',
        'border', 'border-radius', 'vertical-align'
    ];

    function readerCleanAttributes(element, baseUrl, allowStyle = false) {
        for (const attr of Array.from(element.attributes || [])) {
            const name = attr.name.toLowerCase();
            if (!['href', 'src', 'alt', 'title', 'colspan', 'rowspan'].includes(name)
                && !(allowStyle && name === 'style')) {
                element.removeAttribute(attr.name);
                continue;
            }
            if (name !== 'href' && name !== 'src') continue;
            try {
                const value = new URL(attr.value, baseUrl);
                const isImageData = name === 'src'
                    && /^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(attr.value)
                    && attr.value.length < 120000;
                if (!['https:', 'http:'].includes(value.protocol) && !isImageData) {
                    element.removeAttribute(attr.name);
                } else {
                    element.setAttribute(attr.name, isImageData ? attr.value : value.href);
                }
            } catch (_) {
                element.removeAttribute(attr.name);
            }
        }
        if (element.tagName === 'A') element.setAttribute('rel', 'noopener noreferrer');
    }

    function readerText() {
        return (document.body && (document.body.innerText || document.body.textContent) || '').trim();
    }

    function readerCapture() {
        const text = readerText();
        if (text.length < 100 || !document.body) throw new Error('No readable article content');
        if (document.body.querySelector('input[type="password"]')) throw new Error('Login form excluded');
        const sourceNodes = [document.body, ...document.body.querySelectorAll('*')];
        if (sourceNodes.length > 3000) throw new Error('Article exceeds element limit');
        const copy = document.body.cloneNode(true);
        const copyNodes = [copy, ...copy.querySelectorAll('*')];
        for (let index = 0; index < sourceNodes.length; index++) {
            const source = sourceNodes[index];
            const target = copyNodes[index];
            if (!target) continue;
            if (readerForbiddenTags.has(source.tagName)) {
                target.remove();
                continue;
            }
            const computed = getComputedStyle(source);
            if (computed.display === 'none' || computed.visibility === 'hidden') {
                target.remove();
                continue;
            }
            readerCleanAttributes(target, location.href);
            const declarations = [];
            for (const property of readerStyleProperties) {
                const value = computed.getPropertyValue(property);
                if (value && value.length <= 160 && !/url\s*\(/i.test(value)) {
                    declarations.push(property + ':' + value);
                }
            }
            if (declarations.length) target.setAttribute('style', declarations.join(';'));
        }
        const wrapper = document.createElement('div');
        wrapper.setAttribute('lang', document.documentElement.lang || 'en');
        if (copy.hasAttribute('style')) wrapper.setAttribute('style', copy.getAttribute('style'));
        wrapper.innerHTML = copy.innerHTML;
        const html = wrapper.outerHTML;
        if (html.length > 1800000) throw new Error('Article exceeds capture limit');
        return { html, title: document.title.slice(0, 160) };
    }

    function startReaderInFrame() {
        if (window === window.parent) return;
        function announce() {
            if (!document.body || document.body.querySelector('input[type="password"]')) return;
            const text = readerText();
            if (text.length >= 100) {
                window.parent.postMessage({
                    channel: readerBridgeChannel, type: 'ready', textLength: text.length
                }, '*');
            }
        }
        window.addEventListener('message', (event) => {
            if (event.source !== window.parent) return;
            const data = event.data;
            if (!data || data.channel !== readerBridgeChannel) return;
            if (data.type === 'probe') announce();
            if (data.type !== 'capture' || !/^[a-z0-9-]{8,80}$/i.test(data.id || '')) return;
            try {
                const result = readerCapture();
                window.parent.postMessage({
                    channel: readerBridgeChannel, type: 'captured', id: data.id,
                    html: result.html, title: result.title
                }, '*');
            } catch (error) {
                window.parent.postMessage({
                    channel: readerBridgeChannel, type: 'failed', id: data.id,
                    message: String(error && error.message || error)
                }, '*');
            }
        });
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', announce, { once: true });
        } else announce();
        window.addEventListener('load', announce);
        [500, 1500, 4000].forEach((delay) => setTimeout(announce, delay));
    }

    function startReaderInParent() {
        if (window !== window.top) return;
        const known = new WeakMap();
        let sequence = 0;
        function eligible(frame) {
            if (!frame || !frame.isConnected || !frame.contentWindow) return false;
            const raw = frame.getAttribute('src');
            if (!raw) return false;
            try {
                const address = new URL(raw, document.baseURI || location.href);
                if (!['http:', 'https:'].includes(address.protocol)) return false;
                if (/^(?:www\.)?(?:youtube\.com|youtube-nocookie\.com|vimeo\.com|google\.com|recaptcha\.net|doubleclick\.net)$/.test(address.hostname)) return false;
            } catch (_) { return false; }
            const bounds = frame.getBoundingClientRect();
            return bounds.width >= 180 && bounds.height >= 85;
        }
        function sourceFrame(source) {
            return Array.from(document.querySelectorAll('iframe[src]'))
                .find((frame) => frame.contentWindow === source && eligible(frame));
        }
        function probe() {
            for (const frame of document.querySelectorAll('iframe[src]')) {
                if (eligible(frame)) frame.contentWindow.postMessage({
                    channel: readerBridgeChannel, type: 'probe'
                }, '*');
            }
        }
        function addButton(frame) {
            if (known.has(frame) || !document.body) return known.get(frame);
            const bounds = frame.getBoundingClientRect();
            const button = document.createElement('button');
            const width = 44;
            button.type = 'button';
            button.className = 'tm-iframe-translate-open';
            button.textContent = '譯↗';
            button.title = '擷取 iframe 內容，另開獨立檢視頁';
            // Document coordinates, not fixed/sticky; scrolling never follows the button.
            const left = Math.max(0, Math.round((window.scrollX || 0)
                + Math.min(bounds.right, document.documentElement.clientWidth) - width - 6));
            const top = Math.max(0, Math.round((window.scrollY || 0) + bounds.top + 6));
            button.style.cssText = 'position:absolute !important;left:' + left
                + 'px !important;top:' + top + 'px !important;right:auto !important;'
                + 'bottom:auto !important;width:44px !important;'
                + 'height:32px !important;padding:0 3px !important;'
                + 'background:rgba(0,0,0,.35) !important;color:rgba(255,255,255,.75) !important;'
                + 'opacity:.5 !important;border:0 !important;box-shadow:none !important;'
                + 'border-radius:4px !important;font:600 15px/22px system-ui,sans-serif !important;'
                + 'z-index:2147483646 !important;cursor:pointer !important;touch-action:none !important;';
            button.addEventListener('pointerenter', () => { button.style.opacity = '.9'; });
            button.addEventListener('pointerleave', () => { button.style.opacity = '.5'; });
            let drag = null;
            let ignoreClick = false;
            let currentLeft = left, currentTop = top;
            button.addEventListener('pointerdown', (event) => {
                if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
                drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
                    left: currentLeft, top: currentTop, moved: false };
                ignoreClick = false;
                button.setPointerCapture?.(event.pointerId);
                event.stopPropagation?.();
            });
            button.addEventListener('pointermove', (event) => {
                if (!drag || event.pointerId !== drag.id) return;
                const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
                if (!drag.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
                drag.moved = true;
                event.preventDefault?.();
                const pageWidth = document.documentElement.scrollWidth
                    || document.documentElement.clientWidth || window.innerWidth;
                const pageHeight = document.documentElement.scrollHeight
                    || document.documentElement.clientHeight || window.innerHeight;
                const maxX = Math.max(0, pageWidth - width);
                const maxY = Math.max(0, pageHeight - 32);
                currentLeft = Math.min(maxX, Math.max(0, drag.left + dx));
                currentTop = Math.min(maxY, Math.max(0, drag.top + dy));
                button.style.setProperty('left', currentLeft + 'px', 'important');
                button.style.setProperty('top', currentTop + 'px', 'important');
            });
            const finish = (event) => {
                if (!drag || event.pointerId !== drag.id) return;
                ignoreClick = drag.moved;
                drag = null;
                if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId);
            };
            button.addEventListener('pointerup', finish);
            button.addEventListener('pointercancel', finish);
            button.addEventListener('click', (event) => {
                if (ignoreClick) {
                    ignoreClick = false;
                    event.preventDefault?.();
                    event.stopImmediatePropagation?.();
                }
            }, true);
            button.addEventListener('click', () => {
                const info = known.get(frame);
                if (!info || info.pending) return;
                const id = Date.now().toString(36) + '-' + (++sequence).toString(36)
                    + '-' + Math.random().toString(36).slice(2, 9);
                info.pending = id;
                button.disabled = true;
                button.textContent = '擷取中';
                frame.contentWindow.postMessage({
                    channel: readerBridgeChannel, type: 'capture', id
                }, '*');
                setTimeout(() => {
                    if (info.pending !== id) return;
                    info.pending = null;
                    button.disabled = false;
                    button.textContent = '重試↗';
                }, 12000);
            });
            document.body.appendChild(button);
            const info = { button, pending: null };
            known.set(frame, info);
            return info;
        }
        window.addEventListener('message', async (event) => {
            const frame = sourceFrame(event.source);
            if (!frame) return;
            const data = event.data;
            if (!data || data.channel !== readerBridgeChannel) return;
            if (data.type === 'ready' && Number(data.textLength) >= 100) {
                addButton(frame);
                return;
            }
            const info = known.get(frame);
            if (!info || !info.pending || info.pending !== data.id) return;
            if (data.type === 'failed') {
                info.pending = null;
                info.button.disabled = false;
                info.button.textContent = '重試↗';
                return;
            }
            if (data.type !== 'captured' || typeof data.html !== 'string'
                || data.html.length > 1800000) return;
            const id = info.pending;
            info.pending = null;
            try {
                await Promise.resolve(GM_setValue(readerBridgeKey + id, {
                    html: data.html, createdAt: Date.now()
                }));
                // Every opener receives a distinct ID; source metadata stays in
                // the URL even if the HTML session cache is later unavailable.
                const query = new URLSearchParams({
                    id,
                    title: document.title || String(data.title || ''),
                    url: location.href
                });
                GM_openInTab(readerBridgeUrl + '?' + query.toString(), { active: true });
                void readerPruneHandoffs();
                info.button.textContent = '譯↗';
            } catch (_) {
                info.button.textContent = '重試↗';
            }
            info.button.disabled = false;
        });
        function whenReady() {
            probe();
            let times = 0;
            const timer = setInterval(() => {
                probe();
                if (++times >= 12) clearInterval(timer);
            }, 1000);
            new MutationObserver((mutations) => {
                if (mutations.some((mutation) => Array.from(mutation.addedNodes || [])
                    .some((node) => node.nodeType === 1
                        && (node.tagName === 'IFRAME' || node.querySelector?.('iframe'))))) {
                    probe();
                }
            }).observe(document.documentElement, { childList: true, subtree: true });
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', whenReady, { once: true });
        } else whenReady();
    }

    // The persistent GM slot is only a temporary cross-origin handoff. Once
    // a reader tab imports the HTML, it keeps its own copy in sessionStorage.
    // That copy survives refresh and expires when the tab is closed.
    async function readerPruneHandoffs() {
        try {
            const keys = (await Promise.resolve(GM_listValues()))
                .filter((key) => key.startsWith(readerBridgeKey));
            const valid = [];
            for (const key of keys) {
                const entry = await Promise.resolve(GM_getValue(key, null));
                if (!entry || typeof entry.html !== 'string'
                    || !Number.isFinite(entry.createdAt)
                    || Date.now() - entry.createdAt > readerHandoffLifetime) {
                    await Promise.resolve(GM_deleteValue(key));
                } else valid.push({ key, createdAt: entry.createdAt });
            }
            valid.sort((a, b) => b.createdAt - a.createdAt);
            for (const stale of valid.slice(6)) await Promise.resolve(GM_deleteValue(stale.key));
        } catch (_) { /* Optional cleanup must not block the reader. */ }
    }

    function readerOriginalUrl(value) {
        if (!value) return null;
        try {
            const url = new URL(value);
            if (!['http:', 'https:'].includes(url.protocol)
                || url.href === location.href
                || url.href.startsWith(readerBridgeUrl + '?')) return null;
            return url.href;
        } catch (_) { return null; }
    }

    function startStandaloneReader() {
        const query = new URL(location.href).searchParams;
        const id = query.get('id');
        if (!/^[a-z0-9-]{8,80}$/i.test(id || '')) return;
        const originalUrl = readerOriginalUrl(query.get('url'));
        const originalTitle = query.get('title') || originalUrl || '原始網頁';
        // @run-at document-start: these elements are not necessarily parsed
        // yet, so render the permanent source link only after the body exists.
        function renderSourceHeader() {
            const link = document.getElementById('iframe-viewer-source-link');
            const sourceAddress = document.getElementById('iframe-viewer-source-url');
            if (link) {
                link.textContent = originalTitle;
                if (originalUrl) link.href = originalUrl;
                else link.removeAttribute('href');
            }
            if (sourceAddress) sourceAddress.textContent = originalUrl || '';
            document.title = originalTitle;
            document.documentElement.lang = 'en';
        }

        const sessionKey = 'tm-iframe-viewer:' + id;
        const handoffKey = readerBridgeKey + id;
        let attempts = 0, completed = false, loading = false;
        async function load() {
            if (completed || loading) return;
            const target = document.getElementById('iframe-viewer-content');
            if (!target) return;
            renderSourceHeader();
            loading = true;
            try {
                let record = null;
                try {
                    const cached = sessionStorage.getItem(sessionKey);
                    if (cached) record = JSON.parse(cached);
                } catch (_) { /* Cache may be disabled. */ }
                let transferred = false;
                if (!record || typeof record.html !== 'string') {
                    record = await Promise.resolve(GM_getValue(handoffKey, null));
                    transferred = true;
                }
                if (record && typeof record.html === 'string'
                    && (!transferred || Date.now() - record.createdAt <= readerHandoffLifetime)) {
                    const template = document.createElement('template');
                    template.innerHTML = record.html;
                    for (const item of Array.from(template.content.querySelectorAll('*'))) {
                        if (readerForbiddenTags.has(item.tagName)) {
                            item.remove();
                            continue;
                        }
                        readerCleanAttributes(item, readerBridgeUrl, true);
                        if (item.hasAttribute('style')) {
                            for (const property of Array.from(item.style)) {
                                if (!readerStyleProperties.includes(property)
                                    || /url\s*\(/i.test(item.style.getPropertyValue(property))) {
                                    item.style.removeProperty(property);
                                }
                            }
                        }
                    }
                    target.replaceChildren(template.content);
                    if (transferred) {
                        let saved = false;
                        try {
                            sessionStorage.setItem(sessionKey, JSON.stringify(record));
                            saved = true;
                        } catch (_) { /* Retain GM copy if session cache is not available. */ }
                        if (saved) await Promise.resolve(GM_deleteValue(handoffKey));
                    }
                    completed = true;
                    clearInterval(interval);
                    return;
                }
                if (++attempts >= 32) {
                    completed = true;
                    clearInterval(interval);
                    if (originalUrl) location.replace(originalUrl);
                    else target.textContent = '找不到暫存內容，且沒有有效的原始網址。';
                }
            } finally {
                loading = false;
            }
        }
        const interval = setInterval(() => { void load(); }, 250);
        void load();
        void readerPruneHandoffs();
    }

    if (isReaderDocument) { startStandaloneReader(); return; }
    // The main site was excluded by @exclude before introducing the reader.
    if (isOwnerSite) return;
    if (window === window.top) startReaderInParent();
    else startReaderInFrame();
    // END EMBEDDED READER BRIDGE

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
            ['reset', 'Reset floating button position'],
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
        // Fixed positioning prevents the menu from changing document scrollWidth.
        // The visual viewport can differ from the layout viewport on legacy mobile pages.
        const menuWidth = 38;
        // This legacy desktop-width document places CSS-fixed controls outside
        // the visual scrolling viewport on Android Edge. Use a bounded document
        // position for it; other sites retain their existing fixed behavior.
        const documentDock = /(^|\.)openssh\.org$/i.test(location.hostname)
            && location.pathname === '/releasenotes.html';
        const layoutWidth = () => Math.max(menuWidth, Math.min(
            window.innerWidth || menuWidth,
            document.documentElement.clientWidth || window.innerWidth || menuWidth));
        const visualBounds = () => {
            const viewport = window.visualViewport;
            return {
                left: viewport ? viewport.offsetLeft : 0,
                top: viewport ? viewport.offsetTop : 0,
                width: Math.max(menuWidth, viewport ? viewport.width : layoutWidth()),
            };
        };
        const clampX = (x) => {
            const viewport = visualBounds();
            return Math.max(viewport.left, Math.min(x, viewport.left + viewport.width - menuWidth));
        };
        const scrollX = () => Math.max(0, window.scrollX || 0);
        // Older pages and mobile browser engines can scroll through body/html
        // while window.scrollY remains zero; read all root-scroller representations.
        const scrollY = () => {
            const viewport = window.visualViewport;
            const viewportPageScroll = viewport && Number.isFinite(viewport.pageTop)
                ? viewport.pageTop - (viewport.offsetTop || 0) : 0;
            return Math.max(0, window.scrollY || 0,
                document.scrollingElement ? document.scrollingElement.scrollTop || 0 : 0,
                document.documentElement.scrollTop || 0,
                document.body ? document.body.scrollTop || 0 : 0,
                viewportPageScroll);
        };
        // Capture an overflow ceiling before moving the menu. Never let the
        // absolutely-positioned handle enlarge the document and then chase it.
        const unzoomedDocumentWidth = Math.max(
            layoutWidth(), document.documentElement.scrollWidth || 0);
        const pageTop = () => {
            const viewport = window.visualViewport;
            return Math.max(scrollY(), viewport && Number.isFinite(viewport.pageTop)
                ? viewport.pageTop : 0);
        };
        const pageLeft = () => {
            const viewport = window.visualViewport;
            return Math.max(scrollX(), viewport && Number.isFinite(viewport.pageLeft)
                ? viewport.pageLeft : 0);
        };
        const dockX = () => {
            const viewport = visualBounds();
            const relativeX = anchorX === null ? viewport.width - menuWidth : anchorX;
            return Math.max(0, Math.min(
                pageLeft() + Math.max(0, Math.min(relativeX, viewport.width - menuWidth)),
                unzoomedDocumentWidth - menuWidth));
        };
        let documentY = anchorY;
        let previousScrollY = scrollY();
        // A scale change alone is NOT a pinch gesture. Legacy desktop-width pages
        // (e.g. OpenSSH on Android) can auto-refit after load/translation or when
        // the browser toolbar moves, which previously froze the vertical menu.
        let normalScale = window.visualViewport ? window.visualViewport.scale : 1;
        let pinchGestureArmed = false;
        const zoomed = () => {
            if (!window.visualViewport) return false;
            const current = window.visualViewport.scale;
            if (!pinchAnchored && !pinchGestureArmed) normalScale = current;
            return (pinchAnchored || pinchGestureArmed) && current > normalScale * 1.01;
        };
        document.addEventListener('touchstart', (event) => {
            if (!pinchAnchored && event.touches && event.touches.length >= 2) {
                normalScale = window.visualViewport ? window.visualViewport.scale : 1;
                pinchGestureArmed = true;
            }
        }, { capture: true, passive: true });
        document.addEventListener('touchend', (event) => {
            if (!pinchAnchored && (!event.touches || event.touches.length < 2)) {
                pinchGestureArmed = false;
            }
        }, { capture: true, passive: true });
        document.addEventListener('touchcancel', () => {
            if (!pinchAnchored) pinchGestureArmed = false;
        }, { capture: true, passive: true });
        const place = (x, y, fixed) => {
            root.style.setProperty('position', fixed ? 'fixed' : 'absolute', 'important');
            root.style.setProperty('left', `${x}px`, 'important');
            root.style.setProperty('top', `${y}px`, 'important');
            root.style.setProperty('right', 'auto', 'important');
        };
        let pinchAnchored = false;
        const position = () => {
            if (dragging) return;
            if (zoomed()) {
                if (!pinchAnchored) {
                    // Freeze the document position when pinch-zoom starts. Switching
                    // from fixed to absolute stops following the visual viewport.
                    if (!documentDock) {
                        const documentWidth = Math.max(unzoomedDocumentWidth, layoutWidth(), document.documentElement.scrollWidth || 0);
                        const x = Math.max(0, Math.min(scrollX() + parseFloat(root.style.left), documentWidth - menuWidth));
                        place(x, scrollY() + parseFloat(root.style.top), false);
                    }
                    pinchAnchored = true;
                }
                // Keep the handle's physical size unchanged at higher zoom levels.
                root.style.setProperty('transform', `scale(${normalScale / window.visualViewport.scale})`, 'important');
                root.style.setProperty('transform-origin', 'top right', 'important');
                return;
            }
            if (pinchAnchored) {
                pinchAnchored = false;
                pinchGestureArmed = false;
                root.style.removeProperty('transform');
                root.style.removeProperty('transform-origin');
                previousScrollY = scrollY();
            }
            const currentScrollY = scrollY();
            // A temporary placement returns smoothly to the saved clearance on the way up.
            if (currentScrollY < previousScrollY && previousScrollY > 0) {
                documentY = anchorY + (documentY - anchorY) * currentScrollY / previousScrollY;
            }
            if (currentScrollY >= Math.max(documentY, anchorY)) documentY = anchorY;
            previousScrollY = currentScrollY;
            const viewport = visualBounds();
            const x = anchorX === null ? viewport.width - menuWidth : anchorX;
            // CSS position:fixed uses the layout viewport's top. Adding
            // visualViewport.offsetTop here double-counts mobile viewport
            // panning on desktop-width pages, leaving the handle far below
            // the top until translation changes the page's reflow.
            if (documentDock) {
                place(dockX(), Math.max(documentY, pageTop()), false);
            } else {
                place(clampX(viewport.left + x),
                    Math.max(documentY, currentScrollY) - currentScrollY, true);
            }
        };

        let dragging = false;
        let moved = false;
        let startX = 0;
        let startY = 0;
        let originX = 0;
        let originY = 0;
        // Start inside the visual viewport without contributing to page overflow.
        const viewport = visualBounds();
        if (documentDock) {
            place(dockX(), Math.max(anchorY, pageTop()), false);
        } else {
            place(clampX(viewport.left + (anchorX === null ? viewport.width - menuWidth : anchorX)),
                Math.max(anchorY - scrollY(), 0), true);
        }
        window.addEventListener('scroll', position, { passive: true });
        // Capture scroll on body/html in browsers that don't forward it to window.
        document.addEventListener('scroll', position, { capture: true, passive: true });
        window.addEventListener('resize', position);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', position);
            window.visualViewport.addEventListener('scroll', position);
        }
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
            const x = clampX(originX + point.clientX - startX);
            const y = Math.max(0,
                Math.min(originY + point.clientY - startY,
                    (window.visualViewport ? window.visualViewport.height : window.innerHeight) - 32));
            if (documentDock) {
                const documentX = Math.max(0, Math.min(pageLeft() + x - visualBounds().left,
                    unzoomedDocumentWidth - menuWidth));
                place(documentX, pageTop() + y, false);
            } else {
                place(x, y, true);
            }
        };
        const onEnd = () => {
            if (!dragging) return;
            dragging = false;
            if (moved) {
                const next = floatingMenuSettings();
                anchorX = parseFloat(root.style.left) - (documentDock ? pageLeft() : visualBounds().left);
                documentY = parseFloat(root.style.top) + (documentDock ? 0 : scrollY());
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
            if (zoomed() || pinchGestureArmed) return;
            const point = pointer(event);
            dragging = true;
            moved = false;
            startX = point.clientX;
            startY = point.clientY;
            originX = parseFloat(root.style.left) - (documentDock ? pageLeft() - visualBounds().left : 0);
            originY = parseFloat(root.style.top) - (documentDock ? pageTop() : 0);
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
            if (scope === 'reset') {
                const next = floatingMenuSettings();
                delete next.x;
                delete next.y;
                floatingMenuSave(next);
                window.location.reload();
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

    if (floatingMenuForbiddenHost()) return;

    // BEGIN SHARED TRANSIENT CONTROL
    // Shared source for draggable in-content controls. Run scripts/sync-transient-controls.js after editing.
    const transientControlLayouts = new Set();
    let transientControlFrame = null;
    function refreshTransientControls() {
        if (transientControlFrame !== null) return;
        transientControlFrame = window.requestAnimationFrame(() => {
            transientControlFrame = null;
            transientControlLayouts.forEach((layout) => layout());
        });
    }
    window.addEventListener('scroll', refreshTransientControls, { capture: true, passive: true });
    window.addEventListener('resize', refreshTransientControls);
    document.addEventListener('fullscreenchange', refreshTransientControls);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('scroll', refreshTransientControls);
        window.visualViewport.addEventListener('resize', refreshTransientControls);
    }

    function makeTransientControlDraggable(button, container, { bottom = false, size = 24, height = size, inset = 6,
        stationaryOnPinchZoom = false, avoidFloatingMenu = false } = {}) {
        let placement = null;
        let drag = null;
        let suppressClick = false;
        let observer;
        let positioned = false;
        let normalScale = Math.min(1, window.visualViewport?.scale || 1);
        const isPinchZoomed = () => {
            if (!window.visualViewport) return false;
            normalScale = Math.min(normalScale, window.visualViewport.scale);
            return window.visualViewport.scale > normalScale * 1.01;
        };
        const geometry = () => {
            const rect = container.getBoundingClientRect();
            const viewport = stationaryOnPinchZoom ? null : window.visualViewport;
            let left = viewport ? viewport.offsetLeft : 0;
            let top = viewport ? viewport.offsetTop : 0;
            let right = left + (viewport ? viewport.width : window.innerWidth);
            let lower = top + (viewport ? viewport.height : window.innerHeight);
            // A block may be wider than an ancestor's scrollport even when it fits the screen.
            // Intersect every clipping ancestor, excluding borders and scrollbar gutters.
            for (let ancestor = container; ancestor && ancestor !== document.documentElement; ancestor = ancestor.parentElement) {
                const css = window.getComputedStyle(ancestor);
                const clips = (axis) => /^(auto|scroll|hidden|clip|overlay)$/.test(
                    css[`overflow${axis}`] || css.getPropertyValue?.(`overflow-${axis.toLowerCase()}`) || css.overflow || '');
                if (!clips('X') && !clips('Y')) {
                    if (ancestor === document.fullscreenElement) break;
                    continue;
                }
                const bounds = ancestor.getBoundingClientRect();
                const innerLeft = bounds.left + (ancestor.clientLeft || 0);
                const innerTop = bounds.top + (ancestor.clientTop || 0);
                if (clips('X')) {
                    left = Math.max(left, innerLeft);
                    right = Math.min(right, innerLeft + ancestor.clientWidth);
                }
                if (clips('Y')) {
                    top = Math.max(top, innerTop);
                    lower = Math.min(lower, innerTop + ancestor.clientHeight);
                }
                // Native fullscreen content escapes clipping by ancestors outside the top layer.
                if (ancestor === document.fullscreenElement) break;
            }
            // Absolute child coordinates start at the container's inner border edge.
            const originX = rect.left + (container.clientLeft || 0) - (container.scrollLeft || 0);
            const originY = rect.top + (container.clientTop || 0) - (container.scrollTop || 0);
            const minX = Math.max(rect.left, left) - originX;
            const minY = Math.max(rect.top, top) - originY;
            const maxX = Math.min(rect.right, right) - originX - size;
            const maxY = Math.min(rect.bottom, lower) - originY - height;
            return { originX, originY, minX, minY, maxX, maxY };
        };
        const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
        const place = (x, y) => {
            button.style.setProperty('left', `${x}px`, 'important');
            button.style.setProperty('top', `${y}px`, 'important');
            button.style.setProperty('right', 'auto', 'important');
            button.style.setProperty('bottom', 'auto', 'important');
        };
        const avoidMenuOverlap = (x, y, area) => {
            if (!avoidFloatingMenu) return { x, y };
            const menu = document.getElementById('tm-shared-floating-menu');
            if (!menu || menu.hidden) return { x, y };
            const elements = [menu, menu.querySelector('[data-floating-close]'),
                menu.querySelector('[data-floating-dialog]')];
            const obstacles = elements.filter((element) => element && !element.hidden)
                .map((element) => element.getBoundingClientRect())
                .filter((rect) => rect.width > 0 && rect.height > 0);
            const gap = 4;
            const overlaps = (px, py) => obstacles.some((rect) =>
                area.originX + px < rect.right + gap && area.originX + px + size > rect.left - gap &&
                area.originY + py < rect.bottom + gap && area.originY + py + height > rect.top - gap);
            if (!overlaps(x, y)) return { x, y };
            const candidates = obstacles.flatMap((rect) => [
                { x: rect.left - area.originX - size - gap, y },
                { x: rect.right - area.originX + gap, y },
                { x, y: rect.top - area.originY - height - gap },
                { x, y: rect.bottom - area.originY + gap },
            ]);
            // Prefer placing the independent button beside the menu, never on top of it.
            candidates.sort((a, b) => (Number(a.x === x) - Number(b.x === x)) ||
                (Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y)));
            return candidates.find((candidate) =>
                candidate.x >= area.minX && candidate.x <= area.maxX &&
                candidate.y >= area.minY && candidate.y <= area.maxY &&
                !overlaps(candidate.x, candidate.y)) || { x, y };
        };
        const layout = () => {
            if (!button.isConnected) {
                transientControlLayouts.delete(layout);
                if (observer) observer.disconnect();
                return;
            }
            // Pinch zoom must neither reposition the button nor enlarge its screen footprint.
            const zoomed = stationaryOnPinchZoom && isPinchZoomed();
            if (zoomed) {
                button.style.setProperty('transform', `scale(${normalScale / window.visualViewport.scale})`, 'important');
                button.style.setProperty('transform-origin', 'top left', 'important');
                if (positioned) return;
            } else if (stationaryOnPinchZoom) {
                button.style.removeProperty('transform');
            }
            const area = geometry();
            const hidden = area.maxX < area.minX || area.maxY < area.minY;
            if (button.hidden !== hidden) button.hidden = hidden;
            if (hidden || drag) return;
            const x = clamp(placement ? placement.x : area.maxX - inset, area.minX, area.maxX);
            const y = clamp(placement ? placement.y : bottom ? area.maxY - inset : area.minY + inset, area.minY, area.maxY);
            const clear = avoidMenuOverlap(x, y, area);
            place(clear.x, clear.y);
            positioned = true;
        };
        button.style.setProperty('touch-action', 'none', 'important');
        button.style.setProperty('text-decoration', 'none', 'important');
        button.addEventListener('pointerdown', (event) => {
            if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
            suppressClick = false;
            drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
                left: parseFloat(button.style.left), top: parseFloat(button.style.top), moved: false };
            button.setPointerCapture?.(event.pointerId);
            event.stopPropagation?.();
        });
        button.addEventListener('pointermove', (event) => {
            if (!drag || event.pointerId !== drag.id) return;
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            if (!drag.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
            drag.moved = true;
            event.preventDefault();
            event.stopPropagation?.();
            const area = geometry();
            placement = { x: clamp(drag.left + dx, area.minX, area.maxX), y: clamp(drag.top + dy, area.minY, area.maxY) };
            place(placement.x, placement.y);
        });
        const finish = (event) => {
            if (!drag || event.pointerId !== drag.id) return;
            suppressClick = drag.moved;
            drag = null;
            if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId);
            layout();
        };
        button.addEventListener('pointerup', finish);
        button.addEventListener('pointercancel', finish);
        button.addEventListener('lostpointercapture', finish);
        // Register before the action handler so a drag never activates translation or fullscreen.
        button.addEventListener('click', (event) => {
            if (!suppressClick) return;
            suppressClick = false;
            event.preventDefault();
            event.stopImmediatePropagation();
        }, true);
        transientControlLayouts.add(layout);
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(refreshTransientControls);
            observer.observe(container);
        }
        layout();
        return layout;
    }
    // END SHARED TRANSIENT CONTROL

    const wrapperAttribute = 'data-tm-translatable-pre-wrapper';
    const convertedAttribute = 'data-tm-translatable-pre-converted';
    const inlineCodeAttribute = 'data-tm-translatable-inline-code';
    const inlineCodeOriginalAttribute = 'data-tm-translatable-inline-code-original';
    const originalBlocks = new WeakMap();
    const isWikipedia = /(^|\.)wikipedia\.org$/i.test(location.hostname);
    const isOpenSSHReleaseNotes = /(^|\.)openssh\.org$/i.test(location.hostname)
        && location.pathname === '/releasenotes.html';
    let astroNavigationEnabled = false;

    // Page translation can be suppressed by a document-level or article-level
    // translate=no/notranslate marker. Repair only Perplexity blog articles,
    // not its interactive app, and leave code and editable elements protected.
    const isPerplexityBlogArticle = /(^|\.)perplexity\.ai$/i.test(location.hostname)
        && /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?hub\/blog\/[^/]+\/?$/i.test(location.pathname);

    function enablePerplexityArticleTranslation(root, includeDescendants = true) {
        if (!isPerplexityBlogArticle || !root) return;
        const nodes = [];
        if (root.nodeType === 9 && document.documentElement) nodes.push(document.documentElement);
        if (root.nodeType === 1) nodes.push(root);
        if (includeDescendants && root.querySelectorAll) {
            nodes.push(...root.querySelectorAll('[translate="no"], .notranslate, meta[name="google"]'));
        }
        for (const node of nodes) {
            if (node.tagName === 'META') {
                if ((node.getAttribute('name') || '').toLowerCase() === 'google'
                    && /(?:^|\s|,)notranslate(?:$|\s|,)/i.test(node.getAttribute('content') || '')) {
                    node.remove();
                }
                continue;
            }
            // Keep syntax and user input out of the browser's translation pass.
            let protectedNode = false;
            for (let ancestor = node; ancestor && ancestor.nodeType === 1; ancestor = ancestor.parentElement) {
                if (['PRE', 'CODE', 'KBD', 'SAMP', 'SVG', 'MATH', 'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(ancestor.tagName)
                    || ancestor.getAttribute('contenteditable') === 'true') {
                    protectedNode = true;
                    break;
                }
            }
            if (protectedNode) continue;
            if ((node.getAttribute('translate') || '').toLowerCase().trim() === 'no') {
                node.setAttribute('translate', 'yes');
            }
            if (node.classList?.contains('notranslate')) node.classList.remove('notranslate');
        }
    }

    const style = document.createElement('style');
    style.textContent = `
        [${wrapperAttribute}] {
            position: relative !important;
        }
        .tm-translate-pre-button {
            appearance: none !important;
            align-items: center !important;
            background: rgba(0, 0, 0, .35) !important;
            border: 0 !important;
            border-radius: 4px !important;
            box-shadow: none !important;
            color: rgba(255, 255, 255, .75) !important;
            cursor: pointer !important;
            display: inline-flex !important;
            font: 600 12px/1 system-ui, sans-serif !important;
            height: 24px !important;
            justify-content: center !important;
            min-height: 0 !important;
            min-width: 24px !important;
            opacity: .5 !important;
            padding: 0 5px !important;
            text-transform: none !important;
            transition: opacity .15s ease !important;
            user-select: none !important;
            width: auto !important;
            z-index: 2147483646 !important;
        }
        .tm-translate-pre-button:hover,
        .tm-translate-pre-button:focus-visible {
            opacity: .9 !important;
        }
        .tm-translate-pre-button[aria-pressed="true"] {
            background-color: rgba(34, 139, 34, .85) !important;
            color: #fff !important;
        }
        .tm-translate-pre-one {
            position: absolute !important;
            right: 6px !important;
            bottom: 6px !important;
            top: auto !important;
            box-sizing: border-box !important;
            width: 24px !important;
            padding: 0 !important;
            touch-action: none !important;
            text-decoration: none !important;
        }
        .tm-translate-pre-one[hidden] {
            display: none !important;
        }
        [${convertedAttribute}] {
            box-sizing: border-box;
            font-family: monospace;
            overflow: auto;
            white-space: pre-wrap;
        }
        [${inlineCodeAttribute}] {
            display: inline;
            font-family: monospace;
            white-space: break-spaces;
        }
    `;
    (document.head || document.documentElement).appendChild(style);

    const allButton = document.createElement('button');
    allButton.id = 'tm-translate-all-pre';
    allButton.className = 'tm-translate-pre-button';
    allButton.type = 'button';
    allButton.textContent = '譯∞';
    allButton.setAttribute('aria-label', 'Translate all preformatted blocks');
    allButton.title = 'Turn every preformatted block into translatable content';
    allButton.hidden = true;

    function copyAttributes(source, target) {
        Array.from(source.attributes || []).forEach((attribute) => {
            if (Array.isArray(attribute)) {
                target.setAttribute(attribute[0], attribute[1]);
            } else {
                target.setAttribute(attribute.name, attribute.value);
            }
        });
        target.className = source.className;
        target.id = source.id;
    }

    const inlineCodeStyleProperties = [
        'background-color', 'background-image', 'border', 'border-radius', 'box-shadow',
        'color', 'display', 'font-family', 'font-size', 'font-style', 'font-weight',
        'letter-spacing', 'line-height', 'margin', 'padding', 'text-decoration',
        'text-transform', 'vertical-align', 'white-space', 'word-break',
    ];

    function preserveComputedStyle(source, target) {
        if (typeof window.getComputedStyle !== 'function') {
            return;
        }
        const computedStyle = window.getComputedStyle(source);
        if (!computedStyle || typeof computedStyle.getPropertyValue !== 'function') {
            return;
        }
        inlineCodeStyleProperties.forEach((property) => {
            const value = computedStyle.getPropertyValue(property);
            if (value) {
                target.style.setProperty(property, value);
            }
        });
    }

    function getProtectedInlineCode(target) {
        if (!target) {
            return null;
        }
        if (target.nodeType === 1) {
            if (target.hasAttribute(inlineCodeAttribute)) {
                return target;
            }
            return typeof target.closest === 'function' ? target.closest(`[${inlineCodeAttribute}]`) : null;
        }
        const parent = target.parentElement || target.parentNode;
        if (!parent) {
            return null;
        }
        if (parent.hasAttribute && parent.hasAttribute(inlineCodeAttribute)) {
            return parent;
        }
        return typeof parent.closest === 'function' ? parent.closest(`[${inlineCodeAttribute}]`) : null;
    }

    function restoreInlineCode(target) {
        const inlineCode = getProtectedInlineCode(target);
        if (!inlineCode) {
            return false;
        }
        const originalText = inlineCode.getAttribute(inlineCodeOriginalAttribute);
        if (originalText === null || inlineCode.textContent === originalText) {
            return false;
        }
        inlineCode.textContent = originalText;
        return true;
    }

    function makeInlineCodeTranslatable(code) {
        if (!code || !code.parentNode || code.closest('pre') || code.closest(`[${wrapperAttribute}]`) || code.hasAttribute(inlineCodeAttribute)) {
            return;
        }

        const replacement = document.createElement('span');
        const originalText = code.textContent;
        copyAttributes(code, replacement);
        replacement.setAttribute(inlineCodeAttribute, 'true');
        replacement.setAttribute(inlineCodeOriginalAttribute, originalText);
        replacement.setAttribute('translate', 'no');
        preserveComputedStyle(code, replacement);

        if (code.firstChild) {
            while (code.firstChild) {
                replacement.appendChild(code.firstChild);
            }
        } else {
            replacement.textContent = originalText;
        }
        code.parentNode.insertBefore(replacement, code);
        code.parentNode.removeChild(code);
    }

    function setButtonState(button, isActive, scope) {
        button.setAttribute('aria-pressed', String(isActive));
        if (button !== allButton) {
            button.style.setProperty('background-color', isActive ? 'rgba(34, 139, 34, .85)' : 'rgba(0, 0, 0, .35)', 'important');
            button.style.setProperty('color', isActive ? '#fff' : 'rgba(255, 255, 255, .75)', 'important');
        }
        button.title = isActive
            ? `Show original ${scope} preformatted content`
            : `Make ${scope} preformatted content translatable`;
    }

    function updateAllButton() {
        const wrappers = Array.from(document.querySelectorAll(`[${wrapperAttribute}]`));
        const hasBlocks = wrappers.length > 0;
        const allConverted = hasBlocks && wrappers.every((wrapper) => wrapper.querySelector(`[${convertedAttribute}]`));
        setFloatingButtonAvailable(allButton, hasBlocks);
        setButtonState(allButton, allConverted, 'all');
    }

    function getBlockText(node) {
        if (node.nodeType === 1 && node.classList.contains('react-code-lines')) {
            return Array.from(node.querySelectorAll('[data-testid="code-cell"]'))
                .map((line) => line.textContent)
                .join('\n');
        }
        if (node.nodeType === 3) {
            return node.nodeValue || node.textContent || '';
        }
        if (node.nodeType === 1 && node.tagName === 'BR') {
            return '\n';
        }
        const children = Array.from(node.childNodes || node.children || []);
        if (children.length === 0) {
            return node.textContent || '';
        }
        return children.map((child) => getBlockText(child)).join('');
    }

    // Preserve hyperlinks while turning preformatted text into translatable text.
    function copyTranslatableNodes(source, target) {
        const children = Array.from(source.childNodes || source.children || []);
        if (!children.length) {
            target.textContent = source.textContent || '';
            return;
        }
        for (const child of children) {
            if (child.nodeType === 3) {
                target.appendChild(document.createTextNode(child.nodeValue || ''));
            } else if (child.nodeType === 1 && child.tagName === 'BR') {
                target.appendChild(document.createTextNode('\n'));
            } else if (child.nodeType === 1 && child.tagName === 'A') {
                const link = document.createElement('a');
                for (const name of ['href', 'title', 'target', 'rel']) {
                    if (child.hasAttribute(name)) link.setAttribute(name, child.getAttribute(name));
                }
                copyTranslatableNodes(child, link);
                target.appendChild(link);
            } else if (child.nodeType === 1) {
                copyTranslatableNodes(child, target);
            }
        }
    }

    function setConverted(wrapper, shouldConvert) {
        if (!wrapper) {
            return;
        }
        const current = shouldConvert ? originalBlocks.get(wrapper) : wrapper.querySelector(`[${convertedAttribute}]`);
        if (!current) {
            return;
        }
        const replacement = shouldConvert ? document.createElement('div') : originalBlocks.get(wrapper);
        if (!replacement) {
            return;
        }
        if (shouldConvert) {
            copyAttributes(current, replacement);
            replacement.removeAttribute('translate');
            replacement.classList.remove('notranslate');
            replacement.classList.remove('react-code-lines');
            replacement.removeAttribute('data-type');
            replacement.setAttribute(convertedAttribute, 'true');
            if (current.querySelector('a') && !current.classList.contains('react-code-lines')) {
                copyTranslatableNodes(current, replacement);
            } else {
                replacement.textContent = getBlockText(current);
            }
        } else {
            replacement.removeAttribute(convertedAttribute);
        }
        wrapper.insertBefore(replacement, current);
        wrapper.removeChild(current);
        setButtonState(wrapper.querySelector('.tm-translate-pre-one'), shouldConvert, 'this');
        updateAllButton();
        refreshTransientControls();
    }

    function enhance(block) {
        if (!block || !block.parentNode || block.closest(`[${wrapperAttribute}]`)) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.setAttribute(wrapperAttribute, 'true');
        const parent = block.parentNode;
        parent.insertBefore(wrapper, block);
        parent.removeChild(block);
        block.setAttribute('translate', 'no');
        wrapper.appendChild(block);
        originalBlocks.set(wrapper, block);

        const button = document.createElement('button');
        button.className = 'tm-translate-pre-button tm-translate-pre-one';
        button.type = 'button';
        button.textContent = '譯';
        button.setAttribute('aria-label', 'Translate this preformatted block');
        setButtonState(button, false, 'this');
        wrapper.appendChild(button);
        makeTransientControlDraggable(button, wrapper, { bottom: true });
        button.addEventListener('click', () => {
            setConverted(wrapper, !wrapper.querySelector(`[${convertedAttribute}]`));
        });
    }

    // OpenSSH uses long, sometimes non-PRE release-note blocks. Convert only
    // the release body siblings, never the headings or navigation.
    function enhanceOpenSSHReleaseNotes() {
        if (!isOpenSSHReleaseNotes) return;
        for (const heading of document.querySelectorAll('h3')) {
            if (!/^OpenSSH\s+\d/i.test(heading.textContent.trim())) continue;
            let element = heading.nextElementSibling;
            while (element && !/^H[1-6]$/.test(element.tagName)) {
                const next = element.nextElementSibling;
                const tag = element.tagName;
                if (['P', 'DIV', 'BLOCKQUOTE', 'TT', 'SAMP'].includes(tag)
                    && !element.closest(`[${wrapperAttribute}]`)
                    && !element.querySelector('pre')
                    && element.textContent.trim().length >= 100) {
                    enhance(element);
                }
                element = next;
            }
        }
    }

    function scan(root = document) {
        enablePerplexityArticleTranslation(root);
        if (root === document) enhanceOpenSSHReleaseNotes();
        enableAstroFullPageNavigation(root);
        enableMastodonTranslation(root);
        revealWikipediaSections(root);
        if (root.nodeType === 1 && isSpecialBlock(root)) {
            enhance(root);
        }
        if (root.querySelectorAll) {
            root.querySelectorAll('.react-code-lines, [data-type="mermaid"]').forEach((block) => {
                if (isSpecialBlock(block)) {
                    enhance(block);
                }
            });
        }
        const containingQuote = root.nodeType === 1 && root.closest ? root.closest('blockquote') : null;
        if (isCodeQuote(containingQuote)) {
            enhance(containingQuote);
        }
        if (root.nodeType === 1 && (root.tagName === 'PRE' || isCodeQuote(root))) {
            enhance(root);
        }
        if (root.querySelectorAll) {
            root.querySelectorAll('pre').forEach(enhance);
            root.querySelectorAll('blockquote').forEach((blockquote) => {
                if (isCodeQuote(blockquote)) {
                    enhance(blockquote);
                }
            });
        }
        if (root.nodeType === 1 && root.tagName === 'CODE') {
            makeInlineCodeTranslatable(root);
        }
        if (root.querySelectorAll) {
            root.querySelectorAll('code').forEach(makeInlineCodeTranslatable);
        }
        updateAllButton();
    }

    function enableAstroFullPageNavigation(root) {
        if (!astroNavigationEnabled) {
            if (!document.querySelector('meta[name="astro-view-transitions-enabled"][content="true"]')) return;
            astroNavigationEnabled = true;
            // The router marker can arrive after links when running at document-start.
            root = document;
        }

        const links = [];
        if (root.nodeType === 1 && root.tagName === 'A' && root.hasAttribute('href')) {
            links.push(root);
        }
        if (root.querySelectorAll) links.push(...root.querySelectorAll('a[href]'));
        links.forEach((link) => {
            let url;
            try {
                url = new URL(link.getAttribute('href'), document.baseURI || location.href);
            } catch {
                return;
            }
            if (url.origin !== location.origin) return;
            if (url.pathname === location.pathname && url.search === location.search) return;
            // Astro's supported opt-out gives browser translation a new document to process.
            link.setAttribute('data-astro-reload', 'true');
        });
    }

    function enableMastodonTranslation(root) {
        const candidates = [];
        if (root.nodeType === 1 && root.id === 'mastodon' && root.classList.contains('app-holder')) {
            candidates.push(root);
        }
        if (root.querySelectorAll) {
            candidates.push(...root.querySelectorAll('#mastodon.app-holder'));
        }
        candidates.forEach((app) => {
            app.classList.remove('notranslate');
            app.setAttribute('translate', 'yes');
        });
    }

    function isCodeQuote(element) {
        if (!element || element.tagName !== 'BLOCKQUOTE' || element.querySelector('pre')) {
            return false;
        }
        const codeText = Array.from(element.querySelectorAll('code'))
            .map((code) => code.textContent.trim())
            .join(' ');
        return codeText.length >= 80;
    }

    function isSpecialBlock(element) {
        if (!element) {
            return false;
        }
        if (element.classList.contains('react-code-lines')) {
            return Boolean(element.querySelector('[data-testid="code-cell"]'));
        }
        return element.getAttribute('data-type') === 'mermaid'
            && Array.from(element.querySelectorAll('pre'))
                .some((pre) => pre.getAttribute('aria-label') === 'Raw mermaid code');
    }

    function revealWikipediaSections(root) {
        if (!isWikipedia) {
            return;
        }

        const sections = [];
        if (root.nodeType === 1 && root.classList.contains('mw-collapsible-content')) {
            sections.push(root);
        }
        if (root.querySelectorAll) {
            sections.push(...root.querySelectorAll('.mw-collapsible-content'));
        }
        sections.forEach((section) => {
            section.hidden = false;
            section.removeAttribute('hidden');
        });
    }

    allButton.addEventListener('click', (event) => {
        event.preventDefault();
        const wrappers = Array.from(document.querySelectorAll(`[${wrapperAttribute}]`));
        const shouldConvert = !wrappers.every((wrapper) => wrapper.querySelector(`[${convertedAttribute}]`));
        wrappers.forEach((wrapper) => setConverted(wrapper, shouldConvert));
    });
    function mountAllButton() {
        if (!document.body || window !== window.top || floatingMenuDisabled()) return;
        registerFloatingButton('translate', allButton, document.querySelectorAll(`[${wrapperAttribute}]`).length > 0);
        scan();
    }
    mountAllButton();
    if (!document.body) {
        document.addEventListener('DOMContentLoaded', mountAllButton, { once: true });
    }
    scan();

    new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (restoreInlineCode(mutation.target)) {
                return;
            }
            if (mutation.type === 'attributes') {
                revealWikipediaSections(mutation.target);
                enablePerplexityArticleTranslation(mutation.target, false);
                return;
            }
            mutation.addedNodes.forEach((node) => {
                restoreInlineCode(node);
                scan(node);
            });
        });
    }).observe(document.documentElement, {
        attributes: isWikipedia || isPerplexityBlogArticle,
        attributeFilter: isWikipedia ? ['hidden']
            : isPerplexityBlogArticle ? ['translate', 'class', 'content'] : undefined,
        characterData: true,
        childList: true,
        subtree: true,
    });
})();
