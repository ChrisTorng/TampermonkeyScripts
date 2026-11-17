const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createHarness } = require('./dom-harness');

const script = fs.readFileSync(path.join(__dirname, '../src/TranslationDiagnostics.user.js'), 'utf8');

function run(url, setup = () => {}) {
    const h = createHarness({ url });
    const values = new Map();
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
    return { h, values, calls };
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

test('a report is sent only to the paired Cloudflare endpoint, without URL search strings', async () => {
    const { h, calls } = run('https://www.perplexity.ai/hub/blog/perplexity-decider?session=SUPERSECRET');
    const panel = h.document.getElementById('tm-webdiag-panel');
    assert(panel);
    h.document.getElementById('tm-webdiag-toggle').click();
    assert.equal(panel.hidden, false);
    await Promise.resolve();
    const submit = panel.children.find(x => x.tagName === 'BUTTON' && x.textContent === '送出報告至 Cloudflare');
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
    const monitor = panel.children.find(x => x.tagName === 'BUTTON' && x.textContent === '開始記錄 Console');
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
});
