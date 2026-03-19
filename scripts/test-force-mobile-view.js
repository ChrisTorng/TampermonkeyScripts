const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'ForceMobileView.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');
const hnFixturePath = path.join(repoRoot, 'tests', 'Force Mobile View', 'news.ycombinator.com_item_id_46255285.html');
const archiveFixturePath = path.join(repoRoot, 'tests', 'Force Mobile View', 'archive.is_75aY9.html');
const lcamtufFixturePath = path.join(repoRoot, 'tests', 'Force Mobile View', 'lcamtuf.coredump.cx_prep_index-old.shtml.html');
const hnFixtureHtml = fs.readFileSync(hnFixturePath, 'utf8');
const archiveFixtureHtml = fs.readFileSync(archiveFixturePath, 'utf8');
const lcamtufFixtureHtml = fs.readFileSync(lcamtufFixturePath, 'utf8');

function executeForceMobileView(url, options = {}) {
    const harness = createHarness({
        url,
        readyState: 'loading',
        gmInfo: {
            script: {
                matches: ['https://news.ycombinator.com/item?*', 'https://archive.is/*', '*://*/*']
            }
        },
        matchMedia(query) {
            if (query.includes('orientation: portrait')) {
                return { matches: true, media: query, addEventListener() {}, removeEventListener() {} };
            }
            if (query.includes('max-width: 768px') || query.includes('pointer: coarse')) {
                return { matches: true, media: query, addEventListener() {}, removeEventListener() {} };
            }
            return { matches: false, media: query, addEventListener() {}, removeEventListener() {} };
        },
        computedFontSize(element) {
            if (typeof options.computedFontSize === 'function') {
                return options.computedFontSize(element);
            }
            return element.tagName === 'SPAN' ? '10px' : '16px';
        }
    });
    harness.window.innerWidth = 360;
    harness.window.innerHeight = 720;
    harness.window.visualViewport.width = 360;
    harness.document.documentElement.clientWidth = 360;
    harness.document.body.clientWidth = 360;

    if (options.fixtureHtml) {
        harness.document.body.innerHTML = options.fixtureHtml;
    }

    const textElement = harness.document.createElement('span');
    textElement.textContent = 'small text';
    harness.appendToBody(textElement);

    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    return { harness, textElement };
}

describe('ForceMobileView on captured pages', () => {
    test('fixtures contain captured HN, archive.is, and lcamtuf content', () => {
        assert.match(hnFixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(hnFixtureHtml, /hnmain/);
        assert.match(archiveFixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(archiveFixtureHtml, /archive\.is/i);
        assert.match(lcamtufFixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(lcamtufFixtureHtml, /lcamtuf\.coredump\.cx/i);
    });

    test('matched URL auto-enables mobile view style, min font enforcement, and toggle button', () => {
        const { harness, textElement } = executeForceMobileView('https://news.ycombinator.com/item?id=46255285');
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const style = harness.document.getElementById('tm-force-width-style');
        const button = harness.document.body.children.find((child) => child.tagName === 'BUTTON' && child.textContent === '↔');

        assert(style, 'Expected mobile view style element to be inserted.');
        assert.match(style.textContent, /max-width: 100vw !important/);
        assert.match(style.textContent, /body > \* \{\n\s*margin-left: 0 !important;/);
        assert(button, 'Expected mobile view toggle button to be created.');
        assert.equal(button.getAttribute('aria-pressed'), 'true');
        assert.equal(textElement.style.getPropertyValue('font-size'), '18px');
        assert.equal(textElement.style.getPropertyValue('line-height'), '1.4');
        assert.equal(textElement.getAttribute('data-tm-force-width-min-font'), 'true');
    });


    test('tiny-font pages auto-enable mobile view even when URL is not explicitly matched', () => {
        const { harness } = executeForceMobileView('https://lcamtuf.coredump.cx/prep/index-old.shtml', {
            fixtureHtml: lcamtufFixtureHtml,
            computedFontSize(element) {
                if (element.tagName === 'BODY') {
                    return '9px';
                }
                if (element.textContent && element.textContent.trim().length > 0) {
                    return '9px';
                }
                return '16px';
            }
        });
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const style = harness.document.getElementById('tm-force-width-style');
        const button = harness.document.body.children.find((child) => child.tagName === 'BUTTON' && child.textContent === '↔');

        assert(style, 'Expected tiny-font detection to auto-enable style injection.');
        assert(button, 'Expected mobile view toggle button to be created.');
        assert.equal(button.getAttribute('aria-pressed'), 'true');
    });

    test('toggle button disables and re-enables styles and minimum font size overrides', () => {
        const { harness, textElement } = executeForceMobileView('https://archive.is/75aY9');
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const button = harness.document.body.children.find((child) => child.tagName === 'BUTTON' && child.textContent === '↔');
        button.click();
        assert.equal(harness.document.getElementById('tm-force-width-style'), null);
        assert.equal(textElement.getAttribute('data-tm-force-width-min-font'), null);
        assert.equal(button.getAttribute('aria-pressed'), 'false');

        button.click();
        assert(harness.document.getElementById('tm-force-width-style'));
        assert.equal(textElement.getAttribute('data-tm-force-width-min-font'), 'true');
        assert.equal(button.getAttribute('aria-pressed'), 'true');
    });
});
