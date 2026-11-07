const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { createHarness } = require('./dom-harness');

const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'TranslatePreformattedText.user.js'), 'utf8'
);
const channel = 'tm-embedded-reader-v1';

function boot(url = 'https://example.org/article', prepare = () => {},
    sharedStore = new Map(), sessionStorageSeed = {}) {
    const h = createHarness({ url, sessionStorageSeed });
    const opened = [];
    h.context.GM_setValue = (k, v) => sharedStore.set(k, v);
    h.context.GM_getValue = (k, fallback) => sharedStore.get(k) ?? fallback;
    h.context.GM_listValues = () => Array.from(sharedStore.keys());
    h.context.GM_deleteValue = (k) => sharedStore.delete(k);
    h.context.GM_openInTab = (url, options) => opened.push({ url, options });
    prepare(h);
    vm.runInNewContext(source, h.context);
    return { h, opened, store: sharedStore };
}

function embed(h, host, opts = {}) {
    const frame = h.document.createElement('iframe');
    frame.setAttribute('src', 'https://' + host + '/embed/article');
    frame.contentWindow = { postMessage: () => {} };
    frame._rect = {
        left: opts.left ?? 20, right: opts.right ?? 410,
        top: opts.top ?? 250, bottom: opts.bottom ?? 900,
        width: (opts.right ?? 410) - (opts.left ?? 20),
        height: (opts.bottom ?? 900) - (opts.top ?? 250)
    };
    h.appendToBody(frame);
    return frame;
}
function frameMessage(h, frame, data) {
    h.window.dispatchEvent({
        type: 'message', source: frame.contentWindow,
        data: { channel, ...data }, origin: new URL(frame.getAttribute('src')).origin
    });
}

describe('generic iframe translation reader', () => {
    test('standard script identity and GM API grants are preserved', () => {
        assert.match(source, /@name\s+Translate Preformatted Text/);
        assert.match(source, /@grant\s+GM_setValue/);
        assert.match(source, /@grant\s+GM_getValue/);
        assert.match(source, /@sandbox\s+raw/);
        const html = fs.readFileSync(path.join(__dirname, '..', 'IframeViewer.html'), 'utf8');
        assert.match(html, /<main id="iframe-viewer-content"/);
        assert.doesNotMatch(html, /Clipboard Viewer|pasteArea|typeList|contenteditable/);
        assert.match(source, /https:\/\/christorng\.idv\.tw\/TampermonkeyScripts\/ArtifactReader\.html/);
        assert.doesNotMatch(source, /tampermonkey-scripts-git-experiment|frame\.claudeusercontent\.com/);
    });

    test('a generic iframe has no button until its own content script reports ready', () => {
        let frame;
        const { h } = boot('https://news.example.org/story', (h) => {
            frame = embed(h, 'embed.other.example');
        });
        assert.equal(h.document.querySelectorAll('.tm-iframe-translate-open').length, 0);
        frameMessage(h, frame, { type: 'ready', textLength: 25 });
        assert.equal(h.document.querySelectorAll('.tm-iframe-translate-open').length, 0);
        frameMessage(h, frame, { type: 'ready', textLength: 260 });
        const buttons = h.document.querySelectorAll('.tm-iframe-translate-open');
        assert.equal(buttons.length, 1);
        assert.equal(buttons[0].textContent, '譯↗');
        assert.match(buttons[0].style.cssText, /position:absolute/);
        assert.match(buttons[0].style.cssText, /left:360px/);
        assert.match(buttons[0].style.cssText, /top:256px/);
        assert.match(buttons[0].style.cssText, /border:0 !important/);
        assert.match(buttons[0].style.cssText, /background:rgba\(0,0,0,\.35\)/);
        assert.doesNotMatch(buttons[0].style.cssText, /position:fixed|position:sticky/);
        frameMessage(h, frame, { type: 'ready', textLength: 260 });
        assert.equal(h.document.querySelectorAll('.tm-iframe-translate-open').length, 1);
    });

    test('separate embeds receive separate buttons; fake/nonmatching windows cannot add one', () => {
        let one, two, unsafe;
        const { h } = boot('https://example.org/post', (h) => {
            one = embed(h, 'embed.one.example');
            two = embed(h, 'embed.two.example', { left: 20, right: 310, top: 950, bottom: 1300 });
            unsafe = h.document.createElement('iframe');
            unsafe.setAttribute('src', 'javascript:alert(1)');
            unsafe.contentWindow = { postMessage: () => {} };
            h.appendToBody(unsafe);
        });
        frameMessage(h, unsafe, { type: 'ready', textLength: 200 });
        frameMessage(h, one, { type: 'ready', textLength: 200 });
        frameMessage(h, two, { type: 'ready', textLength: 250 });
        assert.equal(h.document.querySelectorAll('.tm-iframe-translate-open').length, 2);
    });

    test('dragging changes the transient position but does not persist or open an article', () => {
        let frame;
        const { h, opened, store } = boot('https://example.org/story', (h) => {
            frame = embed(h, 'embed.example.net');
        });
        frameMessage(h, frame, { type: 'ready', textLength: 240 });
        const button = h.document.querySelector('.tm-iframe-translate-open');
        // The DOM harness does not parse cssText into properties automatically.
        button.style.left = '360px';
        button.style.top = '256px';
        button.dispatchEvent({ type: 'pointerdown', pointerId: 1, clientX: 350, clientY: 270, button: 0 });
        button.dispatchEvent({ type: 'pointermove', pointerId: 1, clientX: 310, clientY: 340, preventDefault() {} });
        button.dispatchEvent({ type: 'pointerup', pointerId: 1 });
        assert.equal(button.style.left, '320px');
        assert.equal(button.style.top, '326px');
        button.click();
        assert.equal(opened.length, 0);
        assert.equal(store.size, 0);
        assert.equal(h.window.localStorage.length ?? 0, 0);
    });

    test('click captures from the selected iframe and opens the OWN-domain standalone reader', async () => {
        let frame;
        const messages = [];
        const { h, opened, store } = boot('https://example.org/story', (h) => {
            frame = embed(h, 'embed.example.com');
            h.document.title = 'Original source story';
            frame.contentWindow.postMessage = (message) => messages.push(message);
        });
        frameMessage(h, frame, { type: 'ready', textLength: 300 });
        const button = h.document.querySelector('.tm-iframe-translate-open');
        button.click();
        const request = messages.find(m => m.type === 'capture');
        assert(request?.id);
        assert.equal(opened.length, 0);
        frameMessage(h, frame, { type: 'captured', id: request.id,
            html: '<div lang="en"><p>Rich text</p></div>', title: 'Readable article' });
        await Promise.resolve();
        await Promise.resolve();
        assert.equal(opened.length, 1);
        const readerAddress = new URL(opened[0].url);
        assert.equal(readerAddress.origin + readerAddress.pathname,
            'https://christorng.idv.tw/TampermonkeyScripts/IframeViewer.html');
        assert.equal(readerAddress.searchParams.get('id'), request.id);
        assert.equal(readerAddress.searchParams.get('title'), 'Original source story');
        assert.equal(readerAddress.searchParams.get('url'), 'https://example.org/story');
        assert.equal(store.get('tm-embedded-reader:' + request.id).html,
            '<div lang="en"><p>Rich text</p></div>');
        assert.equal(button.textContent, '譯↗');
    });


    function makeReader(id, store, seed = {}) {
        const title = 'Full source article title, not iframe title';
        const url = 'https://example.org/articles/42?topic=accessibility#section';
        const query = new URLSearchParams({ id, title, url });
        const readerUrl = 'https://christorng.idv.tw/TampermonkeyScripts/IframeViewer.html?' + query;
        let anchor, address, target;
        const result = boot(readerUrl, (h) => {
            anchor = h.document.createElement('a');
            anchor.id = 'iframe-viewer-source-link';
            h.appendToBody(anchor);
            address = h.document.createElement('div');
            address.id = 'iframe-viewer-source-url';
            h.appendToBody(address);
            target = h.document.createElement('main');
            target.id = 'iframe-viewer-content';
            target.replaceChildren = (fragment) => { target.imported = fragment; };
            h.appendToBody(target);
            // Mock only the DOM fragment receiver: the real sanitizer and
            // source-link initialization still run in the userscript.
            const createElement = h.document.createElement.bind(h.document);
            h.document.createElement = (tag) => tag === 'template'
                ? { content: { querySelectorAll: () => [] }, innerHTML: '' }
                : createElement(tag);
        }, store, seed);
        return { ...result, anchor, address, target, title, url, readerUrl };
    }

    async function settle() {
        for (let i = 0; i < 9; i++) await Promise.resolve();
    }

    test('viewer retains full source title and hyperlink from query, and imports into session cache', async () => {
        const id = 'capture-abcdef12345';
        const html = '<div lang="en"><h1>Independent content A</h1></div>';
        const store = new Map([['tm-embedded-reader:' + id,
            { html, createdAt: Date.now() }]]);
        const first = makeReader(id, store);
        await settle();
        assert.equal(first.anchor.textContent, first.title);
        assert.equal(first.anchor.href, first.url);
        assert.equal(first.address.textContent, first.url);
        assert.equal(first.h.document.title, first.title);
        assert(first.target.imported, 'HTML should have been imported into the main reader area');
        const saved = first.h.sessionStorage.getItem('tm-iframe-viewer:' + id);
        assert(saved);
        assert.equal(JSON.parse(saved).html, html);
        assert.equal(store.has('tm-embedded-reader:' + id), false,
            'GM handoff should be deleted once sessionStorage owns the snapshot');

        const reload = makeReader(id, new Map(), {
            ['tm-iframe-viewer:' + id]: saved
        });
        await settle();
        assert(reload.target.imported, 'refresh must use the per-tab session cache without GM storage');
        assert.equal(reload.h.location.replacedUrl, null);
        assert.equal(reload.anchor.href, first.url);
    });

    test('different reader ids do not mix and survive independent refreshes', async () => {
        const oneId = 'capture-one-12345', twoId = 'capture-two-12345';
        const store = new Map([
            ['tm-embedded-reader:' + oneId,
                { html: '<p>One article</p>', createdAt: Date.now() }],
            ['tm-embedded-reader:' + twoId,
                { html: '<p>Two article</p>', createdAt: Date.now() }]
        ]);
        const one = makeReader(oneId, store), two = makeReader(twoId, store);
        await settle();
        const cacheOne = JSON.parse(one.h.sessionStorage.getItem('tm-iframe-viewer:' + oneId));
        const cacheTwo = JSON.parse(two.h.sessionStorage.getItem('tm-iframe-viewer:' + twoId));
        assert.equal(cacheOne.html, '<p>One article</p>');
        assert.equal(cacheTwo.html, '<p>Two article</p>');
        assert.equal(store.size, 0);
    });

    test('missing reader content replaces current tab with source, without opening another tab', async () => {
        const reader = makeReader('capture-missing-12345', new Map());
        await settle();
        for (let i = 0; i < 34; i++) {
            reader.h.runAllIntervals();
            await settle();
        }
        assert.equal(reader.h.location.replacedUrl, reader.url);
        assert.equal(reader.opened.length, 0);
    });

    test('invalid source protocols never become a clickable link or redirect target', async () => {
        const readerUrl = 'https://christorng.idv.tw/TampermonkeyScripts/IframeViewer.html'
            + '?id=capture-invalid-12345&title=Source&url='
            + encodeURIComponent('javascript:alert(1)');
        const { h } = boot(readerUrl, (h) => {
            const link = h.document.createElement('a');
            link.id = 'iframe-viewer-source-link';
            h.appendToBody(link);
            const content = h.document.createElement('main');
            content.id = 'iframe-viewer-content';
            h.appendToBody(content);
        });
        await settle();
        for (let i = 0; i < 34; i++) {
            h.runAllIntervals();
            await settle();
        }
        assert.equal(h.document.querySelector('#iframe-viewer-source-link').getAttribute('href'), null);
        assert.equal(h.location.replacedUrl, null);
    });

    test('injected child frame announces only the availability of text', () => {
        const messages = [];
        const { h, store } = boot('https://arbitrary.frame.example.org/article', (h) => {
            const parent = { postMessage: (...args) => messages.push(args[0]) };
            h.window.top = parent;
            h.window.parent = parent;
            h.document.body.textContent = 'An ordinary embedded article, not Claude-specific. '.repeat(8);
        });
        assert(messages.some(x => x.type === 'ready' && x.textLength >= 100));
        assert(!messages.some(x => x.html));
        assert.equal(store.size, 0);
        assert.equal(h.document.querySelector('.tm-iframe-translate-open'), null);
    });

    test('other pages on christorng.idv.tw are excluded without touching their UI', () => {
        const { h } = boot('https://christorng.idv.tw/InfoProcess/Clipboard/');
        assert.equal(h.document.querySelector('#tm-translate-all-pre'), null);
        assert.equal(h.document.querySelector('.tm-iframe-translate-open'), null);
    });
});
