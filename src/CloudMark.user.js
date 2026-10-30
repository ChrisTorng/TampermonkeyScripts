// ==UserScript==
// @name         CloudMark
// @namespace    http://tampermonkey.net/
// @version      2026-10-31_1.2.0
// @description  Save Hacker News Summary topics with title-corner category badges, category editing, and collection switching.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/CloudMark.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/CloudMark.user.js
// @match        https://hackernews.betacat.io/*
// @connect      cloudmark-christorng.christorng.workers.dev
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    const SERVER = 'https://cloudmark-christorng.christorng.workers.dev';
    const CONFIG_KEY = 'cloudmark.settings.v1';
    const BUTTON_CLASS = 'tm-cloudmark-save';
    const controls = new Map();
    const pending = new Set();
    const SETTINGS_KEY = 'cloudmark.settings.v2';
    const previous = GM_getValue(CONFIG_KEY, null);
    const stored = GM_getValue(SETTINGS_KEY, null);
    const collections = Array.isArray(stored?.collections) ? stored.collections : previous?.mark ? [previous] : [];
    let config = collections.find((item) => item.mark === stored?.selectedMark) || collections[0] || null;
    const snapshots = new Map();
    let settingsHost = null;
    let menu = null;
    let scheduled = false;

    function persist() {
        GM_setValue(SETTINGS_KEY, { collections, selectedMark: config?.mark });
    }

    function snapshot(settings = config) {
        if (!settings) return { saved: new Map(), categories: new Set(), defaultCategory: 'default', revision: 0 };
        if (!snapshots.has(settings.mark)) snapshots.set(settings.mark, {
            saved: new Map(), categories: new Set([...(settings.categories || []), ...(settings.category ? [settings.category] : [])]),
            defaultCategory: 'default', revision: 0,
        });
        return snapshots.get(settings.mark);
    }

    function request(method, path, body, settings = config) {
        return new Promise((resolve, reject) => {
            let settled = false;
            let transport;
            const finish = (callback, value) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                callback(value);
            };
            const fail = (message) => finish(reject, new Error(message));
            // Anonymous requests use fetch mode in Chrome, where the native GM timeout is ignored.
            const timer = setTimeout(() => {
                fail('Cloudmark timed out. Tap to retry.');
                transport?.abort?.();
            }, 15000);
            try { transport = GM_xmlhttpRequest({
                method,
                url: SERVER + '/api' + path,
                headers: body ? { 'Content-Type': 'application/json' } : { 'X-Cloudmark-Token': settings.token },
                data: body ? JSON.stringify(body) : undefined,
                anonymous: true,
                redirect: 'error',
                timeout: 15000,
                onload(response) {
                    try {
                        if (response.finalUrl && new URL(response.finalUrl).origin !== SERVER) {
                            throw new Error('Cloudmark returned an unexpected redirect.');
                        }
                        let data;
                        try { data = JSON.parse(response.responseText); }
                        catch { throw new Error('Cloudmark returned an invalid response.'); }
                        if (response.status < 200 || response.status >= 300) {
                            throw new Error(typeof data.error === 'string' ? data.error : 'Cloudmark request failed.');
                        }
                        finish(resolve, data);
                    } catch (error) { finish(reject, error); }
                },
                onerror: () => fail('Could not reach Cloudmark. Check the connection and Tampermonkey permissions.'),
                ontimeout: () => fail('Cloudmark timed out. Tap to retry.'),
                onabort: () => fail('Cloudmark request was cancelled.'),
            }); } catch (error) { finish(reject, error); }
        });
    }

    function articleData(link) {
        const url = new URL(link.href, location.href);
        if (!['https:', 'http:'].includes(url.protocol) || url.href.length > 2048) {
            throw new Error('This article does not have a supported HTTP(S) URL.');
        }
        const article = link.closest('article.post-item');
        const text = (value) => String(value || '').replace(/\s+/g, ' ').trim();
        const data = {
            url: url.href,
            title: text(link.textContent).slice(0, 200) || url.hostname,
            description: text(article.querySelector('.summary-text')?.textContent).slice(0, 2000),
        };
        const icon = article.querySelector('.host img.favicon');
        if (icon?.getAttribute('src')) {
            try {
                const favicon = new URL(icon.getAttribute('src'), location.href);
                if (['https:', 'http:'].includes(favicon.protocol) && favicon.href.length <= 96000) data.favicon = favicon.href;
            } catch { /* Let Cloudmark supply its usual favicon. */ }
        }
        return data;
    }

    function render() {
        for (const [link, control] of controls) {
            if (!link.isConnected) { controls.delete(link); continue; }
            let url;
            try { url = articleData(link).url; } catch { continue; }
            const isSaved = snapshot().saved.has(url);
            const isPending = pending.has(config?.mark + '\n' + url);
            const current = snapshot().saved.get(url);
            const label = isSaved ? current.category || snapshot().defaultCategory : '☆';
            if (control.button.textContent !== label) control.button.textContent = label;
            control.button.disabled = isPending;
            control.button.setAttribute('aria-pressed', String(isSaved));
            control.button.setAttribute('aria-busy', String(isPending));
            control.button.setAttribute('aria-expanded', String(menu?.link === link));
            const hint = control.error || (isSaved ? 'Category: ' + label + '. Tap to change category or collection.' : 'Choose a Cloudmark category');
            control.button.title = hint;
            control.button.setAttribute('aria-label', hint);
        }
    }

    function useCollection(data, settings = config) {
        const state = snapshot(settings);
        state.revision += 1;
        state.saved = new Map((data.bookmarksData?.bookmarks || []).map((bookmark) => [bookmark.url, bookmark]));
        state.defaultCategory = data.settings?.defaultCategory || 'default';
        for (const bookmark of data.bookmarksData?.bookmarks || []) {
            if (bookmark.category) state.categories.add(bookmark.category);
        }
        state.categories.add(state.defaultCategory);
        render();
    }

    async function refreshSaved(settings = config) {
        if (!settings?.mark || !settings?.token) return;
        const state = snapshot(settings);
        const revision = state.revision;
        const data = await request('GET', '/collections/' + encodeURIComponent(settings.mark), null, settings);
        if (revision === state.revision) useCollection(data, settings);
    }

    async function saveArticle(link, category) {
        if (!config?.mark || !config?.token) return;
        const control = controls.get(link);
        const settings = config;
        const state = snapshot(settings);
        let article;
        try { article = articleData(link); }
        catch (error) { control.error = error.message; render(); return; }
        const key = settings.mark + '\n' + article.url;
        const existing = state.saved.get(article.url);
        const targetCategory = category || settings.category || state.defaultCategory;
        if (pending.has(key) || (existing && (existing.category || state.defaultCategory) === targetCategory)) return;
        pending.add(key);
        control.error = '';
        render();
        if (menu?.link === link) drawMenu();
        try {
            if (existing && !existing.uuid) throw new Error('Reload the collection before changing this category.');
            const method = existing ? 'PUT' : 'POST';
            const path = existing ? '/bookmarks/' + encodeURIComponent(existing.uuid) : '/bookmarks';
            // Preserve the collection's edited title/description/icon when changing only its category.
            const payload = existing ? {
                uuid: existing.uuid, url: existing.url, title: existing.title,
                description: existing.description,
            } : article;
            const result = await request(method, path, {
                ...payload, mark: settings.mark, token: settings.token, category: targetCategory,
            }, settings);
            if (!result.uuid) throw new Error('Cloudmark did not confirm that the article was saved.');
            state.saved.set(article.url, { ...article, ...existing, ...result, category: targetCategory });
            state.categories.add(targetCategory);
            state.revision += 1;
            if (menu?.link === link && config === settings) closeMenu();
        } catch (error) {
            if (config === settings) control.error = error.message;
        } finally {
            pending.delete(key);
            render();
            if (menu?.link === link && config === settings) drawMenu();
        }
    }

    function closeMenu() {
        if (!menu) return;
        const current = menu;
        menu = null;
        current.host.remove();
        render();
    }

    function drawMenu() {
        if (!menu) return;
        const { panel, link } = menu;
        panel.replaceChildren();
        const add = (tag, text, className) => {
            const node = document.createElement(tag);
            node.textContent = text;
            if (className) node.className = className;
            panel.appendChild(node);
            return node;
        };
        const action = (text, callback, className) => {
            const button = add('button', text, className);
            button.type = 'button';
            button.addEventListener('click', callback);
            return button;
        };
        const header = add('div', '', 'menu-header');
        const close = document.createElement('button');
        close.type = 'button'; close.className = 'menu-close'; close.textContent = '×';
        close.setAttribute('aria-label', 'Close CloudMark menu');
        close.addEventListener('click', closeMenu);
        header.appendChild(close);
        if (collections.length) {
            const select = add('select', '', 'collections');
            select.setAttribute('aria-label', 'Collection');
            header.insertBefore(select, close);
            for (const settings of collections) {
                const option = document.createElement('option');
                option.value = settings.mark;
                option.textContent = settings.mark;
                option.selected = settings === config;
                select.appendChild(option);
            }
            select.value = config.mark;
            select.addEventListener('change', () => {
                config = collections.find((item) => item.mark === select.value);
                for (const control of controls.values()) control.error = '';
                persist(); render(); drawMenu(); void loadMenu();
            });
            add('div', menu.loading ? 'Loading…' : 'Category', 'caption');
            const state = snapshot();
            const url = articleData(link).url;
            const busy = pending.has(config.mark + '\n' + url);
            const existing = state.saved.get(url);
            const currentCategory = existing ? existing.category || state.defaultCategory : null;
            for (const category of [...new Set([state.defaultCategory, ...state.categories])]) {
                const selected = category === currentCategory;
                const button = action(category + (selected ? ' ✓' : ''), () => void saveArticle(link, category), 'category');
                button.setAttribute('aria-pressed', String(selected));
                button.disabled = busy || selected || menu.loading;
            }
            const error = controls.get(link).error;
            if (error) add('p', error, 'error');
            action('+ New category', (event) => {
                const target = event.currentTarget;
                const form = document.createElement('form');
                form.className = 'new-category';
                target.parentNode.insertBefore(form, target);
                target.remove();
                const input = document.createElement('input');
                input.placeholder = 'Category name'; input.maxLength = 50;
                input.setAttribute('aria-label', 'New category');
                const submit = document.createElement('button');
                submit.type = 'submit'; submit.textContent = 'Add';
                submit.title = 'Add category and save article';
                form.append(input, submit);
                form.addEventListener('submit', (event) => {
                    event.preventDefault();
                    const value = input.value.trim();
                    if (!value || value.length > 50) return;
                    if (!state.categories.has(value)) {
                        state.categories.add(value);
                        config.categories = [...state.categories];
                        persist();
                    }
                    void saveArticle(link, value);
                });
                input.focus();
                positionMenu();
            }, 'new-category-action').disabled = busy || menu.loading;
        }
        action('+ Add collection', () => {
            closeMenu();
            openSettings(() => openMenu(link), true);
        });
        if (config) action('Collection settings', () => { closeMenu(); openSettings(() => openMenu(link)); });
        positionMenu();
    }

    async function loadMenu() {
        if (!menu || !config) return;
        const current = menu;
        const settings = config;
        current.loading = true; drawMenu();
        try { await refreshSaved(settings); }
        catch (error) {
            if (menu === current && config === settings) controls.get(current.link).error = error.message;
        } finally {
            if (menu === current && config === settings) { current.loading = false; drawMenu(); }
        }
    }

    function positionMenu() {
        if (!menu) return;
        const { panel, link } = menu;
        const rect = controls.get(link).button.getBoundingClientRect();
        const viewport = window.visualViewport;
        const width = viewport?.width ?? window.innerWidth;
        const height = viewport?.height ?? window.innerHeight;
        const left = viewport?.offsetLeft ?? 0;
        const top = viewport?.offsetTop ?? 0;
        panel.style.setProperty('--menu-height', height + 'px');
        const bounds = panel.getBoundingClientRect();
        panel.style.left = Math.max(left + 8, Math.min(rect.left, left + width - bounds.width - 8)) + 'px';
        panel.style.top = Math.max(top + 8, Math.min(rect.bottom + 4, top + height - bounds.height - 8)) + 'px';
    }

    function openMenu(link) {
        if (menu?.link === link) { closeMenu(); return; }
        closeMenu();
        const host = document.createElement('div');
        const root = host.attachShadow({ mode: 'closed' });
        const style = document.createElement('style');
        style.textContent = `
            :host { all: initial; }
            .panel { box-sizing: border-box; position: fixed; margin: 0; padding: 8px; width: min(224px, calc(100vw - 16px));
                max-height: min(360px, calc(var(--menu-height, 100dvh) - 16px)); overflow: auto; border: 1px solid #91a4b8; border-radius: 10px;
                background: #fff; color: #18212b; box-shadow: 0 6px 24px #0003; font: 14px/1.35 system-ui,sans-serif; }
            .panel::backdrop { background: transparent; }
            button, select, input { box-sizing: border-box; display: block; width: 100%; min-height: 36px; margin: 2px 0;
                padding: 5px 8px; border: 1px solid #c1cbd5; border-radius: 6px; background: #fff; color: #18212b;
                font: inherit; text-align: left; overflow-wrap: anywhere; }
            button { cursor: pointer; } button:hover, button:focus-visible { background: #e5f1ff; }
            button:disabled { opacity: .55; cursor: default; } .caption { color: #53667b; font-size: 12px; padding: 3px; }
            .error { margin: 6px; color: #a21616; overflow-wrap: anywhere; } .menu-header { display: flex; align-items: center; gap: 4px; position: sticky; top: -8px; background: #fff; }
            .menu-header select { flex: 1; min-width: 0; width: 0; text-overflow: ellipsis; }
            .menu-close { flex: 0 0 36px; width: 36px; font-size: 22px; line-height: 1; text-align: center; }
            .new-category { display: flex; align-items: center; gap: 4px; margin: 2px 0; }
            .new-category input { flex: 1; min-width: 0; width: 0; font-size: 16px; }
            .new-category button { flex: none; width: auto; }
        `;
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.setAttribute('popover', 'auto');
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Save to Cloudmark');
        root.append(style, panel);
        document.body.appendChild(host);
        menu = { host, panel, link, loading: false };
        panel.addEventListener('toggle', (event) => {
            if (event.newState === 'closed' && menu?.host === host) closeMenu();
        });
        panel.addEventListener('click', (event) => event.stopPropagation());
        drawMenu();
        panel.showPopover();
        positionMenu();
        panel.querySelector('select, button')?.focus();
        render();
        void loadMenu();
    }

    function parseSettings(markValue, tokenValue, categoryValue) {
        let mark = markValue.trim();
        if (/^https?:\/\//i.test(mark)) {
            const url = new URL(mark);
            if (url.origin !== SERVER) throw new Error('Use a collection URL from ' + SERVER + '.');
            mark = decodeURIComponent(url.pathname.replace(/^\/|\/$/g, ''));
        }
        if (!/^[a-zA-Z0-9_-]{4,64}$/.test(mark) || ['demo', 'default', 'api', 'doc', 'static'].includes(mark.toLowerCase())) {
            throw new Error('Enter your existing collection name (4–64 letters, numbers, _ or -).');
        }
        const token = tokenValue.trim();
        if (!/^[a-zA-Z0-9_-]{16,128}$/.test(token)) throw new Error('Enter the write token from your Cloudmark collection.');
        const category = categoryValue.trim();
        if (category.length > 50) throw new Error('The category must be at most 50 characters.');
        return { mark, token, category };
    }

    function openSettings(onReady, adding = false) {
        closeMenu();
        if (settingsHost) return;
        settingsHost = document.createElement('div');
        const host = settingsHost;
        const root = host.attachShadow({ mode: 'closed' });
        const style = document.createElement('style');
        style.textContent = `
            :host { all: initial; }
            dialog { box-sizing: border-box; width: min(28rem, calc(100vw - 24px)); max-height: calc(100dvh - 24px);
                overflow: auto; margin: auto; padding: 20px; border: 1px solid #9ba6b2; border-radius: 12px;
                background: #fff; color: #18212b; font: 16px/1.5 system-ui, sans-serif; }
            dialog::backdrop { background: #0007; }
            h2 { margin: 0 0 12px; font-size: 20px; } p { margin: 8px 0; overflow-wrap: anywhere; }
            label { display: block; margin: 12px 0; } input, select { box-sizing: border-box; display: block; width: 100%;
                min-height: 42px; margin-top: 4px; padding: 8px; font: inherit; border: 1px solid #8996a3; border-radius: 6px; }
            .actions { display: flex; gap: 10px; justify-content: flex-end; } button { min-height: 42px; padding: 6px 12px;
                font: inherit; border: 1px solid #8996a3; border-radius: 6px; cursor: pointer; } a { color: #1666a7; }
            .error { color: #a21616; } .hint { font-size: 13px; } button:disabled { cursor: wait; opacity: .6; }
        `;
        const dialog = document.createElement('dialog');
        dialog.setAttribute('aria-label', 'CloudMark settings');
        const heading = document.createElement('h2');
        heading.textContent = 'CloudMark settings';
        const help = document.createElement('p');
        help.className = 'hint';
        help.textContent = 'Use the write token from your existing Cloudmark collection. Settings are stored in Tampermonkey.';
        const collectionLink = document.createElement('a');
        collectionLink.href = SERVER + '/';
        collectionLink.target = '_blank';
        collectionLink.rel = 'noopener noreferrer';
        collectionLink.textContent = 'Open Cloudmark';
        dialog.append(heading, help, collectionLink);
        const modeLabel = document.createElement('label');
        modeLabel.textContent = 'Collection action';
        const mode = document.createElement('select');
        mode.name = 'mode';
        for (const [value, text] of [['connect', 'Connect existing collection'], ['create', 'Create new collection']]) {
            const option = document.createElement('option'); option.value = value; option.textContent = text; mode.appendChild(option);
        }
        mode.value = 'connect'; modeLabel.appendChild(mode); dialog.appendChild(modeLabel);
        function field(labelText, name, value, type = 'text') {
            const label = document.createElement('label');
            label.textContent = labelText;
            const input = document.createElement('input');
            input.name = name;
            input.type = type;
            input.value = value || '';
            input.autocomplete = 'off';
            input.autocapitalize = 'off';
            input.spellcheck = false;
            label.appendChild(input);
            dialog.appendChild(label);
            return input;
        }
        const mark = field('Collection URL or name', 'mark', adding ? '' : config?.mark);
        const token = field('Write token', 'token', adding ? '' : config?.token, 'password');
        const category = field('Category (blank = collection default)', 'category', adding ? '' : config?.category);
        mode.addEventListener('change', () => {
            if (mode.value === 'create') {
                const bytes = new Uint8Array(32);
                crypto.getRandomValues(bytes);
                token.value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
                token.type = 'text';
                help.textContent = 'A new write token has been generated. Back it up; it is also stored in Tampermonkey after creation.';
            } else {
                token.value = ''; token.type = 'password';
                help.textContent = 'Paste the existing collection write token.';
            }
        });
        const errorBox = document.createElement('p');
        errorBox.className = 'error';
        errorBox.setAttribute('role', 'status');
        const actions = document.createElement('div');
        actions.className = 'actions';
        const cancel = document.createElement('button');
        cancel.textContent = 'Cancel';
        const apply = document.createElement('button');
        apply.textContent = 'Save settings';
        actions.append(cancel, apply);
        dialog.append(errorBox, actions);
        root.append(style, dialog);
        document.body.appendChild(host);
        let active = true;
        function close() {
            active = false;
            token.value = '';
            host.remove();
            settingsHost = null;
        }
        cancel.addEventListener('click', () => { if (!cancel.disabled) close(); });
        dialog.addEventListener('cancel', (event) => { event.preventDefault(); if (!cancel.disabled) close(); });
        apply.addEventListener('click', async () => {
            if (apply.disabled) return;
            apply.disabled = true;
            for (const input of [mode, mark, token, category]) input.disabled = true;
            errorBox.textContent = 'Checking collection…';
            try {
                const next = parseSettings(mark.value, token.value, category.value);
                const data = await request('GET', '/collections/' + encodeURIComponent(next.mark), null, next);
                if (mode.value === 'create' && data.exists) throw new Error('This collection already exists. Connect it with its existing write token.');
                if (mode.value !== 'create' && !data.exists) throw new Error('Collection not found. Choose Create new collection to create it.');
                if (!active) return;
                cancel.disabled = mode.value === 'create';
                await request('POST', '/collections/claim', { mark: next.mark, token: next.token }, next);
                if (!active) return;
                const index = collections.findIndex((item) => item.mark === next.mark);
                next.categories = [...new Set([...(collections[index]?.categories || []), ...(next.category ? [next.category] : [])])];
                if (index >= 0) collections[index] = next; else collections.push(next);
                config = next;
                persist();
                for (const control of controls.values()) control.error = '';
                useCollection(data);
                close();
                if (onReady) void onReady();
            } catch (error) {
                if (active) errorBox.textContent = error.message;
            } finally {
                apply.disabled = false; cancel.disabled = false;
                for (const input of [mode, mark, token, category]) input.disabled = false;
            }
        });
        dialog.showModal();
    }

    function scan() {
        for (const link of document.querySelectorAll('article.post-item .post-title a.post-url')) {
            if (controls.get(link)?.button.isConnected) continue;
            try { articleData(link); } catch { continue; }
            const button = document.createElement('button');
            button.type = 'button';
            button.className = BUTTON_CLASS;
            button.setAttribute('aria-live', 'polite');
            button.setAttribute('aria-haspopup', 'dialog');
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();
                openMenu(link);
            });
            const title = link.closest('.post-title');
            title.classList.add('tm-cloudmark-title');
            title.appendChild(button);
            controls.set(link, { button, error: '' });
        }
        render();
    }

    function start() {
        const style = document.createElement('style');
        style.textContent = `
            .tm-cloudmark-title { display: grid !important; grid-template-columns: minmax(0, 1fr) auto !important;
                align-items: start !important; column-gap: .5rem !important; }
            .tm-cloudmark-title > h3 { min-width: 0 !important; margin-block: 0 !important; grid-column: 1 !important; }
            .${BUTTON_CLASS} { all: unset !important; display: inline-block !important; text-align: center !important; align-items: center !important;
                box-sizing: border-box !important; min-height: 36px !important; margin: 0 !important;
                grid-column: 2 !important; grid-row: 1 !important; align-self: start !important;
                max-width: 6rem !important; overflow: hidden !important; text-overflow: ellipsis !important;
                padding: 4px 8px !important; border: 1px solid #87a6c2 !important; border-radius: 6px !important;
                font: 500 20px/1.2 system-ui, sans-serif !important; color: #145486 !important;
                background: #f1f7ff !important; white-space: nowrap !important; vertical-align: middle !important;
                cursor: pointer !important; touch-action: manipulation !important; }
            .${BUTTON_CLASS}:hover, .${BUTTON_CLASS}:focus-visible { background: #dbeaff !important; outline: 2px solid #3777b7 !important; }
            .${BUTTON_CLASS}:disabled { opacity: .7 !important; cursor: default !important; }
            .${BUTTON_CLASS}[aria-pressed="true"] { font-size: 13px !important; color: #166c34 !important; border-color: #519467 !important; }
        `;
        document.head.appendChild(style);
        scan();
        new MutationObserver(() => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => { scheduled = false; scan(); });
        }).observe(document.body, { childList: true, subtree: true });
        window.addEventListener('resize', positionMenu);
        window.addEventListener('scroll', positionMenu);
        window.visualViewport?.addEventListener('resize', positionMenu);
        GM_registerMenuCommand('CloudMark settings', () => openSettings());
        void refreshSaved().catch(() => {});
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
