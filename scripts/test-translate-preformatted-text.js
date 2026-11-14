const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

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

function addAstroRouterMarker(harness, content = 'true') {
    const marker = harness.document.createElement('meta');
    marker.setAttribute('name', 'astro-view-transitions-enabled');
    marker.setAttribute('content', content);
    harness.document.head.appendChild(marker);
    return marker;
}

describe('Translate Preformatted Text', () => {
    test('ordinary embedded documents do not create an unverified translation opener', () => {
        const harness = execute((h) => {
            const frame = h.document.createElement('iframe');
            frame.setAttribute('src', 'https://example.net/embedded-article');
            frame.clientWidth = 400;
            frame.clientHeight = 700;
            h.appendToBody(frame);
        }, 'https://claude.ai/artifact/example');

        const button = harness.document.querySelector('#tm-translate-all-pre');
        assert(button);
        assert.equal(button.textContent, '譯∞');
        assert.equal(button.getAttribute('data-floating-available'), 'false');
        button.click();
        assert.equal(harness.window.openCalls.length, 0);
    });

    test('late-loaded ordinary comments do not expose an iframe action', () => {
        const harness = execute(() => {}, 'https://github.com/example/repo/issues/1');
        for (let index = 0; index < 30; index++) {
            const comment = harness.document.createElement('p');
            comment.textContent = `New comment ${index}`;
            harness.appendToBody(comment);
            harness.triggerMutation([comment]);
        }
        const button = harness.document.querySelector('#tm-translate-all-pre');
        assert(button);
        assert.equal(button.getAttribute('data-floating-available'), 'false');
        assert.equal(harness.window.openCalls.length, 0);
    });

    test('Astro article navigation opts out of swaps while fragments and external links remain unchanged', () => {
        const links = [];
        execute((harness) => {
            addAstroRouterMarker(harness);
            for (const href of [
                '/blog/2026/introducing-myriad/',
                'https://aatishb.com/myriad/lets-build-a-brain/',
                '/blog/2026/ai-jagged-intelligence/#more',
                '?page=2',
                '#more',
                '/blog/#more',
                'https://example.com/article',
                'mailto:hello@aatishb.com',
                'javascript:void(0)',
                'https://[invalid'
            ]) {
                const link = harness.document.createElement('a');
                link.setAttribute('href', href);
                harness.appendToBody(link);
                links.push(link);
            }
        }, 'https://aatishb.com/blog/');

        links.forEach((link, index) => {
            assert.equal(link.hasAttribute('data-astro-reload'), index < 4, link.getAttribute('href'));
        });
        assert.equal(links[2].getAttribute('href'), '/blog/2026/ai-jagged-intelligence/#more');
    });

    test('Astro links added after startup are also prepared, including nested links', () => {
        const harness = execute(addAstroRouterMarker, 'https://aatishb.com/blog/');
        const link = harness.document.createElement('a');
        link.setAttribute('href', '/about/');
        harness.appendToBody(link);
        harness.triggerMutation([link]);
        assert.equal(link.hasAttribute('data-astro-reload'), true);

        const container = harness.document.createElement('section');
        const nested = harness.document.createElement('a');
        nested.setAttribute('href', '/myriad/');
        container.appendChild(nested);
        harness.appendToBody(container);
        harness.triggerMutation([container]);
        assert.equal(nested.hasAttribute('data-astro-reload'), true);
    });

    for (const url of [
        'https://metasora.com/blog/',
        'https://events-3bg.pages.dev/',
        'https://unknown-astro-site.example/blog/'
    ]) {
        test(`router detection enables full-page links without a host allowlist: ${url}`, () => {
            let link;
            execute((harness) => {
                addAstroRouterMarker(harness);
                link = harness.document.createElement('a');
                link.setAttribute('href', '/article/');
                harness.appendToBody(link);
            }, url);
            assert.equal(link.hasAttribute('data-astro-reload'), true);
        });
    }

    test('late router detection prepares links already present before the marker arrives', () => {
        let link;
        const harness = execute((current) => {
            link = current.document.createElement('a');
            link.setAttribute('href', '/article/');
            current.appendToBody(link);
        }, 'https://late-router.example/');
        assert.equal(link.hasAttribute('data-astro-reload'), false);

        const marker = addAstroRouterMarker(harness);
        harness.triggerMutation([marker], { target: harness.document.head });
        assert.equal(link.hasAttribute('data-astro-reload'), true);
    });

    test('static Astro sites, disabled routers, and ordinary sites keep their navigation', () => {
        for (const markerType of ['static-astro', 'disabled-router', 'ordinary']) {
            let link;
            execute((harness) => {
                if (markerType === 'static-astro') {
                    const generator = harness.document.createElement('meta');
                    generator.setAttribute('name', 'generator');
                    generator.setAttribute('content', 'Astro v7.2.9');
                    harness.document.head.appendChild(generator);
                } else if (markerType === 'disabled-router') {
                    addAstroRouterMarker(harness, 'false');
                }
                link = harness.document.createElement('a');
                link.setAttribute('href', '/blog/article/');
                harness.appendToBody(link);
            }, 'https://aatishb.com/blog/');
            assert.equal(link.hasAttribute('data-astro-reload'), false, markerType);
        }
    });

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

    test('OpenSSH release-note prose without PRE receives translation controls', () => {
        let heading;
        let prose;
        const harness = execute((current) => {
            heading = current.document.createElement('h3');
            heading.textContent = 'OpenSSH 10.6p2 (2026-11-05)';
            current.appendToBody(heading);
            prose = current.document.createElement('blockquote');
            prose.textContent = 'Portable OpenSSH 10.6p2 was released. ' + 'Recent security reports need careful review. '.repeat(6);
            current.appendToBody(prose);
        }, 'https://www.openssh.org/releasenotes.html');

        const wrapper = harness.document.querySelector('[data-tm-translatable-pre-wrapper]');
        const button = harness.document.querySelector('.tm-translate-pre-one');
        assert(wrapper);
        assert(button);
        assert.equal(wrapper.querySelector('blockquote'), prose);
        assert.equal(harness.document.querySelector('[data-floating-tool="translate"]').getAttribute('data-floating-available'), 'true');
        button.click();
        assert.match(harness.document.querySelector('[data-tm-translatable-pre-converted]').textContent, /security reports/);
        button.click();
        assert.equal(wrapper.querySelector('blockquote'), prose);
        assert.equal(heading.parentNode, harness.document.body);
    });

    test('ordinary prose remains untouched on other websites', () => {
        let prose;
        const harness = execute((current) => {
            const heading = current.document.createElement('h3');
            heading.textContent = 'OpenSSH 10.6p2';
            current.appendToBody(heading);
            prose = current.document.createElement('blockquote');
            prose.textContent = 'Portable OpenSSH notes '.repeat(10);
            current.appendToBody(prose);
        }, 'https://example.com/releases');
        assert.equal(harness.document.querySelector('[data-tm-translatable-pre-wrapper]'), null);
        assert.equal(prose.parentNode, harness.document.body);
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
        assert.equal(converted.getAttribute('translate'), 'yes');
        assert.equal(converted.getAttribute('data-tm-github-code-lines'), 'true');
        assert(converted.classList.contains('react-code-lines'));
        assert.equal(converted.querySelectorAll('[data-testid="code-cell"]').length, 2);
        assert.equal(converted.querySelectorAll('[data-testid="code-cell"]')[0].textContent, '# OKF Agent Memory');
        assert.equal(converted.querySelectorAll('[data-testid="code-cell"]')[1].textContent, 'A standardized memory layer.');
        assert.equal(converted.querySelectorAll('[data-testid="code-cell"]')[0].getAttribute('data-line-number'), '1');
        const wrapper = converted.closest('[data-tm-translatable-pre-wrapper]');
        assert.equal(wrapper.getAttribute('data-tm-github-line-wrapper'), 'true');
        assert.match(harness.document.querySelector('style').textContent, /display: contents !important/);
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
        assert.equal(converted.getAttribute('translate'), 'yes');
        assert.match(converted.textContent, /Input --> Memory/);
    });

    test('the page-wide button stays hidden when there are no PRE blocks', () => {
        const harness = execute(() => {});
        const allButton = harness.document.getElementById('tm-translate-all-pre');

        assert.equal(allButton.hidden, true);
        assert.equal(harness.document.getElementById('tm-shared-floating-menu').hidden, true);
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

    test('the page-wide button toggles every PRE block and remains available after reopening the menu', () => {
        const harness = execute((currentHarness) => {
            addPre(currentHarness, 'first block');
            addPre(currentHarness, 'second block');
            addPre(currentHarness, 'third block');
        });

        const allButton = harness.document.getElementById('tm-translate-all-pre');
        assert.equal(allButton.hidden, true);
        assert.equal(allButton.getAttribute('data-floating-available'), 'true');
        harness.document.querySelector('[data-floating-toggle]').click();
        assert.equal(allButton.hidden, false);
        assert.equal(allButton.textContent, '譯∞');
        allButton.click();

        assert.equal(harness.document.querySelectorAll('pre').length, 0);
        assert.equal(harness.document.querySelectorAll('[data-tm-translatable-pre-converted]').length, 3);
        assert.equal(allButton.hidden, true);
        assert.equal(allButton.getAttribute('data-floating-available'), 'true');
        assert.equal(allButton.getAttribute('aria-pressed'), 'true');
        assert.equal(allButton.style.getPropertyValue('background-color'), '');

        harness.document.querySelector('[data-floating-toggle]').click();
        assert.equal(allButton.hidden, false);
        allButton.click();
        assert.equal(harness.document.querySelectorAll('pre').length, 3);
        assert.equal(harness.document.querySelectorAll('[data-tm-translatable-pre-converted]').length, 0);
        assert.equal(allButton.getAttribute('aria-pressed'), 'false');
    });

    test('the shared menu can be dragged without converting blocks', () => {
        const harness = execute((currentHarness) => addPre(currentHarness, 'drag me'));
        const menu = harness.document.getElementById('tm-shared-floating-menu');
        const toggle = harness.document.querySelector('[data-floating-toggle]');
        const preventDefault = () => {};
        toggle.dispatchEvent({ type: 'mousedown', clientX: 1270, clientY: 80 });
        harness.document.dispatchEvent({ type: 'mousemove', clientX: 1170, clientY: 180, preventDefault });
        harness.document.dispatchEvent({ type: 'mouseup' });
        toggle.dispatchEvent({ type: 'click', preventDefault });
        assert.equal(menu.style.left, '1142px');
        assert.equal(menu.style.top, '170px');
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
    test('long natural-language plain text automatically becomes translatable', () => {
        const original = 'Emacs In the Age Of Magic\n'
            + 'The digital age is changing how we work and what we create. '
                .repeat(18);
        let pre;
        const harness = execute((h) => {
            pre = addPre(h, original, 'plain-article');
            pre.setAttribute('style', 'white-space: pre-wrap; padding: 12px; margin: 7px;');
        }, 'https://commandlinesystems.com/magic.txt');
        harness.runAllTimeouts();
        const converted = harness.document.querySelector('[data-tm-translatable-pre-converted]');
        assert(converted, 'Prose covering most of a plain-text page should auto-convert.');
        assert.equal(converted.tagName, 'DIV');
        assert.equal(converted.getAttribute('translate'), 'yes');
        assert.equal(converted.className, 'plain-article');
        assert.equal(converted.getAttribute('style'), pre.getAttribute('style'));
        assert.equal(converted.style.getPropertyValue('font-size'), '16px');
        assert.equal(harness.document.querySelector('pre'), null);
        const all = harness.document.getElementById('tm-translate-all-pre');
        assert.equal(all.getAttribute('aria-pressed'), 'true');

        // Simulate browser translation without modifying the detached original.
        converted.textContent = '魔法時代的 Emacs';
        all.click();
        assert.equal(harness.document.querySelector('pre.plain-article'), pre);
        assert.equal(pre.textContent, original);
        assert.equal(pre.getAttribute('style'), 'white-space: pre-wrap; padding: 12px; margin: 7px;');
        assert.equal(pre.hasAttribute('translate'), false);
        assert.equal(harness.sessionStorage.getItem('tm-pre-auto-off:/magic.txt'), 'off');
        harness.triggerMutation([pre]);
        harness.runAllTimeouts();
        assert.equal(harness.document.querySelector('[data-tm-translatable-pre-converted]'), null);
    });

    test('code-only preformatted documents remain original even when they dominate the page', () => {
        const code = 'const getValue = (x) => { return x + 2; };\n'.repeat(35);
        const harness = execute((h) => addPre(h, code), 'https://example.net/source.txt');
        harness.runAllTimeouts();
        assert(harness.document.querySelector('pre'));
        assert.equal(harness.document.querySelector('[data-tm-translatable-pre-converted]'), null);
        assert.equal(harness.document.getElementById('tm-translate-all-pre').getAttribute('aria-pressed'), 'false');
    });

    test('short code blocks do not auto-convert beside a large normal article', () => {
        const harness = execute((h) => {
            const article = h.document.createElement('article');
            article.textContent = 'The page itself is an article that should remain readable. '.repeat(18);
            h.appendToBody(article);
            addPre(h, 'The program does not compile because the input is invalid. '.repeat(6));
        }, 'https://example.net/an-article');
        harness.runAllTimeouts();
        assert.equal(harness.document.querySelector('[data-tm-translatable-pre-converted]'), null);
    });

    test('majority prose in a no-translate leaf can be restored without changing its original class', () => {
        let protectedBlock;
        const harness = execute((h) => {
            protectedBlock = h.document.createElement('div');
            protectedBlock.className = 'notranslate original-typography';
            protectedBlock.textContent = 'The history of programming is shaped by the tools we use and the way we think. '.repeat(12);
            h.appendToBody(protectedBlock);
        }, 'https://example.net/essay');
        harness.runAllTimeouts();
        const converted = harness.document.querySelector('[data-tm-translatable-pre-converted]');
        assert(converted);
        assert.equal(converted.classList.contains('notranslate'), false);
        assert.equal(converted.classList.contains('original-typography'), true);
        harness.document.getElementById('tm-translate-all-pre').click();
        assert.equal(harness.document.querySelector('.notranslate.original-typography'), protectedBlock);
        assert.equal(protectedBlock.hasAttribute('translate'), false);
    });

    test('the captured GitHub Markdown view keeps every line paired with its original gutter', () => {
        // The fixture comes from the actual GitHub code-view HTML, including
        // sibling react-line-numbers and react-code-lines columns.
        assert.match(okfPlainFixture, /class="react-line-numbers"/);
        assert.match(okfPlainFixture, /class="react-code-lines"/);
        const sourceLines = [...okfPlainFixture.matchAll(
            /<div id="LC(\d+)" class="react-file-line[^"]*" data-testid="code-cell" data-line-number="\d+"[^>]*>([\s\S]*?)<\/div>/g
        )].map((match) => ({
            number: Number(match[1]),
            text: match[2].replace(/<[^>]+>/g, '')
                .replace(/&amp;/g, '&').replace(/&gt;/g, '>')
                .replace(/&lt;/g, '<').replace(/&#039;/g, "'"),
        }));
        assert(sourceLines.length >= 200, 'Expected most of the captured Markdown source lines.');

        let source, gutter, viewer;
        const harness = execute((h) => {
            viewer = h.document.createElement('div');
            viewer.className = 'react-code-file-contents';
            gutter = h.document.createElement('div');
            gutter.className = 'react-line-numbers';
            source = h.document.createElement('div');
            source.className = 'react-code-lines';
            for (const line of sourceLines) {
                const number = h.document.createElement('div');
                number.className = 'react-line-number react-code-text';
                number.setAttribute('data-line-number', String(line.number));
                number.textContent = String(line.number);
                gutter.appendChild(number);

                const row = h.document.createElement('div');
                row.className = 'react-code-text react-code-line-contents';
                row._rect = { top: line.number * 22, bottom: (line.number + 1) * 22,
                    left: 55, right: 600, width: 545, height: 22 };
                const inner = h.document.createElement('div');
                const cell = h.document.createElement('div');
                cell.id = 'LC' + line.number;
                cell.className = 'react-file-line html-div';
                cell.setAttribute('data-testid', 'code-cell');
                cell.setAttribute('data-line-number', String(line.number));
                // GitHub highlights Markdown with nested syntax spans.
                const colored = h.document.createElement('span');
                colored.className = line.text.includes('https://') ? 'pl-corl' : 'pl-en';
                colored.textContent = line.text || ' ';
                cell.appendChild(colored);
                cell.textContent = line.text || ' ';
                inner.appendChild(cell);
                row.appendChild(inner);
                source.appendChild(row);
            }
            viewer.append(gutter, source);
            h.appendToBody(viewer);
        }, 'https://github.com/okf-memory/okf-agent-memory/blob/main/README.md?plain=1');

        harness.runAllTimeouts();
        const translated = harness.document.querySelector('[data-tm-github-code-lines]');
        assert(translated, 'Prose-heavy Markdown must be auto-enabled for browser translation.');
        assert.equal(translated.getAttribute('translate'), 'yes');
        assert.equal(translated.querySelectorAll('[data-testid="code-cell"]').length, sourceLines.length);
        assert.equal(gutter.querySelectorAll('.react-line-number').length, sourceLines.length);
        assert.equal(translated.parentElement.getAttribute('data-tm-github-line-wrapper'), 'true');
        assert.equal(translated.parentElement.parentElement, viewer);
        assert.equal(viewer.children[0], gutter, 'Line numbers must remain the first flex column.');
        assert.equal(translated.querySelectorAll('.react-code-line-contents').length, sourceLines.length);
        const translatedRows = translated.querySelectorAll('.react-code-line-contents');
        for (const [index, row] of translatedRows.entries()) {
            assert.equal(row.style.getPropertyValue('height'), '22px');
            const cell = row.querySelector('[data-testid="code-cell"]');
            assert.equal(cell.id, 'LC' + (index + 1));
            assert.equal(cell.getAttribute('data-line-number'), String(index + 1));
            assert.equal(cell.style.getPropertyValue('white-space'), 'pre');
            assert.equal(cell.style.getPropertyValue('overflow-wrap'), 'normal');
        }

        const codeLineIndex = sourceLines.findIndex((line) => /^\s*```/.test(line.text));
        assert(codeLineIndex >= 0);
        assert.equal(translated.querySelectorAll('[data-testid="code-cell"]')[codeLineIndex]
            .getAttribute('translate'), 'no', 'Fenced code delimiters must stay original.');
        const proseLineIndex = sourceLines.findIndex((line) =>
            /Conversations with AI agents reset when context windows close/.test(line.text));
        assert(proseLineIndex >= 0);
        const translatedCells = translated.querySelectorAll('[data-testid="code-cell"]');
        assert.equal(translatedCells[proseLineIndex].getAttribute('translate'), 'yes');
        translatedCells[proseLineIndex].textContent = '代理程式的對話會在內容視窗關閉時重設。';

        harness.document.getElementById('tm-translate-all-pre').click();
        assert.equal(viewer.querySelector('.react-code-lines'), source,
            'Restoring must use the original GitHub source element, not a rewritten copy.');
        assert.equal(viewer.querySelectorAll('.react-line-number').length, sourceLines.length);
        assert.equal(source.querySelectorAll('[data-testid="code-cell"]')[proseLineIndex].textContent,
            sourceLines[proseLineIndex].text);
        assert.equal(harness.sessionStorage.getItem(
            'tm-pre-auto-off:/okf-memory/okf-agent-memory/blob/main/README.md?plain=1'), 'off');
        harness.runAllTimeouts();
        assert.equal(harness.document.querySelector('[data-tm-github-code-lines]'), null);
    });

    test('GitHub source code outside Markdown stays manually controlled', () => {
        const harness = execute((h) => {
            const source = h.document.createElement('div');
            source.className = 'react-code-lines';
            for (let i = 0; i < 90; i++) {
                const row = h.document.createElement('div');
                const cell = h.document.createElement('div');
                cell.setAttribute('data-testid', 'code-cell');
                cell.setAttribute('data-line-number', String(i + 1));
                cell.textContent = 'const connection = () => { return configureStorage(); };';
                row.appendChild(cell);
                source.appendChild(row);
            }
            h.appendToBody(source);
        }, 'https://github.com/example/project/blob/main/client.ts');
        harness.runAllTimeouts();
        assert.equal(harness.document.querySelector('[data-tm-github-code-lines]'), null);
        assert(harness.document.querySelector('.react-code-lines'));
    });

});
