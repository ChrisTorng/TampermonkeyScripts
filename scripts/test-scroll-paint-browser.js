const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

test('Chromium hides markers for paint-clipped and covered scroll menus', {
    skip: !process.env.CONTROL_BROWSER_BIN && 'Set CONTROL_BROWSER_BIN to a Chromium executable'
}, () => {
    const root = path.join(__dirname, '..');
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-scroll-paint-'));
    try {
        const userscript = fs.readFileSync(path.join(root, 'src', 'ResponsiveScrollIndicator.user.js'), 'utf8')
            .replace(/<\/script/gi, '<\\/script');
        const html = [
            '<!doctype html><html><head><meta charset="utf-8"><style>',
            'html,body{margin:0;background:#eee} body{min-height:1800px} #article{padding-top:700px}',
            '#toc{position:fixed;z-index:2000;top:160px;left:50px;width:540px;height:440px;clip-path:inset(0 0 100% 0);background:#111}',
            '#toc.open{clip-path:none}',
            '#scrollport{position:absolute;top:60px;left:20px;width:480px;height:330px;overflow-y:auto;background:#181818;color:white}',
            '#scrollcontent{height:1400px}',
            '#toc.contents-collapsed #scrollcontent{visibility:hidden}',
            '#cover{display:none;position:fixed;z-index:3000;top:220px;left:60px;height:160px;width:520px;background:#eee}',
            '#cover.visible{display:block}',
            '</style></head><body><main id="article">A long page</main>',
            '<div id="toc"><div id="scrollport"><div id="scrollcontent">Table of contents</div></div></div>',
            '<div id="cover"></div><p id="browser-result">Pending</p>',
            '<script>window.__tmErrors=[];window.addEventListener("error", e=>window.__tmErrors.push(e.message));window.requestAnimationFrame = callback => setTimeout(() => callback(performance.now()), 0);</script>',
            '<script>' + userscript + '</script>',
            '<script>',
            '(async () => {',
            '  const output=document.getElementById("browser-result");',
            '  const delay=()=>new Promise(resolve=>setTimeout(resolve,200));',
            '  const verify=(condition,message)=>{if(!condition)throw new Error(message)};',
            '  const marker=()=>document.querySelector(".tm-scroll-indicator:not(.tm-root)");',
            '  try {',
            '    await delay();',
            '    const toc=document.getElementById("toc"), cover=document.getElementById("cover");',
            '    const scroller=document.getElementById("scrollport");',
            '    const pageMarker=document.getElementById("tm-scroll-indicator-root");',
            '    verify(marker()&&pageMarker,"Expected both marker nodes");',
            '    verify(scroller.scrollHeight>scroller.clientHeight,"Menu stays scrollable when clipped");',
            '    verify(scroller.getBoundingClientRect().height>300,"Menu retains geometry when clipped");',
            '    verify(marker().style.display==="none","Paint-clipped menu must have no marker: "+JSON.stringify({display:marker().style.display,clip:getComputedStyle(toc).clipPath,rect:scroller.getBoundingClientRect().toJSON(),v:window.visualViewport&&{scale:visualViewport.scale,offsetLeft:visualViewport.offsetLeft,offsetTop:visualViewport.offsetTop},hit:document.elementFromPoint(534,270)?.outerHTML.slice(0,120),marker:marker().outerHTML.slice(0,400),root:pageMarker.outerHTML.slice(0,400),errors:window.__tmErrors}));',
            '    verify(pageMarker.style.display!=="none","Page marker remains visible");',
            '    toc.classList.add("open"); await delay();',
            '    verify(marker().style.display!=="none","Expanded menu must show marker");',
            '    verify(getComputedStyle(marker().querySelector(".tm-viewport")).backgroundImage.includes("205, 208, 212"),"Nested marker must use neutral gray instead of orange");',
            '    verify(getComputedStyle(pageMarker.querySelector(".tm-viewport")).backgroundImage.includes("205, 208, 212"),"Outer marker must use the same neutral gray");',
            '    toc.classList.add("contents-collapsed"); await delay();',
            '    verify(marker().style.display==="none","A blank but hit-testable scrollport must not display a marker");',
            '    toc.classList.remove("contents-collapsed"); await delay();',
            '    verify(marker().style.display!=="none","Visible list entries must restore the inner marker");',
            '    const openTop=Number.parseFloat(marker().style.top);',
            '    const openHeight=Number.parseFloat(marker().style.height);',
            '    verify(openHeight>200,"Open menu must have a substantial marker");',
            '    cover.classList.add("visible"); await delay();',
            '    verify(Number.parseFloat(marker().style.top)>openTop+100,"Overlay must clip marker top");',
            '    verify(Number.parseFloat(marker().style.height)<openHeight,"Overlay must shorten marker");',
            '    cover.classList.remove("visible"); toc.classList.remove("open"); await delay();',
            '    verify(marker().style.display==="none","Closing again hides marker");',
            '    verify(pageMarker.style.display!=="none","Page marker remains independent");',
            '    output.dataset.testStatus="passed";output.textContent="Paint clipping verified";',
            '  }catch(error){output.dataset.testStatus="failed";output.textContent=error.stack||error.message}',
            '})();',
            '</script></body></html>'
        ].join('\n');
        const file = path.join(folder, 'scroll-paint.html');
        fs.writeFileSync(file, html);
        const run = spawnSync(process.env.CONTROL_BROWSER_BIN, [
            '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
            '--user-data-dir=' + path.join(folder, 'profile'),
            '--virtual-time-budget=6000', '--window-size=800,950',
            '--dump-dom', pathToFileURL(file).href
        ], { encoding:'utf8', timeout:30000, maxBuffer: 4 * 1024 * 1024 });
        assert.ifError(run.error);
        assert.equal(run.status, 0, run.stderr);
        const report = run.stdout.match(/<p id="browser-result"[^>]*>[\s\S]*?<\/p>/)?.[0] || 'Missing browser report';
        assert.match(report, /data-test-status="passed"/, report);
    } finally {
        fs.rmSync(folder, { recursive:true, force:true });
    }
});
