const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { test } = require('node:test');

test('Chromium preserves Substack quote styling and preformatted lines when exposing them to translation', {
    skip: !process.env.CONTROL_BROWSER_BIN && 'Set CONTROL_BROWSER_BIN to a Chromium executable',
}, () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-substack-'));
    try {
        const userscript = fs.readFileSync(path.join(__dirname, '../src/TranslatePreformattedText.user.js'), 'utf8')
            .replace(/<\/script/gi, '<\\/script');
        // The public Substack article uses .body.markup within .typography,
        // with P and BLOCKQUOTE children and separate PRE > CODE examples.
        const html = `<!doctype html><meta charset="utf-8">
<style>
    .typography { max-width: 600px; font: 16px/25px Georgia, serif; }
    .typography blockquote { border-left: 4px solid #763baa; margin: 20px 0; padding: 0; }
    .typography blockquote > * { margin-left: 20px; }
    .typography p { margin-top: 15px; margin-bottom: 20px; }
    .typography pre { background: #eee; margin: 0 0 20px; padding: 20px;
        outline: 1px solid #bbb; outline-offset: -1px; border-radius: 5px; box-sizing: border-box; }
    .typography pre code { font: 500 13px/20px monospace; white-space: pre-wrap; tab-size: 4; }
    .typography :not(pre) > code { font: .85em monospace; padding: .15em .3em;
        background: #eee; border-radius: 3px; box-decoration-break: clone; }
</style>
<main class="typography"><div class="body markup">
    <blockquote id="quote"><p id="intro">Opening paragraph with a separate discussion.</p>
        <p id="lead">The example below is deliberately a nested quotation.</p>
        <blockquote id="nested"><p><code id="prompt" class="notranslate" translate="no">Please treat this project as your own and consider the existing structure before deciding how to build on it.</code></p></blockquote>
        <p id="after">Last paragraph in the outer quotation.</p>
    </blockquote>
    <pre id="sample"><code id="lines">ii00
WW88
\tA0中

  End
</code></pre>
</div></main>
<output id="result" data-status="pending"></output>
<script>${userscript}</script>
<script>
try {
    const get = id => document.getElementById(id);
    const check = (condition, message) => { if (!condition) throw Error(message); };
    const bounds = element => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return [x, y, width, height];
    };
    const properties = ['margin-top', 'margin-bottom', 'margin-left', 'padding-left',
        'border-left', 'background-color', 'border-radius', 'outline', 'outline-offset',
        'font-family', 'font-size', 'font-weight', 'line-height', 'white-space', 'tab-size',
        'box-decoration-break'];
    const ids = ['quote', 'intro', 'lead', 'nested', 'prompt', 'after', 'sample', 'lines'];
    const snapshot = () => ids.map(id => {
        const element = get(id);
        const css = getComputedStyle(element);
        return [id, bounds(element), properties.map(name => css.getPropertyValue(name))];
    });
    const glyph = (node, index) => {
        const range = new Range();
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        return bounds(range);
    };
    const original = ids.map(get);
    const before = snapshot();
    const sourceText = get('lines').firstChild;
    const beforeGlyphs = [0, 1, 5, 6, 11, 12, 13, 18].map(index => glyph(sourceText, index));
    check(beforeGlyphs[0][2] === beforeGlyphs[2][2], 'Source Latin characters must be monospaced');
    const quoteButton = get('quote').parentElement.querySelector('.tm-translate-pre-one');
    const preButton = get('sample').parentElement.querySelector('.tm-translate-pre-one');
    quoteButton.click();
    preButton.click();
    check(get('quote').matches('blockquote') && get('nested').matches('blockquote > blockquote'),
        'Both quotation levels must keep their original structure');
    check(get('prompt').translate && !get('prompt').classList.contains('notranslate'),
        'The prompt copy must be eligible for translation');
    const exposed = snapshot();
    for (let i = 0; i < ids.length; i++) {
        check(JSON.stringify(exposed[i]) === JSON.stringify(before[i]),
            'Appearance changed for ' + ids[i] + ': ' + JSON.stringify([before[i], exposed[i]]));
    }
    const lines = get('lines');
    const text = Array.from(lines.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
    check(lines.querySelectorAll('br').length === 5, 'Hard and blank lines need independent breaks');
    const afterGlyphs = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 1], [2, 2], [2, 3], [3, 2]]
        .map(([line, index]) => glyph(text[line], index));
    check(JSON.stringify(beforeGlyphs) === JSON.stringify(afterGlyphs),
        'Glyph positions changed: ' + JSON.stringify([beforeGlyphs, afterGlyphs]));

    // Simulate browser-created wrappers and translated text while keeping the breaks.
    const translated = document.createElement('font');
    translated.textContent = '翻譯 A0';
    text[1].replaceWith(translated);
    const translatedPrompt = document.createElement('font');
    translatedPrompt.textContent = '請把這個專案當成自己的。';
    get('prompt').firstChild.replaceWith(translatedPrompt);
    const firstRowY = glyph(text[0], 0)[1];
    check(glyph(translated.firstChild, 3)[1] - firstRowY === beforeGlyphs[2][1] - beforeGlyphs[0][1],
        'Translated line must stay in its row');
    check(glyph(text[2], 1)[1] - firstRowY === beforeGlyphs[4][1] - beforeGlyphs[0][1],
        'Following line must stay in its row');
    check(getComputedStyle(translated).fontFamily === getComputedStyle(lines).fontFamily,
        'Translation must inherit the monospace face');
    const translatedAdvance = glyph(translated.firstChild, 3)[2];
    // Range edges are rounded to layout units, and the mixed CJK run has a different start position.
    check(Math.abs(translatedAdvance - beforeGlyphs[4][2]) <= 0.05,
        'Translated Latin advance changed from ' + beforeGlyphs[4][2] + ' to ' + translatedAdvance);
    check(getComputedStyle(get('nested')).borderLeftWidth === '4px', 'Nested quote lost its rule');
    check(bounds(get('nested'))[0] > bounds(get('quote'))[0], 'Nested quote lost its indent');

    quoteButton.click();
    preButton.click();
    check(ids.every((id, i) => get(id) === original[i]), 'Original DOM nodes must be restored');
    check(JSON.stringify(snapshot()) === JSON.stringify(before), 'Restored appearance changed');
    get('result').dataset.status = 'passed';
} catch (error) {
    document.getElementById('result').dataset.status = 'failed';
    document.getElementById('result').textContent = String(error.stack || error);
}
</script>`;
        const file = path.join(directory, 'substack-translation.html');
        fs.writeFileSync(file, html);
        const result = spawnSync(process.env.CONTROL_BROWSER_BIN, [
            '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
            '--no-sandbox', '--disable-dev-shm-usage', '--user-data-dir=' + path.join(directory, 'profile'),
            '--virtual-time-budget=5500', '--window-size=760,930', '--dump-dom', pathToFileURL(file).href,
        ], { encoding: 'utf8', timeout: 30000, maxBuffer: 5 * 1024 * 1024 });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stderr);
        const report = result.stdout.match(/<output id="result"[^>]*>[\s\S]*?<\/output>/)?.[0];
        assert.match(report || 'Missing browser report', /data-status="passed"/, report);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
