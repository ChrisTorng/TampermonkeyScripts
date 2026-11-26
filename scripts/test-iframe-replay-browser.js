const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { test } = require('node:test');

test('production replay helpers preserve a large interactive document in an opaque-origin iframe', {
    skip: !process.env.CONTROL_BROWSER_BIN && 'Set CONTROL_BROWSER_BIN to Chromium'
}, () => {
    const source = fs.readFileSync(path.join(__dirname, '../src/TranslatePreformattedText.user.js'), 'utf8');
    const start = source.indexOf('    const readerReplayKey =');
    const end = source.indexOf('    const isReaderDocument =', start);
    assert(start >= 0 && end > start);
    const helpers = source.slice(start, end);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-replay-'));
    try {
        const fixture = async function () {
            const out = document.getElementById('result');
            const check = (ok, why) => { if (!ok) throw Error(why); };
            try {
                const data = 'abcdefghijklmnopqrstuvwxyz0123456789'.repeat(153600).slice(0, 5529565);
                const source = '<!doctype html><html lang="en"><head><style>:root{--ink:#3987e5}svg path{stroke:var(--ink);fill:none}</style></head><body><div id="app"></div><script>const DATA=' +
                    JSON.stringify(data) + ';</' + 'script><script>(' + (function () {
                        const app = document.getElementById('app');
                        app.innerHTML = '<p>Proof progress</p><svg viewBox="0 0 100 50"><path d="M0 45L90 5" stroke-width="3"/></svg><button>Details</button><output></output>';
                        app.querySelector('button').onclick = () => {
                            location.hash = 'detail';
                            app.querySelector('output').textContent = DATA.length;
                        };
                        addEventListener('message', async e => {
                            if (e.source !== parent || e.data !== 'exercise') return;
                            app.querySelector('button').click();
                            let isolated = false, blocked = false;
                            try { void parent.document.body; } catch (_) { isolated = true; }
                            try { await fetch('data:text/plain,blocked'); } catch (_) { blocked = true; }
                            parent.postMessage({ test: true, isolated, blocked,
                                paint: getComputedStyle(app.querySelector('path')).stroke,
                                text: app.querySelector('output').textContent, hash: location.hash }, '*');
                        });
                    }).toString() + ')();</' + 'script></body></html>';
                const packed = await readerPackReplay(source, 'response');
                check(readerValidReplay(packed) && packed.encoding === 'gzip-base64', 'compression');
                check(await readerUnpackReplay(packed) === source, 'lossless unpacking');
                const frame = document.createElement('iframe');
                frame.setAttribute('sandbox', 'allow-scripts');
                const token = 'fixture-replay-token';
                const observed = new Promise((resolve, reject) => {
                    addEventListener('message', e => {
                        if (e.source !== frame.contentWindow || e.origin !== 'null') return;
                        if (e.data?.channel === readerReplayChannel && e.data.token === token &&
                            e.data.graphics === 1 && e.data.controls === 1) {
                            frame.contentWindow.postMessage('exercise', '*');
                        }
                        if (e.data?.test === true) resolve(e.data);
                    });
                    setTimeout(() => reject(Error('replay timeout')), 12000);
                });
                frame.srcdoc = readerReplayDocument(source, token);
                document.body.appendChild(frame);
                const result = await observed;
                check(result.isolated && result.blocked, 'sandbox/CSP');
                check(result.paint === 'rgb(57, 135, 229)', 'CSS color');
                check(result.text === '5529565' && result.hash === '#detail', 'click/hash/data');
                frame.remove();
                out.dataset.status = 'passed';
            } catch (error) {
                for (const frame of document.querySelectorAll('iframe')) frame.remove();
                out.dataset.status = 'failed';
                out.textContent = String(error.stack || error);
            }
        };
        const html = '<!doctype html><meta charset="utf-8"><output id="result" data-status="pending"></output><script>' +
            (helpers + '\n(' + fixture.toString() + ')();').replace(/<\/script/gi, '<\\/script') + '</script>';
        const file = path.join(directory, 'replay.html');
        fs.writeFileSync(file, html);
        const run = spawnSync(process.env.CONTROL_BROWSER_BIN, [
            '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
            '--no-sandbox', '--disable-dev-shm-usage', '--user-data-dir=' + path.join(directory, 'profile'),
            '--virtual-time-budget=20000', '--dump-dom', pathToFileURL(file).href,
        ], { encoding: 'utf8', timeout: 45000, maxBuffer: 24 * 1024 * 1024 });
        assert.ifError(run.error);
        assert.equal(run.status, 0, run.stderr);
        const report = run.stdout.match(/<output id="result"[^>]*>[\s\S]*?<\/output>/)?.[0];
        assert.match(report || 'Missing browser report', /data-status="passed"/, report);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
