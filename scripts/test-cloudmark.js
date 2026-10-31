const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { webcrypto } = require('node:crypto');
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

function setup({ v2 = null, settings = fakeConfig, url = 'https://hackernews.betacat.io/', entries = captured } = {}) {
    const h = createHarness({ url });
    const state = { requests: [], aborts: 0, menu: null, shadows: [], storage: new Map(settings ? [[key, { ...settings }]] : []), handler: null };
    if (v2) state.storage.set('cloudmark.settings.v2', v2);
    h.context.crypto = webcrypto;
    const createElement = h.document.createElement.bind(h.document);
    h.document.createElement = (name) => {
        const element = createElement(name);
        element.focus = () => { state.focused = element; };
        element.replaceChildren = (...children) => {
            for (const child of [...element.children]) element.removeChild(child);
            element.append(...children);
        };
        element.showPopover = () => { element.open = true; };
        element.attachShadow = (options) => {
            assert.equal(options.mode, 'closed');
            const shadow = new BasicElement('shadow-root');
            shadow.ownerDocument = h.document;
            shadow.host = element;
            shadow.replaceChildren = (...children) => {
                for (const child of [...shadow.children]) shadow.removeChild(child);
                shadow.append(...children);
            };
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
            mode: dialog.querySelector('select'),
            apply: dialog.querySelectorAll('button').find((button) => button.textContent.startsWith('Save settings')),
            cancel: dialog.querySelectorAll('button').find((button) => button.textContent === 'Cancel'),
            error: dialog.querySelector('.error') };
    };
    return { h, state };
}

async function settle() { for (let i = 0; i < 30; i++) await Promise.resolve(); }

function panel(state) { return state.shadows.findLast((shadow) => shadow.host.isConnected && shadow.querySelector('.panel'))?.querySelector('.panel'); }
function notices(state) { return state.shadows.filter((shadow) => shadow.host.isConnected).flatMap((shadow) => shadow.querySelectorAll('.notice')); }
function noticeAction(state, text, index = 0) { return notices(state)[index].querySelectorAll('button').find((button) => button.textContent === text); }
function item(state, text) { return panel(state).querySelectorAll('button').find((button) => button.textContent === text); }
async function open(state, index = 0) { const event = state.buttons()[index].click(); await settle(); return event; }
async function save(state, category = 'reading', index = 0) {
    const event = await open(state, index);
    const button = item(state, category);
    assert(button, 'Category must appear in dropdown: ' + category);
    button.click(); await settle(); return event;
}
function change(element, value) { element.value = value; element.dispatchEvent({ type: 'change' }); }
const postCalls = (state) => state.requests.filter((call) => call.url.endsWith('/bookmarks'));

describe('CloudMark category dropdown on captured BetaCat articles', () => {
    test('places unsaved stars in the title control column on latest, Chinese and archive pages', () => {
        assert(captured.length >= 20);
        for (const url of ['https://hackernews.betacat.io/', 'https://hackernews.betacat.io/zh', 'https://hackernews.betacat.io/daily/2026-10-29/']) {
            const { state } = setup({ url, settings: null }); state.run();
            assert.equal(state.buttons().length, captured.length);
            for (const { link } of state.entries) {
                const title = link.closest('.post-title');
                const button = title.querySelector('.tm-cloudmark-save');
                assert(title.classList.contains('tm-cloudmark-title'));
                assert.equal(button.parentElement, title);
                assert.equal(button.textContent, '☆');
                assert.equal(button.getAttribute('aria-haspopup'), 'dialog');
            }
            assert.equal(state.requests.length, 0);
        }
    });
    test('opens dropdown without saving and saves original metadata only after a category tap', async () => {
        const { h, state } = setup(); state.run(); await settle();
        const event = await open(state);
        assert.equal(postCalls(state).length, 0);
        assert(item(state, 'reading'));
        item(state, 'reading').click(); await settle();
        const call = postCalls(state)[0]; const data = JSON.parse(call.data);
        assert.equal(data.url, captured[0].url); assert.equal(data.title, captured[0].title);
        assert.equal(data.description, captured[0].summary); assert.equal(data.category, 'reading');
        assert.equal(data.token, fakeConfig.token); assert(!call.url.includes(fakeConfig.token));
        assert.equal(call.anonymous, true); assert.equal(call.redirect, 'error');
        assert.equal(event.defaultPrevented, true); assert.equal(event.immediatePropagationStopped, true);
        assert.equal(h.location.assignedUrl, null); assert.equal(h.window.openCalls.length, 0);
        assert.equal(state.buttons()[0].textContent, 'reading');
        assert.equal(state.buttons()[0].disabled, false, 'Saved topics can still switch collections.');
    });
    test('loads existing categories and persists newly named empty categories across reloads', async () => {
        const { state } = setup();
        state.handler = (call) => call.method === 'GET'
            ? state.respond(call, { exists: true, settings: { defaultCategory: 'reading' }, bookmarksData: { bookmarks: [{ url: 'https://other.example/', category: 'AI' }] } })
            : state.respond(call, { uuid: 'created' }, 201);
        state.run(); await settle(); await open(state);
        item(state, 'AI').click(); await settle();
        assert.equal(JSON.parse(postCalls(state)[0].data).category, 'AI');
        await open(state, 1); item(state, '+ New category').click();
        const form = panel(state).querySelector('form'); form.querySelector('input').value = 'Music';
        form.dispatchEvent({ type: 'submit', preventDefault() {} }); await settle();
        assert.equal(JSON.parse(postCalls(state)[1].data).category, 'Music');
        const v2 = state.storage.get('cloudmark.settings.v2');
        assert(v2.collections[0].categories.includes('Music'));
        const next = setup({ v2 }); next.state.run(); await settle(); await open(next.state);
        assert(item(next.state, 'Music'));
    });
    test('switches collections with independent tokens, categories and saved states', async () => {
        const other = { mark: 'other-collection', token: 'other_fake_token_for_tests_123', category: 'Music' };
        const { state } = setup({ v2: { collections: [fakeConfig, other], selectedMark: fakeConfig.mark } });
        state.handler = (call) => call.method === 'GET'
            ? state.respond(call, { exists: true, bookmarksData: { bookmarks: call.url.endsWith(fakeConfig.mark) ? [{ url: captured[0].url, category: 'AI' }] : [] } })
            : state.respond(call, { uuid: 'other-saved' });
        state.run(); await settle(); assert.equal(state.buttons()[0].textContent, 'AI');
        await open(state); change(panel(state).querySelector('select'), other.mark); await settle();
        assert.equal(state.buttons()[0].textContent, '☆'); assert(!item(state, 'AI'));
        item(state, 'Music').click(); await settle();
        const payload = JSON.parse(postCalls(state)[0].data);
        assert.equal(payload.mark, other.mark); assert.equal(payload.token, other.token); assert.equal(payload.category, 'Music');
        assert.equal(state.storage.get('cloudmark.settings.v2').selectedMark, other.mark);
    });
    test('deduplicates rapid taps and duplicate article URLs while displaying the saved category', async () => {
        const { state } = setup({ entries: [captured[0], captured[0]] }); state.run(); await settle(); await open(state);
        state.handler = () => {};
        const category = item(state, 'reading'); category.click(); category.click(); await settle();
        assert.equal(postCalls(state).length, 1);
        assert(state.buttons().every((button) => button.textContent === '☆' && button.disabled));
        state.respond(postCalls(state)[0], { uuid: 'confirmed' }); await settle();
        assert(state.buttons().every((button) => button.textContent === 'reading'));
    });
    test('shows the actual category and only one check, then updates that bookmark without duplicate creation', async () => {
        const { state } = setup({ entries: [captured[0], captured[0]] });
        const bookmark = { uuid: 'existing-uuid', url: captured[0].url, title: 'Custom collection title',
            description: 'Custom description', favicon: 'https://example.com/custom.png', category: 'AI' };
        state.handler = (call) => {
            if (call.method === 'GET') state.respond(call, { exists: true, bookmarksData: { bookmarks: [{...bookmark}] }, settings: { defaultCategory: 'default' } });
            else if (call.method === 'PUT') {
                assert.equal(call.url, server + '/api/bookmarks/existing-uuid');
                const payload = JSON.parse(call.data);
                assert.equal(payload.title, bookmark.title); assert.equal(payload.description, bookmark.description);
                assert.equal(payload.favicon, undefined, 'Category-only edits leave custom icons untouched.');
                bookmark.category = payload.category;
                state.respond(call, { ...bookmark });
            } else assert.fail('An existing article must not be inserted again.');
        };
        state.run(); await settle();
        assert(state.buttons().every((button) => button.textContent === 'AI'));
        await open(state);
        assert.equal(panel(state).querySelectorAll('.category').filter((button) => button.textContent.includes('✓')).length, 1);
        assert.equal(item(state, 'AI ✓').disabled, true);
        assert.equal(item(state, 'default').disabled, false);
        item(state, 'default').click(); await settle();
        assert(state.buttons().every((button) => button.textContent === 'default'));
        assert.equal(state.requests.filter((call) => call.method === 'PUT').length, 1);
        assert.equal(postCalls(state).length, 0);
        await open(state);
        assert(item(state, 'default ✓')); assert.equal(item(state, 'AI').disabled, false);
    });
    test('failed category changes retain the actual saved category and allow retry', async () => {
        const { state } = setup();
        state.handler = (call) => call.method === 'GET'
            ? state.respond(call, { exists: true, bookmarksData: { bookmarks: [{uuid:'id', url:captured[0].url, title:'Saved', category:'AI'}] } })
            : state.respond(call, {error:'Invalid write token'}, 400);
        state.run(); await settle(); await open(state); item(state, 'default').click(); await settle();
        assert.equal(state.buttons()[0].textContent, 'AI'); assert.equal(panel(state), undefined);
        assert.equal(notices(state).length, 1);
        noticeAction(state, 'Choose category').click(); await settle();
        assert(item(state, 'AI ✓')); assert.equal(item(state, 'default').disabled, false);
    });
    test('retains errors in menu and retries without claiming unconfirmed writes succeeded', async () => {
        for (const failure of ['token', 'network', 'timeout', 'malformed', 'unconfirmed']) {
            const { state } = setup(); state.run(); await settle(); await open(state);
            state.handler = (call) => {
                if (failure === 'token') state.respond(call, { error: 'Invalid write token' }, 400);
                else if (failure === 'network') call.onerror();
                else if (failure === 'timeout') call.ontimeout();
                else if (failure === 'malformed') call.onload({ status: 502, responseText: '<html>Error</html>' });
                else state.respond(call, {});
            };
            item(state, 'reading').click(); await settle();
            assert.equal(state.buttons()[0].textContent, '☆'); assert.equal(panel(state), undefined);
            assert.equal(notices(state).length, 1);
            assert(!state.buttons()[0].title.includes(fakeConfig.token));
            state.handler = (call) => state.respond(call, { uuid: 'retry' });
            noticeAction(state, 'Retry').click(); await settle(); assert.equal(state.buttons()[0].textContent, 'reading');
            assert.equal(notices(state).length, 0);
        }
    });
    test('enforces timeout when the native GM timeout is ignored and ignores late success', async () => {
        const { h, state } = setup(); state.run(); await settle(); await open(state); state.handler = () => {};
        item(state, 'reading').click(); await settle(); const call = postCalls(state)[0];
        h.runAllTimeouts(); await settle(); assert.equal(state.aborts, 1);
        state.respond(call, { uuid: 'late' }); await settle(); assert.equal(state.buttons()[0].textContent, '☆');
    });
    test('adds and remounts dynamic topic controls without touching metadata links', () => {
        const { h, state } = setup({ entries: [captured[0]], settings: null }); state.run();
        const extra = addArticle(h, captured[1]);
        const author = createLink(h.document, 'https://news.ycombinator.com/user?id=example', { className: 'post-url' });
        extra.article.appendChild(author); h.triggerMutation([extra.article]); h.flushAnimationFrames();
        h.triggerMutation([]); h.flushAnimationFrames(); assert.equal(state.buttons().length, 2);
        state.buttons()[0].remove(); h.triggerMutation([]); h.flushAnimationFrames();
        assert.equal(state.buttons().length, 2); assert.equal(author.nextElementSibling, null);
    });
    test('connects an existing collection without discarding previous settings and reopens the menu', async () => {
        const { state } = setup(); state.run(); await settle(); await open(state); item(state, '+ Add collection').click();
        const ui = state.settings(); assert.equal(ui.inputs.mark.value, ''); assert.equal(ui.inputs.token.type, 'password');
        ui.inputs.mark.value = server + '/connected-collection/'; ui.inputs.token.value = fakeConfig.token;
        ui.inputs.category.value = 'news'; ui.apply.click(); await settle();
        const stored = state.storage.get('cloudmark.settings.v2'); assert.equal(stored.collections.length, 2);
        assert.equal(stored.selectedMark, 'connected-collection'); assert.equal(postCalls(state).length, 0);
        assert.equal(ui.inputs.token.value, ''); assert(item(state, 'news'));
    });
    test('creates a collection with a secure generated token and retains it locally', async () => {
        const { state } = setup({ settings: null }); state.run(); await open(state); item(state, '+ Add collection').click();
        const ui = state.settings(); change(ui.mode, 'create');
        assert.match(ui.inputs.token.value, /^[a-f0-9]{64}$/); const token = ui.inputs.token.value;
        ui.inputs.mark.value = 'brand-new-collection';
        state.handler = (call) => call.method === 'GET'
            ? state.respond(call, { exists: false }) : state.respond(call, { created: true });
        ui.apply.click(); await settle();
        const claim = state.requests.find((call) => call.url.endsWith('/claim'));
        assert.equal(JSON.parse(claim.data).token, token);
        assert.equal(state.storage.get('cloudmark.settings.v2').collections[0].token, token);
        assert.equal(postCalls(state).length, 0, 'Creating does not silently save the pending article.');
    });
    test('rejects foreign URLs, reserved marks, missing collections and wrong tokens without replacing settings', async () => {
        for (const scenario of ['foreign', 'reserved', 'missing', 'wrong-token', 'existing-create']) {
            const { state } = setup(); state.run(); await settle(); const before = JSON.stringify(state.storage.get('cloudmark.settings.v2'));
            state.menu(); const ui = state.settings();
            if (scenario === 'existing-create') change(ui.mode, 'create');
            ui.inputs.mark.value = scenario === 'foreign' ? 'https://example.com/private' : scenario === 'reserved' ? 'demo' : 'another-collection';
            ui.inputs.token.value = fakeConfig.token;
            state.handler = (call) => call.method === 'GET'
                ? state.respond(call, { exists: scenario !== 'missing' })
                : state.respond(call, { error: 'Invalid write token' }, 400);
            ui.apply.click(); await settle(); assert(ui.error.textContent.length > 0);
            assert.equal(JSON.stringify(state.storage.get('cloudmark.settings.v2')), before); assert.equal(ui.apply.disabled, false);
            if (scenario === 'existing-create') assert(!state.requests.some((call) => call.url.endsWith('/claim')));
        }
    });
    test('cancel during connection verification does not persist credentials', async () => {
        const { state } = setup({ settings: null }); state.run(); state.menu(); const ui = state.settings();
        ui.inputs.mark.value = fakeConfig.mark; ui.inputs.token.value = fakeConfig.token; state.handler = () => {};
        ui.apply.click(); await settle(); ui.cancel.click(); state.respond(state.requests[0], { exists: true }); await settle();
        assert.equal(state.requests.length, 1); assert.equal(state.storage.has('cloudmark.settings.v2'), false);
        assert.equal(ui.inputs.token.value, '');
    });
    test('uses native popover light-dismiss and keeps only one dropdown open', async () => {
        const { state } = setup(); state.run(); await settle(); await open(state);
        const first = panel(state); await open(state, 1); assert.notEqual(panel(state), first);
        const current = panel(state); current.dispatchEvent({ type: 'toggle', newState: 'closed' });
        assert.equal(state.buttons()[1].getAttribute('aria-expanded'), 'false');
    });
    test('replaces New category in place with a focused input and Add, and closes explicitly', async () => {
        const { state } = setup(); state.run(); await settle(); await open(state);
        const current = panel(state);
        const before = [...current.children];
        const action = item(state, '+ New category');
        const index = before.indexOf(action);
        action.click();
        const form = current.querySelector('form');
        assert.equal(current.children[index], form, 'Input replaces the existing action in the same position.');
        assert.equal(item(state, '+ New category'), undefined);
        assert.equal(state.focused, form.querySelector('input'));
        assert.equal(form.querySelector('button').textContent, 'Add');
        form.querySelector('input').value = 'Music';
        form.dispatchEvent({type:'submit', preventDefault(){}}); await settle();
        assert.equal(JSON.parse(postCalls(state)[0].data).category, 'Music');
        await open(state, 1);
        const close = panel(state).querySelector('.menu-close');
        assert.equal(close.getAttribute('aria-label'), 'Close CloudMark menu');
        close.click();
        assert.equal(state.buttons()[1].getAttribute('aria-expanded'), 'false');
    });
    test('keeps a new-category form open while the mobile keyboard resizes the viewport', async () => {
        const { h, state } = setup(); state.run(); await settle(); await open(state);
        item(state, '+ New category').click(); const form = panel(state).querySelector('form');
        h.window.innerHeight = 380; h.window.dispatchEvent({ type: 'resize' });
        h.window.dispatchEvent({ type: 'scroll' });
        assert.equal(panel(state).querySelector('form'), form);
        assert.equal(state.buttons()[0].getAttribute('aria-expanded'), 'true');
    });
    test('does not let a background refresh overwrite a confirmed save', async () => {
        const { h, state } = setup(); state.run(); await settle();
        const now = Date.now(); h.context.Date = class extends Date { static now() { return now + 60000; } };
        state.handler = (call) => { if (call.method === 'POST') state.respond(call, { uuid: 'confirmed' }); };
        await save(state);
        const refresh = state.requests.findLast((call) => call.method === 'GET');
        state.respond(refresh, { exists: true, bookmarksData: { bookmarks: [] } }); await settle();
        assert.equal(state.buttons()[0].textContent, 'reading');
    });
    test('shows cached categories immediately, deduplicates preload reads, and closes before a cold-cache write', async () => {
        const { state } = setup({ settings: { ...fakeConfig, categories: ['AI'], defaultCategory: 'reading' } });
        state.handler = () => {};
        state.run(); state.buttons()[0].click();
        assert.equal(item(state, 'AI').disabled, false);
        assert.equal(item(state, 'reading').disabled, false);
        assert.equal(state.requests.filter((call) => call.method === 'GET').length, 1);
        item(state, 'AI').click();
        assert.equal(panel(state), undefined, 'Close synchronously before either response.');
        assert.equal(state.buttons()[0].textContent, '☆');
        await settle(); assert.equal(postCalls(state).length, 0);
        state.respond(state.requests[0], { exists: true, bookmarksData: { bookmarks: [{ uuid: 'existing', url: captured[0].url,
            title: 'Edited title', description: 'Edited description', category: 'Music' }] } }); await settle();
        const write = state.requests.find((call) => call.method === 'PUT');
        assert(write); assert.equal(JSON.parse(write.data).category, 'AI');
        assert.equal(JSON.parse(write.data).title, 'Edited title');
        state.respond(write, { uuid: 'existing' }); await settle();
        assert.equal(state.buttons()[0].textContent, 'AI'); assert.equal(notices(state).length, 0);
    });
    test('does not wait for write responses or close another article menu on success', async () => {
        const { state } = setup(); state.run(); await settle(); await open(state);
        state.handler = () => {};
        item(state, 'reading').click();
        assert.equal(panel(state), undefined); assert.equal(state.buttons()[0].textContent, '☆');
        assert.equal(state.buttons()[0].getAttribute('aria-busy'), 'true');
        await open(state, 1);
        const second = panel(state);
        state.respond(postCalls(state)[0], { uuid: 'saved' }); await settle();
        assert.equal(panel(state), second, 'A background success must not close the new menu.');
        assert.equal(state.buttons()[0].textContent, 'reading');
        assert.equal(state.buttons()[0].getAttribute('aria-busy'), 'false');
    });
    test('background refresh updates categories without clearing or unfocusing a new category draft', async () => {
        const { state } = setup({ settings: { ...fakeConfig, categories: ['AI'] } });
        state.handler = () => {}; state.run(); state.buttons()[0].click();
        item(state, '+ New category').click();
        const form = panel(state).querySelector('form'); const input = form.querySelector('input'); input.value = 'New music';
        state.respond(state.requests[0], { exists: true, bookmarksData: { bookmarks: [{url:'https://other.example/', category:'Science'}] } });
        await settle();
        assert.equal(panel(state).querySelector('form'), form); assert.equal(input.value, 'New music');
        assert.equal(state.focused, input); assert(item(state, 'Science'));
    });
    test('prefetches connected collections and remembers categories without reloading fresh data on every tap', async () => {
        const other = { mark: 'other-collection', token: 'other_fake_token_for_tests_123', category: 'Music' };
        const { state } = setup({v2:{collections:[fakeConfig,other],selectedMark:fakeConfig.mark}});
        state.run(); await settle();
        assert.equal(state.requests.filter((call)=>call.method==='GET').length, 2);
        await open(state); await open(state); await open(state);
        assert.equal(state.requests.filter((call)=>call.method==='GET').length, 2);
        const stored = state.storage.get('cloudmark.settings.v2');
        assert(stored.collections.every((item)=>item.categories.includes('reading')));
        assert(stored.collections.every((item)=>!('bookmarks' in item)), 'Only category metadata is persisted.');
    });
    test('shows retryable failure notices without interrupting another article and retries the intended category', async () => {
        const { state } = setup(); state.run(); await settle(); await open(state);
        state.handler = () => {};
        item(state, 'reading').click(); await open(state, 1);
        const second = panel(state); const call = postCalls(state)[0];
        state.respond(call, {error:'Temporary failure'}, 503); await settle();
        assert.equal(panel(state), second); assert.equal(notices(state).length, 1);
        assert(notices(state)[0].querySelector('p').textContent.includes('reading'));
        state.handler = (request) => state.respond(request, {uuid:'retried'});
        noticeAction(state, 'Retry').click(); await settle();
        assert.equal(JSON.parse(postCalls(state)[1].data).category, 'reading');
        assert.equal(notices(state).length, 0); assert.equal(state.buttons()[0].textContent, 'reading');
        assert.equal(panel(state), second);
    });
    test('retries use the failed collection even after the user switches to another collection', async () => {
        const other = { mark: 'other-collection', token: 'other_fake_token_for_tests_123', category: 'Music' };
        const { state } = setup({v2:{collections:[fakeConfig,other],selectedMark:fakeConfig.mark}});
        state.run(); await settle(); state.handler = () => {};
        await save(state); await open(state, 1);
        change(panel(state).querySelector('select'), other.mark); await settle();
        const second = panel(state);
        state.respond(postCalls(state)[0], {error:'Temporary failure'}, 503); await settle();
        state.handler = (call) => state.respond(call, {uuid:'recovered'});
        noticeAction(state, 'Retry').click(); await settle();
        const payload = JSON.parse(postCalls(state)[1].data);
        assert.equal(payload.mark, fakeConfig.mark); assert.equal(payload.token, fakeConfig.token);
        assert.equal(panel(state), second); assert.equal(second.querySelector('select').value, other.mark);
        assert.equal(state.buttons()[0].textContent, '☆', 'Success must not mark the active other collection as saved.');
    });
    test('keeps simultaneous failures separate and lets each notice be dismissed', async () => {
        const { state } = setup(); state.run(); await settle();
        state.handler = (call) => state.respond(call, {error:'Offline'},503);
        await save(state, 'reading', 0); await save(state, 'reading', 1);
        assert.equal(notices(state).length, 2);
        notices(state)[0].querySelector('.dismiss').click();
        assert.equal(notices(state).length, 1);
        notices(state)[0].querySelector('.dismiss').click();
        assert.equal(notices(state).length, 0);
    });
    test('respects API limits and ignores unsupported URLs', async () => {
        const long = { url: 'https://example.com/article', title: 'T'.repeat(240), summary: 'S'.repeat(2400) };
        const { state } = setup({ settings: { ...fakeConfig, category: 'hacker-news' }, entries: [long, { ...long, url: 'javascript:alert(1)' }] });
        state.run(); await settle(); assert.equal(state.buttons().length, 1); await save(state, 'hacker-news');
        const data = JSON.parse(postCalls(state)[0].data); assert.equal(data.title.length, 200); assert.equal(data.description.length, 2000);
    });
    test('coexists with background-tab and collapse scripts in either startup order', async () => {
        for (const cloudmarkFirst of [false, true]) {
            const { h, state } = setup({ entries: [captured[0], captured[1]] }); const opened = [];
            h.context.GM_openInTab = (url) => opened.push(url);
            const runOthers = () => { for (const name of ['ArticlesExternalNewTab', 'AutoOpenNewArticles'])
                vm.runInNewContext(fs.readFileSync(path.join(root, 'src', name + '.user.js'), 'utf8'), h.context); };
            if (cloudmarkFirst) { state.run(); runOthers(); } else { runOthers(); state.run(); }
            h.flushAnimationFrames(); await settle(); const count = opened.length; await save(state);
            assert.equal(opened.length, count); assert.equal(state.buttons()[0].textContent, 'reading');
        }
    });
});
