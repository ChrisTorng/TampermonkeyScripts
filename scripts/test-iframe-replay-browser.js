const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const { test } = require('node:test');

test('production replay helpers preserve a large interactive document in an opaque-origin iframe', {
    skip: !process.env.CONTROL_BROWSER_BIN && 'Set CONTROL_BROWSER_BIN to Chromium'
}, async () => {
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
                // The original artifact has 5.53M characters of structured data,
                // not an artificially tiny compressed repetitive string.
                const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
                let seed = 0x83a21f7d;
                const chars = new Array(5529565);
                for (let i = 0; i < chars.length; i++) {
                    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
                    chars[i] = alphabet[seed & 63];
                }
                const data = chars.join('');
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
                check(packed.data.length > 3 * 1024 * 1024, 'realistic compressed payload');
                const store = new Map();
                globalThis.GM_setValue = (k, v) => {
                    if (v.data?.length > 192 * 1024) throw Error('single value quota');
                    store.set(k, v);
                };
                globalThis.GM_getValue = (k, fallback) => store.get(k) ?? fallback;
                globalThis.GM_deleteValue = k => store.delete(k);
                const manifest = await readerSaveChunks('fixture', packed);
                check(manifest.chunks > 16, 'chunk count');
                const restored = await readerLoadChunks('fixture', manifest);
                check(restored && await readerUnpackReplay(restored) === source, 'chunk round trip');
                await readerDeleteChunks('fixture', manifest);
                check(store.size === 0, 'chunk cleanup');
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
                frame.srcdoc = readerReplayDocument(await readerUnpackReplay(restored), token);
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
        // Virtual-time dump-dom can finish before CompressionStream's worker
        // returns. Use Chrome's debugging pipe and wait for the real result.
        const chrome = spawn(process.env.CONTROL_BROWSER_BIN, [
            '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
            '--no-sandbox', '--disable-dev-shm-usage', '--user-data-dir=' + path.join(directory, 'profile'),
            '--remote-debugging-pipe', 'about:blank'
        ], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
        let stderr = '', buffer = '', sequence = 0;
        const pending = new Map();
        chrome.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-12000); });
        chrome.stdio[4].on('data', chunk => {
            buffer += chunk.toString();
            let index;
            while ((index = buffer.indexOf('\0')) >= 0) {
                const raw = buffer.slice(0, index);
                buffer = buffer.slice(index + 1);
                if (!raw) continue;
                const message = JSON.parse(raw);
                const waiter = pending.get(message.id);
                if (!waiter) continue;
                pending.delete(message.id);
                clearTimeout(waiter.timer);
                if (message.error) waiter.reject(Error(JSON.stringify(message.error)));
                else waiter.resolve(message.result);
            }
        });
        function command(method, params = {}, sessionId) {
            const id = ++sequence;
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    pending.delete(id);
                    reject(Error('Chrome command timeout: ' + method + '\n' + stderr));
                }, 8000);
                pending.set(id, { resolve, reject, timer });
                chrome.stdio[3].write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
            });
        }
        try {
            const { targetId } = await command('Target.createTarget', { url: 'about:blank' });
            const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true });
            await command('Page.enable', {}, sessionId);
            await command('Page.navigate', { url: pathToFileURL(file).href }, sessionId);
            let report;
            const deadline = Date.now() + 20000;
            while (Date.now() < deadline) {
                const reply = await command('Runtime.evaluate', {
                    expression: 'document.getElementById("result")?.outerHTML || ""',
                    returnByValue: true
                }, sessionId);
                report = reply.result?.value;
                if (report && /data-status="(?:passed|failed)"/.test(report)) break;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            assert.match(report || 'Missing browser report', /data-status="passed"/, (report || '') + '\n' + stderr);
        } finally {
            const closed = new Promise(resolve => chrome.once('close', resolve));
            chrome.kill('SIGTERM');
            await closed;
            for (const waiter of pending.values()) clearTimeout(waiter.timer);
        }
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
