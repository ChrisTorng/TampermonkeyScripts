const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'ResponsiveScrollIndicator.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');
const indiewebFixturePath = path.join(repoRoot, 'tests', 'Responsive Scroll Position Indicator', 'indieweb.org_POSSE.html');
const mastodonFixturePath = path.join(repoRoot, 'tests', 'Responsive Scroll Position Indicator', 'mastodon.social_firefoxwebdevs_115740500373677782.html');
const indiewebFixtureHtml = fs.readFileSync(indiewebFixturePath, 'utf8');
const mastodonFixtureHtml = fs.readFileSync(mastodonFixturePath, 'utf8');

function executeResponsiveScrollIndicator(url, setupDom = null) {
    const harness = createHarness({
        url,
        readyState: 'loading',
        computedStyle(element) {
            return {
                overflowY: element.dataset.overflowY || 'visible',
                display: element.dataset.display || 'block',
                visibility: element.dataset.visibility || 'visible'
            };
        }
    });

    harness.window.innerWidth = 1280;
    harness.window.innerHeight = 720;
    harness.window.visualViewport.width = 1280;
    harness.window.visualViewport.height = 720;
    harness.document.documentElement.clientWidth = 1280;
    harness.document.documentElement.clientHeight = 720;
    harness.document.documentElement.scrollHeight = 2400;
    harness.document.documentElement.scrollTop = 600;
    harness.document.body.clientWidth = 1280;
    harness.document.body.clientHeight = 2400;

    if (typeof setupDom === 'function') {
        setupDom(harness);
    }

    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    harness.dispatchDocumentEvent('DOMContentLoaded');
    harness.flushAnimationFrames();
    return harness;
}

function createScrollablePanel(harness, rect) {
    const panel = harness.document.createElement('section');
    panel.dataset.overflowY = 'auto';
    panel.clientHeight = 300;
    panel.scrollHeight = 900;
    panel.scrollTop = 150;
    panel.clientWidth = 320;
    panel._rect = rect;
    harness.appendToBody(panel);
    return panel;
}

describe('ResponsiveScrollIndicator on captured pages', () => {
    test('fixtures contain captured scrollable page content', () => {
        assert.match(indiewebFixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(indiewebFixtureHtml, /POSSE/);
        assert.match(mastodonFixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(mastodonFixtureHtml, /mastodon/i);
    });

    test('root page indicator is created and positioned for long pages', () => {
        const harness = executeResponsiveScrollIndicator('https://indieweb.org/POSSE');
        const rootIndicator = harness.document.getElementById('tm-scroll-indicator-root');

        assert(rootIndicator, 'Expected root indicator element to exist.');
        assert.equal(rootIndicator.style.display, '');
        assert.equal(rootIndicator.style.top, '0px');
        assert.equal(rootIndicator.style.left, '1280px');
        assert.equal(rootIndicator.style.height, '720px');

        const viewportMarker = rootIndicator.querySelector('.tm-viewport');
        assert(viewportMarker, 'Expected root indicator viewport marker.');
        assert.match(viewportMarker.style.height, /^\d+px$/);
        assert.match(viewportMarker.style.transform, /^translateY\(\d+px\)$/);
    });

    test('visible nested scrollers get their own indicators', () => {
        const harness = executeResponsiveScrollIndicator(
            'https://mastodon.social/@firefoxwebdevs/115740500373677782',
            (currentHarness) => {
                createScrollablePanel(currentHarness, {
                    top: 80,
                    left: 900,
                    right: 1220,
                    bottom: 380,
                    width: 320,
                    height: 300
                });
            }
        );

        const indicators = harness.document.querySelectorAll('[data-tm-scroll-indicator]');
        const panelIndicator = indicators.find((element) => element !== harness.document.getElementById('tm-scroll-indicator-root'));

        assert.equal(indicators.length, 2);
        assert(panelIndicator, 'Expected a nested indicator to be created.');
        assert.equal(panelIndicator.style.display, '');
        assert.equal(panelIndicator.style.top, '80px');
        assert.equal(panelIndicator.style.left, '1220px');
        assert.equal(panelIndicator.style.height, '300px');
    });

    test('mutation observer discovers scrollable elements added later', () => {
        const harness = executeResponsiveScrollIndicator('https://indieweb.org/POSSE');
        const beforeCount = harness.document.querySelectorAll('[data-tm-scroll-indicator]').length;
        const latePanel = createScrollablePanel(harness, {
            top: 120,
            left: 860,
            right: 1180,
            bottom: 420,
            width: 320,
            height: 300
        });

        harness.triggerMutation([latePanel]);
        harness.flushAnimationFrames();

        const indicators = harness.document.querySelectorAll('[data-tm-scroll-indicator]');
        assert.equal(beforeCount, 1);
        assert.equal(indicators.length, 2);
    });
});
