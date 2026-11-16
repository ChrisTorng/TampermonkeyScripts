const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createHarness } = require('./dom-harness');

const script = fs.readFileSync(path.join(__dirname, '../src/TranslationDiagnostics.user.js'), 'utf8');

function run(url, setup = () => {}) {
    const harness = createHarness({ url });
    setup(harness);
    vm.runInNewContext(script, harness.context);
    return harness;
}

test('diagnostics remain inert on every ordinary URL', () => {
    const h = run('https://www.perplexity.ai/hub/blog/perplexity-decider');
    assert.equal(h.document.getElementById('tm-translation-diag'), null);
    assert.equal(h.document.getElementById('tm-translation-diag-report'), null);
});

test('diagnostics expose ancestor translation opt-outs without article content', () => {
    const secret = 'PERSONAL-ARTICLE-TEXT-NOT-TO-COPY';
    const h = run('https://www.perplexity.ai/hub/blog/perplexity-decider?tm_translation_diag=1&token=private', (harness) => {
        harness.document.documentElement.setAttribute('lang', 'en-GB');
        harness.document.documentElement.setAttribute('translate', 'no');
        const main = harness.document.createElement('main');
        const region = harness.document.createElement('div');
        region.setAttribute('translate', 'no');
        const article = harness.document.createElement('article');
        const h1 = harness.document.createElement('h1');
        h1.textContent = 'Public science research';
        article.appendChild(h1);
        for (let n = 0; n < 4; n++) {
            const p = harness.document.createElement('p');
            p.textContent = (secret + ' The article contains substantial narrative prose. ').repeat(3);
            article.appendChild(p);
        }
        region.appendChild(article);
        main.appendChild(region);
        harness.appendToBody(main);
    });
    const button = h.document.getElementById('tm-translation-diag');
    assert(button);
    button.click();
    const area = h.document.querySelector('#tm-translation-diag-report textarea');
    assert(area, 'an in-page report should be available without developer tools');
    const raw = area.value;
    const report = JSON.parse(raw);
    assert.equal(report.page, 'https://www.perplexity.ai/hub/blog/perplexity-decider');
    assert.equal(report.snapshots[0].html.translate, 'no');
    assert(report.snapshots[0].articles.some(a =>
        a.ancestorChain.some(element => element.tag === 'DIV' && element.translate === 'no')));
    assert(!raw.includes(secret));
    assert(!raw.includes('token=private'));
});

test('diagnostics recognize a readable app without changing translation attributes', () => {
    const h = run('https://sample.example/search?q=secret&tm_translation_diag=1', (harness) => {
        harness.document.documentElement.setAttribute('translate', 'no');
        const main = harness.document.createElement('main');
        const form = harness.document.createElement('input');
        main.appendChild(form);
        harness.appendToBody(main);
    });
    const button = h.document.getElementById('tm-translation-diag');
    assert(button);
    assert.equal(h.document.documentElement.getAttribute('translate'), 'no');
    button.click();
    const report = JSON.parse(h.document.querySelector('#tm-translation-diag-report textarea').value);
    assert.equal(report.snapshots[0].articles[0].paragraphCount, 0);
    assert.equal(h.document.documentElement.getAttribute('translate'), 'no');
});
