const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { describe, test } = require('node:test');

const scriptPath = path.join(__dirname, '..', 'src', 'RedditHideAppPopup.user.js');
const script = fs.readFileSync(scriptPath, 'utf8');

class FakeClassList {
    constructor(classes = []) {
        this.values = new Set(classes);
    }

    add(value) {
        this.values.add(value);
    }

    remove(value) {
        this.values.delete(value);
    }

    contains(value) {
        return this.values.has(value);
    }
}

class FakeElement {
    constructor({ selectors = [], textContent = '', classes = [] } = {}) {
        this.selectors = new Set(selectors);
        this.textContent = textContent;
        this.classList = new FakeClassList(classes);
        this.attributes = {};
        this.children = [];
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }
}

function createHarness({ rootReady = true, popup = null, sheet = null } = {}) {
    const observers = [];
    const animationFrames = [];
    const listeners = new Map();
    const root = rootReady ? new FakeElement({ classes: ['rpl-scroll-lock'] }) : null;
    const body = new FakeElement({ classes: ['scroll-is-blocked'] });
    const pageNodes = [popup, sheet].filter(Boolean);
    const document = {
        documentElement: root,
        body,
        head: null,
        createElement() {
            return new FakeElement();
        },
        querySelector(selectorList) {
            const selectors = selectorList.split(',').map((selector) => selector.trim());
            return pageNodes.find((node) => selectors.some((selector) => node.selectors.has(selector))) || null;
        },
        querySelectorAll(selector) {
            assert.equal(selector, '.rpl-bottom-sheet:not([data-tm-reddit-app-popup])');
            return pageNodes.filter((node) =>
                node.selectors.has('.rpl-bottom-sheet') &&
                !Object.hasOwn(node.attributes, 'data-tm-reddit-app-popup')
            );
        }
    };

    class Observer {
        constructor(callback) {
            this.callback = callback;
            this.active = false;
            observers.push(this);
        }

        observe(target, options) {
            assert.equal(target, document);
            assert.equal(options.childList, true);
            this.active = true;
        }

        disconnect() {
            this.active = false;
        }
    }

    const window = {
        addEventListener(type, listener) {
            const callbacks = listeners.get(type) || [];
            callbacks.push(listener);
            listeners.set(type, callbacks);
        }
    };

    vm.runInNewContext(script, {
        window,
        document,
        MutationObserver: Observer,
        requestAnimationFrame(callback) {
            animationFrames.push(callback);
        }
    }, { filename: scriptPath });

    function mutate() {
        for (const observer of [...observers]) {
            if (observer.active) observer.callback(observer);
        }
        while (animationFrames.length) animationFrames.shift()();
    }

    function dispatch(type) {
        const event = {
            stopped: false,
            stopImmediatePropagation() {
                this.stopped = true;
            }
        };
        for (const listener of listeners.get(type) || []) {
            listener(event);
            if (event.stopped) break;
        }
        return event;
    }

    return {
        document,
        root,
        body,
        pageNodes,
        mutate,
        dispatch,
        attachRoot() {
            document.documentElement = new FakeElement({ classes: ['rpl-scroll-lock'] });
            mutate();
            return document.documentElement;
        }
    };
}

describe('Reddit app-popup suppression', () => {
    test('injects early CSS without touching ordinary scrolling', () => {
        const page = createHarness();
        const styles = page.root.children;
        assert.equal(styles.length, 1);
        assert.match(styles[0].textContent, /#app-upsell-blocking-bottom-sheet-direct/);
        assert.match(styles[0].textContent, /data-tm-reddit-app-popup/);
        assert.equal(page.root.classList.contains('rpl-scroll-lock'), true);
        assert.equal(page.body.classList.contains('scroll-is-blocked'), true);
        assert.equal(page.dispatch('touchmove').stopped, false);
        assert.equal(page.dispatch('wheel').stopped, false);
    });

    test('hides known blocking popup and restores scrolling', () => {
        const popup = new FakeElement({
            selectors: ['#app-upsell-blocking-bottom-sheet-direct']
        });
        const page = createHarness({ popup });
        assert.equal(page.root.classList.contains('tm-reddit-app-popup-unlocked'), true);
        assert.equal(page.root.classList.contains('rpl-scroll-lock'), false);
        assert.equal(page.body.classList.contains('scroll-is-blocked'), false);
        assert.equal(page.dispatch('touchmove').stopped, true);
        assert.equal(page.dispatch('wheel').stopped, true);
    });

    test('detects a localized blocking prompt in a generic bottom sheet', () => {
        const sheet = new FakeElement({
            selectors: ['.rpl-bottom-sheet'],
            textContent: '取得應用程式以繼續使用 Reddit'
        });
        const page = createHarness({ sheet });
        assert.equal(sheet.attributes['data-tm-reddit-app-popup'], '1');
        assert.equal(page.root.classList.contains('tm-reddit-app-popup-unlocked'), true);
    });

    test('does not hide unrelated bottom sheets or dialogs', () => {
        const sheet = new FakeElement({
            selectors: ['.rpl-bottom-sheet'],
            textContent: 'Sort comments: Best, Top, New'
        });
        const page = createHarness({ sheet });
        assert.equal(sheet.attributes['data-tm-reddit-app-popup'], undefined);
        assert.equal(page.root.classList.contains('tm-reddit-app-popup-unlocked'), false);
        assert.equal(page.dispatch('touchmove').stopped, false);
    });

    test('handles delayed popup insertion and repeated scroll locks', () => {
        const page = createHarness();
        const popup = new FakeElement({
            selectors: ['#app-upsell-blocking-bottom-sheet-seo']
        });
        page.pageNodes.push(popup);
        page.mutate();
        assert.equal(page.root.classList.contains('tm-reddit-app-popup-unlocked'), true);

        page.root.classList.add('rpl-scroll-lock');
        page.body.classList.add('scroll-is-blocked');
        page.mutate();
        assert.equal(page.root.classList.contains('rpl-scroll-lock'), false);
        assert.equal(page.body.classList.contains('scroll-is-blocked'), false);
    });

    test('installs when documentElement becomes available after document-start', () => {
        const page = createHarness({ rootReady: false });
        const root = page.attachRoot();
        assert.equal(root.children.length, 1);
        assert.match(root.children[0].textContent, /display: none !important/);
    });
});
