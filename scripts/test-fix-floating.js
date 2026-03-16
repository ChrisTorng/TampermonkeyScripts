const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'FixFloating.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');
const fixturePath = path.join(repoRoot, 'tests', 'Fix Floating Elements', 'whatisintelligence.antikythera.org_chapter-02.html');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

function executeFixFloating(url) {
    const harness = createHarness({
        url,
        readyState: 'loading',
        computedStyle(element) {
            return {
                position: element.dataset.position || 'static'
            };
        }
    });
    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    return harness;
}

describe('FixFloating on captured Antikythera content', () => {
    test('fixture contains captured content', () => {
        assert.match(fixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(fixtureHtml, /antikythera/i);
    });

    test('fixed and sticky elements are neutralized on supported pages', () => {
        const harness = executeFixFloating('https://whatisintelligence.antikythera.org/chapter-02/');
        const fixed = harness.document.createElement('div');
        fixed.dataset.position = 'fixed';
        const sticky = harness.document.createElement('div');
        sticky.dataset.position = 'sticky';
        harness.appendToBody(fixed);
        harness.appendToBody(sticky);

        harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.equal(fixed.getAttribute('data-fix-floating-processed'), 'true');
        assert.equal(fixed.style.getPropertyValue('position'), 'static');
        assert.equal(fixed.style.getPropertyPriority('position'), 'important');
        assert.equal(sticky.getAttribute('data-fix-floating-processed'), 'true');
        assert.equal(sticky.style.getPropertyValue('transform'), 'none');
    });

    test('mutation observer neutralizes newly added floating elements', () => {
        const harness = executeFixFloating('https://whatisintelligence.antikythera.org/chapter-02/');
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const floating = harness.document.createElement('div');
        floating.dataset.position = 'absolute';
        harness.appendToBody(floating);
        harness.triggerMutation([floating]);

        assert.equal(floating.getAttribute('data-fix-floating-processed'), 'true');
        assert.equal(floating.style.getPropertyValue('position'), 'static');
    });
});
