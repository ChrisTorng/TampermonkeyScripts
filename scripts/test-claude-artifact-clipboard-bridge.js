const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { createHarness } = require('./dom-harness');

const scriptPath = path.join(__dirname, '..', 'src', 'ClaudeArtifactClipboardBridge.user.js');
const source = fs.readFileSync(scriptPath, 'utf8');

function execute(url, prepare = () => {}) {
    const harness = createHarness({ url });
    const storage = new Map();
    const opened = [];
    harness.context.GM_setValue = (key, value) => { storage.set(key, value); };
    harness.context.GM_getValue = (key, fallback) => storage.get(key) || fallback;
    harness.context.GM_deleteValue = (key) => { storage.delete(key); };
    harness.context.GM_openInTab = (url, options) => { opened.push({ url, options }); };
    prepare(harness);
    vm.runInNewContext(source, harness.context, { filename: scriptPath });
    return { harness, storage, opened };
}

describe('Claude Artifact Reader experiment', () => {
    test('ordinary unrelated pages and the clipboard viewer without an import are untouched', () => {
        const ordinary = execute('https://example.org/article');
        assert.equal(ordinary.harness.document.querySelector('#tm-artifact-reader-open'), null);
        const viewer = execute('https://christorng.idv.tw/TampermonkeyScripts/ArtifactReader.html');
        assert.equal(viewer.harness.document.querySelector('#tm-artifact-reader-open'), null);
    });

    test('parent offers transfer only after a real matching iframe responds', () => {
        let frame;
        const messages = [];
        const { harness } = execute('https://claude.ai/artifact/example', (h) => {
            frame = h.document.createElement('iframe');
            frame.setAttribute('src', 'https://1234abcd.frame.claudeusercontent.com/_f/signed');
            frame.contentWindow = { postMessage: (...args) => messages.push(args) };
            h.appendToBody(frame);
        });
        harness.runAllIntervals();
        assert(messages.some((item) => item[0].type === 'probe'));
        assert.equal(harness.document.querySelector('#tm-artifact-reader-open'), null);

        harness.dispatchWindowEvent('message'); // An unrelated message must do nothing.
        harness.window.dispatchEvent({
            type: 'message', source: frame.contentWindow,
            data: { channel: 'tm-claude-artifact-reader-v1', type: 'ready', textLength: 50 }
        });
        assert.equal(harness.document.querySelector('#tm-artifact-reader-open'), null);

        harness.window.dispatchEvent({
            type: 'message', source: frame.contentWindow,
            data: { channel: 'tm-claude-artifact-reader-v1', type: 'ready', textLength: 500 }
        });
        assert.equal(harness.document.querySelector('#tm-artifact-reader-open').textContent, '譯另開');
    });

    test('user-initiated capture is stored for a standalone reader without a server upload', async () => {
        let frame;
        const messages = [];
        const { harness, storage, opened } = execute('https://claude.ai/artifact/example', (h) => {
            frame = h.document.createElement('iframe');
            frame.setAttribute('src', 'https://1234abcd.frame.claudeusercontent.com/_f/signed');
            frame.contentWindow = { postMessage: (...args) => messages.push(args[0]) };
            h.appendToBody(frame);
        });
        harness.window.dispatchEvent({
            type: 'message', source: frame.contentWindow,
            data: { channel: 'tm-claude-artifact-reader-v1', type: 'ready', textLength: 500 }
        });
        assert.equal(storage.size, 0);
        assert.equal(opened.length, 0);

        harness.document.querySelector('#tm-artifact-reader-open').click();
        const request = messages.find((message) => message.type === 'capture');
        assert(request && request.id);
        harness.window.dispatchEvent({
            type: 'message', source: frame.contentWindow,
            data: {
                channel: 'tm-claude-artifact-reader-v1', type: 'captured',
                id: request.id, html: '<div lang="en"><p>Hello world</p></div>'
            }
        });
        await Promise.resolve();
        await Promise.resolve();
        assert.equal(storage.get('tm-claude-reader:' + request.id).html,
            '<div lang="en"><p>Hello world</p></div>');
        assert.equal(opened.length, 1);
        assert.match(opened[0].url, /^https:\/\/christorng\.idv\.tw\/TampermonkeyScripts\/ArtifactReader\.html\?tmArtifactCapture=/);
    });


    test('opening button is independent, document-positioned and not inserted into the shared menu', () => {
        let frame;
        const { harness } = execute('https://claude.ai/artifact/example', (h) => {
            frame = h.document.createElement('iframe');
            frame.setAttribute('src', 'https://1234abcd.frame.claudeusercontent.com/_f/signed');
            frame.contentWindow = { postMessage: () => {} };
            frame._rect = { top: 230, left: 0, right: 340, bottom: 900, width: 340, height: 670 };
            h.appendToBody(frame);
        });
        harness.window.dispatchEvent({
            type: 'message', source: frame.contentWindow,
            data: { channel: 'tm-claude-artifact-reader-v1', type: 'ready', textLength: 500 }
        });
        const button = harness.document.querySelector('#tm-artifact-reader-open');
        assert(button);
        assert.equal(button.textContent, '譯另開');
        assert.match(button.style.cssText, /position:absolute/);
        assert.doesNotMatch(button.style.cssText, /position:fixed|position:sticky/);
        assert.match(button.style.cssText, /top:238px/);
        assert.equal(button.getAttribute('data-floating-tool'), null);
        assert.equal(button.parentNode, harness.document.body);
    });

    test('unrelated iframe source cannot advertise readiness', () => {
        let external;
        const { harness } = execute('https://claude.ai/artifact/example', (h) => {
            external = h.document.createElement('iframe');
            external.setAttribute('src', 'https://example.com/embedded');
            external.contentWindow = { postMessage: () => {} };
            h.appendToBody(external);
        });
        harness.window.dispatchEvent({
            type: 'message', source: external.contentWindow,
            data: { channel: 'tm-claude-artifact-reader-v1', type: 'ready', textLength: 5000 }
        });
        assert.equal(harness.document.querySelector('#tm-artifact-reader-open'), null);
    });

    test('iframe script announces readable content without opening tabs or transmitting HTML', () => {
        let parentMessages = [];
        const { harness, opened } = execute('https://1234abcd.frame.claudeusercontent.com/_f/signed', (h) => {
            h.window.parent = { postMessage: (...args) => parentMessages.push(args) };
            h.document.body.textContent = 'An English article with readable paragraphs. '.repeat(9);
        });
        assert(parentMessages.some((item) => item[0].type === 'ready' && item[0].textLength >= 160));
        assert.equal(parentMessages.some((item) => item[0].html), false);
        assert.equal(opened.length, 0);
        assert.equal(harness.document.querySelector('#tm-artifact-reader-open'), null);
    });
});
