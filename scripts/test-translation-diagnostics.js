const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createHarness } = require('./dom-harness');

const script = fs.readFileSync(path.join(__dirname, '../src/TranslationDiagnostics.user.js'), 'utf8');

function run(url, setup = () => {}, seededValues = null) {
    const h = createHarness({ url });
    const values = new Map(seededValues || []);
    const clock = { now: Date.now() };
    h.context.Date = class extends Date { static now() { return clock.now; } };
    const calls = [];
    h.location.protocol = new URL(url).protocol;
    h.context.crypto = {
        randomUUID: () => '9fbd37be-dfab-477a-ad93-90732813a4af',
        getRandomValues(arr) { arr.fill(0x17); return arr; }
    };
    h.context.navigator = { language: 'zh-TW', userAgent: 'Mozilla/5.0 Android Edge' };
    h.context.NodeFilter = { SHOW_TEXT: 4 };
    h.document.createTextNode = text => {
        const el = h.document.createElement('span');
        el.textContent = text;
        return el;
    };
    h.document.documentElement.cloneNode = () => ({
        querySelectorAll: () => [],
        outerHTML: '<html lang="zh-TW"><body><article>[content is sanitized]</article></body></html>'
    });
    h.context.GM_getValue = (key, fallback) => values.has(key) ? values.get(key) : fallback;
    h.context.GM_setValue = (key, value) => values.set(key, value);
    h.context.GM_xmlhttpRequest = options => {
        calls.push({ url: options.url, method: options.method, data: JSON.parse(options.data) });
        let response = { ok: true };
        if (options.url.endsWith('/api/status')) response = { authorized: true };
        if (options.url.endsWith('/api/pair')) response = { pairingCode: 'ABCDE234', expiresMinutes: 60 };
        if (options.url.endsWith('/api/report')) response = { ok: true, reportId: '20261117-ABCDE2345678' };
        options.onload({ status: 200, responseText: JSON.stringify(response) });
    };
    h.window.confirm = () => true;
    setup(h);
    h.context.globalThis = h.context;
    vm.runInNewContext(script, h.context, { filename: 'TranslationDiagnostics.user.js' });
    return { h, values, calls, clock };
}

test('common web pages show the report button without special query parameters', () => {
    for (const url of [
        'https://www.perplexity.ai/hub/blog/perplexity-decider',
        'https://www.perplexity.ai/en-GB/hub/blog/teammates-are-agents-for-complex-ongoing-work',
        'https://www.perplexity.ai/search/test',
        'https://example.org/',
    ]) {
        const { h } = run(url);
        assert(h.document.getElementById('tm-webdiag-toggle'), url);
        assert.equal(h.document.querySelectorAll('#tm-webdiag-toggle').length, 1, url);
    }
});

test('reports cannot be sent before an explicit click', () => {
    const { h, calls } = run('https://www.perplexity.ai/hub/blog/perplexity-decider');
    assert.equal(calls.length, 0);
    h.runAllTimeouts();
    assert.equal(calls.length, 0);
    assert.equal(h.document.querySelectorAll('#tm-webdiag-toggle').length, 1);
});

test('diagnostics panel is reliably hidden by inline !important and closes from its top bar', async () => {
    const { h, calls } = run('https://www.techspot.com/news/114558-nvidia-deliberately-kept-gpu-prices-high-through-circular.html');
    const toggle = h.document.getElementById('tm-webdiag-toggle');
    const panel = h.document.getElementById('tm-webdiag-panel');
    const close = h.document.getElementById('tm-webdiag-close');
    assert(toggle && panel && close);
    assert.equal(panel.hidden, true);
    assert.equal(panel.style.getPropertyValue('display'), 'none');
    assert.equal(panel.style.getPropertyPriority('display'), 'important');
    assert.equal(panel.getAttribute('aria-hidden'), 'true');
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(panel.children[0].id, 'tm-webdiag-panel-header');
    assert.equal(panel.children[0].children[1], close);

    toggle.click();
    await Promise.resolve();
    assert.equal(panel.hidden, false);
    assert.equal(panel.style.getPropertyValue('display'), 'flex');
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');

    close.click();
    assert.equal(panel.hidden, true);
    assert.equal(panel.style.getPropertyValue('display'), 'none');
    assert.equal(panel.getAttribute('aria-hidden'), 'true');
    h.runAllTimeouts();
    h.runAllIntervals();
    assert.equal(panel.hidden, true);
    assert.equal(panel.style.getPropertyValue('display'), 'none');
    assert.equal(calls.filter(x => x.url.endsWith('/api/report')).length, 0);

    toggle.click();
    assert.equal(panel.hidden, false);
    toggle.click();
    assert.equal(panel.hidden, true);
});

test('one-click refresh explicitly arms a single sanitized automatic report', async () => {
    const url = 'https://www.techspot.com/news/114558-nvidia-deliberately-kept-gpu-prices-high-through-circular.html';
    const { h, values, calls } = run(url);
    const panel = h.document.getElementById('tm-webdiag-panel');
    const body = h.document.getElementById('tm-webdiag-body');
    const footer = h.document.getElementById('tm-webdiag-footer');
    const pairing = h.document.getElementById('tm-webdiag-pairing');
    assert(body && footer && pairing);
    assert.equal(panel.children[1], body);
    assert.equal(panel.children[2], footer);
    assert.equal(footer.children[1].getAttribute('role'), 'status');
    h.document.getElementById('tm-webdiag-toggle').click();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(pairing.hidden, true, 'Already paired devices must not show pairing code controls.');
    const next = footer.querySelector('#tm-webdiag-actions').children[0];
    assert.equal(next.textContent, '重新整理並自動回報');
    next.click();
    await Promise.resolve();
    assert.equal(h.location.reloadCallCount, 1, 'Click immediately reloads the page.');
    assert.equal(values.get('tm-webdiag-auto-once:' + url).mode, 'once');
    assert.equal(calls.filter(x => x.url.endsWith('/api/report')).length, 0,
        'Report is sent only after the next page loads.');
});

test('armed reload records a settled page and automatically sends only once', async () => {
    const url = 'https://visualbasic.world/';
    const key = 'tm-webdiag-auto-once:' + url;
    const seed = new Map([[key, { mode: 'once', armedAt: Date.now() - 500 }]]);
    const { h, calls, values, clock } = run(url, () => {}, seed);
    assert.equal(values.get(key), null, 'One-shot authorization is consumed at page start.');
    assert.equal(calls.filter(c => c.url.endsWith('/api/report')).length, 0);
    h.dispatchWindowEvent('load');
    clock.now += 9500;
    h.runAllIntervals();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    const reports = calls.filter(c => c.url.endsWith('/api/report'));
    assert.equal(reports.length, 1);
    assert.equal(reports[0].data.report.mode, 'structure');
    assert.equal(reports[0].data.report.autoSubmission.reason, 'page-stable');
    assert.equal(reports[0].data.report.autoSubmission.triggeredBy, 'explicit-reload-click');
    assert.equal(h.document.getElementById('tm-webdiag-toggle').textContent, '已送出');
    assert.match(h.document.getElementById('tm-webdiag-footer').querySelector('[data-status]').textContent,
        /已送出重新整理後的報告/);
    clock.now += 10000;
    h.runAllIntervals();
    h.runAllTimeouts();
    assert.equal(calls.filter(c => c.url.endsWith('/api/report')).length, 1);
    const repeat = run(url, () => {}, values);
    repeat.h.runAllTimeouts();
    assert.equal(repeat.calls.filter(c => c.url.endsWith('/api/report')).length, 0,
        'Subsequent reloads cannot auto-submit without another explicit click.');
});

test('unarmed diagnostic pages never auto-upload after timers and load', () => {
    const { h, calls } = run('https://visualbasic.world/');
    h.dispatchWindowEvent('load');
    h.runAllTimeouts();
    h.runAllIntervals();
    assert.equal(calls.filter(c => c.url.endsWith('/api/report')).length, 0);
});

test('a report is sent only to the paired Cloudflare endpoint, without URL search strings', async () => {
    const { h, calls } = run('https://www.perplexity.ai/hub/blog/perplexity-decider?session=SUPERSECRET');
    const panel = h.document.getElementById('tm-webdiag-panel');
    assert(panel);
    h.document.getElementById('tm-webdiag-toggle').click();
    assert.equal(panel.hidden, false);
    await Promise.resolve();
    const submit = h.document.getElementById('tm-webdiag-actions').children[1];
    assert(submit);
    submit.click();
    await Promise.resolve();
    await Promise.resolve();
    const item = calls.find(c => c.url.endsWith('/api/report'));
    assert(item);
    assert.equal(item.url, 'https://tm-web-diagnostics.christorng.workers.dev/api/report');
    assert.equal(item.data.report.url, 'https://www.perplexity.ai/hub/blog/perplexity-decider');
    assert.equal(item.data.report.mode, 'structure');
    assert.equal(item.data.report.snapshots[0].html.lang, null);
    assert.equal(item.data.report.domTruncated, false);
    assert(!JSON.stringify(item.data.report).includes('SUPERSECRET'));
    assert(!JSON.stringify(item.data.report).includes(item.data.secret));
});

test('starting recording wraps the console only after user activation', () => {
    const { h } = run('https://example.org/');
    const panel = h.document.getElementById('tm-webdiag-panel');
    const monitor = h.document.getElementById('tm-webdiag-body').children.find(x => x.tagName === 'BUTTON' && x.textContent === '開始記錄 Console');
    assert(monitor);
    assert.equal(monitor.textContent, '開始記錄 Console');
    monitor.click();
    assert.equal(monitor.textContent, '已開始記錄');
    assert(h.document.getElementById('tm-webdiag-toggle'));
});

test('report panel can be recovered if a site removes the control', () => {
    const { h } = run('https://www.perplexity.ai/en-GB/hub/blog/teammates-are-agents-for-complex-ongoing-work');
    const host = h.document.getElementById('tm-webdiag-host');
    host.remove();
    assert.equal(h.document.getElementById('tm-webdiag-host'), null);
    h.runAllIntervals();
    assert(h.document.getElementById('tm-webdiag-toggle'));
    const recoveredPanel = h.document.getElementById('tm-webdiag-panel');
    assert.equal(recoveredPanel.hidden, true);
    assert.equal(recoveredPanel.style.getPropertyValue('display'), 'none');
});

test('mobile report panel and success toast are fixed to viewport and never duplicate', async () => {
    const { h } = run('https://christorng.idv.tw/notes/editor/');
    const toggle = h.document.getElementById('tm-webdiag-toggle');
    const host = h.document.getElementById('tm-webdiag-host');
    const panel = h.document.getElementById('tm-webdiag-panel');
    const toast = h.document.getElementById('tm-webdiag-result');
    const css = host.children.find(child => child.tagName === 'STYLE').textContent;
    assert.ok(css.includes('#tm-webdiag-panel{position:fixed!important'));
    assert.ok(css.includes('#tm-webdiag-result{display:none!important;position:fixed!important'));
    assert.ok(css.includes('max-width:calc(100vw - 16px)'));
    toggle.click();
    await Promise.resolve();
    await Promise.resolve();
    const submit = h.document.getElementById('tm-webdiag-actions').children[1];
    submit.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(panel.hidden, false);
    assert.equal(toast.dataset.visible, 'false', 'Do not display a second status outside the open panel');
    assert.match(h.document.getElementById('tm-webdiag-footer').querySelector('[data-status]').textContent, /已送出報告/);
    assert.equal(toggle.textContent, '已送出');
});

test('archive.is report UI counter-scales on a shrunk desktop page and restores at scale one', () => {
    const { h } = run('https://archive.is/R5XUn', h => {
        h.window.visualViewport.scale = 0.4;
        h.window.visualViewport.width = 900;
        h.window.visualViewport.height = 1500;
    });
    const host = h.document.getElementById('tm-webdiag-host');
    const toggle = h.document.getElementById('tm-webdiag-toggle');
    const panel = h.document.getElementById('tm-webdiag-panel');
    const result = h.document.getElementById('tm-webdiag-result');
    assert.equal(host.style.getPropertyValue('bottom'), '25px');
    assert.equal(toggle.style.getPropertyValue('transform'), 'scale(2.5)');
    assert.equal(panel.style.getPropertyValue('transform'), 'scale(2.5)');
    assert.equal(panel.style.getPropertyValue('width'), '336px');
    assert.equal(panel.style.getPropertyValue('height'), '420px');
    assert.equal(result.style.getPropertyValue('transform'), 'scale(2.5)');
    assert.equal(h.document.querySelector('meta[name="viewport"]'), null);
    h.window.visualViewport.scale = 1;
    h.dispatchVisualViewportEvent('resize');
    assert.equal(toggle.style.getPropertyValue('transform'), '');
    assert.equal(panel.style.getPropertyValue('transform'), '');
    assert.equal(panel.style.getPropertyValue('width'), '');
});
