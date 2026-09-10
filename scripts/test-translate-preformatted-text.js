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
const simonWillisonFixture = fs.readFileSync(
    path.join(__dirname, '..', 'tests', 'Translate Preformatted Text', 'simonwillison.net_2026_Sep_2_claudes-new-system-prompt.html'),
    'utf8'
);
const okfPlainFixture = fs.readFileSync(
    path.join(__dirname, '..', 'tests', 'Translate Preformatted Text', 'github.com_okf-memory_okf-agent-memory_blob_main_README.md_plain_1.html'),
    'utf8'
);
const okfRenderedFixture = fs.readFileSync(
    path.join(__dirname, '..', 'tests', 'Translate Preformatted Text', 'github.com_okf-memory_okf-agent-memory_blob_main_README.md.html'),
    'utf8'
);
const mathstodonFixture = fs.readFileSync(
    path.join(__dirname, '..', 'tests', 'Translate Preformatted Text', 'mathstodon.xyz_@tao_117237320796901560.html'),
    'utf8'
);

function execute(setupDom, url = 'https://codex-tool-reference.simonw.chatgpt.site/') {
    const harness = createHarness({ url });
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
    test('inline code is replaced in place before automatic translation can reorder it', () => {
        let paragraph;
        const harness = execute((currentHarness) => {
            paragraph = currentHarness.document.createElement('p');
            const before = currentHarness.document.createElement('span');
            before.textContent = 'no ';
            const code = currentHarness.document.createElement('code');
            code.textContent = 'native_decide';
            code.className = 'source-code';
            code.setAttribute('title', 'Lean declaration');
            const after = currentHarness.document.createElement('span');
            after.textContent = ' is used';
            paragraph.append(before, code, after);
            currentHarness.appendToBody(paragraph);
        }, 'https://github.com/anthropics/fermats-last-theorem');

        const inlineCode = paragraph.children[1];
        assert.equal(inlineCode.tagName, 'SPAN');
        assert.equal(inlineCode.textContent, 'native_decide');
        assert.equal(inlineCode.className, 'source-code');
        assert.equal(inlineCode.getAttribute('title'), 'Lean declaration');
        assert.equal(inlineCode.getAttribute('data-tm-translatable-inline-code'), 'true');
        assert.equal(inlineCode.getAttribute('data-tm-translatable-inline-code-original'), 'native_decide');
        assert.equal(inlineCode.getAttribute('translate'), 'no');
        assert.equal(paragraph.children[0].textContent, 'no ');
        assert.equal(paragraph.children[2].textContent, ' is used');
        assert.equal(harness.document.querySelectorAll('code').length, 0);
    });

    test('inline code changed by translation is restored without wrapping it again', () => {
        let paragraph;
        const harness = execute((currentHarness) => {
            paragraph = currentHarness.document.createElement('p');
            const code = currentHarness.document.createElement('code');
            code.textContent = 'native_decide';
            paragraph.appendChild(code);
            currentHarness.appendToBody(paragraph);
        });

        const inlineCode = paragraph.children[0];
        inlineCode.textContent = 'native decide';
        harness.triggerMutation([], { type: 'childList', target: inlineCode });

        assert.equal(inlineCode.textContent, 'native_decide');
        assert.equal(inlineCode.tagName, 'SPAN');
        assert.equal(harness.document.querySelectorAll('[data-tm-translatable-inline-code]').length, 1);
        assert.equal(harness.document.querySelectorAll('code').length, 0);

        harness.triggerMutation([], { type: 'childList', target: inlineCode });
        assert.equal(inlineCode.textContent, 'native_decide');
        assert.equal(harness.document.querySelectorAll('[data-tm-translatable-inline-code]').length, 1);
    });

    test('code inside PRE remains code and uses the existing block controls', () => {
        let nestedCode;
        const harness = execute((currentHarness) => {
            const pre = currentHarness.document.createElement('pre');
            nestedCode = currentHarness.document.createElement('code');
            nestedCode.textContent = 'lake build';
            pre.appendChild(nestedCode);
            currentHarness.appendToBody(pre);
        });

        assert.equal(nestedCode.tagName, 'CODE');
        assert.equal(nestedCode.hasAttribute('data-tm-translatable-inline-code'), false);
        assert(nestedCode.closest('[data-tm-translatable-pre-wrapper]'));
        assert.equal(harness.document.querySelectorAll('.tm-translate-pre-one').length, 1);
    });

    test('code quotations on Simon Willison articles receive block controls', () => {
        assert.match(simonWillisonFixture, /<blockquote>\s*<p><code>Claude does not reproduce song lyrics/);
        let quote;
        let code;
        const harness = execute((currentHarness) => {
            quote = currentHarness.document.createElement('blockquote');
            const paragraph = currentHarness.document.createElement('p');
            code = currentHarness.document.createElement('code');
            code.textContent = 'Claude does not reproduce song lyrics, poems, or passages from books and articles.';
            paragraph.appendChild(code);
            quote.appendChild(paragraph);
            currentHarness.appendToBody(quote);
        }, 'https://simonwillison.net/2026/Sep/2/claudes-new-system-prompt/');

        const button = harness.document.querySelector('.tm-translate-pre-one');
        assert(button);
        assert.equal(button.textContent, '譯');
        assert.equal(code.tagName, 'CODE');
        assert.equal(code.hasAttribute('data-tm-translatable-inline-code'), false);

        button.click();
        const converted = harness.document.querySelector('[data-tm-translatable-pre-converted]');
        assert(converted);
        assert.equal(converted.tagName, 'DIV');
        assert.match(converted.textContent, /song lyrics/);

        button.click();
        assert.equal(harness.document.querySelector('blockquote'), quote);
        assert.equal(quote.querySelector('code'), code);
    });

    test('GitHub source code view waits for its translation button to be pressed', () => {
        assert.match(okfPlainFixture, /class="react-code-lines"/);
        let source;
        const harness = execute((currentHarness) => {
            source = currentHarness.document.createElement('div');
            source.className = 'react-code-lines';
            ['# OKF Agent Memory', 'A standardized memory layer.'].forEach((text, index) => {
                const line = currentHarness.document.createElement('div');
                line.setAttribute('data-testid', 'code-cell');
                line.setAttribute('data-line-number', String(index + 1));
                line.textContent = text;
                source.appendChild(line);
            });
            currentHarness.appendToBody(source);
        }, 'https://github.com/okf-memory/okf-agent-memory/blob/main/README.md?plain=1');

        const button = harness.document.querySelector('.tm-translate-pre-one');
        assert(button);
        assert.equal(source.getAttribute('translate'), 'no');
        assert.equal(source.querySelectorAll('[data-tm-translatable-inline-code]').length, 0);
        assert.equal(harness.document.querySelector('[data-tm-translatable-pre-converted]'), null);

        button.click();
        const converted = harness.document.querySelector('[data-tm-translatable-pre-converted]');
        assert.equal(converted.getAttribute('translate'), null);
        assert.equal(
            converted.textContent,
            '# OKF Agent Memory\nA standardized memory layer.'
        );
    });

    test('rendered GitHub Mermaid diagrams receive a visible block control', () => {
        assert.match(okfRenderedFixture, /data-type="mermaid" aria-label="mermaid rendered output container"/);
        let mermaid;
        const harness = execute((currentHarness) => {
            mermaid = currentHarness.document.createElement('div');
            mermaid.setAttribute('data-type', 'mermaid');
            const hiddenSource = currentHarness.document.createElement('div');
            hiddenSource.className = 'render-plaintext-hidden';
            hiddenSource.hidden = true;
            const pre = currentHarness.document.createElement('pre');
            pre.setAttribute('aria-label', 'Raw mermaid code');
            pre.textContent = 'flowchart TD\n    Input --> Memory';
            hiddenSource.appendChild(pre);
            mermaid.appendChild(hiddenSource);
            currentHarness.appendToBody(mermaid);
        }, 'https://github.com/okf-memory/okf-agent-memory/blob/main/README.md');

        const wrapper = harness.document.querySelector('[data-tm-translatable-pre-wrapper]');
        const button = wrapper.querySelector('.tm-translate-pre-one');
        assert(button);
        assert.equal(button.textContent, '譯');
        assert.equal(button.hidden, false);
        assert.equal(harness.document.querySelectorAll('.tm-translate-pre-one').length, 1);
        assert.equal(mermaid.closest('[data-tm-translatable-pre-wrapper]'), wrapper);
        assert.equal(mermaid.getAttribute('translate'), 'no');

        button.click();
        const converted = harness.document.querySelector('[data-tm-translatable-pre-converted]');
        assert.equal(converted.getAttribute('translate'), null);
        assert.match(converted.textContent, /Input --> Memory/);
    });

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

    test('inline code added later is automatically replaced in place', () => {
        const harness = execute(() => {});
        const paragraph = harness.document.createElement('p');
        const lateCode = harness.document.createElement('code');
        lateCode.textContent = 'FinalCheck.lean';
        paragraph.appendChild(lateCode);
        harness.appendToBody(paragraph);

        harness.triggerMutation([paragraph]);

        assert.equal(paragraph.children[0].tagName, 'SPAN');
        assert.equal(paragraph.children[0].textContent, 'FinalCheck.lean');
        assert.equal(paragraph.children[0].getAttribute('data-tm-translatable-inline-code'), 'true');
        assert.equal(paragraph.children[0].getAttribute('data-tm-translatable-inline-code-original'), 'FinalCheck.lean');
        assert.equal(paragraph.children[0].getAttribute('translate'), 'no');
    });

    test('mobile Wikipedia sections remain visible for automatic translation', () => {
        let initialSection;
        const harness = execute((currentHarness) => {
            initialSection = currentHarness.document.createElement('div');
            initialSection.className = 'mw-collapsible-content';
            initialSection.hidden = true;
            initialSection.setAttribute('hidden', '');
            initialSection.textContent = 'The first reports of the Rego Grande site';
            currentHarness.appendToBody(initialSection);
        }, 'https://en.wikipedia.org/wiki/Parque_Arqueol%C3%B3gico_do_Solst%C3%ADcio');

        assert.equal(initialSection.hidden, false);
        assert.equal(initialSection.hasAttribute('hidden'), false);

        initialSection.hidden = true;
        initialSection.setAttribute('hidden', '');
        harness.triggerMutation([], {
            type: 'attributes',
            target: initialSection,
            attributeName: 'hidden',
        });

        assert.equal(initialSection.hidden, false);
        assert.equal(initialSection.hasAttribute('hidden'), false);
    });

    test('Mastodon instances allow browser translation without a host allowlist', () => {
        assert.match(mathstodonFixture, /class="notranslate app-holder"[^>]+id="mastodon"/);
        let app;
        execute((currentHarness) => {
            app = currentHarness.document.createElement('div');
            app.id = 'mastodon';
            app.className = 'notranslate app-holder';
            currentHarness.appendToBody(app);
        }, 'https://unlisted-mastodon-instance.example/@person/1234');

        assert.equal(app.classList.contains('notranslate'), false);
        assert.equal(app.classList.contains('app-holder'), true);
        assert.equal(app.getAttribute('translate'), 'yes');
    });
});
