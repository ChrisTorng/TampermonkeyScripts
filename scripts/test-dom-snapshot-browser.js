const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const { test } = require('node:test');

test('generic snapshot captures actual browser DOM before and after a page rewrite', {
    skip: !process.env.CONTROL_BROWSER_BIN && 'Set CONTROL_BROWSER_BIN to a Chromium executable'
}, () => {
    const userscript = fs.readFileSync(
        path.join(__dirname, '..', 'src', 'PageDomSnapshot.user.js'), 'utf8'
    );
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-dom-snapshot-'));
    try {
        const page = [
            '<!doctype html><html lang="en" translate="no"><head>',
            '<meta name="google" content="notranslate">',
            '<script>',
            'window.__downloads = [];',
            'URL.createObjectURL = (blob) => { window.__lastBlob = blob; return "blob:mock-snapshot"; };',
            'URL.revokeObjectURL = () => {};',
            'HTMLAnchorElement.prototype.click = function () {',
            '  if (this.download) window.__downloads.push(this.download);',
            '};',
            '</script>',
            '<script>', userscript, '</script>',
            '</head><body><main class="notranslate" translate="no">',
            '<h1>Original English heading</h1></main>',
            '<script>',
            'document.addEventListener("DOMContentLoaded", async () => {',
            '  const button = document.querySelector("#tm-dom-snapshot-control button");',
            '  if (!button) { document.documentElement.dataset.snapshotTest = "missing-button"; return; }',
            '  button.click();',
            '  const first = await window.__lastBlob.text();',
            '  const firstDoc = new DOMParser().parseFromString(first, "text/html");',
            '  const firstValid = firstDoc.querySelector("main")?.textContent.trim() === "Original English heading"',
            '    && first.includes(\'translate="no"\')',
            '    && first.includes("blockingMarkerCount")',
            '    && !firstDoc.querySelector("#tm-dom-snapshot-control");',
            '  const main = document.querySelector("main");',
            '  main.textContent = "Replaced English heading";',
            '  button.click();',
            '  const second = await window.__lastBlob.text();',
            '  const secondDoc = new DOMParser().parseFromString(second, "text/html");',
            '  const secondValid = secondDoc.querySelector("main")?.textContent === "Replaced English heading"',
            '    && secondDoc.querySelector("#tm-dom-snapshot-control") === null',
            '    && window.__downloads.length === 2',
            '    && window.__downloads[0] !== window.__downloads[1];',
                       '  document.documentElement.dataset.snapshotTest = firstValid && secondValid ? "passed" : "failed";',
            '});',
            '</script>',
            '</body></html>'
        ].join('\n');
        const file = path.join(temp, 'fixture.html');
        fs.writeFileSync(file, page);
        const result = spawnSync(process.env.CONTROL_BROWSER_BIN, [
            '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run',
            '--no-default-browser-check', '--disable-dev-shm-usage',
            '--virtual-time-budget=2000', `--user-data-dir=${path.join(temp, 'profile')}`,
            '--dump-dom', pathToFileURL(file).href
        ], { encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /data-snapshot-test="passed"/);
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
});
