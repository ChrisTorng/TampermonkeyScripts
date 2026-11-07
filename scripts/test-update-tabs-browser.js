const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('one click requests five distinct Tampermonkey update tabs in Chromium', {
    skip: !process.env.CONTROL_BROWSER_BIN && 'Set CONTROL_BROWSER_BIN to a Chromium executable'
}, () => {
    const root = path.join(__dirname, '..');
    const htmlFile = path.join(root, 'tests', 'SharedFloatingMenuUpdates', 'index.html');
    const original = fs.readFileSync(htmlFile, 'utf8');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-bulk-update-'));
    try {
        const intercept = '<script>window.__opened=[]; window.open=(...args)=>{window.__opened.push(args);return {}};</script>';
        const verify = `<script>
            const urls = Array.from(document.querySelectorAll('#links a'), a => a.href);
            document.getElementById('open-all').click();
            const result = document.getElementById('status');
            const opened = window.__opened.map(entry => entry[0]);
            const valid = opened.length === 5 && new Set(opened).size === 5
                && urls.length === 5 && urls.every((url, i) => url === opened[i])
                && opened.every(url => url.startsWith('https://github.com/ChrisTorng/TampermonkeyScripts/raw/'));
            result.setAttribute('data-bulk-test', valid ? 'passed' : 'failed');
        </script>`;
        const html = original.replace('<script>\n(() => {', intercept + '<script>\n(() => {')
            .replace('</body>', verify + '</body>');
        const file = path.join(directory, 'launcher.html');
        fs.writeFileSync(file, html);
        const browser = spawnSync(process.env.CONTROL_BROWSER_BIN, [
            '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
            `--user-data-dir=${path.join(directory, 'profile')}`, '--dump-dom',
            pathToFileURL(file).href + '?ref=fix/openssh-translate-menu-overflow-20261107',
        ], { encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
        assert.ifError(browser.error);
        assert.equal(browser.status, 0, browser.stderr);
        assert.match(browser.stdout, /data-bulk-test="passed"/);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
