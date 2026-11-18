const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { test } = require('node:test');

test('real browser keeps translation inside its horizontal scrollport and renders the compact fullscreen control', {
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
                    // OpenSSH changes its line wrapping when 譯 is clicked.
                    // The floating menu must dock identically both before and after.
                    const translationMenu = document.getElementById('tm-shared-floating-menu');
                    document.body.style.minHeight = '2800px';
                    window.scrollTo({ top: 650, behavior: 'instant' });
                    window.dispatchEvent(new Event('scroll'));
                    await frame();
                    assert(translationMenu && Math.abs(translationMenu.getBoundingClientRect().top) < 2,
                        'Before translation the menu should already dock to the top');
                    button.click();
                    await frame();
                    assert(button.getAttribute('aria-pressed') === 'true', 'Translation should convert');
                    assert(Math.abs(translationMenu.getBoundingClientRect().top) < 2,
                        'Translation must not be required before the menu docks');
                    button.click();
                    await frame();
                    assert(button.getAttribute('aria-pressed') === 'false', 'Translation should restore');
                    document.body.style.minHeight = '';
                    window.scrollTo({ top: 0, behavior: 'instant' });
                    window.dispatchEvent(new Event('scroll'));
                    await frame();
                    // Reproduce a legacy document wider than the viewport (as on OpenSSH).
                    // A fixed menu follows horizontal scrolling without contributing to scrollWidth.
                    const menu = document.getElementById('tm-shared-floating-menu');
                    assert(menu && !menu.hidden, 'Floating menu should be available with translation controls');
                    document.body.style.minWidth = '1800px';
                    await frame();
                    const initialPageWidth = document.documentElement.scrollWidth;
                    for (const left of [0, 200, 500, 0]) {
                        window.scrollTo({ left, top: 0, behavior: 'instant' });
                        window.dispatchEvent(new Event('scroll'));
                        await frame();
                        const menuRect = menu.getBoundingClientRect();
                        const visibleRight = window.visualViewport
                            ? window.visualViewport.offsetLeft + window.visualViewport.width
                            : window.innerWidth;
                        assert(getComputedStyle(menu).position === 'fixed',
                            'Menu should use fixed layout while unzoomed');
                        assert(Math.abs(menuRect.right - visibleRight) < 2,
                            'Menu must stay at the visible right edge after horizontal scroll: ' + menuRect.right);
                        assert(document.documentElement.scrollWidth === initialPageWidth,
                            'Menu must not grow page scrollWidth while tracking horizontal scroll');
                    }
                    // In particular, the menu must remain visible on tall
                    // legacy-format documents while the page scrolls vertically.
                    document.body.style.minHeight = '3000px';
                    for (const top of [0, 140, 850, 1400, 0]) {
                        window.scrollTo({ left: 0, top, behavior: 'instant' });
                        window.dispatchEvent(new Event('scroll'));
                        await frame();
                        const rect = menu.getBoundingClientRect();
                        const expectedTop = window.visualViewport.offsetTop + Math.max(70 - top, 0);
                        assert(Math.abs(rect.top - expectedTop) < 2,
                            'Menu must remain vertically visible after page scroll: scrollY=' +
                                window.scrollY + ', top=' + rect.top + ', expected=' + expectedTop);
                        assert(document.documentElement.scrollWidth === initialPageWidth,
                            'Vertical scrolling must not grow page width');
                    }
                    document.body.style.minHeight = '';
                    document.body.style.minWidth = '';
                    // Scroll the game into view to check that its CSS-anchored control
                    // follows the media rather than sticking to the viewport.
                    document.getElementById('test-game').scrollIntoView({ block: 'center', behavior: 'instant' });
                    window.dispatchEvent(new Event('scroll'));
                    await frame();
                    const fullscreen = document.getElementById('tm-fullscreen-game-view-button');
                    assert(fullscreen && !fullscreen.hidden, 'Fullscreen test button must be available');
                    assert(getComputedStyle(fullscreen).color.includes('170, 180, 190'), 'Fullscreen icon should be intentionally muted');
                    assert(getComputedStyle(fullscreen).backgroundColor === 'rgba(0, 0, 0, 0)', 'Fullscreen button must have no background fill');
                    assert(getComputedStyle(fullscreen).boxShadow === 'none', 'Fullscreen button must have no shadow');
                    assert(getComputedStyle(fullscreen).position === 'absolute', 'Fullscreen must use CSS media-local positioning');
                    assert(getComputedStyle(fullscreen).width === '38px', 'Fullscreen width must match the menu');
                    assert(getComputedStyle(fullscreen).height === '32px', 'Fullscreen height must match the menu');
                    const blockRect = document.getElementById('test-game').getBoundingClientRect();
                    assert(fullscreen.getBoundingClientRect().bottom <= blockRect.top + 1,
                        'Fullscreen entry belongs above the canvas, not at the browser/menu corner');
                    const offset = fullscreen.getBoundingClientRect().bottom - blockRect.top;
                    window.scrollBy({top: 140, behavior:'instant'});
                    await frame();
                    assert(Math.abs((fullscreen.getBoundingClientRect().bottom -
                        document.getElementById('test-game').getBoundingClientRect().top) - offset) < 2,
                        'Full screen glyph must scroll with media without lag or jitter');
                    assert(!fullscreen.hidden, 'Offscreen entry must never be artificially hidden');
                    // Script-generated clicks have no user activation. Explicitly reject the native
                    // API so the real-browser CSS check exercises the fallback deterministically.
                    document.getElementById('test-game').requestFullscreen = () => Promise.reject(new Error('Fallback test'));
                    document.body.style.minHeight = '1800px';
                    document.documentElement.style.scrollBehavior = 'smooth';
                    window.scrollTo({ top: 300, behavior: 'instant' });
                    scroller.scrollLeft = 175;
                    await frame();
                    const originalScroll = { x: window.scrollX, y: window.scrollY, code: scroller.scrollLeft };
                    fullscreen.click();
                    await frame();
                    assert(getComputedStyle(fullscreen).display === 'none', 'Entry button should disappear during fallback');
                    assert(!document.getElementById('tm-fullscreen-game-view-exit-button'),
                        'History Back replaces the fallback × overlay.');
                    window.dispatchEvent(new Event('resize'));
                    await frame();
                    assert(getComputedStyle(fullscreen).display === 'none', 'Layout updates must not reveal the expanded-state entry');
                    window.scrollTo({ top: 0, behavior: 'instant' });
                    window.dispatchEvent(new PopStateEvent('popstate'));
                    await frame();
                    assert(getComputedStyle(fullscreen).display !== 'none' && !fullscreen.disabled,
                        'Back should restore the entry button without any close icon');
                    assert(window.scrollX === originalScroll.x && window.scrollY === originalScroll.y, 'Exit must restore the pre-entry page scroll position');
                    assert(scroller.scrollLeft === originalScroll.code, 'Other page scrollers must stay unchanged');
                    fullscreen.click();
                    await frame();
                    window.scrollTo({ top: 0, behavior: 'instant' });
                    window.dispatchEvent(new PopStateEvent('popstate'));
                    await frame();
                    assert(getComputedStyle(fullscreen).display !== 'none' && !fullscreen.disabled, 'Back should restore the entry button');
                    assert(window.scrollY === originalScroll.y, 'Back must restore the pre-entry page scroll position');
                    result.setAttribute('data-test-status', 'passed');
                    result.textContent = 'Clipping, translation, outside media entry, no overlay ×, and Back restoration checks passed';
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


test('Nitter clipped gallery: poster and video share a visible media-anchored fullscreen corner', {
    skip: !process.env.CONTROL_BROWSER_BIN && 'Set CONTROL_BROWSER_BIN to a Chromium browser executable',
}, () => {
    const root = path.join(__dirname, '..');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-nitter-fullscreen-'));
    try {
        // The file:// fixture must emulate the Nitter hostname to exercise
        // the exact Nitter-specific branch; all remaining code is unchanged.
        const source = fs.readFileSync(path.join(root, 'src', 'FullscreenGameView.user.js'), 'utf8');
        const flag = "const isNitter = window.location.hostname === 'nitter.tiekoetter.com';";
        assert(source.includes(flag));
        const nitterScript = source.replace(flag, 'const isNitter = true;')
            .replace(/<\/script/gi, '<\\/script');
        const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">'
            + '<style>body{margin:0;min-height:2400px;font:16px sans-serif;background:#eee}'
            + '.status-el{margin:90px 12px 0;padding:8px;min-height:670px;background:#ddd}'
            + '.status-body{padding:4px}.status-content{margin-top:60px}'
            + '.attachments{margin-top:70px}.gallery-video{overflow:hidden}'
            + '.attachment{overflow:hidden;position:relative;width:340px;height:230px;background:#000}'
            + '.attachment img,.attachment video{display:block;width:100%;height:100%;object-fit:contain}'
            + '</style></head><body>'
            + '<section class="status-el" id="tweet"><div class="status-body">'
            + '<div>Tweet author</div><div class="status-content media-body">Nitter preview'
            + '<div class="attachments"><div class="gallery-video"><div class="attachment video-container" id="clip">'
            + '<img id="poster" alt="video preview"></div></div></div></div></div></section>'
            + '<p id="nitter-check" data-test-status="pending"></p>'
            + '<script>window.requestAnimationFrame = fn => setTimeout(() => fn(performance.now()), 0);</script>'
            + '<script>' + nitterScript + '</script>'
            + '<script>(async()=>{const out=document.getElementById("nitter-check");'
            + 'const wait=()=>new Promise(r=>setTimeout(r,70));'
            + 'const check=(ok,m)=>{if(!ok)throw Error(m)};'
            + 'try{await wait();'
            + 'const clip=document.getElementById("clip"),tweet=document.getElementById("tweet");'
            + 'const buttons=document.querySelectorAll(".tm-fullscreen-game-view-button");'
            + 'check(buttons.length===1,"Poster must have exactly one fullscreen icon");'
            + 'const btn=buttons[0];check(btn.parentElement===tweet,"Icon must anchor outside clipped gallery");'
            + 'let r=btn.getBoundingClientRect(),c=clip.getBoundingClientRect();'
            + 'check(r.bottom<=c.top+2,"Icon must be above media, not inside clipped media");'
            + 'check(document.elementFromPoint(r.left+20,r.top+16)===btn,"Icon must actually be visible and clickable");'
            + 'const offset=r.bottom-c.top;'
            + 'window.scrollBy({top:100,behavior:"instant"});await wait();'
            + 'r=btn.getBoundingClientRect();c=clip.getBoundingClientRect();'
            + 'check(Math.abs((r.bottom-c.top)-offset)<2,"Icon must scroll together with media without jitter");'
            + 'const video=document.createElement("video");video.id="video";video.poster="poster.jpg";'
            + 'document.getElementById("poster").remove();clip.insertBefore(video,clip.firstChild);'
            + 'await wait();await wait();'
            + 'check(document.querySelectorAll(".tm-fullscreen-game-view-button").length===1,"Video replacement duplicates button");'
            + 'check(document.querySelector(".tm-fullscreen-game-view-button")===btn,"Video replacement must retain same button");'
            + 'check(btn.parentElement===tweet,"After playing, button must remain outside clipping");'
            + 'r=btn.getBoundingClientRect();c=clip.getBoundingClientRect();'
            + 'check(document.elementFromPoint(r.left+20,r.top+16)===btn,"Video button must remain clickable");'
            + 'out.dataset.testStatus="passed";out.textContent="Nitter poster, video, clipping and scroll passed";'
            + '}catch(e){out.dataset.testStatus="failed";out.textContent=e.message}'
            + '})();</script></body></html>';
        const file = path.join(directory, 'nitter-clipping.html');
        fs.writeFileSync(file, html);
        const result = spawnSync(process.env.CONTROL_BROWSER_BIN, [
            '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
            '--no-sandbox',
            '--user-data-dir=' + path.join(directory, 'profile'),
            '--virtual-time-budget=5000', '--window-size=900,1000',
            '--dump-dom', pathToFileURL(file).href,
        ], {encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
        assert.ifError(result.error);
        assert.equal(result.status,0,result.stderr);
        const report = result.stdout.match(/<p id="nitter-check"[^>]*>[\s\S]*?<\/p>/)?.[0] || 'No Nitter browser result';
        assert.match(report,/data-test-status="passed"/,report);
    } finally {
        fs.rmSync(directory,{recursive:true,force:true});
    }
});
