/* Math Visibility Lab: browser-native translation diagnostics; no userscript needed. */
(() => {
    'use strict';
    const modes = ['baseline', 'output', 'source', 'paragraph', 'image', 'placeholder', 'engines'];
    const selected = new URLSearchParams(location.search).get('mode');
    const mode = modes.includes(selected) ? selected : 'paragraph';
    const url = 'https://tm-math-translation-lab.christorng.workers.dev/report';
    const store = 'math-visibility-lab-20261114';
    let settings = {};
    try { settings = JSON.parse(sessionStorage.getItem(store) || '{}'); } catch (_) {}
    const session = settings.session || crypto.randomUUID();
    let consent = settings.consent === true;
    const history = [];
    let hash = '';
    let timer;
    let mutations = 0;
    let lastUpload = 0;
    let uploadPending = false;
    let rebuildTimer = null;
    document.documentElement.dataset.labMode = mode;
    const get = (id) => document.getElementById(id);
    const within = (root, selector) => Array.from(root.querySelectorAll(selector));
    const trim = (value, max) => String(value || '').slice(0, max || 350);
    function bounds(element) {
        const r = element.getBoundingClientRect();
        const css = getComputedStyle(element);
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width),
            h: Math.round(r.height), display: css.display,
            visibility: css.visibility, color: css.color, opacity: css.opacity };
    }
    function inspect(element) {
        return {
            id: element.id,
            viewportVisible: (() => { const r = element.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; })(),
            order: Array.from(element.children).filter((el) => el.dataset.part).map((el) => el.dataset.part),
            rect: bounds(element),
            text: trim(element.textContent, 1200),
            html: trim(element.innerHTML, 3000),
            items: within(element, '[data-part]').map((el) => ({
                part: el.dataset.part, tag: el.tagName,
                text: trim(el.textContent, 150), rect: bounds(el),
                mathjaxCount: el.querySelectorAll('mjx-container').length,
                latex: within(el, '[data-latex]').map((n) => trim(n.getAttribute('data-latex'), 130)).slice(0, 2),
                image: within(el, 'img').map((img) => ({ loaded: img.complete, width: img.naturalWidth, alt: img.alt }))
            }))
        };
    }
    function snapshot(reason) {
        const block = get('case-' + mode);
        const control = get('plain-control').textContent;
        const samples = within(block, 'p[data-example]');
        return {
            at: new Date().toISOString(), reason, mode, mutations, session,
            controlText: trim(control, 200),
            controlTranslated: !control.includes('This ordinary English control sentence should be translated'),
            viewport: { width: innerWidth, height: innerHeight, scrollY: Math.round(scrollY),
                scale: window.visualViewport?.scale || 1 },
            userAgent: navigator.userAgent,
            mathJaxReady: !!window.MathJax?.startup?.document,
            mathJaxCount: block.querySelectorAll('mjx-container').length,
            scriptsActive: {
                mathGuard: !!document.querySelector('[data-tm-math-protected]'),
                inlineOrder: !!document.querySelector('[data-tm-translation-order-anchor]')
            },
            samples: samples.map(inspect),
            reconstructed: within(block, '[data-hybrid-root]').map(root => ({
                position: root.dataset.hybridRoot,
                engine: root.closest('[data-engine-case]')?.dataset.engineCase || '',
                status: root.dataset.reconstruction,
                formulaIds: root.dataset.formulaIds || '',
                formulaCount: root.querySelectorAll('[data-restored-formula]').length,
                mathJaxNodes: root.querySelectorAll('mjx-container').length,
                sentences: root.querySelectorAll('.math-hybrid-sentence').length,
                sentenceAligned: root.dataset.sentenceAligned || '',
                statusMessage: root.querySelector('[data-hybrid-note]')?.textContent || '',
                text: trim(root.querySelector('[data-hybrid-content]')?.textContent, 850)
            }))
        };
    }
    function data() {
        return { lab: 'math-visibility-20261114', session, method: mode, events: history.slice(-10) };
    }
    // Full raw DOM history remains available via "下載 JSON" for investigations.
    // Automatic/manual submissions use a compact sample that preserves:
    // the first state, first observed translation, and the most recent state.
    // Sending ten copies of rendered MathJax HTML made G reports unnecessarily large.
    function uploadData() {
        const first = history[0];
        const firstTranslated = history.find(e => e.controlTranslated);
        const latest = history[history.length - 1];
        const events = [...new Set([first, firstTranslated, latest].filter(Boolean))];
        const minimized = events.map(event => ({
            ...event,
            samples: event.samples.map(sample => ({
                ...sample,
                html: trim(sample.html, 700),
                text: trim(sample.text, 750),
                items: sample.items.map(item => ({
                    ...item,
                    text: trim(item.text, 120)
                }))
            }))
        }));
        return { lab: 'math-visibility-20261114', format: 'compact-v2',
            session, method: mode, capturedEvents: history.length, events: minimized };
    }
    function status(message) { get('report-status').textContent = message; }
    async function send(kind, report) {
        const response = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'omit', mode: 'cors', referrerPolicy: 'no-referrer',
            body: JSON.stringify({ version: 1, session, method: mode, kind, report })
        });
        let result = null;
        try { result = await response.json(); } catch (_) {}
        if (!response.ok || !result?.saved) {
            const detail = result?.error ? ' (' + result.error + ')' : '';
            throw new Error('HTTP ' + response.status + detail);
        }
        return result;
    }
    async function autoSend() {
        if (!consent || uploadPending || Date.now() - lastUpload < 3000) return;
        uploadPending = true; lastUpload = Date.now();
        try {
            await send('dom', uploadData());
            status('診斷已傳送；實驗代碼 ' + session.slice(0, 8) + '，48 小時後刪除');
        } catch (error) { status('傳送失敗：' + error.message + '；仍可下載 JSON'); }
        uploadPending = false;
    }
    function record(reason) {
        const value = snapshot(reason);
        const next = JSON.stringify(value.samples) + JSON.stringify(value.reconstructed) + value.controlText + (value.viewport.scrollY > 300 ? 'scrolled' : 'top');
        if (next === hash && reason === 'change') return;
        hash = next;
        history.push(value);
        if (history.length > 10) history.shift();
        get('log').textContent = JSON.stringify(uploadData(), null, 2);
        const inView = value.samples.find((s) => s.viewportVisible) || value.samples[0];
        const formulas = inView.items.filter((item) => item.part.startsWith('M'));
        const visible = formulas.filter((item) => item.rect.w > 0 && item.rect.h > 0
            && item.rect.display !== 'none').length;
        get('formula-status').textContent = 'DOM 區域可測量 ' + visible + '/' + formulas.length +
            '；MathJax ' + value.mathJaxCount + ' 個；第三版 ' + value.reconstructed.map(x=>x.status+':'+x.formulaIds).join(' / ') + '；已記錄 ' + history.length + ' 次';
        get('control-status').textContent = value.controlTranslated
            ? '英文對照文字已變化' : '英文對照文字尚未翻譯';
        if (value.scriptsActive.mathGuard || value.scriptsActive.inlineOrder) {
            status('偵測到已安裝的數學/順序實驗腳本：純淨比較請先在本網址停用它們，再重整測試頁。');
        }
        void autoSend();
    }
    function enqueue(reason) { clearTimeout(timer); timer = setTimeout(() => record(reason || 'change'), 500); }
    function saveSettings() {
        try { sessionStorage.setItem(store, JSON.stringify({ session, consent })); } catch (_) {}
    }
    function download(name, blob) {
        const address = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = address; a.download = name; a.click();
        setTimeout(() => URL.revokeObjectURL(address), 5000);
    }
    function ready() {
        const block = get('case-' + mode);
        get('current-method').textContent = mode;
        get('session-id').textContent = session;
        const toggle = get('enable-report');
        const label = () => { toggle.textContent = consent ? '停止自動回報' : '開始自動回報'; };
        label();
        toggle.onclick = () => {
            consent = !consent; saveSettings(); label();
            status(consent ? '開始傳送本測試頁的 DOM 診斷（無 Cookie 與網頁以外的內容）' : '已停止回報');
            if (consent) void autoSend();
        };
        get('capture-now').onclick = () => record('manual');
        get('download-json').onclick = () => download('math-lab-' + mode + '.json',
            new Blob([JSON.stringify(data(), null, 2)], { type: 'application/json' }));
        get('send-now').onclick = async () => {
            record('manual');
            try { await send('dom', uploadData()); status('已上傳本次結果 ' + session.slice(0, 8)); }
            catch (error) { status('傳送失敗：' + error.message); }
        };
        get('capture-image').onclick = async () => {
            if (typeof html2canvas !== 'function') {
                status('DOM 擷圖程式尚未載入；可改用 Edge 內建螢幕截圖。'); return;
            }
            try {
                const card = block.querySelector('[data-near]');
                const canvas = await html2canvas(card, { backgroundColor: '#18212a', scale: 1, logging: false });
                const png = canvas.toDataURL('image/png');
                download('math-lab-' + mode + '.png', await (await fetch(png)).blob());
                if (consent && png.length < 300000) {
                    await send('image', { png, at: new Date().toISOString() });
                    status('DOM 圖片已上傳；這不是瀏覽器畫面的原生截圖');
                } else status('PNG 已下載；開啟自動回報後才會傳送圖片');
            } catch (error) { status('圖片擷取失敗：' + error.message); }
        };
        get('copy-json').onclick = async () => {
            try {
                await navigator.clipboard.writeText(JSON.stringify(uploadData(), null, 2));
                status('已複製診斷');
            } catch (_) { status('剪貼簿無法使用，請下載 JSON'); }
        };
        const experiment = mode === 'paragraph' || mode === 'placeholder' || mode === 'engines';
        let latestReconstruction = [];
        function paintKaTeX() {
            if (mode !== 'engines' || !window.katex?.render) return;
            block.querySelectorAll('[data-katex-tex]').forEach(node => {
                if (node.dataset.katexReady === 'true') return;
                try {
                    window.katex.render(node.dataset.katexTex, node, {
                        throwOnError: false, output: 'htmlAndMathml'
                    });
                    node.dataset.katexReady = 'true';
                } catch (error) {
                    node.dataset.katexError = String(error?.message || error);
                }
            });
        }
        const rebuild = () => {
            if (!experiment) return;
            paintKaTeX();
            if (mode === 'engines') {
                latestReconstruction = Array.from(block.querySelectorAll('[data-engine-case]'))
                    .flatMap(section => window.MathVisibilityReconstructor?.rebuildPair(section,'slots') || []);
            } else {
                latestReconstruction = window.MathVisibilityReconstructor
                    ?.rebuildPair(block, mode === 'placeholder' ? 'markers' : 'slots') || [];
            }
        };
        const queueRebuild = () => {
            if (!experiment) return;
            clearTimeout(rebuildTimer);
            rebuildTimer = setTimeout(() => { rebuild(); enqueue('reconstructed'); }, 220);
        };
        rebuild();
        if (mode === 'engines') window.addEventListener('katex-loaded', () => queueRebuild());
        // Probe the test content, but do not recursively rebuild a reconstructed result.
        new MutationObserver((records) => {
            mutations += records.length;
            if (records.some(r => !r.target.closest?.('[data-hybrid-root]'))) queueRebuild();
            enqueue();
        }).observe(block, { childList: true, subtree: true, characterData: true,
            attributes: true, attributeFilter: ['class', 'style', 'hidden', 'translate'] });
        new MutationObserver(() => { queueRebuild(); enqueue('translation-control'); }).observe(get('plain-control'), {
            childList: true, subtree: true, characterData: true
        });
        if (mode === 'output') {
            const protect = () => within(block, 'mjx-container').forEach((n) => {
                if (n.getAttribute('translate') !== 'no') n.setAttribute('translate', 'no');
                if (!n.classList.contains('notranslate')) n.classList.add('notranslate');
            });
            new MutationObserver(protect).observe(block, { childList: true, subtree: true });
            protect();
        }
        addEventListener('scroll', () => enqueue('scroll'), { passive: true });
        addEventListener('pageshow', () => enqueue('pageshow'));
        record('initial');
        setTimeout(() => { rebuild(); record('after-mathjax'); }, 2300);
        setTimeout(() => { rebuild(); record('late'); }, 6300);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
    else ready();
})();
