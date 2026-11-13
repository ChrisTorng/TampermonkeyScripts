const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');

const src = fs.readFileSync(path.join(__dirname, '../tests/MathVisibilityLab/reconstruct.js'), 'utf8');
test('reconstruction script is syntactically valid and does not call remote translation', () => {
    assert.doesNotThrow(() => new vm.Script(src));
    assert.doesNotMatch(src, /fetch\s*\(|GM_xmlhttpRequest|innerHTML\s*=/);
    assert.match(src, /translated.querySelectorAll\('\[data-part\]'\)/);
    assert.match(src, /data-restored-formula/);
    assert.match(src, /dataset.reconstruction = 'incomplete'/);
});

test('reconstruction repairs reordered math using protected source and refuses missing translated fragments', {
    skip: !process.env.CONTROL_BROWSER_BIN && 'Provide Chromium for an actual DOM test'
}, () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-reconstructed-math-'));
    const browser = process.env.CONTROL_BROWSER_BIN;
    try {
        const script = src.replace(/<\/script/gi, '<\\/script');
        function math(type, n) {
            if (type === 'katex') return '<span class="katex">rendered-' + n + '</span>';
            if (type === 'mathml') return '<math><mi>x</mi><mn>'+n+'</mn></math>';
            if (type === 'svg') return '<svg width="35" height="35" viewBox="0 0 35 35"><defs><path id="glyph-'+n+'" d="M3 3 L30 30" stroke="white"/></defs><use href="#glyph-'+n+'"/></svg>';
            return '<mjx-container>rendered-' + n + '</mjx-container>';
        }
        function pair(type) {
            const original = [
                '<span data-part="T0">This is </span>',
                '<span data-part="M0">' + math(type, 0) + '</span>',
                '<span data-part="T1">. Then see </span>',
                '<span data-part="M1">' + math(type, 1) + '</span>',
                '<span data-part="T2">.</span>'
            ].join('');
            const translated = [
                '<span data-part="T0">這是 </span>',
                '<span data-part="M0">MATH-CORRUPTED</span>',
                '<span data-part="T1">。接著看 </span>',
                '<span data-part="M1">MATH-CORRUPTED</span>',
                '<span data-part="T2">。</span>'
            ].join('');
            return '<section id="' + type + '">' +
                '<p data-hybrid-translated="near">' + translated + '</p>' +
                '<section data-hybrid-root="near" translate="no" data-reconstruction="pending"><div data-hybrid-note></div><div data-hybrid-content></div></section>' +
                '<p data-hybrid-reference="near" data-original-reference="true" translate="no">' + original + '</p>' +
                '</section>';
        }
        const markerSection = [
            '<section id="marker"><p data-hybrid-translated="near">這是⟦MATH_0⟧。接著看⟦MATH_1⟧。</p>',
            '<section data-hybrid-root="near" translate="no"><div data-hybrid-note></div><div data-hybrid-content></div></section>',
            '<p data-hybrid-reference="near" data-original-reference="true" translate="no">',
            '<span data-part="T0">This is </span><span data-part="M0">' + math('mathjax', 0) + '</span>',
            '<span data-part="T1">. Then see </span><span data-part="M1">' + math('mathjax', 1) + '</span>',
            '<span data-part="T2">.</span></p></section>'
        ].join('');
        const html = [
            '<!doctype html><html lang="en"><head><meta charset="utf-8"><script>' + script + '</script></head><body>',
            '<div id="fixtures">' + pair('mathjax') + pair('katex') + pair('mathml') + pair('svg') + markerSection + '</div>',
            '<pre id="result"></pre>',
            '<script>',
            'const api=window.MathVisibilityReconstructor;',
            'const failed=[];const evidence={};',
            'function requireValue(x,m){if(!x)throw Error(m)}',
            'try {',
            ' for(const type of ["mathjax","katex","mathml","svg"]) {',
            '  const s=document.getElementById(type),p=s.querySelector("[data-hybrid-translated]");',
            '  // Edge can nest translated T nodes under its own wrapper and move the M nodes.',
            '  const nested=document.createElement("div");',
            '  [...p.querySelectorAll("[data-part^=T]")].forEach(e=>nested.append(e));',
            '  p.prepend(nested);',
            '  const rows=api.rebuildPair(s,"slots");',
            '  const root=s.querySelector("[data-hybrid-root]");',
            '  requireValue(rows.length===1&&root.dataset.reconstruction==="complete",type+" did not complete");',
            '  requireValue(root.dataset.formulaIds==="M0,M1",type+" formula order");',
            '  requireValue(root.querySelectorAll("[data-restored-formula]").length>=2,type+" math absent");',
            '  const combined=root.querySelector("[data-hybrid-content]").textContent;',
            '  requireValue(combined.includes("這是")&&combined.includes("接著看"),type+" translated text absent");',
            '  if(type==="svg"){const paths=[...root.querySelectorAll("svg path[id]")];requireValue(paths.length>=2,"SVG reference defs absent");const uses=[...root.querySelectorAll("svg use")];requireValue(uses.length>=2,"SVG glyph uses absent");requireValue(uses.every(u=>u.getAttribute("href")&&root.querySelector("[id="+u.getAttribute("href").slice(1)+"]")),"SVG internal #references broken");const ids=[...root.querySelectorAll("[id]")].map(e=>e.id);requireValue(new Set(ids).size===ids.length,"duplicated reconstructed SVG ids");}',
'  evidence[type]={math:root.dataset.mathCount,sentences:root.querySelectorAll(".math-hybrid-sentence").length,aligned:root.dataset.sentenceAligned};',
            ' }',
            ' const mr=api.rebuildPair(document.getElementById("marker"),"markers");',
            ' requireValue(mr[0].status==="complete","valid placeholders were not restored");',
            ' requireValue(mr[0].formulaIds==="M0,M1","marker formula order changed");',
            ' // Corrupt one translation fragment: must refuse a silently incomplete result.',
            ' const x=document.querySelector("#mathjax [data-part=T1]");x.removeAttribute("data-part");',
            ' api.rebuildPair(document.getElementById("mathjax"),"slots");',
            ' requireValue(document.querySelector("#mathjax [data-hybrid-root]").dataset.reconstruction==="incomplete","missing Chinese segment not detected");',
            ' const m=document.querySelector("#marker [data-hybrid-translated]");',
            ' m.textContent="這是數學變形，沒有保留佔位符";',
            ' api.rebuildPair(document.getElementById("marker"),"markers");',
            ' requireValue(document.querySelector("#marker [data-hybrid-root]").dataset.reconstruction==="incomplete","missing markers not detected");',
            ' const result=document.getElementById("result");',
            ' result.dataset.status="passed";result.textContent=JSON.stringify(evidence);',
            '}catch(err){const result=document.getElementById("result");result.dataset.status="failed";result.textContent=err.stack||err.message;}',
            '</script></body></html>'
        ].join('\n');
        const filepath = path.join(tmp, 'test.html');
        fs.writeFileSync(filepath, html);
        const p = spawnSync(browser, [
            '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
            '--no-first-run','--no-default-browser-check',
            '--user-data-dir='+path.join(tmp,'profile'),
            '--virtual-time-budget=2800','--dump-dom',pathToFileURL(filepath).href
        ], { encoding:'utf8', timeout:32000, maxBuffer:4*1024*1024 });
        assert.ifError(p.error);
        assert.equal(p.status,0,p.stderr.slice(-1700));
        const result = p.stdout.match(/<pre id="result"[^>]*>[\s\S]*?<\/pre>/)?.[0] || p.stdout.slice(-1800);
        assert.match(result,/data-status="passed"/,result);
        assert.match(result,/"mathjax":/);
        assert.match(result,/"katex":/);
        assert.match(result,/"mathml":/);
        assert.match(result,/"svg":/);
    } finally {
        fs.rmSync(tmp,{recursive:true,force:true});
    }
});
