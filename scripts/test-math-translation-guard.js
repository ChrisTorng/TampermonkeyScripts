const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');
const scriptPath = path.join(__dirname, '..', 'src', 'MathTranslationGuard.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');

function addTextSupport(harness) {
    // Extend only this test harness: the shared DOM harness does not emulate
    // text nodes or SHOW_TEXT, which this userscript needs for DOM scanning.
    const document = harness.document;
    const createElement = document.createElement.bind(document);
    document.createTextNode = (value) => {
        const node = createElement('#text');
        node.nodeType = 3;
        node.nodeValue = String(value);
        Object.defineProperty(node, 'textContent', {
            get() { return this.nodeValue; },
            set(next) { this.nodeValue = String(next); },
        });
        return node;
    };
    const originalWalker = document.createTreeWalker.bind(document);
    document.createTreeWalker = (root, filter) => {
        if (filter !== 4) return originalWalker(root, filter);
        const nodes = [];
        const walk = (node) => {
            if (node.nodeType === 3) nodes.push(node);
            for (const child of node.children || []) walk(child);
        };
        walk(root);
        let index = 0;
        return { nextNode() { return nodes[index++] || null; } };
    };
    harness.context.NodeFilter = { SHOW_ELEMENT: 1, SHOW_TEXT: 4 };
}

function execute(setupDom = () => {}, url = 'https://blog.plover.com/math/ordinals/02-wellfoundedness.html', options = {}) {
    const harness = createHarness({ url, ...options });
    addTextSupport(harness);
    setupDom(harness);
    harness.context.globalThis = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    return harness;
}

describe('Math Translation Guard', () => {
    test('Plover math uses successful G-style text spans and math script containers', () => {
        let paragraph;
        let original;
        const harness = execute((h) => {
            paragraph = h.document.createElement('p');
            original = h.document.createTextNode('Nim size !!\\{1, 3, \\omega\\}!! always ends.');
            paragraph.appendChild(original);
            h.appendToBody(paragraph);
        });
        assert.equal(original.parentNode, null, 'raw math text node should be replaced');
        assert.equal(paragraph.children.length, 3);
        const [prose, slot, tail] = paragraph.children;
        assert.equal(prose.tagName, 'SPAN');
        assert.equal(prose.textContent, 'Nim size ');
        assert.equal(tail.tagName, 'SPAN');
        assert.equal(tail.textContent, ' always ends.');
        assert.equal(prose.getAttribute('translate'), null);
        assert.equal(paragraph.getAttribute('translate'), null);
        assert.equal(slot.tagName, 'SPAN');
        assert.equal(slot.className, 'math-slot');
        assert.equal(slot.getAttribute('translate'), null);
        assert.equal(slot.children.length, 1);
        assert.equal(slot.children[0].tagName, 'SCRIPT');
        assert.equal(slot.children[0].type, 'math/tex');
        assert.equal(slot.children[0].textContent, '\\{1, 3, \\omega\\}');
        assert.equal(harness.document.querySelectorAll('.MathJax_Preview').length, 0);
        assert.equal(harness.document.querySelectorAll('.MathJax').length, 0);
    });

    test('Plover multiline math and multiple formulas keep exact TeX without modifying surrounding words', () => {
        let paragraph;
        execute((h) => {
            paragraph = h.document.createElement('p');
            paragraph.appendChild(h.document.createTextNode('Before !!1,\\!000!! then !!\\{1,\n\\omega\\}!! after'));
            h.appendToBody(paragraph);
        });
        const slots = paragraph.children.filter((node) => node.className === 'math-slot');
        const prose = paragraph.children.filter((node) => node.className !== 'math-slot');
        assert.equal(slots.length, 2);
        assert.deepEqual(slots.map((node) => node.children[0].textContent),
            ['1,\\!000', '\\{1,\n\\omega\\}']);
        assert.deepEqual(prose.map((node) => node.textContent), ['Before ', ' then ', ' after']);
        assert.equal(paragraph.children.length, 5);
        assert.deepEqual(paragraph.children.map((node) => node.className === 'math-slot' ? 'math' : 'text'),
            ['text', 'math', 'text', 'math', 'text']);
    });

    test('unrelated sites are not parsed as Plover math; code and preview source are excluded', () => {
        let paragraph;
        execute((h) => {
            paragraph = h.document.createElement('p');
            paragraph.appendChild(h.document.createTextNode('!!\\omega!!'));
            h.appendToBody(paragraph);
        }, 'https://example.net/article');
        assert.equal(paragraph.children.length, 1);
        assert.equal(paragraph.children[0].nodeValue, '!!\\omega!!');

        let code;
        let preview;
        execute((h) => {
            code = h.document.createElement('code');
            code.appendChild(h.document.createTextNode('!!\\omega!!'));
            h.appendToBody(code);
            preview = h.document.createElement('span');
            preview.className = 'MathJax_Preview';
            preview.appendChild(h.document.createTextNode('!!\\omega!!'));
            h.appendToBody(preview);
        });
        assert.equal(code.children.length, 1);
        assert.equal(preview.children.length, 1);
    });

    test('new Plover source nodes and character-data changes are converted without touching other text', () => {
        const harness = execute();
        const paragraph = harness.document.createElement('p');
        const lateText = harness.document.createTextNode('before !!\\omega!! after');
        paragraph.appendChild(lateText);
        harness.appendToBody(paragraph);
        harness.triggerMutation([paragraph]);
        assert.equal(paragraph.children.filter((node) => node.className === 'math-slot').length, 1);

        const changing = harness.document.createTextNode('before ');
        paragraph.appendChild(changing);
        changing.nodeValue = 'another !!b_1+1!! case';
        harness.triggerMutation([], { type: 'characterData', target: changing });
        assert.equal(paragraph.children.filter((node) => node.className === 'math-slot').length, 2);
    });

    test('MathJax 2 typesetting is queued for newly preserved source rather than invoked synchronously', () => {
        const queues = [];
        let paragraph;
        execute((h) => {
            h.window.MathJax = { Hub: { Queue(args) { queues.push(args); } } };
            paragraph = h.document.createElement('p');
            paragraph.appendChild(h.document.createTextNode('text !!\\omega!! more'));
            h.appendToBody(paragraph);
        });
        assert.equal(queues.length, 1);
        assert.equal(queues[0][0], 'Typeset');
        assert.equal(queues[0][2], paragraph);
    });

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


describe('Math Translation Guard site modes', () => {
    const plover = 'https://blog.plover.com/math/ordinals/02-wellfoundedness.html';
    test('automatic mode remains implicit until user explicitly chooses another strategy', () => {
        const h = execute((harness) => {
            const span = harness.document.createElement('span');
            span.className = 'MathJax';
            harness.appendToBody(span);
        });
        assert.equal(h.window.localStorage.getItem('tm-math-strategy-v1'), null);
        const button = h.document.querySelector('[data-floating-tool="math"]');
        assert.ok(button, 'math action should be registered after math is found');
        assert.equal(button.getAttribute('aria-pressed'), 'true');
    });

    test('output-only mode does not rewrite Plover raw delimiter text', () => {
        let paragraph;
        execute((h) => {
            paragraph = h.document.createElement('p');
            paragraph.appendChild(h.document.createTextNode('before !!\\omega!! after'));
            h.appendToBody(paragraph);
        }, plover, {localStorageSeed:{'tm-math-strategy-v1':'output'}});
        assert.equal(paragraph.children.length, 1);
        assert.equal(paragraph.children[0].nodeValue, 'before !!\\omega!! after');
    });

    test('off mode does not rewrite raw TeX or mark MathJax output', () => {
        let paragraph;
        let rendered;
        execute((h) => {
            paragraph = h.document.createElement('p');
            paragraph.appendChild(h.document.createTextNode('before !!\\omega!! after'));
            rendered = h.document.createElement('span');
            rendered.className = 'MathJax';
            h.appendToBody(paragraph);
            h.appendToBody(rendered);
        }, plover, {localStorageSeed:{'tm-math-strategy-v1':'off'}});
        assert.equal(paragraph.children.length, 1);
        assert.equal(rendered.getAttribute('translate'), null);
    });

    test('manual selection persists only for current origin and triggers one reload', () => {
        const h = execute((harness) => {
            const math = harness.document.createElement('mjx-container');
            harness.appendToBody(math);
        }, 'https://example.org/article');
        const mathAction = h.document.querySelector('[data-floating-tool="math"]');
        assert.ok(mathAction);
        h.window.scrollX = 12;
        h.window.scrollY = 520;
        mathAction.click();
        const item = h.document.querySelector('[data-math-mode="output"]');
        assert.ok(item);
        item.click();
        assert.equal(h.window.localStorage.getItem('tm-math-strategy-v1'), 'output');
        assert.equal(h.location.reloadCallCount, 1);
        const offset = JSON.parse(h.context.sessionStorage.getItem('tm-math-scroll-v1'));
        assert.equal(offset.href, 'https://example.org/article');
        assert.equal(offset.x, 12);
        assert.equal(offset.y, 520);
    });

    test('explicit backup selection is kept per origin, not global', () => {
        const h = execute((harness) => {
            const math = harness.document.createElement('span');
            math.className = 'katex';
            harness.appendToBody(math);
        }, 'https://foo.invalid/page', {localStorageSeed:{'tm-math-strategy-v1':'backup'}});
        assert.equal(h.document.querySelector('[data-floating-tool="math"]').title,
            'Math protection: backup');
        assert.equal(h.window.localStorage.getItem('tm-math-strategy-v1'),'backup');
    });
});


describe('Math Guard scroll restoration', () => {
    const key = 'tm-math-scroll-v1';
    const url = 'https://site.example/a?chapter=5';
    test('consumes a fresh one-time scroll marker without initiating another reload', () => {
        const positions = [];
        const marker = JSON.stringify({href:url,x:37,y:912,at:Date.now()});
        const h = execute((harness) => {
            harness.window.scrollTo = (x,y) => positions.push([x,y]);
        },url,{sessionStorageSeed:{[key]:marker}});
        assert.equal(h.context.sessionStorage.getItem(key),null);
        assert.deepEqual(positions,[[37,912]]);
        assert.equal(h.location.reloadCallCount,0);
    });
    test('ignores scroll markers for a different URL or too old to apply', () => {
        const positions=[];
        const marker=JSON.stringify({href:'https://other.example/page',x:0,y:999,at:Date.now()-40000});
        const h=execute((harness)=>{
            harness.window.scrollTo=(x,y)=>positions.push([x,y]);
        },url,{sessionStorageSeed:{[key]:marker}});
        assert.deepEqual(positions,[]);
        assert.equal(h.context.sessionStorage.getItem(key),null);
    });
});


test('shared floating-menu disabled-domain setting also disables all math transforms', () => {
    let rendered, paragraph;
    const h = execute((harness) => {
        rendered = harness.document.createElement('mjx-container');
        paragraph = harness.document.createElement('p');
        paragraph.appendChild(harness.document.createTextNode('Nim !!\\omega!! example'));
        harness.appendToBody(rendered);
        harness.appendToBody(paragraph);
    }, 'https://blog.plover.com/a', {
        localStorageSeed: {'tm-floating-menu-v1:blog.plover.com':JSON.stringify({disabledDomain:true})}
    });
    assert.equal(h.document.querySelector('[data-floating-tool="math"]'),null);
    assert.equal(rendered.getAttribute('translate'),null);
    assert.equal(paragraph.children.length,1);
    assert.equal(paragraph.children[0].nodeValue,'Nim !!\\omega!! example');
});
