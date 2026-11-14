const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const {test}=require('node:test');

function browserAssertions() {
    const result=document.getElementById('test-result');
    const check=(x,m)=>{if(!x)throw new Error(m)};
    const get=id=>document.getElementById(id);
    const wrapper=id=>get(id)?.nextElementSibling;
    const ref=id=>wrapper(id)?.querySelector('.tm-math-backup-copy');
    const count=()=>document.querySelectorAll('[data-tm-math-dual-reference]').length;
    const fail=e=>{result.dataset.status='failed';result.textContent=e.stack||e.message};
    setTimeout(()=>{
        try{
            check(!get('plain').hasAttribute('data-tm-math-dual-original'),'plain p modified');
            check(!get('ordinary-div').hasAttribute('data-tm-math-dual-original'),'ordinary div modified');
            check(get('math-only').getAttribute('translate')==='no','math-only protection missing');
            check(!wrapper('math-only').hasAttribute('data-tm-math-dual-reference'),'math-only duplicated');
            check(count()===5,'unexpected math block count '+count());
            check(ref('nested').querySelector('mjx-container'),'nested original missing');
            check(!wrapper('nested').classList.contains('tm-math-merged-ready'),'nested fallback not maintained');
            for(const id of ['inline','svg','math-div','source-only']){
                check(wrapper(id).hasAttribute('data-tm-math-dual-reference'),id+' backup missing');
                check(ref(id).getAttribute('translate')==='no',id+' backup not protected');
                check(!wrapper(id).classList.contains('tm-math-merged-ready'),'untranslated paragraph incorrectly merged: '+id);
            }
            const svgRef=ref('svg');
            const path=svgRef.querySelector('svg path[id]'),use=svgRef.querySelector('svg use');
            check(path&&use,'SVG output disappeared');
            check(use.getAttribute('href')==='#'+path.id,'SVG internal href not remapped');
            const p=get('inline'),slots=[...p.querySelectorAll('[data-tm-math-part]')]
                .map(el=>el.getAttribute('data-tm-math-part')).join(',');
            check(slots==='T0,M0,T1,M1,T2','unexpected slot order: '+slots);
            p.querySelector('[data-tm-math-part=T0]').textContent='三角形具有 ';
            p.querySelector('[data-tm-math-part=T1]').textContent='。另一個公式是 ';
            p.querySelector('[data-tm-math-part=T2]').textContent='。這是第二個句子。';
            // Simulate Edge damaging the MathJax output while translating prose.
            p.querySelector('[data-tm-math-part=M0]').textContent='broken formula';
            p.querySelector('[data-tm-math-part=M1]').textContent='';
            const div=get('math-div');
            div.querySelector('[data-tm-math-part=T0]').textContent='前面 ';
            div.querySelector('[data-tm-math-part=T1]').textContent=' 後面。';
            setTimeout(()=>{
                try{
                    const m=wrapper('inline');
                    check(m.classList.contains('tm-math-merged-ready'),'Chinese reconstruction not ready');
                    check(m.querySelectorAll('[data-tm-restored-math]').length>=2,'rendered formulas not recovered');
                    const joined=m.querySelector('.tm-math-combined').textContent;
                    check(joined.includes('三角形具有')&&joined.includes('另一個公式是'),'Chinese words missing');
                    check(joined.includes('x²+y²')&&joined.includes('z²'),'source math missing');
                    check(m.querySelectorAll('.tm-math-original-sentence').length>=2,'sentence-level originals not available');
                    check(wrapper('math-div').classList.contains('tm-math-merged-ready'),'math leaf div not reconstructed');
                    check(!wrapper('svg').classList.contains('tm-math-merged-ready'),'English SVG should not merge');
                    check(!wrapper('source-only').classList.contains('tm-math-merged-ready'),'raw TeX should remain fallback');
                    check(count()===5,'duplicate math backup created');
                    const button=m.querySelector('.tm-math-view-toggle');
                    button.click();
                    check(m.classList.contains('tm-math-expanded'),'expanding reference failed');
                    check(getComputedStyle(ref('inline')).display!=='none','expanded reference hidden');
                    button.click();
                    check(!m.classList.contains('tm-math-expanded'),'collapsing reference failed');
                    const dynamic=document.createElement('p');
                    dynamic.id='dynamic';
                    dynamic.textContent='Dynamic math is $\\frac{1}{2}$ and has an English sentence.';
                    get('article').appendChild(dynamic);
                    setTimeout(()=>{
                        try{
                            check(count()===6,'dynamic math backup missing');
                            check(!wrapper('dynamic').classList.contains('tm-math-merged-ready'),'untranslated dynamic math unexpectedly merged');
                            check(!get('plain').hasAttribute('data-tm-math-dual-original'),'plain p changed after translations');
                            result.dataset.status='passed';
                            result.textContent=JSON.stringify({sourceMath:2,div:true,onlyMath:true,svg:true,dynamic:true,refCount:count()});
                        }catch(e){fail(e)}
                    },280);
                }catch(e){fail(e)}
            },520);
        }catch(e){fail(e)}
    },360);
}

test('Complex browser DOM: native-like translation, formula loss, svg IDs, math-only skip, dynamic math', {
    skip:!process.env.CONTROL_BROWSER_BIN&&'Set CONTROL_BROWSER_BIN to Chromium'
},()=>{
    const root=path.join(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tm-math-hybrid-'));
    try{
        const raw=fs.readFileSync(path.join(root,'src/MathTranslationGuard.user.js'),'utf8');
        assert.match(raw,/@version\s+2026-11-14_1\.2\.3/);
        const script=raw.replace(
            "if (location.hostname === 'alexwang.ai' || location.hostname.endsWith('.alexwang.ai')) {",
            'if (true) {'
        ).replace(/<\/script/gi,'<\\/script');
        assert.notEqual(script,raw);
        const html=[
            '<!doctype html><html><head><meta charset="utf-8"><script>'+script+'</script></head><body>',
            '<main id="article">',
            '<p id="plain">This paragraph has no math and must remain untouched.</p>',
            '<p id="math-only"><mjx-container jax="CHTML"><mjx-math>x²</mjx-math></mjx-container></p>',
            '<p id="inline">A triangle has <mjx-container jax="CHTML" data-latex="x^2+y^2"><mjx-math>x²+y²</mjx-math></mjx-container>. Another formula is <mjx-container jax="CHTML" data-latex="z^2"><mjx-math>z²</mjx-math></mjx-container>. This is a second sentence.</p>',
            '<p id="svg">SVG follows <mjx-container jax="SVG"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><path id="math-glyph" d="M0 0 L10 10"/></defs><use href="#math-glyph"/></svg></mjx-container> and is visible.</p>',
            '<div id="math-div">Before <mjx-container jax="CHTML"><mjx-math>1+2</mjx-math></mjx-container> after.</div>',
            '<div id="ordinary-div">Normal div without math.</div>',
            '<p id="nested">A <strong>nested <mjx-container>z</mjx-container></strong> formula.</p>',
            '<p id="source-only">What is $1+2+3$? This is a source TeX paragraph.</p>',
            '</main><div id="test-result"></div>',
            '<script>('+browserAssertions.toString()+')()</script></body></html>'
        ].join('\n');
        const page=path.join(tmp,'index.html');fs.writeFileSync(page,html);
        const run=spawnSync(process.env.CONTROL_BROWSER_BIN,[
            '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
            '--no-first-run','--no-default-browser-check',
            '--user-data-dir='+path.join(tmp,'profile'),
            '--virtual-time-budget=3500','--dump-dom',pathToFileURL(page).href
        ],{encoding:'utf8',timeout:32000,maxBuffer:5*1024*1024});
        assert.ifError(run.error);assert.equal(run.status,0,run.stderr.slice(-1600));
        const fragment=run.stdout.match(/<div id="test-result"[^>]*>[\s\S]*?<\/div>/)?.[0]||run.stdout.slice(-2000);
        assert.match(fragment,/data-status="passed"/,fragment);
        assert.match(fragment,/"sourceMath":2/);
    }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
