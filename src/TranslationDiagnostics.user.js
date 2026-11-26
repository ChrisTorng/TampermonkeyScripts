// ==UserScript==
// @name         Translation Diagnostics
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-11-27_1.2.10
// @description  Universal opt-in web diagnostics: sanitized DOM, translation flags, errors and recent console logs, with paired Cloudflare reporting.
// @author       Chris Torng
// @match        *://*/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      tm-web-diagnostics.christorng.workers.dev
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TranslationDiagnostics.user.js
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TranslationDiagnostics.user.js
// ==/UserScript==

(function () {
    'use strict';
    if (!/^https?:$/.test(location.protocol)) return;

    const ENDPOINT = 'https://tm-web-diagnostics.christorng.workers.dev';
    const VERSION = '2026-11-27_1.2.10';
    const HISTORY_LIMIT = 40;
    const HTML_LIMIT = 4_000_000;
    const FRAME_CHANNEL = 'tm-webdiag-frame-v1';
    const FRAME_KEY = 'tm-webdiag-frame-once:';
    const FRAME_LIMIT = 550000;
    const FRAME_WAIT = 2200;
    // A child never shows controls or uploads data. It only writes a private
    // GM response to a short-lived request created by the reporting userscript.
    // The page's postMessage contains the request ID, not the report or secret.
    if (window !== window.top) {
        window.addEventListener('message', receiveFrameRequest);
        return;
    }

    function safeFrameUrl(value, base = location.href) {
        try {
            const u = new URL(value, base);
            return /^https?:$/.test(u.protocol) && !u.username && !u.password
                ? u.origin + u.pathname : null;
        } catch (_) { return null; }
    }

    function frameInventory() {
        const scripts = Array.from(document.querySelectorAll('script'));
        const svg = Array.from(document.querySelectorAll('svg'));
        const image = Array.from(document.querySelectorAll('img'));
        const paint = [];
        for (const root of svg.slice(0, 24)) {
            const box = root.getBoundingClientRect();
            if (box.width <= 0 || box.height <= 0) continue;
            const samples = Array.from(root.querySelectorAll('path,line,rect,circle,text,polygon,polyline')).slice(0, 12);
            paint.push({
                width: box.width, height: box.height, viewBox: root.getAttribute('viewBox'),
                samples: samples.map(node => {
                    const css = getComputedStyle(node);
                    return {
                        tag: node.localName, fill: css.getPropertyValue('fill'),
                        stroke: css.getPropertyValue('stroke'),
                        opacity: css.getPropertyValue('opacity'),
                        strokeWidth: css.getPropertyValue('stroke-width')
                    };
                })
            });
        }
        return {
            readyState: document.readyState,
            inlineScripts: scripts.filter(node => !node.getAttribute('src')).length,
            inlineScriptCharacters: scripts.filter(node => !node.getAttribute('src'))
                .reduce((n, node) => n + (node.textContent || '').length, 0),
            externalScripts: scripts.filter(node => node.getAttribute('src')).map(node => safeFrameUrl(node.getAttribute('src'))).filter(Boolean).slice(0, 30),
            inlineStyles: document.querySelectorAll('style').length,
            svg: svg.length, canvas: document.querySelectorAll('canvas').length,
            buttons: document.querySelectorAll('button,[role="button"]').length,
            image: image.length,
            svgImageCount: image.filter(node => /^data:image\/svg\+xml/i.test(node.getAttribute('src') || '')).length,
            paint
        };
    }

    function receiveFrameRequest(event) {
        const data = event.data;
        if (event.source !== window.parent || data?.channel !== FRAME_CHANNEL ||
            !/^[a-zA-Z0-9-]{8,100}$/.test(data.id || '')) return;
        const key = FRAME_KEY + data.id;
        const request = GM_getValue(key, null);
        if (!request || request.state !== 'request' ||
            request.parentOrigin !== event.origin ||
            request.frameUrl !== safeFrameUrl(location.href) ||
            Date.now() > request.expires || request.expires - Date.now() > 10000 ||
            !document.documentElement || !document.body) return;
        if (document.querySelector('input[type="password"]')) {
            GM_setValue(key, { state: 'response', status: 'password-form-excluded' });
            return;
        }
        try {
            const dom = captureDom(request.includeText === true, FRAME_LIMIT);
            const inventory = frameInventory();
            GM_setValue(key, { state: 'response', status: 'captured', dom, inventory });
        } catch (_) {
            GM_setValue(key, { state: 'response', status: 'capture-error' });
        }
    }

    function collectFrameReports(includeText) {
        const all = Array.from(document.querySelectorAll('iframe[src]'));
        if (!all.length) return null;
        const frames = all.slice(0, 6);
        const entries = [];
        for (const frame of frames) {
            const frameUrl = safeFrameUrl(frame.getAttribute('src'), document.baseURI || location.href);
            const item = {
                url: frameUrl, sandbox: frame.getAttribute('sandbox'),
                status: 'unsupported-url'
            };
            entries.push(item);
            if (!frameUrl || !frame.contentWindow) continue;
            const id = generatedId();
            const key = FRAME_KEY + id;
            item.status = 'no-response';
            item.key = key;
            GM_setValue(key, {
                state: 'request', parentOrigin: location.origin, frameUrl,
                includeText: includeText === true, expires: Date.now() + 5000
            });
            try {
                frame.contentWindow.postMessage({ channel: FRAME_CHANNEL, id }, '*');
            } catch (_) { item.status = 'post-message-error'; }
        }
        return new Promise(resolve => {
            let ticks = 0;
            const finish = () => {
                let pending = false;
                for (const item of entries) {
                    if (!item.key) continue;
                    const result = GM_getValue(item.key, null);
                    if (result?.state === 'response') {
                        item.status = result.status;
                        if (result.status === 'captured') {
                            item.dom = result.dom;
                            item.inventory = result.inventory;
                        }
                        GM_deleteValue(item.key);
                        delete item.key;
                    } else pending = true;
                }
                if (pending && ++ticks < Math.ceil(FRAME_WAIT / 100)) {
                    setTimeout(finish, 100);
                    return;
                }
                for (const item of entries) {
                    if (item.key) GM_deleteValue(item.key);
                    delete item.key;
                }
                resolve({ total: all.length, frames: entries });
            };
            finish();
        });
    }

    function attachFrameReports(report, result) {
        report.embeddedFrames = result;
        // Keep a conservative UTF-8 size budget below the existing 5 MiB
        // collector limit. Prefer frame inventory over an oversized DOM.
        const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length;
        if (typeof TextEncoder === 'undefined') return;
        for (const frame of result.frames.slice().reverse()) {
            if (bytes(report) <= 4_500_000) break;
            if (frame.dom) {
                frame.dom = { originalDomCharacters: frame.dom.originalDomCharacters,
                    domTruncated: true, domHtml: '' };
                frame.status = 'inventory-only-size-limit';
            }
        }
    }

    const START_KEY = 'tm-webdiag-record-next:' + location.origin + location.pathname;
    const AUTO_KEY = 'tm-webdiag-auto-once:' + location.origin + location.pathname;
    const AUTO_QUIET_MS = 3000;
    const AUTO_MIN_WAIT_MS = 8000;
    const AUTO_MAX_WAIT_MS = 90000;
    const arm = GM_getValue(AUTO_KEY, null);
    const autoReportArmed = arm?.mode === 'once' && Number.isFinite(arm.armedAt)
        && Date.now() >= arm.armedAt && Date.now() - arm.armedAt < 5 * 60 * 1000;
    if (arm) GM_setValue(AUTO_KEY, null); // Consume one-shot permission first.
    let latestResult = '';
    let onResult = () => {};
    function showResult(message) { latestResult = message; onResult(message); }
    const snapshots = [];
    const events = [];
    const started = Date.now();
    const generatedId = () => typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    function secretHex() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)),
            b => b.toString(16).padStart(2, '0')).join('');
    }
    let deviceId = GM_getValue('tm-webdiag-device-id', '');
    let secret = GM_getValue('tm-webdiag-device-secret', '');
    if (!deviceId) {
        deviceId = generatedId();
        GM_setValue('tm-webdiag-device-id', deviceId);
    }
    if (!/^[0-9a-f]{64}$/.test(secret)) {
        secret = secretHex();
        GM_setValue('tm-webdiag-device-secret', secret);
    }

    function post(path, data) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: ENDPOINT + path,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data),
                timeout: 30000,
                onload: (response) => {
                    let value;
                    try { value = JSON.parse(response.responseText || '{}'); }
                    catch { reject(new Error('Invalid Cloudflare response')); return; }
                    if (response.status < 200 || response.status >= 300) {
                        reject(new Error(value.error || 'HTTP ' + response.status));
                    } else resolve(value);
                },
                onerror: () => reject(new Error('Cloudflare connection failed')),
                ontimeout: () => reject(new Error('Cloudflare request timed out'))
            });
        });
    }

    function flags(element) {
        if (!element) return null;
        return {
            tag: element.tagName,
            translate: element.getAttribute('translate'),
            notranslate: element.classList.contains('notranslate'),
            lang: element.getAttribute('lang'),
            contenteditable: element.getAttribute('contenteditable')
        };
    }

    function ancestorChain(node) {
        const result = [];
        for (let current = node, depth = 0; current && depth < 24; current = current.parentElement, depth++) {
            result.push(flags(current));
            if (current === document.documentElement) break;
        }
        return result;
    }

    function summarizeRegion(element) {
        const paragraphs = Array.from(element.querySelectorAll('p'));
        const substantial = paragraphs.filter(p => (p.textContent || '').trim().length >= 70);
        let han = 0, latin = 0;
        for (const p of substantial.slice(0, 8)) {
            const text = (p.textContent || '').slice(0, 2000);
            han += (text.match(/[\u3400-\u9fff]/g) || []).length;
            latin += (text.match(/[a-zA-Z]/g) || []).length;
        }
        const heading = element.querySelector('h1,h2');
        return {
            tag: element.tagName,
            headingPresent: Boolean(heading),
            headingLength: heading ? (heading.textContent || '').trim().length : 0,
            paragraphCount: paragraphs.length,
            substantialParagraphs: substantial.length,
            substantialCharacters: substantial.reduce((sum, p) => sum + (p.textContent || '').trim().length, 0),
            sampleLetterCounts: { han, latin },
            ancestorChain: ancestorChain(substantial[0] || heading || element)
        };
    }

    function snapshot(stage) {
        const google = document.querySelector('meta[name="google"]');
        const blockers = Array.from(document.querySelectorAll('[translate="no"], .notranslate'));
        return {
            stage, elapsedMs: Date.now() - started, readyState: document.readyState,
            html: flags(document.documentElement), body: flags(document.body),
            browserLanguage: navigator.language || null,
            googleNotranslate: Boolean(google && /notranslate/i.test(google.getAttribute('content') || '')),
            totalOptOuts: blockers.length,
            optOutExamples: blockers.slice(0, 12).map(flags),
            regions: Array.from(document.querySelectorAll('article,main,[role="main"]'))
                .slice(0, 8).map(summarizeRegion),
            frameworkMarkers: {
                next: Boolean(document.querySelector('#__next')),
                nuxt: Boolean(document.querySelector('#__nuxt')),
                astro: Boolean(document.querySelector('meta[name="astro-view-transitions-enabled"]'))
            }
        };
    }
    function recordSnapshot(stage) {
        try {
            if (snapshots.length >= 10) snapshots.shift();
            snapshots.push(snapshot(stage));
        } catch (_) { /* Never break the page while collecting diagnostics. */ }
    }

    function scrub(message) {
        return String(message)
            .replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
            .replace(/(?:token|secret|password|authorization|apikey|api_key)\s*[:=]\s*["']?[^,\s"'&]+/gi, '$1=[REDACTED]')
            .replace(/(?:eyJ[a-zA-Z0-9_-]{20,}\.){2}[a-zA-Z0-9_-]+/g, '[JWT REDACTED]')
            .slice(0, 240);
    }

    let recording = false;
    let originalConsole = null;
    let errorListener = null;
    let rejectionListener = null;
    function recordEvent(type, args) {
        const values = Array.from(args || []).slice(0, 4).map(value => {
            if (typeof value === 'string') return scrub(value);
            if (value instanceof Error) return scrub(value.name + ': ' + value.message);
            if (value && typeof value === 'object') return '[object ' + scrub(value.constructor?.name || 'Object') + ']';
            return scrub(value);
        });
        events.push({ elapsedMs: Date.now() - started, type, values });
        if (events.length > HISTORY_LIMIT) events.shift();
    }
    function startRecording() {
        if (recording) return;
        recording = true;
        originalConsole = {};
        for (const type of ['log', 'info', 'warn', 'error', 'debug']) {
            try {
                const old = console[type];
                if (typeof old !== 'function') continue;
                originalConsole[type] = old;
                console[type] = function (...args) {
                    try { recordEvent(type, args); } catch (_) {}
                    return old.apply(this, args);
                };
            } catch (_) { /* Some pages make console methods immutable. */ }
        }
        errorListener = e => recordEvent('window-error', [e.message || 'script error']);
        rejectionListener = e => recordEvent('unhandled-rejection', [
            e.reason?.message || e.reason || 'promise rejected'
        ]);
        window.addEventListener('error', errorListener, true);
        window.addEventListener('unhandledrejection', rejectionListener);
        recordSnapshot('recording-start');
    }

    // Copy structure faithfully while excluding hidden credentials, hydration payloads,
    // input values, script contents, event handlers and arbitrary data attributes.
    // Full readable text is an explicit per-report choice.
    function captureDom(includeText, limit = HTML_LIMIT) {
        const clone = document.documentElement.cloneNode(true);
        for (const element of Array.from(clone.querySelectorAll('*'))) {
            if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(element.tagName)) {
                element.textContent = '[source omitted]';
            }
            if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(element.tagName)
                || element.hasAttribute('contenteditable')) {
                element.textContent = '[input redacted]';
            }
            for (const attribute of Array.from(element.attributes)) {
                const name = attribute.name.toLowerCase();
                const svgGeometry = element.namespaceURI === 'http://www.w3.org/2000/svg' &&
                    ['viewbox', 'width', 'height', 'd', 'x', 'y', 'x1', 'x2', 'y1', 'y2',
                        'cx', 'cy', 'r', 'rx', 'ry', 'points', 'transform', 'fill', 'stroke',
                        'stroke-width', 'opacity', 'fill-opacity', 'stroke-opacity'].includes(name) &&
                    !/url\s*\(/i.test(attribute.value) && attribute.value.length <= 24000;
                const keep = svgGeometry || ['id', 'class', 'role', 'lang', 'dir', 'translate', 'contenteditable',
                    'aria-hidden', 'aria-expanded', 'data-testid', 'type', 'style'].includes(name);
                if (name === 'href' || name === 'src') {
                    try {
                        const u = new URL(attribute.value, location.href);
                        if (/^https?:$/.test(u.protocol)) element.setAttribute(name, u.origin + u.pathname);
                        else element.removeAttribute(name);
                    } catch { element.removeAttribute(name); }
                } else if (keep) {
                    if (name === 'style') {
                        element.setAttribute('style', attribute.value
                            .replace(/url\s*\([^)]*\)/gi, 'url([redacted])').slice(0, 2000));
                    }
                    if (name === 'id' || name === 'class' || name === 'data-testid') {
                        element.setAttribute(name, attribute.value.slice(0, 256));
                    }
                } else element.removeAttribute(attribute.name);
            }
        }
        if (!includeText) {
            const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
            let textNode;
            while ((textNode = walker.nextNode())) {
                if (textNode.nodeValue && textNode.nodeValue.trim()) {
                    textNode.nodeValue = '[text:' + textNode.nodeValue.length + ']';
                }
            }
        }
        const raw = '<!DOCTYPE html>\n' + clone.outerHTML;
        return { domHtml: raw.length <= limit ? raw : raw.slice(0, limit),
            domTruncated: raw.length > limit,
            originalDomCharacters: raw.length };
    }

    // Geometry only: never read the editor's contents, selector, name, or value.
    const reportInteractionGeometry = [];
    function isActiveTextEditor(element = document.activeElement) {
        return !!element && (element.isContentEditable ||
            !!element.matches?.('textarea, input:not([type]), input[type="text"], input[type="search"], input[type="url"], input[type="tel"], input[type="email"], input[type="password"], input[type="number"]'));
    }
    function measureReportInteraction(reason) {
        const v = window.visualViewport;
        const r = document.getElementById('tm-webdiag-toggle')?.getBoundingClientRect();
        const a = document.activeElement;
        const editor = isActiveTextEditor(a);
        const er = editor ? a.getBoundingClientRect() : null;
        reportInteractionGeometry.push({
            reason, at: new Date().toISOString(), editorFocused: editor,
            innerHeight: window.innerHeight, clientHeight: document.documentElement.clientHeight,
            visualHeight: v?.height ?? window.innerHeight, visualTop: v?.offsetTop ?? 0,
            visualWidth: v?.width ?? window.innerWidth, visualScale: v?.scale ?? 1,
            reportBottom: r?.bottom ?? null, editorTop: er?.top ?? null, editorBottom: er?.bottom ?? null
        });
        if (reportInteractionGeometry.length > 24) reportInteractionGeometry.shift();
    }
    function preserveEditorFocus(event) {
        // Cancel only pointer focus transfer, not click. Keep keyboard navigation.
        if (event.button !== 0 || event.isPrimary === false || !isActiveTextEditor()) return;
        const control = event.target?.closest?.('button, input[type="checkbox"], label');
        if (!control || !event.cancelable) return;
        if (event.type === 'pointerdown') measureReportInteraction('before-pointerdown');
        event.preventDefault();
    }
    function buildReport(includeText) {
        measureReportInteraction('build-report');
        recordSnapshot('report');
        const dom = captureDom(includeText);
        return {
            format: 2, diagnosticVersion: VERSION,
            url: location.origin + location.pathname,
            capturedAt: new Date().toISOString(),
            viewport: { width: window.innerWidth, height: window.innerHeight,
                dpr: window.devicePixelRatio || 1,
                visualScale: window.visualViewport?.scale || 1 },
            userAgent: navigator.userAgent,
            mode: includeText ? 'public-text' : 'structure',
            snapshots: snapshots.slice(),
            events: events.slice(),
            reportInteractionGeometry: reportInteractionGeometry.slice(),
            ...dom
        };
    }

    let diagnosticNormalScale = 1;
    let diagnosticLayoutWidth = 0;
    let diagnosticNormalVisualWidth = 0;
    let diagnosticOrientation = window.screen?.orientation?.type;
    let diagnosticAnchor = null;
    // Compensate only the report UI for Edge's shrink-to-fit on desktop-width pages.
    // Never alter the webpage or its viewport.
    function fitDiagnosticViewport() {
        const host = document.getElementById('tm-webdiag-host');
        const toggle = host?.querySelector('#tm-webdiag-toggle');
        const panel = host?.querySelector('#tm-webdiag-panel');
        if (!toggle || !panel) return;
        const vv = window.visualViewport;
        const scale = Number.isFinite(vv?.scale) && vv.scale > 0 ? vv.scale : 1;
        const orientation = window.screen?.orientation?.type;
        const layoutWidth = document.documentElement.clientWidth || window.innerWidth;
        const visualWidth = vv?.width || layoutWidth;
        // A provisional desktop-width layout can be replaced by a responsive
        // viewport during first navigation. Do not carry its scale into the
        // new layout. A real pinch contracts the visual width at fixed layout width.
        const layoutChanged = !diagnosticLayoutWidth ||
            Math.abs(layoutWidth - diagnosticLayoutWidth) > 2 ||
            orientation !== diagnosticOrientation;
        const scaleWithoutPinch = scale > diagnosticNormalScale * 1.05 &&
            visualWidth >= diagnosticNormalVisualWidth * 0.98;
        if (layoutChanged || scaleWithoutPinch || scale <= diagnosticNormalScale) {
            diagnosticOrientation = orientation;
            diagnosticLayoutWidth = layoutWidth;
            diagnosticNormalScale = Math.min(1, scale);
            diagnosticNormalVisualWidth = visualWidth;
            if (layoutChanged || scaleWithoutPinch) diagnosticAnchor = null;
        }
        const pinched = scale > diagnosticNormalScale * 1.05 &&
            visualWidth < diagnosticNormalVisualWidth * 0.98;
        host.dataset.pinched = String(pinched);
        const set = (el, prop, value) => {
            if (el.style.getPropertyValue(prop) !== value)
                el.style.setProperty(prop, value, 'important');
        };
        set(host, 'display', 'block');
        if (pinched && diagnosticAnchor?.host === host) {
            // Preserve the pre-zoom document position and CSS transforms so the
            // controls enlarge naturally with the page and pan out of view.
            set(host, 'position', 'absolute');
            set(host, 'left', diagnosticAnchor.x + 'px');
            set(host, 'top', diagnosticAnchor.y + 'px');
            set(host, 'bottom', 'auto');
            set(panel, 'position', 'absolute');
            set(panel, 'left', '0px');
            set(panel, 'bottom', diagnosticAnchor.gap + 'px');
            return;
        }
        const zoom = scale < 0.9 ? Math.min(3.5, 1 / scale) : 1;
        const vw = vv?.width || window.innerWidth;
        const vh = vv?.height || window.innerHeight;
        const x = vv?.offsetLeft || 0;
        const y = vv?.offsetTop || 0;
        const width = Math.max(1, Math.min(370, vw / zoom - 16));
        const height = Math.max(1, Math.min(320, vh / zoom - 64));
        const left = x + 8 * zoom;
        // Native fixed positioning follows browser toolbar animation on the
        // compositor. Applying a JS height delta on every toolbar scroll can
        // double-compensate a stale visualViewport value. Only compensate an
        // occluding keyboard (or a panned visual viewport).
        const occlusion = Math.max(0, window.innerHeight - y - vh);
        const keyboardOrPan = y > 1 ||
            (isActiveTextEditor() && occlusion * scale > 100);
        const bottomInset = keyboardOrPan ? occlusion : 0;
        const bottom = bottomInset + 10 * zoom;
        set(host, 'position', 'fixed');
        set(host, 'top', 'auto');
        set(host, 'left', left + 'px');
        set(host, 'bottom', bottom + 'px');
        set(panel, 'position', 'fixed');
        set(toggle, 'transform', zoom === 1 ? 'none' : 'scale(' + zoom + ')');
        set(toggle, 'transform-origin', 'bottom left');
        set(panel, 'transform', zoom === 1 ? 'none' : 'scale(' + zoom + ')');
        set(panel, 'transform-origin', 'bottom left');
        set(panel, 'left', (x + 8 * zoom) + 'px');
        set(panel, 'top', 'auto');
        set(panel, 'bottom', (bottomInset + 48 * zoom) + 'px');
        set(panel, 'width', width + 'px');
        set(panel, 'height', 'auto');
        set(panel, 'max-height', height + 'px');
        const anchorRect = host.getBoundingClientRect();
        diagnosticAnchor = {
            host, x: (window.scrollX || 0) + anchorRect.left,
            y: (window.scrollY || 0) + anchorRect.top,
            gap: 38 * zoom
        };
    }

    function installUI() {
        if (!document.documentElement) return;
        let host = document.getElementById('tm-webdiag-host');
        if (!host) {
            host = document.createElement('div');
            host.id = 'tm-webdiag-host';
            host.setAttribute('translate', 'no');
            document.documentElement.appendChild(host);
        }
        if (host.querySelector('#tm-webdiag-toggle')) { fitDiagnosticViewport(); return; }
        const css = document.createElement('style');
        css.textContent = [
            '#tm-webdiag-host{all:initial!important;position:fixed!important;bottom:10px!important;left:8px!important;max-width:calc(100vw - 16px)!important;z-index:2147483647!important;pointer-events:none!important;-webkit-text-size-adjust:none!important;text-size-adjust:none!important}',
            '#tm-webdiag-host *{box-sizing:border-box!important;font:14px/1.4 system-ui,sans-serif!important}',
            '#tm-webdiag-host button,#tm-webdiag-host input{pointer-events:auto!important}',
            '#tm-webdiag-host button{background:#363636!important;color:#fff!important;border:1px solid #777!important;border-radius:7px!important;padding:5px 8px!important;margin:0!important;cursor:pointer!important}',
            '#tm-webdiag-panel{position:fixed!important;bottom:calc(60px + env(safe-area-inset-bottom,0px))!important;left:max(8px,env(safe-area-inset-left,0px))!important;background:#202020!important;color:#fff!important;border:1px solid #666!important;border-radius:9px!important;width:min(370px,calc(100vw - 16px))!important;height:min(72dvh,560px)!important;max-height:calc(100dvh - 90px)!important;overflow:hidden!important;overscroll-behavior:contain!important;pointer-events:auto!important;flex-direction:column!important}',
            '#tm-webdiag-panel[hidden]{display:none!important}',
            '#tm-webdiag-panel-header{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;position:relative!important;top:0!important;background:#202020!important;padding:6px 0!important;z-index:1!important}',
            '#tm-webdiag-close{margin:0!important;padding:4px 9px!important;white-space:nowrap!important}',
            '#tm-webdiag-panel p{margin:7px 0!important;color:#ddd!important}',
            '#tm-webdiag-panel label{display:block!important;color:#fff!important;margin:5px 0!important}',
            '#tm-webdiag-panel code{font:12px monospace!important;overflow-wrap:anywhere!important;color:#fff!important}',
            '#tm-webdiag-panel [data-status]{white-space:pre-wrap!important;overflow-wrap:anywhere!important;font-size:13px!important;margin:7px 0 0!important;max-height:64px!important;overflow-y:auto!important}',
            '#tm-webdiag-panel-header{flex:0 0 auto!important;padding:5px 8px!important;border-bottom:1px solid #555!important}',
            '#tm-webdiag-body{flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;padding:5px 8px!important}',
            '#tm-webdiag-footer{flex:0 0 auto!important;border-top:1px solid #555!important;padding:5px 8px!important}',
            '#tm-webdiag-actions{display:flex!important;flex-wrap:wrap!important;gap:4px!important}',
            '#tm-webdiag-actions button{flex:1 1 120px!important;min-width:0!important;white-space:normal!important}',
            '#tm-webdiag-pairing[hidden]{display:none!important}',
            '#tm-webdiag-host[data-open="true"] #tm-webdiag-toggle{min-width:52px!important;background:#126a4f!important}',
            '#tm-webdiag-footer{display:contents!important}',
            '#tm-webdiag-panel-header{order:-2!important}',
            '#tm-webdiag-panel [data-status]{order:-1!important;margin:4px 8px!important}',
            '#tm-webdiag-body{order:0!important;flex:0 1 auto!important}',
            '#tm-webdiag-actions{order:1!important;padding:4px 8px!important}',
            '#tm-webdiag-actions button:last-child{display:none!important}',
            'html:has(#tm-webdiag-host[data-open="true"]:not([data-pinched="true"])) #tm-shared-floating-menu{visibility:hidden!important}',
            '#tm-webdiag-result{display:none!important;position:fixed!important;bottom:calc(60px + env(safe-area-inset-bottom,0px))!important;left:max(8px,env(safe-area-inset-left,0px))!important;right:auto!important;width:min(310px,calc(100vw - 16px))!important;max-width:calc(100vw - 16px)!important;pointer-events:none!important;background:#202020!important;color:#fff!important;padding:6px 9px!important;border-radius:6px!important;overflow-wrap:anywhere!important;margin:0!important;box-shadow:0 2px 9px #0007!important}',
            '#tm-webdiag-result[data-visible="true"]{display:block!important}'
        ].join('\n');
        host.appendChild(css);
        const toggle = document.createElement('button');
        toggle.id = 'tm-webdiag-toggle';
        toggle.type = 'button';
        toggle.textContent = '回報';
        toggle.title = 'Universal Web Diagnostics';
        host.appendChild(toggle);
        const panel = document.createElement('section');
        panel.id = 'tm-webdiag-panel';
        panel.hidden = true;
        const header = document.createElement('div');
        header.id = 'tm-webdiag-panel-header';
        const headline = document.createElement('strong');
        headline.textContent = '網頁問題回報';
        const close = document.createElement('button');
        close.id = 'tm-webdiag-close';
        close.type = 'button';
        close.textContent = '關閉';
        close.title = '收合回報面板';
        header.appendChild(headline);
        header.appendChild(close);
        panel.appendChild(header);
        const body = document.createElement('div');
        body.id = 'tm-webdiag-body';
        panel.appendChild(body);
        const pairingState = document.createElement('p');
        pairingState.id = 'tm-webdiag-pair-state';
        pairingState.textContent = '配對狀態：尚未檢查';
        body.appendChild(pairingState);
        const pairing = document.createElement('div');
        pairing.id = 'tm-webdiag-pairing';
        pairing.hidden = true;
        pairing.style.setProperty('display', 'none', 'important');
        body.appendChild(pairing);
        const notice = document.createElement('p');
        notice.textContent = '表單值、Cookie、網址參數不會回報；可存取的內嵌頁面會一併回報。';
        notice.hidden = true;
        body.appendChild(notice);
        const status = document.createElement('p');
        status.dataset.status = 'true';
        status.textContent = latestResult || '';
        status.setAttribute('role','status');
        status.setAttribute('aria-live','polite');
        const info = document.createElement('p');
        const pair = document.createElement('button');
        pair.type = 'button';
        pair.textContent = '建立配對碼';
        const check = document.createElement('button');
        check.type = 'button';
        check.textContent = '確認已配對';
        const monitor = document.createElement('button');
        monitor.type = 'button';
        monitor.textContent = recording ? '已開始記錄' : '開始記錄 Console';
        const next = document.createElement('button');
        next.type = 'button';
        next.textContent = '重新整理並自動回報';
        const reloadHelp = document.createElement('p');
        reloadHelp.textContent = '重整並回報：授權下一次載入穩定後自動送出一次（最多 90 秒）。';
        const label = document.createElement('label');
        const include = document.createElement('input');
        include.type = 'checkbox';
        include.checked = true;
        label.appendChild(include);
        label.appendChild(document.createTextNode(' 包含公開頁面文字'));
        const submit = document.createElement('button');
        submit.type = 'button';
        submit.textContent = '立即送出報告';
        for (const element of [pair, check, info]) pairing.appendChild(element);
        for (const element of [monitor, label]) body.appendChild(element);
        const footer = document.createElement('div');
        footer.id = 'tm-webdiag-footer';
        const actions = document.createElement('div');
        actions.id = 'tm-webdiag-actions';
        actions.appendChild(next);
        actions.appendChild(submit);
        footer.appendChild(actions);
        footer.appendChild(status);
        panel.appendChild(footer);
        host.appendChild(panel);
        const result = document.createElement('p');
        result.id = 'tm-webdiag-result';
        host.appendChild(result);
        // Touch and mouse report actions must not blur the active page editor.
        host.addEventListener('pointerdown', preserveEditorFocus, { capture: true, passive: false });
        host.addEventListener('mousedown', preserveEditorFocus, { capture: true, passive: false });
        host.addEventListener('click', event => {
            if (event.isTrusted && event.target?.closest?.('button, input[type="checkbox"], label')) {
                measureReportInteraction('control-click');
            }
        }, true);
        // Label activation can independently focus its checkbox.
        label.addEventListener('click', event => {
            if (event.target !== include && isActiveTextEditor()) {
                event.preventDefault();
                include.checked = !include.checked;
                include.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        let pairingAuthorized = null;
        const showPairing = visible => {
            pairing.hidden = !visible;
            pairing.style.setProperty('display', visible ? 'block' : 'none', 'important');
        };
        onResult = message => {
            // The full report ID is always available in the panel status.
            // A second full-width result below the panel created a duplicate
            // mobile banner and could overflow the viewport.
            status.textContent = message;
            result.dataset.visible = 'false';
            toggle.textContent = message.startsWith('已送出') ? '已送出' : '立即送出';
            if (message.startsWith('已送出')) setPanelOpen(false);
            else setPanelOpen(true);
        };
        
        async function refreshPairing() {
            pairingState.textContent = '配對狀態：正在檢查…';
            showPairing(false);
            try {
                const r = await post('/api/status', { deviceId, secret });
                pairingAuthorized = r.authorized === true;
                pairingState.textContent = pairingAuthorized ? '配對狀態：已配對' : '配對狀態：尚未配對';
                showPairing(!pairingAuthorized);
                if (!pairingAuthorized && !latestResult) status.textContent = '請先完成配對。';
                return pairingAuthorized;
            } catch (e) {
                pairingState.textContent = '配對狀態：檢查失敗';
                showPairing(true);
                status.textContent = '檢查失敗：' + e.message;
                return false;
            }
        }
        const setStatus = text => { status.textContent = text; };
        const setPanelOpen = open => {
            panel.hidden = !open;
            // Inline !important wins over a host website's global display rules
            // and makes the hidden state reliable in mobile Edge.
            panel.style.setProperty('display', open ? 'flex' : 'none', 'important');
            panel.setAttribute('aria-hidden', String(!open));
            toggle.setAttribute('aria-expanded', String(open));
            host.dataset.open = String(open);
            result.dataset.visible = 'false';
            if (open) { toggle.textContent = '立即送出'; fitDiagnosticViewport(); }
            else toggle.textContent = latestResult.startsWith('已送出') ? '已送出' : '回報';
        };
        toggle.setAttribute('aria-controls', 'tm-webdiag-panel');
        setPanelOpen(false);
        if (latestResult) onResult(latestResult);
        toggle.addEventListener('click', () => {
            if (panel.hidden) { setPanelOpen(true); void refreshPairing(); }
            else if (!submit.disabled) void sendReport();
        });
        pair.addEventListener('click', async () => {
            setStatus('正在建立配對碼…');
            try {
                const r = await post('/api/pair', { deviceId, secret });
                info.textContent = '配對碼：' + r.pairingCode + '（60 分鐘內有效），交給 ChatGPT 完成核准。';
                setStatus('等待配對核准');
            } catch (e) { setStatus('配對失敗：' + e.message); }
        });
        check.addEventListener('click', () => { void refreshPairing(); });
        monitor.addEventListener('click', () => {
            startRecording();
            monitor.textContent = '已開始記錄';
            setStatus('開始記錄新產生的 Console 訊息與例外；不包含開始前的紀錄');
        });
        next.addEventListener('click', async event => {
            // Reject synthetic clicks from arbitrary websites.
            if (event.isTrusted === false) return;
            next.disabled = true;
            const authorized = pairingAuthorized === true || await refreshPairing();
            if (!authorized) {
                setStatus('尚未配對，請先完成配對。');
                next.disabled = false;
                return;
            }
            GM_setValue(AUTO_KEY, { mode: 'once', armedAt: Date.now(), includeText: include.checked });
            setStatus('正在重新整理，頁面穩定後將自動送出一次。');
            window.location.reload();
        });
        async function sendReport() {
            if (submit.disabled) return;
            submit.disabled = true;
            setStatus('正在擷取並送出…');
            try {
                const report = buildReport(include.checked);
                const frameTask = collectFrameReports(include.checked);
                if (frameTask) attachFrameReports(report, await frameTask);
                const response = await post('/api/report', { deviceId, secret, report });
                showResult('已送出報告 ' + response.reportId + '（7 天後自動刪除）');
            } catch (e) {
                setStatus('送出失敗：' + e.message + '。資料尚未上傳。');
            } finally { submit.disabled = false; }
        }
        submit.addEventListener('click', sendReport);
        close.addEventListener('click', () => { setPanelOpen(false); });
        fitDiagnosticViewport();
    }

    function startAutomaticReport() {
        if (!autoReportArmed) return;
        startRecording();
        let completed = false;
        let loaded = document.readyState === 'complete';
        let lastChange = Date.now();
        const startedWaiting = Date.now();
        const observer = new MutationObserver(records => {
            if (records.some(record => !record.target?.closest?.('#tm-webdiag-host'))) {
                lastChange = Date.now();
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        const tick = async () => {
            if (completed) return;
            const elapsed = Date.now() - startedWaiting;
            const timeout = elapsed >= AUTO_MAX_WAIT_MS;
            if (document.readyState === 'complete') loaded = true;
            if (!timeout && (elapsed < AUTO_MIN_WAIT_MS
                || !loaded || Date.now() - lastChange < AUTO_QUIET_MS)) return;
            completed = true;
            observer.disconnect();
            clearInterval(interval);
            recordSnapshot(timeout ? 'auto-timeout' : 'auto-page-stable');
            try {
                const report = buildReport(arm?.includeText === true);
                const frameTask = collectFrameReports(arm?.includeText === true);
                if (frameTask) attachFrameReports(report, await frameTask);
                report.autoSubmission = { triggeredBy: 'explicit-reload-click',
                    reason: timeout ? 'timeout' : 'page-stable', waitedMs: elapsed,
                    readyState: document.readyState, quietMs: Date.now() - lastChange };
                const response = await post('/api/report', { deviceId, secret, report });
                showResult('已送出重新整理後的報告 ' + response.reportId
                    + (timeout ? '（頁面尚未確認穩定）' : '') + '（7 天後自動刪除）');
            } catch (e) {
                showResult('自動回報失敗：' + e.message + '；未自動重試，可手動送出。');
            }
        };
        const interval = setInterval(() => { void tick(); }, 500);
        window.addEventListener('load', () => { loaded = true; }, { once: true });
        setTimeout(() => { void tick(); }, AUTO_MAX_WAIT_MS);
    }

    window.visualViewport?.addEventListener('resize', fitDiagnosticViewport);
    window.visualViewport?.addEventListener('scroll', fitDiagnosticViewport);
    window.addEventListener('scroll', fitDiagnosticViewport, { passive: true });
    window.addEventListener('resize', fitDiagnosticViewport);
    window.addEventListener('orientationchange', fitDiagnosticViewport);
    window.addEventListener('touchstart', fitDiagnosticViewport, { passive: true });
    window.addEventListener('focusin', fitDiagnosticViewport, { passive: true });
    window.addEventListener('focusout', fitDiagnosticViewport, { passive: true });
    recordSnapshot('document-start');
    if (GM_getValue(START_KEY, false)) {
        GM_setValue(START_KEY, false);
        startRecording();
    }
    startAutomaticReport();
    installUI();
    document.addEventListener('DOMContentLoaded', () => {
        recordSnapshot('dom-ready');
        installUI();
    }, { once: true });
    window.addEventListener('load', () => {
        recordSnapshot('load');
        installUI();
    }, { once: true });
    setTimeout(() => { recordSnapshot('after-2s'); installUI(); }, 2000);
    setTimeout(() => { recordSnapshot('after-8s'); installUI(); }, 8000);
    // SPA hydration or translator rewrites can remove injected DOM.
    // Reattach a single existing control; never scan/rewrite site article nodes.
    setInterval(installUI, 4000);
})();
