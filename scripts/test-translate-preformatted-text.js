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

    test('gallery hydration batches expensive document-wide translation checks', () => {
        let gallery;
        const h = execute(current => {
            current.document.documentElement.setAttribute('lang', 'zh-TW');
            gallery = current.document.createElement('main');
            current.appendToBody(gallery);
        }, 'https://visualbasic.world/');
        const originalQuery = h.document.querySelectorAll.bind(h.document);
        let globalArticleChecks = 0;
        h.document.querySelectorAll = selector => {
            if (selector === 'article, main') globalArticleChecks += 1;
            return originalQuery(selector);
        };
        const added = [];
        for (let i = 0; i < 120; i += 1) {
            const card = h.document.createElement('div');
            card.className = 'gallery-card';
            const image = h.document.createElement('img');
            const caption = h.document.createElement('p');
            caption.textContent = 'Project screenshot ' + i;
            card.appendChild(image);
            card.appendChild(caption);
            gallery.appendChild(card);
            added.push(card);
        }
        h.triggerMutation(added, { target: gallery });
        assert(globalArticleChecks <= 1,
            'One mutation delivery with 120 new cards must not rescan all articles 120 times.');
    });

    // The public Perplexity HTML response captured on 2026-11-08 contains
    // <html lang="en-GB" translate="no"> and a full article with 1 H1 and
    // 24 paragraphs. These runtime tests reproduce that observed structure;
    // native Edge translation still requires a separate device check.
    test('document-level translation opt-out is removed for a readable article', () => {
        let article;
        const harness = execute((h) => {
            h.document.documentElement.setAttribute('lang', 'en-GB');
            h.document.documentElement.setAttribute('translate', 'no');
            article = h.document.createElement('article');
            const heading = h.document.createElement('h1');
            heading.textContent = 'Teammates are agents for complex, ongoing work';
            article.appendChild(heading);
            for (let i = 0; i < 4; i++) {
                const p = h.document.createElement('p');
                p.textContent = 'A teammate coordinates other agents and handles ongoing projects as priorities change. '.repeat(2);
                article.appendChild(p);
            }
            h.appendToBody(article);
        }, 'https://www.perplexity.ai/en-GB/hub/blog/teammates-are-agents-for-complex-ongoing-work');

        assert.equal(harness.document.documentElement.getAttribute('translate'), null);
        assert.equal(article.querySelector('h1').textContent,
            'Teammates are agents for complex, ongoing work');
    });

    // The two Perplexity device reports captured on 2026-11-17 found:
    // Decider's English article is already marked <html lang="zh-TW">
    // from document-start; Teammates begins en-GB and switches to zh-TW
    // only after Edge translated its visible heading and paragraphs.
    const englishProse = 'The article explains how the service can help the reader use new tools and work with the team, and how this approach will improve the experience. '.repeat(3);
    const appendArticle = (h, title, paragraphs) => {
        const article = h.document.createElement('article');
        const h1 = h.document.createElement('h1');
        h1.textContent = title;
        article.appendChild(h1);
        for (const prose of paragraphs) {
            const p = h.document.createElement('p');
            p.textContent = prose;
            article.appendChild(p);
        }
        h.appendToBody(article);
        return article;
    };

    test('Decider: an English article falsely marked zh-TW is relabeled en without rewriting prose', () => {
        let article;
        const harness = execute((h) => {
            h.document.documentElement.setAttribute('lang', 'zh-TW');
            article = appendArticle(h, 'Perplexity Decider', Array(8).fill(englishProse));
        }, 'https://www.perplexity.ai/hub/blog/perplexity-decider');
        assert.equal(harness.document.documentElement.getAttribute('lang'), 'en');
        assert.equal(article.querySelector('p').textContent, englishProse);
        assert.equal(article.querySelectorAll('p').length, 8);
        assert.equal(article.querySelector('h1').textContent, 'Perplexity Decider');
    });

    test('same language-label repair applies to an unrelated English article', () => {
        const harness = execute(h => {
            h.document.documentElement.setAttribute('lang', 'zh-Hant');
            appendArticle(h, 'Understanding autonomous agents', Array(8).fill(englishProse));
        }, 'https://example.org/essays/autonomous-agents');
        assert.equal(harness.document.documentElement.getAttribute('lang'), 'en');
    });

    test('German navigation with an English research article is identified by article prose, not the site language', () => {
        const harness = execute(h => {
            h.document.documentElement.setAttribute('lang', 'de-DE');
            const nav = h.document.createElement('nav');
            nav.textContent = 'Anwendungssicherheit Beratung Softwareentwicklung Über uns';
            h.appendToBody(nav);
            appendArticle(h, 'Lovable apps expose sensitive data', Array(8).fill(englishProse));
        }, 'https://www.crissyfield.de/research/lovable-en/');
        assert.equal(harness.document.documentElement.getAttribute('lang'), 'en');
        assert.match(harness.document.querySelector('nav').textContent, /Anwendungssicherheit/);
        assert.equal(harness.document.querySelector('article').querySelector('p').textContent, englishProse);
    });

    test('other mislabeled European-language article roots also use the same correction', () => {
        for (const declared of ['de', 'fr-FR', 'es-ES']) {
            const harness = execute(h => {
                h.document.documentElement.setAttribute('lang', declared);
                appendArticle(h, 'How modern software agents collaborate', Array(8).fill(englishProse));
            }, 'https://example.org/read/english');
            assert.equal(harness.document.documentElement.getAttribute('lang'), 'en', declared);
        }
    });

    test('true German and French long articles retain their native language', () => {
        const german = 'Die Forschung untersucht, wie Unternehmen ihre Anwendungen sicher entwickeln und ihre Daten schützen. Die Untersuchung zeigt, dass verschiedene Plattformen ähnliche Probleme haben. '.repeat(4);
        const french = 'Les entreprises utilisent de nouveaux outils pour développer leurs applications, mais leurs données doivent rester protégées. Cette étude examine les risques et les solutions disponibles. '.repeat(4);
        for (const [declared, title, prose] of [
            ['de', 'Sicherheit für moderne Anwendungen', german],
            ['fr-FR', 'Sécurité des applications modernes', french],
        ]) {
            const harness = execute(h => {
                h.document.documentElement.setAttribute('lang', declared);
                appendArticle(h, title, Array(8).fill(prose));
            }, 'https://example.org/research/security');
            assert.equal(harness.document.documentElement.getAttribute('lang'), declared, declared);
        }
    });

    test('language labels are not repeatedly overwritten during native Edge translation', () => {
        const harness = execute(h => {
            h.document.documentElement.setAttribute('lang', 'de');
            appendArticle(h, 'Understanding collaborative software systems', Array(8).fill(englishProse));
        }, 'https://example.org/research/software');
        assert.equal(harness.document.documentElement.getAttribute('lang'), 'en');
        const article = harness.document.querySelector('article');
        // Edge can update root lang before some English paragraphs are translated.
        harness.document.documentElement.setAttribute('lang', 'zh-TW');
        harness.triggerMutation([article], { target: article });
        assert.equal(harness.document.documentElement.getAttribute('lang'), 'zh-TW');
    });

    test('missing language and already-English root labels are not rewritten', () => {
        for (const declared of ['', 'en-GB']) {
            const harness = execute(h => {
                if (declared) h.document.documentElement.setAttribute('lang', declared);
                appendArticle(h, 'Understanding collaborative software systems', Array(8).fill(englishProse));
            }, 'https://example.org/research/software');
            assert.equal(harness.document.documentElement.getAttribute('lang'), declared || null);
        }
    });

    test('Teammates remains en-GB, and successful Edge translation can set zh-TW afterward', () => {
        let article;
        const harness = execute(h => {
            h.document.documentElement.setAttribute('lang', 'en-GB');
            article = appendArticle(h, 'Teammates are agents for complex, ongoing work', Array(8).fill(englishProse));
        }, 'https://www.perplexity.ai/en-GB/hub/blog/teammates-are-agents-for-complex-ongoing-work');
        assert.equal(harness.document.documentElement.getAttribute('lang'), 'en-GB');
        // Edge has now translated the heading and most paragraphs to Chinese.
        article.querySelector('h1').textContent = '協作代理程式與持續工作';
        for (const p of article.querySelectorAll('p')) p.textContent = '這篇文章已成功翻譯成繁體中文。'.repeat(15);
        harness.document.documentElement.setAttribute('lang', 'zh-TW');
        harness.triggerMutation([article], { target: article });
        assert.equal(harness.document.documentElement.getAttribute('lang'), 'zh-TW');
    });

    test('genuine Chinese, mixed-language pages and short apps retain zh-TW labels', () => {
        const chinese = '這是一篇繁體中文技術文章，包含處理流程、測試步驟和必要的完整內容。'.repeat(8);
        const cases = [
            { title: '中文文章介紹新的翻譯技術', paragraphs: Array(8).fill(chinese) },
            { title: 'English APIs in Chinese documentation', paragraphs: Array(8).fill(chinese + englishProse) },
            { title: 'Interactive Application', paragraphs: [englishProse] }
        ];
        for (const info of cases) {
            const harness = execute(h => {
                h.document.documentElement.setAttribute('lang', 'zh-TW');
                appendArticle(h, info.title, info.paragraphs);
            }, 'https://example.com/article');
            assert.equal(harness.document.documentElement.getAttribute('lang'), 'zh-TW', info.title);
        }
    });

    test('dynamically hydrated English article can fix a misleading language label', () => {
        const harness = execute(h => {
            h.document.documentElement.setAttribute('lang', 'zh-TW');
        }, 'https://news.example.net/read/late');
        assert.equal(harness.document.documentElement.getAttribute('lang'), 'zh-TW');
        const article = appendArticle(harness, 'The future of collaborative work', Array(8).fill(englishProse));
        harness.triggerMutation([article]);
        assert.equal(harness.document.documentElement.getAttribute('lang'), 'en');
    });

    test('TechSpot-style Google notranslate meta is removed only for a readable article', () => {
        let article, meta, exclusion;
        const harness = execute(h => {
            h.document.documentElement.setAttribute('lang', 'en-US');
            meta = h.document.createElement('meta');
            meta.setAttribute('name', 'google');
            meta.setAttribute('content', 'notranslate');
            h.document.head.appendChild(meta);
            article = appendArticle(h, 'Nvidia GPU pricing through circular investment', Array(5).fill(englishProse));
            exclusion = h.document.createElement('span');
            exclusion.setAttribute('translate', 'no');
            exclusion.textContent = 'RTX 4090';
            article.appendChild(exclusion);
        }, 'https://www.techspot.com/news/114558-nvidia-deliberately-kept-gpu-prices-high-through-circular.html');
        assert.equal(meta.isConnected, false);
        assert.equal(harness.document.documentElement.getAttribute('lang'), 'en-US');
        assert.equal(article.querySelectorAll('p').length, 5);
        assert.equal(article.querySelector('p').textContent, englishProse);
        assert.equal(exclusion.getAttribute('translate'), 'no');
    });

    test('Google meta opt-out and root translate=no are fixed together without changing unrelated meta tokens', () => {
        let meta;
        const harness = execute(h => {
            h.document.documentElement.setAttribute('translate', 'no');
            meta = h.document.createElement('meta');
            meta.setAttribute('name', 'google');
            meta.setAttribute('content', 'notranslate, nositelinkssearchbox');
            h.document.head.appendChild(meta);
            appendArticle(h, 'How independent research is conducted', Array(5).fill(englishProse));
        }, 'https://reader.example.org/research/report');
        assert.equal(harness.document.documentElement.getAttribute('translate'), null);
        assert.equal(meta.getAttribute('content'), 'nositelinkssearchbox');
    });

    test('short interactive pages keep Google notranslate and non-Google metadata unchanged', () => {
        let meta, robots;
        const harness = execute(h => {
            meta = h.document.createElement('meta');
            meta.setAttribute('name', 'google');
            meta.setAttribute('content', 'notranslate');
            h.document.head.appendChild(meta);
            robots = h.document.createElement('meta');
            robots.setAttribute('name', 'googlebot');
            robots.setAttribute('content', 'notranslate');
            h.document.head.appendChild(robots);
            const main = h.document.createElement('main');
            const h1 = h.document.createElement('h1');
            h1.textContent = 'Account settings';
            main.appendChild(h1);
            main.appendChild(h.document.createElement('input'));
            h.appendToBody(main);
        }, 'https://app.example.org/');
        assert.equal(meta.getAttribute('content'), 'notranslate');
        assert.equal(robots.getAttribute('content'), 'notranslate');
        assert.equal(meta.isConnected, true);
    });

    test('late content and re-applied Google opt-outs are corrected without a mutation loop', () => {
        let meta;
        const harness = execute(h => {
            meta = h.document.createElement('meta');
            meta.setAttribute('name', 'google');
            meta.setAttribute('content', 'notranslate');
            h.document.head.appendChild(meta);
        }, 'https://example.net/news/late');
        assert.equal(meta.isConnected, true);
        const article = appendArticle(harness, 'An article about machine learning systems', Array(4).fill(englishProse));
        harness.triggerMutation([article]);
        assert.equal(meta.isConnected, false);

        const replacement = harness.document.createElement('meta');
        replacement.setAttribute('name', 'google');
        replacement.setAttribute('content', 'notranslate');
        harness.document.head.appendChild(replacement);
        harness.triggerMutation([replacement]);
        assert.equal(replacement.isConnected, false);

        const active = harness.document.createElement('meta');
        active.setAttribute('name', 'google');
        active.setAttribute('content', 'translate');
        harness.document.head.appendChild(active);
        active.setAttribute('content', 'notranslate');
        harness.triggerMutation([], { type: 'attributes', target: active, attributeName: 'content' });
        assert.equal(active.isConnected, false);
    });

    test('root notranslate class uses the same shared opt-out handling', () => {
        const harness = execute((h) => {
            h.document.documentElement.classList.add('notranslate');
            const article = h.document.createElement('article');
            const heading = h.document.createElement('h1');
            heading.textContent = 'An article intended for translation';
            article.appendChild(heading);
            for (let i = 0; i < 3; i++) {
                const paragraph = h.document.createElement('p');
                paragraph.textContent = 'Readable prose on a public news website should not inherit a site-wide translation opt-out. '.repeat(2);
                article.appendChild(paragraph);
            }
            h.appendToBody(article);
        }, 'https://reader.example.org/posts/article');
        assert.equal(harness.document.documentElement.classList.contains('notranslate'), false);
    });

    test('generic article unblocking also applies to unrelated domains', () => {
        for (const url of ['https://example.org/essay', 'https://news.example.net/articles/topic']) {
            const harness = execute((h) => {
                h.document.documentElement.setAttribute('translate', 'no');
                const main = h.document.createElement('main');
                const h1 = h.document.createElement('h1');
                h1.textContent = 'How to manage ongoing work';
                main.appendChild(h1);
                for (let i = 0; i < 3; i++) {
                    const p = h.document.createElement('p');
                    p.textContent = 'An article paragraph with sufficiently long prose intended for human readers. '.repeat(2);
                    main.appendChild(p);
                }
                h.appendToBody(main);
            }, url);
            assert.equal(harness.document.documentElement.getAttribute('translate'), null, url);
        }
    });

    test('interactive applications and short pages retain their document-level opt-out', () => {
        const harness = execute((h) => {
            h.document.documentElement.setAttribute('translate', 'no');
            const main = h.document.createElement('main');
            const input = h.document.createElement('input');
            main.appendChild(input);
            h.appendToBody(main);
        }, 'https://www.perplexity.ai/search/example');
        assert.equal(harness.document.documentElement.getAttribute('translate'), 'no');
    });

    test('dynamically loaded readable articles become translatable after content arrives', () => {
        const harness = execute((h) => {
            h.document.documentElement.setAttribute('translate', 'no');
        }, 'https://news.example.org/');
        assert.equal(harness.document.documentElement.getAttribute('translate'), 'no');
        const article = harness.document.createElement('article');
        const h1 = harness.document.createElement('h1');
        h1.textContent = 'An article loaded after initial navigation';
        article.appendChild(h1);
        harness.appendToBody(article);
        harness.triggerMutation([article]);
        assert.equal(harness.document.documentElement.getAttribute('translate'), 'no');

        for (let i = 0; i < 3; i++) {
            const p = harness.document.createElement('p');
            p.textContent = 'This content is written for human readers, with a full paragraph that should be translated. '.repeat(2);
            article.appendChild(p);
            harness.triggerMutation([p], { target: article });
        }
        assert.equal(harness.document.documentElement.getAttribute('translate'), null);

        // If hydration restores the original opt-out, the observer repairs it.
        harness.document.documentElement.setAttribute('translate', 'no');
        harness.triggerMutation([], {
            type: 'attributes', target: harness.document.documentElement, attributeName: 'translate'
        });
        assert.equal(harness.document.documentElement.getAttribute('translate'), null);
    });

    test('an article-specific translate=no remains untouched after root unblocking', () => {
        let aside;
        const harness = execute((h) => {
            h.document.documentElement.setAttribute('translate', 'no');
            const article = h.document.createElement('article');
            const heading = h.document.createElement('h1');
            heading.textContent = 'Long research report with exclusions';
            article.appendChild(heading);
            for (let i = 0; i < 3; i++) {
                const p = h.document.createElement('p');
                p.textContent = 'The body of this article is readable prose which should be available for translation. '.repeat(2);
                article.appendChild(p);
            }
            aside = h.document.createElement('aside');
            aside.setAttribute('translate', 'no');
            aside.textContent = 'UNTRANSLATED_APP_TOKEN';
            article.appendChild(aside);
            h.appendToBody(article);
        });
        assert.equal(harness.document.documentElement.getAttribute('translate'), null);
        assert.equal(aside.getAttribute('translate'), 'no');
    });

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
        assert.equal(converted.tagName, 'BLOCKQUOTE');
        assert.match(converted.querySelector('p').querySelector('span').textContent, /song lyrics/);

        button.click();
        assert.equal(harness.document.querySelector('blockquote'), quote);
        assert.equal(quote.querySelector('code'), code);
    });

    test('AI disclosure quote with many inline code examples remains native-translatable prose', () => {
        let quote;
        const inlineExamples = [
            'http://siterate.org/css/commons.css',
            '[domain].siterank.org',
            '.headerText { margin-inline-end: .25rem }',
            'height: .9375em',
            'height: 1.1em'
        ];
        assert(inlineExamples.join(' ').length > 80);
        const harness = execute(h => {
            quote = h.document.createElement('blockquote');
            const title = h.document.createElement('h2');
            title.textContent = 'AI disclosure';
            quote.appendChild(title);
            for (const text of [
                'All prose was written by the author without output from agents or inline completion tools. The writer explains which work did and did not use AI. ',
                'A chatbot helped turn screenshots into a responsive layout. The remaining explanation describes the author’s manual adjustments, final review, and implementation details. '
            ]) {
                const p = h.document.createElement('p');
                p.textContent = text.repeat(3);
                quote.appendChild(p);
            }
            const list = h.document.createElement('ul');
            for (const [index, snippet] of inlineExamples.entries()) {
                const item = h.document.createElement('li');
                const plain = h.document.createElement('span');
                plain.textContent = 'The writer discusses a small styling adjustment in a much longer ordinary paragraph. '.repeat(2);
                const code = h.document.createElement('code');
                code.textContent = snippet;
                item.appendChild(plain);
                item.appendChild(code);
                list.appendChild(item);
            }
            quote.appendChild(list);
            h.appendToBody(quote);
        }, 'https://jack.cab/blog/siterate');

        assert.equal(quote.getAttribute('translate'), null, 'ordinary quote must never be blocked as code');
        assert.equal(quote.closest('[data-tm-translatable-pre-wrapper]'), null);
        assert.equal(harness.document.querySelectorAll('.tm-translate-pre-one').length, 0,
            'prose does not need the manual translation control');
        assert.equal(quote.querySelector('p').textContent.includes('All prose was written'), true);
        assert.equal(quote.querySelectorAll('code').length, 0,
            'small inline code elements still use the existing protected-span behavior');
        assert.equal(quote.querySelectorAll('[data-tm-translatable-inline-code]').length, inlineExamples.length);
        for (const span of quote.querySelectorAll('[data-tm-translatable-inline-code]')) {
            assert.equal(span.getAttribute('translate'), 'no', 'inline code stays protected');
        }
    });

    test('code-dominated blockquote still offers the manual translation button', () => {
        let code;
        const harness = execute(h => {
            const quote = h.document.createElement('blockquote');
            const p = h.document.createElement('p');
            const lead = h.document.createElement('span');
            lead.textContent = 'Quoted source: ';
            code = h.document.createElement('code');
            code.textContent = 'const settings = { label: "a configuration example", enabled: true, levels: [1, 2, 3] }; '.repeat(2);
            p.appendChild(lead);
            p.appendChild(code);
            quote.appendChild(p);
            h.appendToBody(quote);
        }, 'https://example.org/technical-note');
        assert(harness.document.querySelector('.tm-translate-pre-one'));
        assert(code.closest('[data-tm-translatable-pre-wrapper]'));
        assert.equal(code.getAttribute('translate'), null);
    });

    test('outer quotation containing a genuine nested code quotation keeps its manual wrapper', () => {
        let outer, nested;
        const harness = execute(h => {
            outer = h.document.createElement('blockquote');
            const prose = h.document.createElement('p');
            prose.textContent = 'An introduction describes the example and the author explains why the exact quotation is important. '.repeat(4);
            outer.appendChild(prose);
            nested = h.document.createElement('blockquote');
            const p = h.document.createElement('p');
            const code = h.document.createElement('code');
            code.textContent = 'Please treat this project as your own and consider the existing structure before deciding how to build on it.';
            p.appendChild(code);
            nested.appendChild(p);
            outer.appendChild(nested);
            h.appendToBody(outer);
        }, 'https://example.org/nested-quote');
        const button = harness.document.querySelector('.tm-translate-pre-one');
        assert(button);
        assert(outer.closest('[data-tm-translatable-pre-wrapper]'));
        button.click();
        const converted = harness.document.querySelector('[data-tm-translatable-pre-converted]');
        assert(converted);
        assert.equal(converted.tagName, 'BLOCKQUOTE');
        assert(converted.querySelector('blockquote'));
        button.click();
        assert.equal(outer.querySelector('blockquote'), nested);
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
                line.className = 'react-code-line-contents';
                const inner = currentHarness.document.createElement('div');
                const cell = currentHarness.document.createElement('div');
                cell.setAttribute('data-testid', 'code-cell');
                cell.setAttribute('data-line-number', String(index + 1));
                cell.textContent = text;
                inner.appendChild(cell);
                line.appendChild(inner);
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

    test('rendered GitHub Mermaid diagrams keep their frame and hidden source', () => {
        assert.match(okfRenderedFixture, /data-type="mermaid" aria-label="mermaid rendered output container"/);
        let mermaid, diagram, pre;
        const harness = execute((currentHarness) => {
            mermaid = currentHarness.document.createElement('div');
            mermaid.setAttribute('data-type', 'mermaid');
            const hiddenSource = currentHarness.document.createElement('div');
            hiddenSource.className = 'render-plaintext-hidden';
            hiddenSource.hidden = true;
            pre = currentHarness.document.createElement('pre');
            pre.setAttribute('aria-label', 'Raw mermaid code');
            pre.textContent = 'flowchart TD\n    Input --> Memory';
            hiddenSource.appendChild(pre);
            mermaid.appendChild(hiddenSource);
            diagram = currentHarness.document.createElement('iframe');
            mermaid.appendChild(diagram);
            addPre(currentHarness, 'An ordinary preformatted block');
            currentHarness.appendToBody(mermaid);
        }, 'https://github.com/okf-memory/okf-agent-memory/blob/main/README.md');

        assert.equal(harness.document.querySelectorAll('.tm-translate-pre-one').length, 1);
        harness.document.getElementById('tm-translate-all-pre').click();
        assert.equal(mermaid.querySelector('iframe'), diagram);
        assert.equal(mermaid.querySelector('pre'), pre);
        assert.equal(mermaid.getAttribute('translate'), null);
        assert.equal(mermaid.querySelector('[data-tm-translatable-pre-wrapper]'), null);
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
        assert.equal(translatedCells[proseLineIndex].querySelector('.pl-en').textContent, sourceLines[proseLineIndex].text);
        translatedCells[proseLineIndex].querySelector('.pl-en').textContent = '代理程式的對話會在內容視窗關閉時重設。';

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

test('headingless English Mastodon post repairs localized root after hydration, once', () => {
    let app, detail;
    const h = execute(h => {
        h.document.documentElement.setAttribute('lang', 'zh-TW');
        app = h.document.createElement('div');
        app.id = 'mastodon';
        app.className = 'app-holder';
        h.appendToBody(app);
    }, 'https://grapheneos.social/@GrapheneOS/117645038299496084');
    assert.equal(h.document.documentElement.getAttribute('lang'), 'zh-TW');
    detail = h.document.createElement('div');
    detail.className = 'detailed-status';
    const post = h.document.createElement('div');
    post.className = 'status__content__text';
    post.setAttribute('lang', 'en');
    const p = h.document.createElement('p');
    p.textContent = 'The project is working with their partners to improve support and to make the updates available for more devices.';
    post.appendChild(p);
    // The lightweight DOM harness does not aggregate descendant textContent.
    post.textContent = p.textContent;
    detail.appendChild(post);
    app.appendChild(detail);
    h.triggerMutation([detail], { target: app });
    assert.equal(h.document.documentElement.getAttribute('lang'), 'en');
    h.document.documentElement.setAttribute('lang', 'zh-TW');
    h.triggerMutation([detail], { target: app });
    assert.equal(h.document.documentElement.getAttribute('lang'), 'zh-TW');
    assert.equal(post.getAttribute('lang'), 'en');
});

function addMastodonHead(h, locale = 'en', id = '117645038299496084') {
    const head = h.document.head;
    const link = h.document.createElement('link');
    link.setAttribute('type', 'application/activity+json');
    link.setAttribute('href', 'https://grapheneos.social/users/GrapheneOS/statuses/' + id);
    head.appendChild(link);
    const metas = [link];
    for (const [key, value] of [
        ['og:type', 'article'],
        ['og:url', 'https://grapheneos.social/@GrapheneOS/' + id],
        ['og:locale', locale],
    ]) {
        const meta = h.document.createElement('meta');
        meta.setAttribute('property', key);
        meta.setAttribute('content', value);
        head.appendChild(meta);
        metas.push(meta);
    }
    return metas;
}

test('Mastodon English head metadata repairs language before any post renders', () => {
    const h = execute(h => {
        h.document.documentElement.setAttribute('lang', 'zh-TW');
        addMastodonHead(h);
    }, 'https://grapheneos.social/@GrapheneOS/117645038299496084');
    assert.equal(h.document.documentElement.getAttribute('lang'), 'en');
    assert.equal(h.document.querySelector('.detailed-status'), null);
    h.document.documentElement.setAttribute('lang', 'zh-TW');
    const node = h.document.createElement('main');
    h.appendToBody(node);
    h.triggerMutation([node], { target: h.document.body });
    assert.equal(h.document.documentElement.getAttribute('lang'), 'zh-TW');
});

test('Mastodon metadata arriving during HTML parsing repairs the root without waiting for hydration', () => {
    const h = execute(h => {
        h.document.documentElement.setAttribute('lang', 'zh-TW');
    }, 'https://grapheneos.social/@GrapheneOS/117645038299496084');
    assert.equal(h.document.documentElement.getAttribute('lang'), 'zh-TW');
    const nodes = addMastodonHead(h, 'en_US');
    h.triggerMutation(nodes, { target: h.document.head });
    assert.equal(h.document.documentElement.getAttribute('lang'), 'en');
});

test('Chinese, stale and ordinary OG locale metadata do not force English', () => {
    for (const mode of ['chinese', 'stale', 'ordinary']) {
        const h = execute(h => {
            h.document.documentElement.setAttribute('lang', 'zh-TW');
            if (mode === 'ordinary') {
                const meta = h.document.createElement('meta');
                meta.setAttribute('property', 'og:locale');
                meta.setAttribute('content', 'en_US');
                h.document.head.appendChild(meta);
            } else {
                addMastodonHead(h, mode === 'chinese' ? 'zh-TW' : 'en',
                    mode === 'stale' ? '123' : '117645038299496084');
            }
        }, 'https://grapheneos.social/@GrapheneOS/117645038299496084');
        assert.equal(h.document.documentElement.getAttribute('lang'), 'zh-TW', mode);
    }
});
