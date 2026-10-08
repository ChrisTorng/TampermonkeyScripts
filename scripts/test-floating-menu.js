const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { createHarness } = require('./dom-harness');

const root = path.join(__dirname, '..');
const files = {
    archive: 'AllGoInternetArchive.user.js',
    archiveFallback: 'InternetArchive.user.js',
    mobile: 'ForceMobileView.user.js',
    dark: 'ForceDarkMode.user.js',
    translate: 'TranslatePreformattedText.user.js',
};
const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.readFileSync(path.join(root, 'src', file), 'utf8')]));
const key = 'tm-floating-menu-v1:example.com';

function run(order, options = {}) {
    const harness = createHarness({
        url: options.url || 'https://example.com/article',
        readyState: 'loading',
        localStorageSeed: options.localStorageSeed || {},
        gmInfo: { script: { matches: ['*://*/*'] } },
    });
    if (options.pre) {
        const pre = harness.document.createElement('pre');
        pre.textContent = 'example';
        harness.appendToBody(pre);
    }
    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    if (options.scale) harness.window.visualViewport.scale = options.scale;
    for (const feature of order) {
        vm.runInNewContext(source[feature], harness.context, { filename: files[feature] });
    }
    harness.dispatchDocumentEvent('DOMContentLoaded');
    return harness;
}

function menuTools(harness) {
    return harness.document.querySelectorAll('[data-floating-tool]');
}

describe('shared floating menu', () => {
    test('one collapsed menu owns the four controls in a stable order', () => {
        const harness = run(['translate', 'dark', 'mobile', 'archive'], { pre: true });
        const menu = harness.document.getElementById('tm-shared-floating-menu');
        const toggle = harness.document.querySelector('[data-floating-toggle]');
        const close = harness.document.querySelector('[data-floating-close]');
        assert(menu);
        assert.equal(harness.document.querySelectorAll('#tm-shared-floating-menu').length, 1);
        assert.equal(menu.hidden, false);
        assert.equal(toggle.textContent, '≡');
        assert.equal(toggle.getAttribute('aria-expanded'), 'false');
        assert.equal(close.hidden, true);
        assert.deepEqual(menuTools(harness).map((button) => button.getAttribute('data-floating-tool')), ['archive', 'mobile', 'dark', 'translate']);
        assert(menuTools(harness).every((button) => button.hidden));
        toggle.click();
        assert.equal(toggle.getAttribute('aria-expanded'), 'true');
        assert.equal(close.hidden, false);
        assert(menuTools(harness).every((button) => !button.hidden));
    });

    test('unavailable translation control and empty menu stay hidden', () => {
        const onlyTranslation = run(['translate']);
        assert.equal(onlyTranslation.document.getElementById('tm-shared-floating-menu').hidden, true);
        const harness = run(['dark', 'translate']);
        harness.document.querySelector('[data-floating-toggle]').click();
        assert.equal(harness.document.querySelector('[data-floating-tool="dark"]').hidden, false);
        assert.equal(harness.document.querySelector('[data-floating-tool="translate"]').hidden, true);
    });

    test('drag position is saved by hostname and restored on the next page', () => {
        const first = run(['archive']);
        const toggle = first.document.querySelector('[data-floating-toggle]');
        toggle.dispatchEvent({ type: 'mousedown', clientX: 1270, clientY: 80 });
        first.document.dispatchEvent({ type: 'mousemove', clientX: 1070, clientY: 180, preventDefault() {} });
        first.document.dispatchEvent({ type: 'mouseup' });
        const saved = first.window.localStorage.getItem(key);
        assert.deepEqual(JSON.parse(saved), { x: 1042, y: 170 });
        const next = run(['mobile'], { localStorageSeed: { [key]: saved } });
        const menu = next.document.getElementById('tm-shared-floating-menu');
        assert.equal(menu.style.left, '1042px');
        assert.equal(menu.style.top, '170px');
    });

    test('normal scrolling reaches the viewport top and restores the page-top clearance', () => {
        for (const feature of Object.keys(files)) {
            const harness = run([feature], { pre: true });
            const menu = harness.document.getElementById('tm-shared-floating-menu');
            if (!menu) continue; // The fallback only registers on supported Wayback pages.
            for (const [scroll, top] of [[0, 70], [30, 70], [120, 120], [20, 70], [0, 70]]) {
                harness.window.scrollY = scroll;
                harness.dispatchWindowEvent('scroll');
                assert.equal(menu.style.top, `${top}px`);
                assert.equal(menu.style.position, 'absolute');
            }
        }
    });

    test('pinch zoom and panning do not reposition or save the menu', () => {
        const saved = JSON.stringify({ x: 1000, y: 170 });
        const harness = run(['translate', 'dark'], { pre: true, localStorageSeed: { [key]: saved } });
        const menu = harness.document.getElementById('tm-shared-floating-menu');
        harness.window.visualViewport.scale = 3;
        harness.window.visualViewport.offsetTop = 250;
        harness.window.visualViewport.offsetLeft = 500;
        harness.window.visualViewport.width = 400;
        harness.window.innerWidth = 400;
        harness.window.scrollY = 300;
        harness.dispatchVisualViewportEvent('resize');
        harness.dispatchVisualViewportEvent('scroll');
        harness.dispatchWindowEvent('resize');
        harness.dispatchWindowEvent('scroll');
        assert.equal(menu.style.top, '170px');
        assert.equal(menu.style.left, '1000px');
        assert.equal(harness.window.localStorage.getItem(key), saved);
        harness.window.visualViewport.scale = 1;
        harness.window.innerWidth = 1280;
        harness.window.scrollY = 0;
        harness.dispatchVisualViewportEvent('resize');
        assert.equal(menu.style.top, '170px');
        assert.equal(menu.style.left, '1000px');
    });

    test('dragging on a scrolled page saves clearance rather than document position', () => {
        const harness = run(['mobile']);
        harness.window.scrollY = 400;
        harness.dispatchWindowEvent('scroll');
        const toggle = harness.document.querySelector('[data-floating-toggle]');
        toggle.dispatchEvent({ type: 'mousedown', clientX: 1270, clientY: 10 });
        harness.document.dispatchEvent({ type: 'mousemove', clientX: 1070, clientY: 180, preventDefault() {} });
        harness.document.dispatchEvent({ type: 'mouseup' });
        assert.deepEqual(JSON.parse(harness.window.localStorage.getItem(key)), { x: 1042, y: 170 });
        harness.window.scrollY = 0;
        harness.dispatchWindowEvent('scroll');
        assert.equal(harness.document.getElementById('tm-shared-floating-menu').style.top, '170px');
    });

    test('pinch zoom is detected on pages whose initial fit scale is below one', () => {
        const harness = run(['archive'], { scale: 0.4 });
        const menu = harness.document.getElementById('tm-shared-floating-menu');
        harness.window.visualViewport.scale = 0.8;
        harness.window.scrollY = 300;
        harness.dispatchWindowEvent('scroll');
        assert.equal(menu.style.top, '70px');
        harness.window.visualViewport.scale = 0.4;
        harness.window.scrollY = 0;
        harness.dispatchVisualViewportEvent('resize');
        assert.equal(menu.style.top, '70px');
    });

    test('translation action leaves both active and inactive colors to the shared stylesheet', () => {
        const harness = run(['translate'], { pre: true });
        const button = harness.document.querySelector('[data-floating-tool="translate"]');
        harness.document.querySelector('[data-floating-toggle]').click();
        for (const active of ['false', 'true', 'false']) {
            assert.equal(button.getAttribute('aria-pressed'), active);
            assert.equal(button.style.getPropertyValue('background-color'), '');
            assert.equal(button.style.getPropertyValue('color'), '');
            button.click();
        }
    });

    test('close disables floating features after reload while separate page controls survive', () => {
        const first = run(['archive', 'translate', 'dark', 'mobile'], { pre: true });
        first.document.querySelector('[data-floating-toggle]').click();
        first.document.querySelector('[data-floating-close]').click();
        assert.equal(first.location.reloadCallCount, 1);
        const saved = first.window.localStorage.getItem(key);
        assert.equal(JSON.parse(saved).disabled, true);
        const next = run(['archive', 'translate', 'dark', 'mobile'], { pre: true, localStorageSeed: { [key]: saved } });
        assert.equal(next.document.getElementById('tm-shared-floating-menu'), null);
        assert.equal(next.document.getElementById('tm-force-dark-mode-style'), null);
        assert.equal(next.document.getElementById('tm-force-width-style'), null);
        assert.equal(next.document.querySelectorAll('.tm-translate-pre-one').length, 1);
    });

    test('forbidden domain has no menu or floating effects', () => {
        const harness = run(['archive', 'translate', 'dark', 'mobile'], { url: 'https://sub.christorng.idv.tw/article', pre: true });
        assert.equal(harness.document.getElementById('tm-shared-floating-menu'), null);
        assert.equal(harness.document.getElementById('tm-force-dark-mode-style'), null);
        assert.equal(harness.document.querySelectorAll('.tm-translate-pre-one').length, 0);
        for (const text of Object.values(source)) {
            assert.match(text, /@exclude\s+\*:\/\/christorng\.idv\.tw\/\*/);
            assert.match(text, /@exclude\s+\*:\/\/\*\.christorng\.idv\.tw\/\*/);
        }
    });

    test('Wayback fallback registers the archive action in the same menu', () => {
        const harness = run(['archive', 'archiveFallback'], {
            url: 'https://web.archive.org/web/20250106005830/https://www.rawstory.com/story/',
        });
        const toggle = harness.document.querySelector('[data-floating-toggle]');
        const buttons = menuTools(harness);
        assert(toggle);
        assert.equal(buttons.length, 1);
        assert.equal(buttons[0].getAttribute('data-floating-tool'), 'archive');
        toggle.click();
        buttons[0].click();
        assert.equal(harness.location.href, 'https://archive.is/submit/?url=https://www.rawstory.com/story/');
    });

    test('copied shared code matches the canonical source', () => {
        const shared = fs.readFileSync(path.join(root, 'src', 'FloatingMenu.js'), 'utf8').trimEnd();
        for (const text of Object.values(source)) {
            const match = text.match(/    \/\/ BEGIN SHARED FLOATING MENU\r?\n([\s\S]*?)\r?\n    \/\/ END SHARED FLOATING MENU/);
            assert(match);
            assert.equal(match[1].replace(/\r\n/g, '\n'), shared.replace(/\r\n/g, '\n'));
        }
    });
});
