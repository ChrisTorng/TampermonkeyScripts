const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');
const scriptPath = path.join(__dirname, '..', 'src', 'MathTranslationGuard.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');

function execute(setupDom = () => {}) {
    const harness = createHarness({ url: 'https://blog.plover.com/math/ordinals/02-wellfoundedness.html' });
    setupDom(harness);
    harness.context.globalThis = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    return harness;
}

describe('Math Translation Guard', () => {
    test('protects MathJax 2 output while leaving preview, source and parent structure untouched', () => {
        let paragraph;
        let preview;
        let rendered;
        let script;
        let source;
        execute((harness) => {
            paragraph = harness.document.createElement('p');
            source = harness.document.createElement('span');
            source.textContent = 'Nim with !!\\omega!! tokens';
            preview = harness.document.createElement('span');
            preview.className = 'MathJax_Preview';
            preview.textContent = '\\omega';
            rendered = harness.document.createElement('span');
            rendered.className = 'MathJax';
            rendered.textContent = 'ω';
            script = harness.document.createElement('script');
            script.setAttribute('type', 'math/tex');
            script.textContent = '\\omega';
            paragraph.append(source, preview, rendered, script);
            harness.appendToBody(paragraph);
        });
        assert.equal(paragraph.children.length, 4);
        assert.deepEqual(paragraph.children, [source, preview, rendered, script]);
        assert.equal(source.textContent, 'Nim with !!\\omega!! tokens');
        assert.equal(source.getAttribute('translate'), null);
        assert.equal(preview.getAttribute('translate'), null);
        assert.equal(preview.className, 'MathJax_Preview');
        assert.equal(script.textContent, '\\omega');
        assert.equal(rendered.getAttribute('translate'), 'no');
        assert.equal(rendered.classList.contains('notranslate'), true);
    });

    test('protects existing KaTeX, MathML and modern MathJax roots without affecting neighbors', () => {
        let paragraph;
        const harness = execute((h) => {
            paragraph = h.document.createElement('p');
            for (const [tag, className] of [['span', 'katex'], ['math', ''], ['mjx-container', '']]) {
                const element = h.document.createElement(tag);
                element.className = className;
                paragraph.appendChild(element);
            }
            h.appendToBody(paragraph);
        });
        assert.equal(paragraph.getAttribute('translate'), null);
        for (const child of paragraph.children) {
            assert.equal(child.getAttribute('translate'), 'no');
            assert.equal(child.classList.contains('notranslate'), true);
        }
        assert.equal(harness.document.querySelectorAll('[translate="no"]').length, 3);
    });

    test('marks dynamically inserted output and newly classified elements', () => {
        const harness = execute();
        const added = harness.document.createElement('div');
        const math = harness.document.createElement('span');
        math.className = 'MathJax';
        added.appendChild(math);
        harness.appendToBody(added);
        harness.triggerMutation([added]);
        assert.equal(math.getAttribute('translate'), 'no');

        const changed = harness.document.createElement('span');
        harness.appendToBody(changed);
        changed.className = 'katex';
        harness.triggerMutation([], { type: 'attributes', target: changed, attributeName: 'class' });
        assert.equal(changed.getAttribute('translate'), 'no');
        const before = changed.className;
        harness.triggerMutation([], { type: 'attributes', target: changed, attributeName: 'class' });
        assert.equal(changed.className, before, 'repeated observer callbacks should be idempotent');
    });

    test('MathJax 2 New Math hook protects an equation after its rendering signal', () => {
        const hooks = [];
        const harness = execute((h) => {
            h.window.MathJax = {
                Hub: {
                    Register: {
                        MessageHook(type, callback) { hooks.push({ type, callback }); },
                    },
                },
            };
        });
        assert.equal(hooks.length, 1);
        assert.equal(hooks[0].type, 'New Math');

        const display = harness.document.createElement('div');
        display.className = 'MathJax_Display';
        const frame = harness.document.createElement('span');
        frame.id = 'MathJax-Element-1-Frame';
        frame.className = 'MathJax';
        display.appendChild(frame);
        harness.appendToBody(display);
        hooks[0].callback(['New Math', 'MathJax-Element-1']);
        assert.equal(display.getAttribute('translate'), 'no');
        assert.equal(frame.getAttribute('translate'), 'no');
    });
});
