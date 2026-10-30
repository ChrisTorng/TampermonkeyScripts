const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { BasicElement, createHarness, createLink } = require('./dom-harness');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/CloudMark.user.js'), 'utf8');
const fixture = fs.readFileSync(path.join(root, 'tests/ArticlesExternalNewTab/hackernews.betacat.io.html'), 'utf8');
const server = 'https://cloudmark-christorng.christorng.workers.dev';
const key = 'cloudmark.settings.v1';
const fakeConfig = { mark: 'test-collection', token: 'fake_token_for_local_tests_only_123', category: '' };

function text(html) {
    return html.replace(/<[^>]*>/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ').trim();
}

// Reconstruct the relevant article nodes from the existing real-page capture.
// Shadow DOM, native dialogs, and Tampermonkey network/storage APIs are explicit mocks.
const captured = [...fixture.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)].flatMap((match) => {
    const article = match[1];
    const link = article.match(/<a\b[^>]*class="post-url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!link) return [];
    const summary = article.match(/<div\b[^>]*class="summary-text"[^>]*>([\s\S]*?)<\/div>/);
    return [{ url: text(link[1]), title: text(link[2]), summary: text(summary?.[1] || '') }];
});

function addArticle(harness, entry = captured[0]) {
    const article = harness.document.createElement('article');
    article.className = 'post-item';
    const title = harness.document.createElement('div');
    title.className = 'post-title';
    const heading = harness.document.createElement('h3');
    const link = createLink(harness.document, entry.url, { className: 'post-url', textContent: entry.title });
    const summary = harness.document.createElement('div');
    summary.className = 'summary-text';
    summary.textContent = entry.summary;
    heading.appendChild(link);
    title.appendChild(heading);
    article.append(title, summary);
    harness.appendToBody(article);
    return { article, heading, link, summary };
}

function setup({ settings = fakeConfig, url = 'https://hackernews.betacat.io/', entries = captured } = {}) {
    const h = createHarness({ url });
    const state = { requests: [], aborts: 0, menu: null, shadows: [], storage: new Map(settings ? [[key, { ...settings }]] : []), handler: null };
    const createElement = h.document.createElement.bind(h.document);
    h.document.createElement = (name) => {
        const element = createElement(name);
        element.attachShadow = (options) => {
            assert.equal(options.mode, 'closed');
            const shadow = new BasicElement('shadow-root');
            shadow.ownerDocument = h.document;
            state.shadows.push(shadow);
            return shadow;
        };
        if (name === 'dialog') element.showModal = () => { element.open = true; };
        return element;
    };
    h.context.GM_getValue = (name, fallback) => state.storage.get(name) ?? fallback;
    h.context.GM_setValue = (name, value) => state.storage.set(name, value);
    h.context.GM_registerMenuCommand = (name, callback) => { state.menu = callback; };
    state.respond = (options, data, status = 200) => options.onload({ status, finalUrl: options.url, responseText: JSON.stringify(data) });
    h.context.GM_xmlhttpRequest = (options) => {
        state.requests.push(options);
        queueMicrotask(() => {
            if (state.handler) { state.handler(options); return; }
            if (options.method === 'GET') state.respond(options, { exists: true, bookmarksData: { bookmarks: [] }, settings: { defaultCategory: 'reading' } });
            else if (options.url.endsWith('/claim')) state.respond(options, { created: false });
            else state.respond(options, { uuid: 'fake-bookmark-id', ...JSON.parse(options.data) }, 201);
        });
        return { abort: () => { state.aborts += 1; options.onabort(); } };
    };
    state.entries = entries.map((entry) => addArticle(h, entry));
    state.run = () => vm.runInNewContext(source, h.context, { filename: 'CloudMark.user.js' });
    state.buttons = () => h.document.querySelectorAll('.tm-cloudmark-save');
    state.settings = () => {
        const dialog = state.shadows.at(-1).querySelector('dialog');
        return { dialog, inputs: Object.fromEntries(dialog.querySelectorAll('input').map((input) => [input.name, input])),
            apply: dialog.querySelectorAll('button').find((button) => button.textContent.startsWith('Save settings')),
            cancel: dialog.querySelectorAll('button').find((button) => button.textContent === 'Cancel'),
            error: dialog.querySelector('.error') };
    };
    return { h, state };
}

async function settle() { for (let i = 0; i < 15; i++) await Promise.resolve(); }

describe('CloudMark on captured BetaCat articles', () => {
    test('adds one adjacent button for every captured topic on latest, Chinese, and dated pages', () => {
        assert(captured.length >= 20, 'Use the real captured article list.');
        for (const url of ['https://hackernews.betacat.io/', 'https://hackernews.betacat.io/zh', 'https://hackernews.betacat.io/daily/2026-10-29/']) {
            const { h, state } = setup({ url, settings: null });
            createLink(h.document, 'https://example.com/footer');
            state.run();
            assert.equal(state.buttons().length, captured.length);
            for (const { link } of state.entries) assert.equal(link.nextElementSibling.className, 'tm-cloudmark-save');
            assert.equal(state.requests.length, 0, 'No request before configuration.');
        }
    });

    test('saves original URL, title and summary without navigation, credentials in URLs, or repeat submissions', async () => {
        const { h, state } = setup(); state.run(); await settle();
        const event = state.buttons()[0].click(); await settle();
        const call = state.requests.find((request) => request.url.endsWith('/bookmarks'));
        const data = JSON.parse(call.data);
        assert.equal(data.url, captured[0].url);
        assert.equal(data.title, captured[0].title);
        assert.equal(data.description, captured[0].summary);
        assert.equal(data.category, 'reading');
        assert.equal(data.token, fakeConfig.token);
        assert.equal(call.url, server + '/api/bookmarks');
        assert.equal(call.anonymous, true);
        assert.equal(call.redirect, 'error');
        assert(!call.url.includes(fakeConfig.token));
        assert.equal(event.defaultPrevented, true);
        assert.equal(event.immediatePropagationStopped, true);
        assert.equal(h.location.assignedUrl, null);
        assert.equal(h.window.openCalls.length, 0);
        assert.equal(state.buttons()[0].textContent, '✓ Saved');
        state.buttons()[0].click(); await settle();
        assert.equal(state.requests.filter((request) => request.method === 'POST').length, 1);
    });

    test('shows saved state from the server for duplicate links and prevents simultaneous taps', async () => {
        const { state } = setup({ entries: [captured[0], captured[0]] });
        state.handler = (call) => { if (call.method === 'GET') state.respond(call, { bookmarksData: { bookmarks: [] } }); };
        state.run(); await settle();
        state.buttons()[0].click(); state.buttons()[1].click(); await settle();
        const calls = state.requests.filter((call) => call.method === 'POST');
        assert.equal(calls.length, 1);
        assert(state.buttons().every((button) => button.textContent === 'Saving…'));
        state.respond(calls[0], { uuid: 'confirmed' }, 201); await settle();
        assert(state.buttons().every((button) => button.textContent === '✓ Saved' && button.disabled));
        const existing = setup();
        existing.state.handler = (call) => existing.state.respond(call, { bookmarksData: { bookmarks: [{ url: captured[0].url }] } });
        existing.state.run(); await settle();
        assert.equal(existing.state.buttons()[0].textContent, '✓ Saved');
    });

    test('does not let a slow initial collection read erase a newly saved article', async () => {
        const { state } = setup();
        state.handler = (call) => { if (call.method === 'POST') state.respond(call, { uuid: 'confirmed' }, 201); };
        state.run(); await settle();
        state.buttons()[0].click(); await settle();
        state.respond(state.requests[0], { bookmarksData: { bookmarks: [] } }); await settle();
        assert.equal(state.buttons()[0].textContent, '✓ Saved');
    });

    test('keeps failures retryable and never reports unconfirmed writes as saved', async () => {
        for (const failure of ['token', 'network', 'timeout', 'malformed', 'unconfirmed']) {
            const { state } = setup(); state.run(); await settle();
            state.handler = (call) => {
                if (failure === 'token') state.respond(call, { error: 'Invalid write token' }, 400);
                else if (failure === 'network') call.onerror();
                else if (failure === 'timeout') call.ontimeout();
                else if (failure === 'malformed') call.onload({ status: 502, responseText: '<html>Unavailable</html>' });
                else state.respond(call, {});
            };
            state.buttons()[0].click(); await settle();
            assert.equal(state.buttons()[0].textContent, '↻ Retry');
            assert.equal(state.buttons()[0].disabled, false);
            assert(!state.buttons()[0].title.includes(fakeConfig.token));
            state.handler = (call) => state.respond(call, { uuid: 'retry-confirmed' }, 201);
            state.buttons()[0].click(); await settle();
            assert.equal(state.buttons()[0].textContent, '✓ Saved');
        }
    });

    test('tracks dynamically added/remounted topics without duplicate controls or controls on metadata links', async () => {
        const { h, state } = setup({ entries: [captured[0]], settings: null }); state.run();
        const extra = addArticle(h, captured[1]);
        const author = createLink(h.document, 'https://news.ycombinator.com/user?id=example', { className: 'post-url' });
        extra.article.appendChild(author);
        h.triggerMutation([extra.article]); h.flushAnimationFrames();
        h.triggerMutation([extra.article]); h.flushAnimationFrames();
        assert.equal(state.buttons().length, 2);
        state.buttons()[0].remove();
        h.triggerMutation([]); h.flushAnimationFrames();
        assert.equal(state.buttons().length, 2);
        assert.equal(author.nextElementSibling, null);
        extra.article.remove(); h.triggerMutation([]); h.flushAnimationFrames();
        assert.equal(state.buttons().length, 1);
    });

    test('enforces a timeout even when Chrome fetch mode ignores the native GM timeout', async () => {
        const { h, state } = setup(); state.run(); await settle();
        state.handler = () => {};
        state.buttons()[0].click(); await settle();
        const call = state.requests.at(-1);
        h.runAllTimeouts(); await settle();
        assert.equal(state.aborts, 1);
        assert.equal(state.buttons()[0].textContent, '↻ Retry');
        state.respond(call, { uuid: 'late-response' }, 201); await settle();
        assert.equal(state.buttons()[0].textContent, '↻ Retry');
    });

    test('rejects non-HTTP links and respects API field limits and explicit categories', async () => {
        const long = { url: 'https://example.com/article', title: 'T'.repeat(240), summary: 'S'.repeat(2400) };
        const { state } = setup({ settings: { ...fakeConfig, category: 'hacker-news' }, entries: [long, { ...long, url: 'javascript:alert(1)' }] });
        state.run(); await settle();
        assert.equal(state.buttons().length, 1);
        state.buttons()[0].click(); await settle();
        const data = JSON.parse(state.requests.at(-1).data);
        assert.equal(data.title.length, 200);
        assert.equal(data.description.length, 2000);
        assert.equal(data.category, 'hacker-news');
    });

    test('first click verifies and stores settings in Tampermonkey, then saves the pending article', async () => {
        const { state } = setup({ settings: null, entries: [captured[0]] }); state.run();
        state.buttons()[0].click();
        const ui = state.settings();
        assert.equal(ui.inputs.token.type, 'password');
        ui.inputs.mark.value = server + '/my-collection/';
        ui.inputs.token.value = fakeConfig.token;
        ui.inputs.category.value = 'news';
        ui.apply.click(); await settle();
        const stored = state.storage.get(key);
        assert.equal(stored.mark, 'my-collection');
        assert.equal(stored.token, fakeConfig.token);
        assert.equal(stored.category, 'news');
        assert.deepEqual(state.requests.map((call) => call.method), ['GET', 'POST', 'POST']);
        assert(state.requests[1].url.endsWith('/collections/claim'));
        assert.equal(ui.inputs.token.value, '', 'Clear the detached token field.');
        assert.equal(state.buttons()[0].textContent, '✓ Saved');
    });

    test('rejects foreign servers, reserved collections, missing collections and wrong tokens without changing settings', async () => {
        for (const scenario of ['foreign', 'reserved', 'missing', 'wrong-token']) {
            const { state } = setup(); state.run(); await settle(); state.menu();
            const before = state.storage.get(key);
            const ui = state.settings();
            ui.inputs.mark.value = scenario === 'foreign' ? 'https://example.com/private' : scenario === 'reserved' ? 'demo' : 'another-collection';
            ui.inputs.token.value = fakeConfig.token;
            const count = state.requests.length;
            state.handler = (call) => {
                if (call.method === 'GET') state.respond(call, { exists: scenario !== 'missing', bookmarksData: { bookmarks: [] } });
                else state.respond(call, { error: 'Invalid write token' }, 400);
            };
            ui.apply.click(); await settle();
            assert(ui.error.textContent.length > 0);
            assert.equal(state.storage.get(key), before);
            assert.equal(ui.apply.disabled, false);
            if (['foreign', 'reserved'].includes(scenario)) assert.equal(state.requests.length, count);
        }
    });

    test('cancelling settings during verification neither persists settings nor saves an article', async () => {
        const { state } = setup({ settings: null }); state.run(); state.buttons()[0].click();
        const ui = state.settings();
        ui.inputs.mark.value = fakeConfig.mark; ui.inputs.token.value = fakeConfig.token;
        state.handler = () => {};
        ui.apply.click(); await settle(); ui.cancel.click();
        state.respond(state.requests[0], { exists: true }); await settle();
        assert.equal(state.requests.length, 1);
        assert.equal(state.storage.has(key), false);
        assert.equal(ui.inputs.token.value, '');
    });

    test('coexists with the existing background-tab and article-collapse scripts in either startup order', async () => {
        for (const cloudmarkFirst of [false, true]) {
            const { h, state } = setup({ entries: [captured[0], captured[1]] });
            const opened = [];
            h.context.GM_openInTab = (url) => opened.push(url);
            const runOthers = () => {
                for (const name of ['ArticlesExternalNewTab', 'AutoOpenNewArticles']) {
                    vm.runInNewContext(fs.readFileSync(path.join(root, 'src', name + '.user.js'), 'utf8'), h.context);
                }
            };
            if (cloudmarkFirst) { state.run(); runOthers(); }
            else { runOthers(); state.run(); }
            h.flushAnimationFrames(); await settle();
            assert.equal(state.buttons().length, 2);
            const count = opened.length;
            state.buttons()[0].click(); await settle();
            assert.equal(opened.length, count, 'Saving must not open the article in a background tab.');
            assert.equal(state.buttons()[0].textContent, '✓ Saved');
            assert.equal(JSON.parse(state.requests.at(-1).data).title, captured[0].title);
        }
    });
});
