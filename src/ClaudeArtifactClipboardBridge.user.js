// ==UserScript==
// @name         Claude Artifact to Clipboard Viewer (Experimental)
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-11-07_0.1.0
// @description  Experimentally capture a readable Claude artifact frame and transfer styled HTML to Clipboard Viewer, without opening the frame URL.
// @author       Chris Torng
// @match        https://claude.ai/artifact/*
// @match        https://claude.ai/code/artifact/*
// @match        https://claude.ai/public/artifacts/*
// @match        https://*.frame.claudeusercontent.com/*
// @match        https://christorng.idv.tw/InfoProcess/Clipboard/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @run-at       document-end
// ==/UserScript==

(() => {
    'use strict';

    const channel = 'tm-claude-artifact-clipboard-v1';
    const viewerUrl = 'https://christorng.idv.tw/InfoProcess/Clipboard/';
    const storagePrefix = 'tm-claude-clipboard:';
    const frameHost = /^(?:[0-9a-f-]+)\.frame\.claudeusercontent\.com$/i;
    const forbiddenTags = new Set([
        'SCRIPT', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT',
        'BUTTON', 'SELECT', 'TEXTAREA', 'META', 'BASE', 'LINK', 'STYLE',
        'TEMPLATE', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO'
    ]);
    const styleProperties = [
        'display', 'font-family', 'font-size', 'font-weight', 'font-style',
        'line-height', 'letter-spacing', 'color', 'background-color',
        'text-align', 'text-decoration', 'white-space', 'word-break',
        'list-style-type', 'list-style-position', 'margin', 'padding',
        'border', 'border-radius', 'vertical-align'
    ];

    function validFrameAddress(raw) {
        try {
            const url = new URL(raw, location.href);
            return url.protocol === 'https:' && frameHost.test(url.hostname);
        } catch (_) {
            return false;
        }
    }

    function sanitiseAttributes(element, baseUrl, keepSafeStyle = false) {
        const attributes = Array.from(element.attributes);
        for (const attribute of attributes) {
            const key = attribute.name.toLowerCase();
            if (!['href', 'src', 'alt', 'title', 'colspan', 'rowspan'].includes(key)
                && !(keepSafeStyle && key === 'style')) {
                element.removeAttribute(attribute.name);
                continue;
            }
            if (key !== 'href' && key !== 'src') continue;
            try {
                const url = new URL(attribute.value, baseUrl);
                if (url.protocol !== 'https:' && url.protocol !== 'http:'
                    && !(key === 'src' && /^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(attribute.value)
                        && attribute.value.length < 120000)) {
                    element.removeAttribute(attribute.name);
                } else {
                    element.setAttribute(attribute.name, url.protocol === 'data:' ? attribute.value : url.href);
                }
            } catch (_) {
                element.removeAttribute(attribute.name);
            }
        }
        if (element.tagName === 'A') element.setAttribute('rel', 'noopener noreferrer');
    }

    function serialiseVisibleHtml() {
        if (!document.body) throw new Error('Content not loaded');
        const text = (document.body.innerText || document.body.textContent || '').trim();
        if (text.length < 160) throw new Error('No substantial readable content');
        const original = [document.body, ...document.body.querySelectorAll('*')];
        if (original.length > 3000) throw new Error('Document too complex for safe capture');
        const clonedBody = document.body.cloneNode(true);
        const cloned = [clonedBody, ...clonedBody.querySelectorAll('*')];
        for (let i = 0; i < original.length; i++) {
            const source = original[i];
            const target = cloned[i];
            if (!target || !target.parentNode && i > 0) continue;
            if (forbiddenTags.has(source.tagName)) {
                target.remove();
                continue;
            }
            const computed = getComputedStyle(source);
            if (computed.display === 'none' || computed.visibility === 'hidden') {
                target.remove();
                continue;
            }
            sanitiseAttributes(target, location.href);
            const styles = [];
            for (const property of styleProperties) {
                const value = computed.getPropertyValue(property);
                if (!value || value.length > 160 || /url\s*\(/i.test(value)) continue;
                styles.push(property + ':' + value);
            }
            if (styles.length) target.setAttribute('style', styles.join(';'));
        }
        // No executable scripts, event handlers, external stylesheets, or source tokens.
        const wrapper = document.createElement('div');
        wrapper.setAttribute('lang', 'en');
        if (clonedBody.hasAttribute('style')) wrapper.setAttribute('style', clonedBody.getAttribute('style'));
        wrapper.innerHTML = clonedBody.innerHTML;
        const html = wrapper.outerHTML;
        if (html.length > 1800000) throw new Error('Capture exceeds 1.8 MB');
        return { html, textLength: text.length };
    }

    function startFrame() {
        if (window === window.parent) return;
        function announceReady() {
            if (!document.body) return;
            const text = (document.body.innerText || document.body.textContent || '').trim();
            if (text.length >= 160) {
                window.parent.postMessage({ channel, type: 'ready', textLength: text.length }, 'https://claude.ai');
            }
        }
        window.addEventListener('message', (event) => {
            if (event.source !== window.parent || event.origin !== 'https://claude.ai') return;
            const message = event.data;
            if (!message || message.channel !== channel) return;
            if (message.type === 'probe') {
                announceReady();
            } else if (message.type === 'capture' && /^[a-zA-Z0-9-]{8,80}$/.test(message.id || '')) {
                try {
                    const snapshot = serialiseVisibleHtml();
                    window.parent.postMessage({
                        channel, type: 'captured', id: message.id,
                        html: snapshot.html, textLength: snapshot.textLength
                    }, 'https://claude.ai');
                } catch (error) {
                    window.parent.postMessage({
                        channel, type: 'failed', id: message.id,
                        message: String(error && error.message || error)
                    }, 'https://claude.ai');
                }
            }
        });
        announceReady();
        window.addEventListener('load', announceReady);
        [400, 1200, 3000, 6000].forEach((ms) => setTimeout(announceReady, ms));
    }

    function startParent() {
        if (window !== window.top) return;
        let confirmedFrame = null;
        let button = null;
        let pending = null;
        const debug = new URL(location.href).searchParams.has('tmArtifactDebug');
        function frameForSource(source) {
            return Array.from(document.querySelectorAll('iframe[src]')).find(
                (frame) => frame.contentWindow === source && validFrameAddress(frame.getAttribute('src'))
            ) || null;
        }
        function showDiagnostic(text) {
            if (!debug) return;
            let status = document.getElementById('tm-artifact-clipboard-status');
            if (!status) {
                status = document.createElement('div');
                status.id = 'tm-artifact-clipboard-status';
                status.style.cssText = 'position:fixed;bottom:60px;right:6px;z-index:2147483646;'
                    + 'background:#fff;color:#111;border:1px solid #888;padding:5px;font:12px sans-serif;';
                document.body.appendChild(status);
            }
            status.textContent = text;
        }
        function mountButton() {
            if (button || !document.body) return;
            button = document.createElement('button');
            button.id = 'tm-artifact-clipboard-transfer';
            button.type = 'button';
            button.textContent = 'To Clipboard Viewer';
            button.title = 'Capture the rendered artifact into a translatable Clipboard Viewer page';
            button.style.cssText = 'position:fixed;right:6px;bottom:64px;z-index:2147483646;'
                + 'background:#333;color:white;border:1px solid #777;border-radius:6px;'
                + 'padding:7px 10px;font:13px system-ui,sans-serif;opacity:.85;';
            button.addEventListener('click', () => {
                if (!confirmedFrame || pending) return;
                const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
                pending = id;
                button.disabled = true;
                button.textContent = 'Capturing…';
                confirmedFrame.contentWindow.postMessage({ channel, type: 'capture', id }, '*');
                setTimeout(() => {
                    if (pending !== id) return;
                    pending = null;
                    button.disabled = false;
                    button.textContent = 'Retry Clipboard Viewer';
                    showDiagnostic('Frame did not respond to capture');
                }, 12000);
            });
            document.body.appendChild(button);
        }
        window.addEventListener('message', async (event) => {
            const frame = frameForSource(event.source);
            if (!frame) return;
            const data = event.data;
            if (!data || data.channel !== channel) return;
            if (data.type === 'ready' && data.textLength >= 160) {
                confirmedFrame = frame;
                mountButton();
                showDiagnostic('Frame capture available: ' + data.textLength + ' characters');
            } else if (pending && data.id === pending && data.type === 'captured'
                    && typeof data.html === 'string' && data.html.length < 1800000) {
                const id = pending;
                pending = null;
                try {
                    await Promise.resolve(GM_setValue(storagePrefix + id, {
                        html: data.html, createdAt: Date.now()
                    }));
                    GM_openInTab(viewerUrl + '?tmArtifactCapture=' + encodeURIComponent(id), { active: true });
                    if (button) {
                        button.disabled = false;
                        button.textContent = 'To Clipboard Viewer';
                    }
                } catch (error) {
                    if (button) {
                        button.disabled = false;
                        button.textContent = 'Retry Clipboard Viewer';
                    }
                    showDiagnostic('Transfer failed: ' + String(error));
                }
            } else if (pending && data.id === pending && data.type === 'failed') {
                pending = null;
                if (button) {
                    button.disabled = false;
                    button.textContent = 'Retry Clipboard Viewer';
                }
                showDiagnostic('Capture failed: ' + String(data.message));
            }
        });
        let attempts = 0;
        const probe = () => {
            attempts++;
            const frames = Array.from(document.querySelectorAll('iframe[src]'))
                .filter((frame) => validFrameAddress(frame.getAttribute('src')));
            frames.forEach((frame) => frame.contentWindow.postMessage({ channel, type: 'probe' }, '*'));
            if (debug && attempts >= 12 && !confirmedFrame) {
                showDiagnostic(frames.length ? 'Frame found, but injection not confirmed'
                    : 'No Claude artifact content frame found');
            }
            if (attempts >= 12) clearInterval(interval);
        };
        const interval = setInterval(probe, 800);
        probe();
    }

    function startViewer() {
        const id = new URL(location.href).searchParams.get('tmArtifactCapture');
        if (!id || !/^[a-zA-Z0-9-]{8,80}$/.test(id)) return;
        const key = storagePrefix + id;
        let attempts = 0;
        async function loadCapture() {
            attempts++;
            const container = document.getElementById('htmlContent');
            if (!container) return;
            const backupKey = 'tm-artifact-html:' + id;
            const saved = sessionStorage.getItem(backupKey);
            const record = saved
                ? { html: saved, createdAt: Date.now() }
                : await Promise.resolve(GM_getValue(key, null));
            if (!record || typeof record.html !== 'string'
                || !saved && Date.now() - record.createdAt > 10 * 60 * 1000) {
                if (attempts >= 24) {
                    container.textContent = 'No captured HTML was received. Reopen it from the Claude tab.';
                    clearInterval(interval);
                }
                return;
            }
            const template = document.createElement('template');
            template.innerHTML = record.html;
            for (const element of Array.from(template.content.querySelectorAll('*'))) {
                if (forbiddenTags.has(element.tagName)) {
                    element.remove();
                    continue;
                }
                sanitiseAttributes(element, viewerUrl, true);
                // Styles must contain only the visual properties we generated.
                if (element.hasAttribute('style')) {
                    const declarations = element.style;
                    for (const property of Array.from(declarations)) {
                        if (!styleProperties.includes(property)
                            || /url\s*\(/i.test(declarations.getPropertyValue(property))) {
                            declarations.removeProperty(property);
                        }
                    }
                }
            }
            container.replaceChildren(template.content);
            const typeList = document.getElementById('typeList');
            if (typeList) typeList.textContent = 'Imported HTML from Claude Artifact';
            document.documentElement.lang = 'en';
            document.title = 'Clipboard Viewer — Imported Artifact';
            if (!saved) {
                try { sessionStorage.setItem(backupKey, record.html); } catch (_) {}
                GM_deleteValue(key);
            }
            clearInterval(interval);
        }
        const interval = setInterval(loadCapture, 250);
        loadCapture();
    }

    if (location.hostname === 'claude.ai') startParent();
    else if (frameHost.test(location.hostname)) startFrame();
    else if (location.hostname === 'christorng.idv.tw' && location.pathname.startsWith('/InfoProcess/Clipboard/')) startViewer();
})();
