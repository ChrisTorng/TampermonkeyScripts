const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

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
    test('a block button converts one PRE while retaining its text and class', () => {
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
    });

    test('the page-wide button converts every PRE block', () => {
        const harness = execute((currentHarness) => {
            addPre(currentHarness, 'first block');
            addPre(currentHarness, 'second block');
            addPre(currentHarness, 'third block');
        });

        const allButton = harness.document.getElementById('tm-translate-all-pre');
        assert.equal(allButton.hidden, false);
        assert.equal(allButton.textContent, '譯∞');
        assert.equal(allButton.style.top, '192px');
        allButton.click();

        assert.equal(harness.document.querySelectorAll('pre').length, 0);
        assert.equal(harness.document.querySelectorAll('[data-tm-translatable-pre-converted]').length, 3);
        assert.equal(allButton.hidden, true);
    });

    test('the page-wide icon can be dragged without converting blocks', () => {
        const harness = execute((currentHarness) => addPre(currentHarness, 'drag me'));
        const allButton = harness.document.getElementById('tm-translate-all-pre');
        const preventDefault = () => {};
        allButton.offsetTop = 192;

        allButton.dispatchEvent({ type: 'mousedown', clientX: 10, clientY: 200 });
        harness.document.dispatchEvent({ type: 'mousemove', clientX: 110, clientY: 300, preventDefault });
        harness.document.dispatchEvent({ type: 'mouseup' });
        allButton.dispatchEvent({ type: 'click', preventDefault });

        assert.equal(allButton.style.left, '100px');
        assert.equal(allButton.style.top, '292px');
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
