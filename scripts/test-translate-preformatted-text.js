const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

function assertFloatingControlLayout(button, slot) {
    assert.equal(button.getAttribute('data-tm-floating-control'), String(slot));
    assert.equal(button.style.getPropertyValue('position'), 'absolute');
    assert.equal(button.style.getPropertyValue('top'), `${70 + (slot * 44)}px`);
    assert.equal(button.style.getPropertyValue('right'), 'auto');
    assert.equal(button.style.getPropertyValue('left'), 'calc(100vw - 44px)');
    assert.equal(button.style.getPropertyValue('opacity'), '0.5');
    assert.equal(button.style.getPropertyValue('width'), '44px');
    assert.equal(button.style.getPropertyValue('height'), '34px');
    for (const property of ['position', 'top', 'right', 'left', 'opacity', 'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height']) {
        assert.equal(button.style.getPropertyPriority(property), 'important', `${property} must resist page CSS`);
    }
}

const scriptPath = path.join(__dirname, '..', 'src', 'TranslatePreformattedText.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');

function execute(setupDom) {
    const harness = createHarness({ url: 'https://codex-tool-reference.simonw.chatgpt.site/' });
    setupDom(harness);
    harness.context.globalThis = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    return harness;
}

function addPre(harness, text, className = '') {
    const pre = harness.document.createElement('pre');
    pre.textContent = text;
    pre.className = className;
    harness.appendToBody(pre);
    return pre;
}

describe('Translate Preformatted Text', () => {
    test('the page-wide button stays hidden when there are no PRE blocks', () => {
        const harness = execute(() => {});
        const allButton = harness.document.getElementById('tm-translate-all-pre');

        assert.equal(allButton.hidden, true);
        assert.equal(allButton.style.getPropertyValue('display'), 'none');
        assert.equal(allButton.style.getPropertyPriority('display'), 'important');
    });

    test('a block button toggles between PRE and DIV while retaining its text and class', () => {
        const harness = execute((currentHarness) => {
            addPre(currentHarness, 'declare const tools: {\n  apply_patch(input: string)\n}', 'tool-code');
            addPre(currentHarness, 'second block');
        });

        const buttons = harness.document.querySelectorAll('.tm-translate-pre-one');
        assert.equal(buttons.length, 2);
        assert.equal(buttons[0].textContent, '譯');
        assert.equal(buttons[0].getAttribute('aria-label'), 'Translate this preformatted block');
        buttons[0].dispatchEvent({ type: 'click' });

        const converted = harness.document.querySelector('[data-tm-translatable-pre-converted]');
        assert(converted);
        assert.equal(converted.tagName, 'DIV');
        assert.equal(converted.className, 'tool-code');
        assert.match(converted.textContent, /apply_patch/);
        assert.equal(harness.document.querySelectorAll('pre').length, 1);
        assert.equal(buttons[0].getAttribute('aria-pressed'), 'true');
        assert.equal(buttons[0].style.getPropertyValue('background-color'), 'rgba(34, 139, 34, .85)');

        buttons[0].dispatchEvent({ type: 'click' });
        const restored = harness.document.querySelector('pre.tool-code');
        assert(restored);
        assert.match(restored.textContent, /apply_patch/);
        assert.equal(harness.document.querySelectorAll('[data-tm-translatable-pre-converted]').length, 0);
        assert.equal(buttons[0].getAttribute('aria-pressed'), 'false');
    });

    test('the page-wide button toggles every PRE block and remains available', () => {
        const harness = execute((currentHarness) => {
            addPre(currentHarness, 'first block');
            addPre(currentHarness, 'second block');
            addPre(currentHarness, 'third block');
        });

        const allButton = harness.document.getElementById('tm-translate-all-pre');
        assert.equal(allButton.hidden, false);
        assert.equal(allButton.textContent, '譯∞');
        assertFloatingControlLayout(allButton, 3);
        allButton.click();

        assert.equal(harness.document.querySelectorAll('pre').length, 0);
        assert.equal(harness.document.querySelectorAll('[data-tm-translatable-pre-converted]').length, 3);
        assert.equal(allButton.hidden, false);
        assert.equal(allButton.getAttribute('aria-pressed'), 'true');
        assert.equal(allButton.style.getPropertyValue('background-color'), 'rgba(34, 139, 34, .85)');

        allButton.click();
        assert.equal(harness.document.querySelectorAll('pre').length, 3);
        assert.equal(harness.document.querySelectorAll('[data-tm-translatable-pre-converted]').length, 0);
        assert.equal(allButton.getAttribute('aria-pressed'), 'false');
    });

    test('the page-wide icon can be dragged without converting blocks', () => {
        const harness = execute((currentHarness) => addPre(currentHarness, 'drag me'));
        const allButton = harness.document.getElementById('tm-translate-all-pre');
        const preventDefault = () => {};
        allButton.offsetTop = 202;

        allButton.dispatchEvent({ type: 'mousedown', clientX: 10, clientY: 210 });
        harness.document.dispatchEvent({ type: 'mousemove', clientX: 110, clientY: 300, preventDefault });
        harness.document.dispatchEvent({ type: 'mouseup' });
        allButton.dispatchEvent({ type: 'click', preventDefault });

        assert.equal(allButton.style.left, '100px');
        assert.equal(allButton.style.top, '292px');
        assert.equal(allButton.style.getPropertyPriority('top'), 'important');
        assert.equal(allButton.style.right, 'auto');
        assert.equal(harness.document.querySelectorAll('pre').length, 1);
    });

    test('PRE blocks added later receive controls', () => {
        const harness = execute(() => {});
        const latePre = addPre(harness, 'late block');

        harness.triggerMutation([latePre]);

        assert(latePre.closest('[data-tm-translatable-pre-wrapper]'));
        assert.equal(harness.document.querySelectorAll('.tm-translate-pre-one').length, 1);
    });
});
