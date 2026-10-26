const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { test } = require('node:test');

test('real browser keeps translation inside its horizontal scrollport and renders the dim fullscreen control', {
    skip: !process.env.CONTROL_BROWSER_BIN && 'Set CONTROL_BROWSER_BIN to a Chromium browser executable',
}, () => {
    const root = path.join(__dirname, '..');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-control-browser-'));
    try {
        const scripts = ['TranslatePreformattedText.user.js', 'FullscreenGameView.user.js']
            .map((name) => `<script>${fs.readFileSync(path.join(root, 'src', name), 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`).join('\n');
        // Headless virtual time does not reliably advance compositor frames. Only the frame
        // scheduler is substituted; CSS layout, scrolling, clipping, and hit testing remain native.
        const scheduler = '<script>window.requestAnimationFrame = callback => setTimeout(() => callback(performance.now()), 0);</script>';
        const checks = `<script>
            (async () => {
                const result = document.getElementById('browser-result');
                const frame = () => new Promise(resolve => setTimeout(resolve, 80));
                const assert = (condition, message) => { if (!condition) throw new Error(message); };
                try {
                    await frame();
                    const scroller = document.getElementById('horizontal-scroll');
                    const button = document.getElementById('wide-code').parentElement.querySelector('.tm-translate-pre-one');
                    for (const left of [0, 400, scroller.scrollWidth, 0]) {
                        scroller.scrollLeft = left;
                        // Flush the same captured scroll event without waiting for compositor delivery.
                        scroller.dispatchEvent(new Event('scroll'));
                        await frame();
                        const rect = button.getBoundingClientRect();
                        const outer = scroller.getBoundingClientRect();
                        assert(!button.hidden, 'Translation button must remain visible');
                        assert(rect.left >= outer.left + scroller.clientLeft, 'Translation must be inside the left edge at ' + scroller.scrollLeft + ': ' + rect.left);
                        assert(rect.right <= outer.left + scroller.clientLeft + scroller.clientWidth, 'Translation must be inside the right edge');
                        assert(rect.bottom <= outer.top + scroller.clientTop + scroller.clientHeight, 'Translation must be above the scrollbar');
                        assert(document.elementFromPoint(rect.left + 12, rect.top + 12) === button, 'Translation must be reachable without horizontal scrolling');
                    }
                    button.click();
                    await frame();
                    assert(button.getAttribute('aria-pressed') === 'true', 'Translation should convert');
                    button.click();
                    await frame();
                    assert(button.getAttribute('aria-pressed') === 'false', 'Translation should restore');
                    const fullscreen = document.getElementById('tm-fullscreen-game-view-button');
                    assert(fullscreen && !fullscreen.hidden, 'Fullscreen test button must be available');
                    assert(getComputedStyle(fullscreen).color === 'rgb(153, 153, 153)', 'Fullscreen icon must be dim gray');
                    // Script-generated clicks have no user activation. Explicitly reject the native
                    // API so the real-browser CSS check exercises the fallback deterministically.
                    document.getElementById('test-game').requestFullscreen = () => Promise.reject(new Error('Fallback test'));
                    fullscreen.click();
                    await frame();
                    assert(getComputedStyle(fullscreen).display === 'none', 'No entry or close button should appear while expanded');
                    window.dispatchEvent(new Event('resize'));
                    await frame();
                    assert(getComputedStyle(fullscreen).display === 'none', 'Layout updates must not reveal the expanded-state button');
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                    await frame();
                    assert(getComputedStyle(fullscreen).display !== 'none' && !fullscreen.disabled, 'Escape should restore the entry button');
                    fullscreen.click();
                    await frame();
                    window.dispatchEvent(new PopStateEvent('popstate'));
                    await frame();
                    assert(getComputedStyle(fullscreen).display !== 'none' && !fullscreen.disabled, 'Back should restore the entry button');
                    result.setAttribute('data-test-status', 'passed');
                    result.textContent = 'Clipping, translation, dim entry button, hidden expanded controls, Escape, and Back checks passed';
                } catch (error) {
                    result.setAttribute('data-test-status', 'failed');
                    result.textContent = error.message;
                }
            })();
        </script>`;
        const file = path.join(directory, 'controls.html');
        fs.writeFileSync(file, fs.readFileSync(path.join(root, 'tests/ControlButtons/index.html'), 'utf8')
            .replace('<!-- USERSCRIPT_TEST_INJECTION -->', () => scheduler + scripts + checks));
        const result = spawnSync(process.env.CONTROL_BROWSER_BIN, [
            '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
            `--user-data-dir=${path.join(directory, 'profile')}`, '--virtual-time-budget=5000',
            '--window-size=1100,1000', '--dump-dom', pathToFileURL(file).href,
        ], { encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stderr);
        const report = result.stdout.match(/<p id="browser-result"[^>]*>[\s\S]*?<\/p>/)?.[0] || 'No browser result';
        assert.match(report, /data-test-status="passed"/, report);
    } finally {
        assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
        assert(path.basename(directory).startsWith('tm-control-browser-'));
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
