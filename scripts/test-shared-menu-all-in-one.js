'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { metadata, renderBundle, renderMeta, names } =
    require('./build-shared-menu-all-in-one');

const root = path.join(__dirname, '..');
const scriptPath = path.join(root, 'src', 'SharedMenuAllInOne.user.js');
const bundle = fs.readFileSync(scriptPath, 'utf8');
const meta = fs.readFileSync(path.join(root, 'src', 'SharedMenuAllInOne.meta.js'), 'utf8');
const version = bundle.match(/^\/\/ @version\s+(\S+)$/m)[1];

test('the bundle and metadata match all canonical source files', () => {
    assert.doesNotThrow(() => new vm.Script(bundle), 'generated combined script must parse as JavaScript');
    const files = Object.fromEntries(names.map(name => [
        name, fs.readFileSync(path.join(root, 'src', name + '.user.js'), 'utf8')
    ]));
    const runtime = fs.readFileSync(
        path.join(root, 'scripts', 'shared-menu-all-in-one-updates.js'), 'utf8');
    assert.equal(bundle, renderBundle(version, files, runtime));
    assert.equal(meta, renderMeta(version));
    assert.match(meta, new RegExp('^// @version\\s+' + version.replace(/\./g, '\\.') + '$', 'm'));
    assert(!meta.includes('@grant'), 'small metadata file contains version and source only');
    for (const name of names) {
        assert(bundle.includes('// BEGIN BUNDLED ' + name), 'missing ' + name);
        assert(bundle.includes('        const GM_info = __tmOriginalGMInfo ? Object.assign('),
            'original per-script GM_info metadata must be preserved');
    }
});

test('per-source rules remain available to the runtime dispatcher', () => {
    const scripts = Object.fromEntries(names.map(name => {
        const text = fs.readFileSync(path.join(root, 'src', name + '.user.js'), 'utf8');
        return [name, metadata(text)];
    }));
    const dispatch = bundle.slice(bundle.indexOf('    function matchesPattern('),
        bundle.indexOf('    // BEGIN BUNDLED ' + names[0]));
    function appliesTo(name, url) {
        const ctx = { location: { href: url } };
        vm.runInNewContext(dispatch + '\nthis.result=applies(' +
            JSON.stringify(scripts[name].matches) + ',' +
            JSON.stringify(scripts[name].excludes) + ');', ctx);
        return ctx.result;
    }
    assert(appliesTo('InternetArchive', 'https://www.bbc.com/news/example'));
    assert(!appliesTo('InternetArchive', 'https://example.org/'));
    assert(!appliesTo('ForceMobileView', 'https://github.com/ChrisTorng/TampermonkeyScripts/'));
    assert(!appliesTo('AllGoInternetArchive', 'https://hackernews.betacat.io/'));
    assert(appliesTo('TranslatePreformattedText', 'https://example.org/article'));
    assert(!appliesTo('TranslatePreformattedText', 'https://a.christorng.idv.tw/'));
});

function createVersionCheck() {
    const runtime = fs.readFileSync(
        path.join(root, 'scripts', 'shared-menu-all-in-one-updates.js'), 'utf8')
        .replaceAll('__ALL_IN_ONE_VERSION__', JSON.stringify(version))
        .replaceAll('__ALL_IN_ONE_INSTALL_URL__',
            JSON.stringify('https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/main/src/SharedMenuAllInOne.user.js'))
        .replaceAll('__ALL_IN_ONE_META_URL__',
            JSON.stringify('https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/main/src/SharedMenuAllInOne.meta.js'));
    const opened = [];
    const nodes = [];
    const handle = {
        style: { setProperty(name, value) { this[name] = value; } },
        title: ''
    };
    const rootNode = {
        appended: [],
        querySelector(selector) {
            if (selector === '[data-floating-toggle]') return handle;
            if (selector === '#tm-shared-menu-bundle-update')
                return this.appended.find(node => node.id === 'tm-shared-menu-bundle-update') || null;
            return null;
        },
        getAttribute(name) { return name === 'data-floating-expanded' ? 'true' : ''; },
        appendChild(node) { this.appended.push(node); }
    };
    const document = {
        body: {},
        getElementById(id) { return id === 'tm-shared-floating-menu' ? rootNode : null; },
        addEventListener() {},
        createElement() {
            const node = {
                style: {},
                attributes: {},
                setAttribute(name, value) { this.attributes[name] = value; },
                addEventListener(type, handler) { this.handler = handler; },
                remove() { this.removed = true; }
            };
            nodes.push(node);
            return node;
        }
    };
    const request = [];
    const win = { open(url) { opened.push(url); } };
    win.top = win;
    vm.runInNewContext(runtime, {
        document, window: win, Date, Promise,
        setTimeout() {},
        GM_getValue() { return version; },
        GM_setValue() {},
        GM_openInTab(url) { opened.push(url); },
        GM_xmlhttpRequest(options) { request.push(options); }
    });
    return { request, opened, rootNode, handle, nodes };
}

test('single official-main request per load; the menu stays quiet when current', () => {
    const state = createVersionCheck();
    assert.equal(state.request.length, 1);
    assert.match(state.request[0].url, /^https:\/\/raw\.githubusercontent\.com\/ChrisTorng\/TampermonkeyScripts\/main\/src\/SharedMenuAllInOne\.meta\.js\?check=\d+$/);
    state.request[0].onload({ status: 200, responseText: '// @version      ' + version });
    assert.equal(state.rootNode.appended.length, 0);
});

test('a newer merged version highlights the menu and opens one installer on explicit click', () => {
    const state = createVersionCheck();
    const next = '2099-01-01_1.0.2';
    state.request[0].onload({ status: 200, responseText: '// @version      ' + next });
    assert.equal(state.rootNode.appended.length, 1);
    assert.match(state.handle.title, /新版/);
    const button = state.rootNode.appended[0];
    assert.equal(button.hidden, false);
    assert.equal(button.attributes['data-floating-tool'], 'bundle-update');
    assert.equal(state.opened.length, 0);
    button.handler({ preventDefault() {}, stopPropagation() {} });
    assert.equal(state.opened.length, 1);
    assert.match(state.opened[0], /SharedMenuAllInOne\.user\.js\?update=2099-01-01_1\.0\.2$/);
    state.request[0].onload({ status: 200, responseText: '// @version      2020-01-01_1.0.0' });
    assert.equal(state.rootNode.appended.length, 1, 'no duplicate update buttons');
});
