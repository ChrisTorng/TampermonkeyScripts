// Browser integration smoke test for MathJax 2. The GitHub Actions runner
// supplies a headless Chrome binary and access to the pinned MathJax CDN.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const original = fs.readFileSync(path.join(root, 'src', 'MathTranslationGuard.user.js'), 'utf8');
// Enable Plover's site-specific parser in this synthetic file fixture.
// The actual production logic and the document-start timing are unchanged.
const userscript = original.replace(
    "location.hostname === 'blog.plover.com'",
    "location.protocol === 'file:'"
);
assert.notEqual(userscript, original, 'Plover hostname condition was not found');

const html = [
    '<!doctype html>',
    '<html><head><meta charset="utf-8">',
    '<script>' + userscript.replace(/<\/script/gi, '<\\/script') + '</script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.0/MathJax.js?config=TeX-AMS-MML_HTMLorMML"></script>',
    '<script type="text/x-mathjax-config">',
    "MathJax.Hub.Config({tex2jax: {inlineMath: [['!!','!!']]}});",
    '</script>',
    '<script>',
    "window.addEventListener('load', function () {",
    "  const hub = window.MathJax && window.MathJax.Hub;",
    "  if (!hub) { document.documentElement.dataset.smoke = 'mathjax-not-loaded'; return; }",
    '  hub.Queue(function () {',
    "    const rendered = document.querySelectorAll('.MathJax');",
    '    const source = document.querySelectorAll(\'script[type="math/tex"]\');',
    "    const prose = document.querySelector('#fixture').textContent;",
    '    document.documentElement.dataset.smoke = rendered.length >= 3 && source.length === 3',
    "      && prose.includes('尼姆堆大小') && prose.includes('結束。') && !prose.includes('!!')",
    "      ? 'passed' : 'rendered-' + rendered.length + '-sources-' + source.length;",
    '  });',
    '});',
    '</script>',
    '</head><body>',
    '<p id="fixture">Nim size !!\\{1, 3, 4, 8\\}!! ends. Next !!\\omega!! token.</p>',
    '<h2>!!\\omega\\cdot 2!!</h2>',
    '<script>',
    'Promise.resolve().then(function () {',
    "  const paragraph = document.getElementById('fixture');",
    "  for (const span of paragraph.querySelectorAll(':scope > span:not(.math-slot)')) {",
    "    span.textContent = span.textContent.replace('Nim size', '尼姆堆大小').replace(' ends.', ' 結束。').replace(' Next ', ' 下一個 ');",
    '  }',
    '});',
    '</script>',
    '</body></html>',
].join('\n');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mathjax-smoke-'));
const fixture = path.join(directory, 'fixture.html');
fs.writeFileSync(fixture, html, 'utf8');
const chrome = process.env.CHROME_BIN || 'google-chrome';
try {
    const result = spawnSync(chrome, [
        '--headless=new', '--no-sandbox', '--disable-gpu',
        '--disable-dev-shm-usage', '--no-first-run', '--virtual-time-budget=18000',
        '--dump-dom', 'file://' + fixture,
    ], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 45000 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr.slice(-3000));
    const outcome = (result.stdout.match(/data-smoke="([^"]+)"/) || [])[1];
    assert.equal(outcome, 'passed', 'MathJax 2 browser smoke: ' + (outcome || 'no outcome') +
        '\n' + result.stdout.slice(-2500) + '\n' + result.stderr.slice(-1000));
    process.stdout.write('MathJax 2 browser smoke test passed (3 rendered formulas).\n');
} finally {
    fs.rmSync(directory, { recursive: true, force: true });
}
