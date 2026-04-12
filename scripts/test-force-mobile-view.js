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
const steveBlankFixturePath = path.join(repoRoot, 'tests', 'Force Mobile View', 'steveblank.com_2026_04_09_nowhere-is-safe.html');
const hnFixtureHtml = fs.readFileSync(hnFixturePath, 'utf8');
const archiveFixtureHtml = fs.readFileSync(archiveFixturePath, 'utf8');
const lcamtufFixtureHtml = fs.readFileSync(lcamtufFixturePath, 'utf8');
const steveBlankFixtureHtml = fs.readFileSync(steveBlankFixturePath, 'utf8');

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
        },
        computedStyle(element) {
            if (typeof options.computedStyle === 'function') {
                return options.computedStyle(element);
            }
            return {
                fontSize: element.tagName === 'SPAN' ? '10px' : '16px',
                marginLeft: '0px',
                marginRight: '0px',
                paddingLeft: '0px',
                paddingRight: '0px'
            };
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
    test('fixtures contain captured HN, archive.is, lcamtuf, and Steve Blank content', () => {
        assert.match(hnFixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(hnFixtureHtml, /hnmain/);
        assert.match(archiveFixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(archiveFixtureHtml, /archive\.is/i);
        assert.match(lcamtufFixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(lcamtufFixtureHtml, /lcamtuf\.coredump\.cx/i);
        assert.match(steveBlankFixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(steveBlankFixtureHtml, /steveblank\.com/i);
    });

    test('matched URL auto-enables mobile view style, min font enforcement, and toggle button', () => {
        const { harness, textElement } = executeForceMobileView('https://news.ycombinator.com/item?id=46255285');
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const style = harness.document.getElementById('tm-force-width-style');
        const button = harness.document.body.children.find((child) => child.tagName === 'BUTTON' && child.textContent === '↔');

        assert(style, 'Expected mobile view style element to be inserted.');
        assert.match(style.textContent, /max-width: 100vw !important/);
        assert(button, 'Expected mobile view toggle button to be created.');
        assert.equal(button.getAttribute('aria-pressed'), 'true');
        assert.equal(textElement.style.getPropertyValue('font-size'), '18px');
        assert.equal(textElement.style.getPropertyValue('line-height'), '25.2px');
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

    test('excessive horizontal spacing is trimmed on enable and restored on disable', () => {
        const { harness } = executeForceMobileView('https://daringfireball.net/2026/03/your_frustration_is_the_product', {
            computedStyle(element) {
                return {
                    fontSize: '16px',
                    marginLeft: element.id === 'post' ? '24px' : '0px',
                    marginRight: element.id === 'post' ? '24px' : '0px',
                    paddingLeft: element.id === 'post' ? '18px' : '0px',
                    paddingRight: element.id === 'post' ? '18px' : '0px'
                };
            }
        });
        const post = harness.document.createElement('article');
        post.id = 'post';
        post.textContent = 'content';
        harness.appendToBody(post);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const button = harness.document.body.children.find((child) => child.tagName === 'BUTTON' && child.textContent === '↔');

        assert.equal(post.style.getPropertyValue('margin-left'), '0px');
        assert.equal(post.style.getPropertyValue('padding-left'), '8px');
        assert.equal(post.getAttribute('data-tm-force-width-spacing-trimmed'), 'true');

        button.click();
        assert.equal(post.style.getPropertyValue('margin-left'), '');
        assert.equal(post.style.getPropertyValue('padding-left'), '');
        assert.equal(post.getAttribute('data-tm-force-width-spacing-trimmed'), null);
    });

    test('legacy font-only boost overlaps text lines, while current behavior raises parent line-height', () => {
        const { harness } = executeForceMobileView('https://steveblank.com/2026/04/09/nowhere-is-safe/', {
            fixtureHtml: steveBlankFixtureHtml,
            computedStyle(element) {
                const inlineFont = element.style.getPropertyValue('font-size');
                const inlineLineHeight = element.style.getPropertyValue('line-height');
                if (element.id === 'problem-line-box') {
                    return {
                        fontSize: inlineFont || '20px',
                        lineHeight: inlineLineHeight || '12px',
                        marginLeft: '0px',
                        marginRight: '0px',
                        paddingLeft: '0px',
                        paddingRight: '0px'
                    };
                }
                if (element.id === 'problem-small-text') {
                    return {
                        fontSize: inlineFont || '10px',
                        lineHeight: inlineLineHeight || '10px',
                        marginLeft: '0px',
                        marginRight: '0px',
                        paddingLeft: '0px',
                        paddingRight: '0px'
                    };
                }
                return {
                    fontSize: inlineFont || '16px',
                    lineHeight: inlineLineHeight || '22px',
                    marginLeft: '0px',
                    marginRight: '0px',
                    paddingLeft: '0px',
                    paddingRight: '0px'
                };
            }
        });
        const paragraph = harness.document.createElement('p');
        paragraph.id = 'problem-line-box';
        const span = harness.document.createElement('span');
        span.id = 'problem-small-text';
        span.textContent = 'Dense translated text';
        paragraph.appendChild(span);
        harness.appendToBody(paragraph);

        const legacyLineHeight = 12;
        const legacyFontAfterBoost = 18;
        assert(legacyLineHeight < legacyFontAfterBoost, 'Legacy font-only boost would have line overlap.');

        harness.dispatchDocumentEvent('DOMContentLoaded');
        assert.equal(span.style.getPropertyValue('font-size'), '18px');
        assert.equal(span.style.getPropertyValue('line-height'), '25.2px');
        assert.equal(paragraph.getAttribute('data-tm-force-width-min-line-height-only'), 'true');
        assert.equal(paragraph.style.getPropertyValue('line-height'), '28px');
    });
});
