const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { createHarness } = require('./dom-harness');

const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'ForceMobileView.user.js'), 'utf8');
const prefix = 'https://github.com/ChrisTorng/TampermonkeyScripts/raw/refs/heads/fix/openssh-translate-menu-overflow-20261107/src/';
const names = [
    'TranslatePreformattedText.user.js',
    'AllGoInternetArchive.user.js',
    'InternetArchive.user.js',
    'ForceMobileView.user.js',
    'ForceDarkMode.user.js'
];

function createUpdater({ url = 'https://tampermonkey-scripts-test.vercel.app/tests/SharedFloatingMenuUpdates/index.html', tamper = null } = {}) {
    const harness = createHarness({ url, readyState: 'loading' });
    const calls = [];
    const list = harness.document.createElement('ol');
    list.id = 'links';
    for (const name of names) {
        const item = harness.document.createElement('li');
        const link = harness.document.createElement('a');
        link.setAttribute('href', prefix + name);
        item.appendChild(link);
        list.appendChild(item);
    }
    harness.appendToBody(list);
    const button = harness.document.createElement('button');
    button.id = 'open-all';
    harness.appendToBody(button);
    const status = harness.document.createElement('p');
    status.id = 'status';
    harness.appendToBody(status);
    harness.context.GM_info = { script: { matches: ['*://*/*'] } };
    harness.context.GM_openInTab = (url, options) => {
        calls.push({ url, options });
        if (tamper) tamper(url);
    };
    vm.runInNewContext(source, harness.context);
    const event = {
        type: 'click', target: button, prevented: false, stopped: false,
        preventDefault() { this.prevented = true; },
        stopImmediatePropagation() { this.stopped = true; }
    };
    return { harness, list, calls, event, click: () => harness.document.dispatchEvent(event) };
}

describe('Force Mobile View Tampermonkey updater bridge', () => {
    test('opens all five source links in background tabs on one explicit click', () => {
        const { harness, calls, event, click } = createUpdater();
        assert.equal(harness.document.getElementById('tm-shared-floating-menu'), null,
            'Vercel must remain excluded from the mobile layout code');
        click();
        assert.equal(event.prevented, true);
        assert.equal(event.stopped, true);
        assert.deepEqual(calls.map(x => x.url), names.map(name => prefix + name));
        assert(calls.every(x => x.options.active === false && x.options.insert === true));
        assert.match(harness.document.getElementById('status').textContent, /five Tampermonkey update tabs/);
    });

    test('does not open arbitrary links or trigger on other Vercel pages', () => {
        const allowed = createUpdater();
        allowed.list.querySelector('a').href = 'https://example.com/evil.user.js';
        allowed.click();
        assert.equal(allowed.calls.length, 0);
        assert.equal(allowed.event.prevented, false);
        const other = createUpdater({ url: 'https://unrelated.vercel.app/tests/SharedFloatingMenuUpdates/index.html' });
        other.click();
        assert.equal(other.calls.length, 0);
        assert.equal(other.event.stopped, false);
    });
});
