const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const root = path.join(__dirname, '..');

test('Chromium keeps GitHub code-view line numbers aligned before, during, and after translation', {
    skip: !process.env.CONTROL_BROWSER_BIN && 'Set CONTROL_BROWSER_BIN to a Chromium executable',
}, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-github-translation-'));
    try {
        const fixture = fs.readFileSync(path.join(root, 'tests', 'Translate Preformatted Text',
            'github.com_okf-memory_okf-agent-memory_blob_main_README.md_plain_1.html'), 'utf8');
        const lines = [...fixture.matchAll(
            /<div id="LC(\d+)" class="react-file-line[^"]*" data-testid="code-cell" data-line-number="\d+"[^>]*>([\s\S]*?)<\/div>/g
        )].map((match) => ({ number: Number(match[1]),
            text: match[2].replace(/<[^>]*>/g, '')
                .replace(/&amp;/g, '&').replace(/&gt;/g, '>')
                .replace(/&lt;/g, '<').replace(/&#039;/g, "'") }));
        assert(lines.length >= 200, 'Expected captured GitHub lines');
        const safe = (value) => String(value).replace(/&/g, '&amp;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const numbers = lines.map(({ number }) =>
            '<div class="react-line-number react-code-text" data-line-number="' + number + '">' + number + '</div>').join('');
        const source = lines.map(({ number, text }) =>
            '<div class="react-code-text react-code-line-contents"><div>' +
            '<div class="react-file-line html-div" id="LC' + number +
            '" data-testid="code-cell" data-line-number="' + number +
            '"><span class="pl-en">' + safe(text || ' ') +
            '</span></div></div></div>').join('');
        const userScript = fs.readFileSync(path.join(root, 'src', 'TranslatePreformattedText.user.js'), 'utf8')
            .replace(/<\/script/gi, '<\\/script');
        const check = `
<script>
(async () => {
    const output = document.getElementById('github-browser-result');
    const pause = () => new Promise(resolve => setTimeout(resolve, 100));
    const check = (valid, message) => { if (!valid) throw Error(message); };
    const verifyRows = (label) => {
        const gutter = [...document.querySelectorAll('.react-line-number')];
        const code = [...document.querySelectorAll('.react-code-line-contents')];
        check(gutter.length === ${lines.length}, label + ': missing numbered rows');
        check(code.length === gutter.length, label + ': missing code rows');
        for (let i = 0; i < code.length; i++) {
            const a = gutter[i].getBoundingClientRect();
            const b = code[i].getBoundingClientRect();
            check(Math.abs(a.top - b.top) <= 1, label + ': line ' + (i+1) +
                ' vertical mismatch (' + a.top + ',' + b.top + ')');
            check(Math.abs(a.height - b.height) <= 1, label + ': line ' + (i+1) + ' height mismatch');
        }
    };
    try {
        await pause();
        const original = document.querySelector('.react-code-lines');
        verifyRows('original');
        const button = document.getElementById('tm-translate-all-pre');
        check(button && button.getAttribute('data-floating-available') === 'true', 'translate action missing');
        button.click();
        await pause();
        const translated = document.querySelector('[data-tm-github-code-lines]');
        check(translated && translated !== original, 'converted code column missing');
        check(getComputedStyle(translated.parentElement).display === 'contents',
            'replacement wrapper must not introduce a flex item');
        check(getComputedStyle(translated.querySelector('[data-testid="code-cell"]')).whiteSpace === 'pre',
            'translation must not wrap one source line into many');
        verifyRows('converted');
        const paragraph = translated.querySelector('#LC14') ||
            translated.querySelector('[data-testid="code-cell"]');
        paragraph.textContent = '一段特別長的繁體中文翻譯文字'.repeat(50);
        await pause();
        verifyRows('translated long line');
        button.click();
        await pause();
        check(document.querySelector('.react-code-lines') === original, 'original source must restore');
        verifyRows('restored');
        output.setAttribute('data-status', 'passed');
        output.textContent = 'Line numbers remain aligned through conversion, long translated text, and restoration';
    } catch (error) {
        output.setAttribute('data-status', 'failed');
        output.textContent = String(error.stack || error);
    }
})();
</script>`;
        const html = '<!doctype html><html><head><meta charset="utf-8"><style>' +
            'body { margin:0; font:13px/22px ui-monospace,monospace; }' +
            '.react-code-file-contents { display:flex; align-items:flex-start; width:max-content; }' +
            '.react-line-numbers { width:50px; flex:none; text-align:right; padding-right:8px; box-sizing:border-box; }' +
            '.react-code-lines { flex:1 1 auto; min-width:0; white-space:pre; }' +
            '.react-line-number,.react-code-line-contents { height:22px; line-height:22px; box-sizing:border-box; }' +
            '.react-code-line-contents,.react-file-line { white-space:pre; }' +
            '</style></head><body><div class="react-code-file-contents">' +
            '<div class="react-line-numbers">' + numbers + '</div>' +
            '<div class="react-code-lines">' + source + '</div></div>' +
            '<p id="github-browser-result" data-status="pending">Checking</p>' +
            '<script>' + userScript + '</script>' + check + '</body></html>';
        const file = path.join(dir, 'github-lines.html');
        fs.writeFileSync(file, html);
        const result = spawnSync(process.env.CONTROL_BROWSER_BIN, [
            '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
            '--no-sandbox', '--disable-dev-shm-usage',
            '--user-data-dir=' + path.join(dir, 'profile'), '--virtual-time-budget=5500',
            '--window-size=420,930', '--dump-dom', pathToFileURL(file).href
        ], { encoding: 'utf8', timeout: 30000, maxBuffer: 5 * 1024 * 1024 });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stderr);
        const status = result.stdout.match(/<p id="github-browser-result"[^>]*>[\s\S]*?<\/p>/)?.[0] || 'missing report';
        assert.match(status, /data-status="passed"/, status);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
