const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { test } = require('node:test');

test('Chromium keeps a flush-right outer marker for document and viewport-app scrollers', {
    skip: !process.env.CONTROL_BROWSER_BIN && 'Set CONTROL_BROWSER_BIN to a Chromium executable'
}, () => {
    const root = path.join(__dirname, '..');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-root-scroller-'));
    try {
        const script = fs.readFileSync(path.join(root, 'src', 'ResponsiveScrollIndicator.user.js'), 'utf8')
            .replace(/<\/script/gi, '<\\/script');
        const html = [
            '<!doctype html><html><head><meta charset="utf-8"><style>',
            'html,body{margin:0;padding:0} body{min-height:2600px;background:#222}',
            'main{height:2500px;color:#fff}',
            '#fake-native-scrollbar{position:fixed;z-index:2147483647;right:0;top:150px;width:8px;height:100px;background:#888;pointer-events:none}',
            '#app{display:none;position:fixed;z-index:10;inset:0;overflow-y:auto;background:#181818;color:white}',
            '#app-content{height:3600px}',
            'html.app-mode,html.app-mode body{height:100%;min-height:0;overflow:hidden}',
            'html.app-mode main{display:none}',
            'html.app-mode #app{display:block}',
            '</style></head><body>',
            '<main>Root document has a real browser scrollbar.</main>',
            '<section id="app"><div id="app-content">Full-screen app scroller</div></section>',
            '<div id="fake-native-scrollbar"></div>',
            '<p id="browser-result"></p>',
            '<script>window.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),0);</script>',
            '<script>' + script + '</script>',
            '<script>',
            '(async()=>{',
            ' const result=document.getElementById("browser-result");',
            ' const delay=()=>new Promise(r=>setTimeout(r,200));',
            ' const verify=(test,message)=>{if(!test)throw new Error(message)};',
            ' try {',
            '   await delay();',
            '   const marker=document.getElementById("tm-scroll-indicator-root");',
            '   const thumb=marker.querySelector(".tm-viewport");',
            '   verify(marker && marker.style.display!=="none","Long root page must display marker");',
            '   const rect=marker.getBoundingClientRect();',
            '   verify(Math.abs(rect.right-(visualViewport.offsetLeft+visualViewport.width))<=2,"Custom marker must be flush with the viewport edge");',
            '   const initialTop=thumb.style.transform;',
            '   window.scrollTo(0,600);window.dispatchEvent(new Event("scroll"));',
            '   await delay();',
            '   verify(marker.style.display!=="none","Root marker persists after scrolling");',
            '   verify(thumb.style.transform!==initialTop,"Root indicator follows page scroll");',
            '   window.scrollTo(0,0);',
            '   document.documentElement.classList.add("app-mode");',
            '   const app=document.getElementById("app");app.scrollTop=900;',
            '   await delay();',
            '   const other=Array.from(document.querySelectorAll("[data-tm-scroll-indicator]")).filter(e=>e!==marker);',
            '   verify(marker.style.display!=="none","An app-owned page scroller must still display the root marker");',
            '   verify(Math.abs(marker.getBoundingClientRect().right-(visualViewport.offsetLeft+visualViewport.width))<=2,"App marker must stay flush with viewport edge");',
            '   verify(other.every(el=>el.style.display==="none"),"Do not duplicate outer marker inside full screen app");',
            '   verify(thumb.style.transform!=="translateY(0px)","App scroll position moves outer marker");',
            '   result.dataset.testStatus="passed";result.textContent="Root document and app scrollers verified";',
            ' }catch(error){result.dataset.testStatus="failed";result.textContent=error.stack||error.message}',
            '})();',
            '</script></body></html>'
        ].join('\n');
        const file = path.join(directory, 'root-scroll.html');
        fs.writeFileSync(file, html);
        const run = spawnSync(process.env.CONTROL_BROWSER_BIN, [
            '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
            '--user-data-dir=' + path.join(directory, 'profile'),
            '--virtual-time-budget=6000', '--window-size=800,900',
            '--dump-dom', pathToFileURL(file).href
        ], { encoding:'utf8', timeout:30000, maxBuffer:4*1024*1024 });
        assert.ifError(run.error);
        assert.equal(run.status, 0, run.stderr);
        const report = run.stdout.match(/<p id="browser-result"[^>]*>[\s\S]*?<\/p>/)?.[0] || 'Missing browser report';
        assert.match(report, /data-test-status="passed"/, report);
    } finally {
        fs.rmSync(directory, { recursive:true, force:true });
    }
});
