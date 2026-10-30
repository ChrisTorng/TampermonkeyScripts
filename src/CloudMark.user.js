// ==UserScript==
// @name         CloudMark
// @namespace    http://tampermonkey.net/
// @version      2026-10-31_1.0.0
// @description  Add Cloudmark save buttons after Hacker News Summary topic links, preserving article titles and summaries.
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
    let saved = new Set();
    let savedRevision = 0;
    let config = GM_getValue(CONFIG_KEY, null);
    let defaultCategory = 'default';
    let settingsHost = null;
    let scheduled = false;

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
            const isSaved = saved.has(url);
            const isPending = pending.has(config?.mark + '\n' + url);
            const label = isSaved ? '✓ Saved' : isPending ? 'Saving…' : control.error ? '↻ Retry' : '☆ Cloudmark';
            if (control.button.textContent !== label) control.button.textContent = label;
            control.button.disabled = isSaved || isPending;
            control.button.setAttribute('aria-pressed', String(isSaved));
            control.button.title = control.error || (isSaved ? 'Already in this Cloudmark collection' : 'Save this article to Cloudmark');
        }
    }

    function useCollection(data) {
        savedRevision += 1;
        saved = new Set((data.bookmarksData?.bookmarks || []).map((bookmark) => bookmark.url));
        defaultCategory = data.settings?.defaultCategory || 'default';
        render();
    }

    async function refreshSaved() {
        if (!config?.mark || !config?.token) return;
        const current = config;
        const revision = savedRevision;
        try {
            const data = await request('GET', '/collections/' + encodeURIComponent(current.mark), null, current);
            if (current === config && revision === savedRevision) useCollection(data);
        } catch { /* Saving reports connection and token errors on the affected button. */ }
    }

    async function saveArticle(link) {
        if (!config?.mark || !config?.token) { openSettings(() => saveArticle(link)); return; }
        const control = controls.get(link);
        const settings = config;
        let article;
        try { article = articleData(link); }
        catch (error) { control.error = error.message; render(); return; }
        const key = settings.mark + '\n' + article.url;
        if (saved.has(article.url) || pending.has(key)) return;
        pending.add(key);
        control.error = '';
        render();
        try {
            const result = await request('POST', '/bookmarks', {
                ...article,
                mark: settings.mark,
                token: settings.token,
                category: settings.category || defaultCategory,
            }, settings);
            if (!result.uuid) throw new Error('Cloudmark did not confirm that the article was saved.');
            if (config === settings) { saved.add(article.url); savedRevision += 1; }
        } catch (error) {
            if (config === settings) control.error = error.message + ' Use Tampermonkey → CloudMark settings to change the collection or token.';
        } finally { pending.delete(key); render(); }
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

    function openSettings(onReady) {
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
            label { display: block; margin: 12px 0; } input { box-sizing: border-box; display: block; width: 100%;
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
        const mark = field('Collection URL or name', 'mark', config?.mark);
        const token = field('Write token', 'token', config?.token, 'password');
        const category = field('Category (blank = collection default)', 'category', config?.category);
        const errorBox = document.createElement('p');
        errorBox.className = 'error';
        errorBox.setAttribute('role', 'status');
        const actions = document.createElement('div');
        actions.className = 'actions';
        const cancel = document.createElement('button');
        cancel.textContent = 'Cancel';
        const apply = document.createElement('button');
        apply.textContent = onReady ? 'Save settings and article' : 'Save settings';
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
        cancel.addEventListener('click', close);
        dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
        apply.addEventListener('click', async () => {
            if (apply.disabled) return;
            apply.disabled = true;
            errorBox.textContent = 'Checking collection…';
            try {
                const next = parseSettings(mark.value, token.value, category.value);
                const data = await request('GET', '/collections/' + encodeURIComponent(next.mark), null, next);
                if (!data.exists) throw new Error('Create this collection in Cloudmark first, then return here.');
                if (!active) return;
                await request('POST', '/collections/claim', { mark: next.mark, token: next.token }, next);
                if (!active) return;
                GM_setValue(CONFIG_KEY, next);
                config = next;
                for (const control of controls.values()) control.error = '';
                useCollection(data);
                close();
                if (onReady) void onReady();
            } catch (error) {
                if (active) errorBox.textContent = error.message;
            } finally { apply.disabled = false; }
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
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();
                void saveArticle(link);
            });
            link.insertAdjacentElement('afterend', button);
            controls.set(link, { button, error: '' });
        }
        render();
    }

    function start() {
        const style = document.createElement('style');
        style.textContent = `
            .${BUTTON_CLASS} { all: unset !important; display: inline-flex !important; align-items: center !important;
                box-sizing: border-box !important; min-height: 36px !important; margin: 3px 0 3px .6em !important;
                padding: 4px 8px !important; border: 1px solid #87a6c2 !important; border-radius: 6px !important;
                font: 500 .65em/1.4 system-ui, sans-serif !important; color: #145486 !important;
                background: #f1f7ff !important; white-space: nowrap !important; vertical-align: middle !important;
                cursor: pointer !important; touch-action: manipulation !important; }
            .${BUTTON_CLASS}:hover, .${BUTTON_CLASS}:focus-visible { background: #dbeaff !important; outline: 2px solid #3777b7 !important; }
            .${BUTTON_CLASS}:disabled { opacity: .7 !important; cursor: default !important; }
            .${BUTTON_CLASS}[aria-pressed="true"] { color: #166c34 !important; border-color: #519467 !important; }
        `;
        document.head.appendChild(style);
        scan();
        new MutationObserver(() => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => { scheduled = false; scan(); });
        }).observe(document.body, { childList: true, subtree: true });
        GM_registerMenuCommand('CloudMark settings', () => openSettings());
        void refreshSaved();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
