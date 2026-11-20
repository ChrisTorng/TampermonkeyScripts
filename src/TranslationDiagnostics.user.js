// ==UserScript==
// @name         Translation Diagnostics
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-11-21_1.2.1
// @description  Universal opt-in web diagnostics: sanitized DOM, translation flags, errors and recent console logs, with paired Cloudflare reporting.
// @author       Chris Torng
// @match        *://*/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      tm-web-diagnostics.christorng.workers.dev
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TranslationDiagnostics.user.js
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TranslationDiagnostics.user.js
// ==/UserScript==

(function () {
    'use strict';
    if (window !== window.top || !/^https?:$/.test(location.protocol)) return;

    const ENDPOINT = 'https://tm-web-diagnostics.christorng.workers.dev';
    const VERSION = '2026-11-21_1.2.1';
    const HISTORY_LIMIT = 40;
    const HTML_LIMIT = 4_000_000;
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
    function captureDom(includeText) {
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
                const keep = ['id', 'class', 'role', 'lang', 'dir', 'translate', 'contenteditable',
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
        return { domHtml: raw.length <= HTML_LIMIT ? raw : raw.slice(0, HTML_LIMIT),
            domTruncated: raw.length > HTML_LIMIT,
            originalDomCharacters: raw.length };
    }

    function buildReport(includeText) {
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
            ...dom
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
        if (host.querySelector('#tm-webdiag-toggle')) return;
        const css = document.createElement('style');
        css.textContent = [
            '#tm-webdiag-host{all:initial!important;position:fixed!important;bottom:10px!important;left:8px!important;z-index:2147483647!important;pointer-events:none!important}',
            '#tm-webdiag-host *{box-sizing:border-box!important;font:14px/1.4 system-ui,sans-serif!important}',
            '#tm-webdiag-host button,#tm-webdiag-host input{pointer-events:auto!important}',
            '#tm-webdiag-host button{background:#363636!important;color:#fff!important;border:1px solid #777!important;border-radius:7px!important;padding:7px 10px!important;margin:3px!important;cursor:pointer!important}',
            '#tm-webdiag-panel{position:absolute!important;bottom:calc(100% + 7px)!important;left:0!important;background:#202020!important;color:#fff!important;border:1px solid #666!important;border-radius:9px!important;width:min(370px,calc(100vw - 20px))!important;height:min(82dvh,600px)!important;max-height:calc(100dvh - 80px)!important;overflow:hidden!important;overscroll-behavior:contain!important;pointer-events:auto!important;flex-direction:column!important}',
            '#tm-webdiag-panel[hidden]{display:none!important}',
            '#tm-webdiag-panel-header{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;position:sticky!important;top:-10px!important;background:#202020!important;padding:6px 0!important;z-index:1!important}',
            '#tm-webdiag-close{margin:0!important;padding:4px 9px!important;white-space:nowrap!important}',
            '#tm-webdiag-panel p{margin:7px 0!important;color:#ddd!important}',
            '#tm-webdiag-panel label{display:block!important;color:#fff!important;margin:5px 0!important}',
            '#tm-webdiag-panel code{font:12px monospace!important;overflow-wrap:anywhere!important;color:#fff!important}',
            '#tm-webdiag-panel [data-status]{white-space:pre-wrap!important;overflow-wrap:anywhere!important;font-size:13px!important;margin:7px 0 0!important;max-height:100px!important;overflow-y:auto!important}',
            '#tm-webdiag-panel-header{flex:0 0 auto!important;padding:8px 10px!important;border-bottom:1px solid #555!important}',
            '#tm-webdiag-body{flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;padding:8px 10px!important}',
            '#tm-webdiag-footer{flex:0 0 auto!important;border-top:1px solid #555!important;padding:8px 10px!important}',
            '#tm-webdiag-actions{display:flex!important;flex-wrap:wrap!important;gap:4px!important}',
            '#tm-webdiag-actions button{flex:1 1 130px!important}',
            '#tm-webdiag-pairing[hidden]{display:none!important}',
            '#tm-webdiag-result{display:none!important;pointer-events:none!important;background:#202020!important;color:#fff!important;padding:5px 8px!important;max-width:min(320px,calc(100vw - 20px))!important}',
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
        notice.textContent = '按下「重新整理並自動回報」即授權下一次載入後自動送出一份結構報告。預設不含文章文字、表單值、Cookie 或網址參數。';
        body.appendChild(notice);
        const status = document.createElement('p');
        status.dataset.status = 'true';
        status.textContent = latestResult || '按鈕在此區，回報結果顯示在最下方。';
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
        reloadHelp.textContent = '重整後會記錄至頁面載入穩定，最多觀察 90 秒，並自動送出一次；不會自動附上公開文章全文。';
        const label = document.createElement('label');
        const include = document.createElement('input');
        include.type = 'checkbox';
        include.checked = false;
        label.appendChild(include);
        label.appendChild(document.createTextNode(' 包含公開頁面文字（需確認）'));
        const submit = document.createElement('button');
        submit.type = 'button';
        submit.textContent = '立即送出報告';
        for (const element of [pair, check, info]) pairing.appendChild(element);
        for (const element of [monitor, reloadHelp, label]) body.appendChild(element);
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
        let pairingAuthorized = null;
        const showPairing = visible => {
            pairing.hidden = !visible;
            pairing.style.setProperty('display', visible ? 'block' : 'none', 'important');
        };
        onResult = message => {
            status.textContent = message;
            result.textContent = message;
            result.dataset.visible = 'true';
            toggle.textContent = message.startsWith('已送出') ? '已送出' : '回報';
        };
        if (latestResult) onResult(latestResult);
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
            if (open) result.dataset.visible = 'false';
        };
        toggle.setAttribute('aria-controls', 'tm-webdiag-panel');
        setPanelOpen(false);
        toggle.addEventListener('click', () => {
            const open = panel.hidden;
            setPanelOpen(open);
            if (open) void refreshPairing();
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
            GM_setValue(AUTO_KEY, { mode: 'once', armedAt: Date.now() });
            setStatus('正在重新整理，頁面穩定後將自動送出一次。');
            window.location.reload();
        });
        submit.addEventListener('click', async () => {
            if (include.checked && !window.confirm('這是公開文章嗎？報告會包含可見文字並保存 7 天。請勿在私人、登入或付款頁勾選。')) return;
            submit.disabled = true;
            setStatus('正在擷取並送出…');
            try {
                const report = buildReport(include.checked);
                const response = await post('/api/report', { deviceId, secret, report });
                showResult('已送出報告 ' + response.reportId + '（7 天後自動刪除）');
            } catch (e) {
                setStatus('送出失敗：' + e.message + '。資料尚未上傳。');
            } finally { submit.disabled = false; }
        });
        close.addEventListener('click', () => { setPanelOpen(false); });
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
                const report = buildReport(false);
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
