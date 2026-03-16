const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'hackernews.betacat.io.html');
const scriptPath = path.join(repoRoot, 'src', 'BetterMobileView.user.js');

const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');

function executeBetterMobileView(url) {
    const harness = createHarness({ url, readyState: 'loading' });
    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    return harness;
}

describe('BetterMobileView on captured Hacker News Summary pages', () => {
    test('fixture contains captured summary layout content', () => {
        assert.match(fixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(fixtureHtml, /class="post-summary"/);
        assert.match(fixtureHtml, /class="feature-image"/);
        assert.match(fixtureHtml, /class="summary-text"/);
    });

    test('script injects the mobile layout style at startup', () => {
        const harness = executeBetterMobileView('https://hackernews.betacat.io/');
        const style = harness.document.getElementById('tm-better-mobile-view-style');

        assert(style, 'Expected BetterMobileView style element.');
        assert.match(style.textContent, /@media \(max-width: 768px\) and \(orientation: portrait\)/);
        assert.match(style.textContent, /\.post-summary \.feature-image img/);
        assert.match(style.textContent, /width: 100% !important/);
    });
});
