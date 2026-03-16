const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'ForceDarkMode.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');
const fixturePath = path.join(repoRoot, 'tests', 'Force Dark Mode', 'www.lesswrong.com_rationality.html');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

function executeForceDarkMode(url) {
    const harness = createHarness({
        url,
        readyState: 'loading',
        gmInfo: {
            script: {
                matches: ['https://www.lesswrong.com/*', '*://*/*']
            }
        }
    });
    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    return harness;
}

describe('ForceDarkMode on captured LessWrong content', () => {
    test('fixture contains captured LessWrong content', () => {
        assert.match(fixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(fixtureHtml, /lesswrong/i);
    });

    test('matched URL auto-enables dark style and creates a toggle button', () => {
        const harness = executeForceDarkMode('https://www.lesswrong.com/rationality');
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const style = harness.document.getElementById('tm-force-dark-mode-style');
        const button = harness.document.body.children.find((child) => child.tagName === 'BUTTON');

        assert(style, 'Expected dark mode style element to be inserted.');
        assert.match(style.textContent, /color-scheme: dark !important/);
        assert(button, 'Expected floating toggle button to be created.');
        assert.equal(button.textContent, '🌙');
        assert.equal(button.getAttribute('aria-pressed'), 'true');
        assert.equal(button.title, 'Force Dark Mode is ON (click to disable)');
    });

    test('toggle button disables and re-enables the dark style', () => {
        const harness = executeForceDarkMode('https://www.lesswrong.com/rationality');
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const button = harness.document.body.children.find((child) => child.tagName === 'BUTTON');
        button.click();
        assert.equal(harness.document.getElementById('tm-force-dark-mode-style'), null);
        assert.equal(button.getAttribute('aria-pressed'), 'false');

        button.click();
        assert(harness.document.getElementById('tm-force-dark-mode-style'));
        assert.equal(button.getAttribute('aria-pressed'), 'true');
    });
});
