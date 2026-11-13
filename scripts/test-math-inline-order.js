const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { createHarness } = require('./dom-harness');

const mathScript = fs.readFileSync(path.join(__dirname, '../src/MathTranslationGuard.user.js'), 'utf8');
const orderScript = fs.readFileSync(path.join(__dirname, '../src/InlineTranslationOrderGuard.user.js'), 'utf8');

function textNodes(harness) {
    const doc = harness.document;
    const originalCreate = doc.createElement.bind(doc);
    doc.createTextNode = (value) => {
        const node = originalCreate('#text');
        node.nodeType = 3;
        node.nodeValue = String(value);
        Object.defineProperty(node, 'textContent', {
            get() { return this.nodeValue; },
            set(value) { this.nodeValue = String(value); }
        });
        return node;
    };
    const originalWalker = doc.createTreeWalker.bind(doc);
    doc.createTreeWalker = (root, filter) => {
        if (filter !== 4) return originalWalker(root, filter);
        const nodes = [];
        function traverse(node) {
            if (node.nodeType === 3) nodes.push(node);
            for (const child of node.children || []) traverse(child);
        }
        traverse(root);
        let index = 0;
        return { nextNode() { return nodes[index++] || null; } };
    };
    harness.context.NodeFilter = { SHOW_ELEMENT: 1, SHOW_TEXT: 4 };
}

function execute(url, setup, options = { math: true, order: true }) {
    const h = createHarness({ url });
    textNodes(h);
    setup(h);
    h.context.globalThis = h.context;
    if (options.math) vm.runInNewContext(mathScript, h.context, { filename: 'MathTranslationGuard.user.js' });
    if (options.order) vm.runInNewContext(orderScript, h.context, { filename: 'InlineTranslationOrderGuard.user.js' });
    return h;
}

function paragraph(h, ...contents) {
    const p = h.document.createElement('p');
    for (const value of contents) {
        const child = typeof value === 'string' ? h.document.createTextNode(value) : value;
        p.appendChild(child);
    }
    h.appendToBody(p);
    return p;
}

describe('Math protection without position mutations', () => {
    test('Alex Wang source: both inline TeX and display TeX remain inside their original paragraph', () => {
        let p;
        execute('https://alexwang.ai/posts/reasoning-as-pathfinding/', (h) => {
            p = paragraph(h, 'Consider $1 + 2 + 3 + \\cdots + 10$ and then $1 + 10$.');
        }, { math: true, order: false });
        const formulae = p.children.filter((element) => element.getAttribute &&
            element.getAttribute('data-tm-math-protected') === 'source');
        assert.equal(formulae.length, 2);
        assert.deepEqual(formulae.map((item) => item.textContent),
            ['$1 + 2 + 3 + \\cdots + 10$', '$1 + 10$']);
        assert.equal(formulae.every((item) => item.getAttribute('translate') === 'no'), true);
        assert.equal(p.children.map((item) => item.textContent).join(''),
            'Consider $1 + 2 + 3 + \\cdots + 10$ and then $1 + 10$.');
    });

    test('display math and MathJax output are protected independently of translation ordering', () => {
        let display;
        let output;
        execute('https://alexwang.ai/posts/reasoning-as-pathfinding/', (h) => {
            display = paragraph(h, '$$p_x = \\sum_z \\pi(z \\mid x)$$');
            output = h.document.createElement('mjx-container');
            output.appendChild(h.document.createElement('math'));
            h.appendToBody(output);
        }, { math: true, order: false });
        assert.equal(display.children[0].getAttribute('data-tm-math-protected'), 'source');
        assert.equal(output.getAttribute('data-tm-math-protected'), 'output');
        assert.equal(output.getAttribute('translate'), 'no');
        assert.equal(output.children[0].getAttribute('data-tm-math-protected'), null,
            'a nested MathML element is not a second inline slot');
    });

    test('unrelated pages without a math renderer are not changed', () => {
        let p;
        execute('https://example.com/article', (h) => {
            p = paragraph(h, 'Offer $15 today and $20 tomorrow.');
        }, { math: true, order: false });
        assert.equal(p.children.length, 1);
        assert.equal(p.children[0].nodeValue, 'Offer $15 today and $20 tomorrow.');
    });

    test('Plover custom !! delimiters stay in source order without MathJax-specific script insertion', () => {
        let p;
        execute('https://blog.plover.com/math/ordinals/02-wellfoundedness.html', (h) => {
            p = paragraph(h, 'Start !!\\{1,3,\\omega\\}!! then !!\\omega!! end.');
        }, { math: true, order: false });
        assert.deepEqual(p.children.filter((item) => item.getAttribute &&
            item.getAttribute('data-tm-math-protected') === 'source')
            .map((item) => item.textContent), ['!!\\{1,3,\\omega\\}!!', '!!\\omega!!']);
        assert.equal(p.querySelectorAll('script').length, 0);
    });
});

describe('Inline order repair for code and mathematics', () => {
    test('both code and math use one shared ordering mechanism', () => {
        let p;
        let code;
        let math;
        const h = execute('https://alexwang.ai/posts/reasoning-as-pathfinding/', (doc) => {
            code = doc.document.createElement('span');
            code.setAttribute('data-tm-translatable-inline-code', 'true');
            code.textContent = 'native_decide';
            math = doc.document.createElement('span');
            math.setAttribute('data-tm-math-protected', 'source');
            math.textContent = '$1 + 10$';
            p = paragraph(doc, 'Before ', code, ' and ', math, ' after.');
        }, { math: false, order: true });

        assert.equal(p.querySelectorAll('[data-tm-translation-order-anchor]').length, 2);
        assert.equal(p.children.map((item) => item.textContent).join('').includes('native_decide'), true);
        p.removeChild(code);
        p.appendChild(code);
        p.removeChild(math);
        p.appendChild(math);
        h.triggerMutation([code, math], { target: p });
        const index = (node) => p.children.indexOf(node);
        assert.equal(index(code) < index(math), true);
        assert.equal(p.children[index(code) - 1].getAttribute('aria-hidden'), 'true');
        assert.equal(p.children[index(math) - 1].getAttribute('aria-hidden'), 'true');
    });

    test('order script does not convert normal code elements', () => {
        let code;
        const h = execute('https://example.com/', (doc) => {
            code = doc.document.createElement('code');
            code.textContent = 'original';
            paragraph(doc, 'Before ', code, ' after');
        }, { math: false, order: true });
        assert.equal(code.tagName, 'CODE');
        assert.equal(h.document.querySelectorAll('[data-tm-translation-order-anchor]').length, 0);
    });

    test('newly inserted math output is anchored after a dynamic mutation', () => {
        const h = execute('https://example.com/', () => {}, { math: true, order: true });
        const mjx = h.document.createElement('mjx-container');
        const p = paragraph(h, 'Before ', mjx, ' after');
        h.triggerMutation([p], { target: h.document.body });
        assert.equal(mjx.getAttribute('data-tm-math-protected'), 'output');
        h.triggerMutation([mjx], { type: 'attributes', target: mjx, attributeName: 'data-tm-math-protected' });
        assert.equal(p.querySelectorAll('[data-tm-translation-order-anchor]').length, 1);
    });

    test('order script does not recreate a MathJax source wrapper removed by its renderer', () => {
        let p;
        let source;
        const h = execute('https://alexwang.ai/posts/reasoning-as-pathfinding/', (doc) => {
            source = doc.document.createElement('span');
            source.setAttribute('data-tm-math-protected', 'source');
            source.textContent = '$z$';
            p = paragraph(doc, 'Before ', source, ' after');
        }, { math: false, order: true });
        p.removeChild(source);
        const rendered = h.document.createElement('mjx-container');
        rendered.setAttribute('data-tm-math-protected', 'output');
        p.appendChild(rendered);
        h.triggerMutation([rendered], { target: p });
        assert.equal(p.querySelectorAll('[data-tm-translation-order-anchor]').length, 1);
        assert.equal(source.isConnected, false);
    });
});
