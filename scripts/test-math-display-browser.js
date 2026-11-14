const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const {test}=require('node:test');

function inspectDisplayGuards() {
    const main=document.querySelector('.c-article__content'),result=document.getElementById('result');
    const guard='[data-tm-math-display-guard]';
    const check=(ok,msg)=>{if(!ok)throw Error(msg)};
    const fail=e=>{result.dataset.status='failed';result.textContent=e.stack||e.message};
    setTimeout(()=>{
        try {
            let sections=[...main.querySelectorAll(guard)];
            check(sections.length===2,'expected 2 direct display equation guards: '+sections.length);
            check(sections.every(x=>x.parentElement===main),'display math changed container ordering');
            check(sections.every(x=>x.getAttribute('translate')==='no'),'display math not protected');
            check(sections.every(x=>x.querySelector('mjx-container[translate=no]')),'rendered math lacks translate=no');
            check(main.querySelector('p mjx-container')?.closest(guard)===null,'inline math incorrectly guarded as display');
            check(!document.querySelector('#ordinary').hasAttribute('data-tm-math-dual-original'),'ordinary prose unexpectedly touched');
            check(!main.querySelector('p').hasAttribute('translate'),'ordinary article prose incorrectly disabled for translation');
            check(sections[0].querySelector('mjx-math').getAttribute('data-latex').includes('Scal_x'),'site-specific macro missing');
            const svg=sections[1].querySelector('svg');
            check(svg.querySelector('use')?.getAttribute('href')==='#glyph-original','SVG original path missing');

            // Simulate Android Edge replacing display formula with raw TeX.
            sections[0].replaceChildren(document.createTextNode('$$\\Scal_x = \\{y:r(x,y)=1\\}.$$'));
            sections[1].replaceChildren(document.createTextNode('$$\\sqrt{x}$$'));
            setTimeout(()=>{
                try {
                    sections=[...main.querySelectorAll(guard)];
                    check(sections.length===2,'display guards duplicated during re-translation');
                    const restored=sections[0].querySelector('mjx-container[display=true] mjx-math');
                    check(restored&&restored.getAttribute('data-latex').includes('Scal_x'),'source MathJax formula not restored');
                    check(!sections[0].textContent.includes('$$'),'raw dollar-TeX remains visible');
                    const svgCopy=sections[1].querySelector('mjx-container[display=true] svg');
                    const path=svgCopy?.querySelector('path[id]'),use=svgCopy?.querySelector('use');
                    check(path&&use&&use.getAttribute('href')==='#'+path.id,'SVG glyph ref not repaired');
                    const dyn=document.createElement('mjx-container');
                    dyn.setAttribute('jax','CHTML');
                    dyn.setAttribute('display','true');
                    dyn.innerHTML='<mjx-math data-latex="a+b"><mjx-mi>a+b</mjx-mi></mjx-math>';
                    main.appendChild(dyn);
                    setTimeout(()=>{
                        try{
                            const arr=[...main.querySelectorAll(guard)];
                            check(arr.length===3,'late MathJax display equation not guarded');
                            check(arr[2].querySelector('mjx-math')?.getAttribute('data-latex')==='a+b','dynamic math not preserved');
                            check(!main.querySelector('#ordinary')?.hasAttribute('data-tm-math-dual-original'),'ordinary text affected');
                            result.dataset.status='passed';
                            result.textContent=JSON.stringify({displayEquations:arr.length,restoredTeX:true,svgGlyph:true,inlineUnchanged:true});
                        }catch(e){fail(e)}
                    },320);
                }catch(e){fail(e)}
            },360);
        }catch(e){fail(e)}
    },320);
}

test('MathJax 4 block display is protected and restored when native translation exposes raw TeX', {
    skip:!process.env.CONTROL_BROWSER_BIN&&'Set CONTROL_BROWSER_BIN to Chrome/Chromium'
},()=>{
    const root=path.join(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'tm-display-'));
    try {
        const raw=fs.readFileSync(path.join(root,'src/MathTranslationGuard.user.js'),'utf8');
        assert.match(raw,/@version\s+2026-11-14_1\.2\.3/);
        const script=raw.replace("if (location.hostname === 'alexwang.ai' || location.hostname.endsWith('.alexwang.ai')) {",'if (true) {').replace(/<\/script/gi,'<\\/script');
        assert.notEqual(script,raw);
        const html=[
          '<!doctype html><html><head><meta charset="utf-8"><script>'+script+'</script></head><body>',
          '<main class="c-article__content">',
          '<h2>Math before/after a paragraph</h2>',
          '<p id="ordinary">This prose contains no equations and should be translated normally.</p>',
          '<mjx-container display="true" jax="CHTML"><mjx-math data-latex="\\Scal_x = \\{y:r(x,y)=1\\}."><mjx-mrow>Sx</mjx-mrow></mjx-math></mjx-container>',
          '<p id="inline">An inline equation <mjx-container jax="CHTML"><mjx-math>x</mjx-math></mjx-container> appears here.</p>',
          '<mjx-container display="true" jax="SVG"><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><defs><path id="glyph-original" d="M2 2L20 20" /></defs><use href="#glyph-original"/></svg></mjx-container>',
          '<p>Another ordinary paragraph.</p>',
          '</main><div id="result"></div>',
          '<script>('+inspectDisplayGuards.toString()+')()</script>',
          '</body></html>'
        ].join('');
        const file=path.join(dir,'index.html');fs.writeFileSync(file,html);
        const run=spawnSync(process.env.CONTROL_BROWSER_BIN,[
            '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
            '--no-first-run','--no-default-browser-check',
            '--user-data-dir='+path.join(dir,'profile'),
            '--virtual-time-budget=2900','--dump-dom',pathToFileURL(file).href
        ],{encoding:'utf8',timeout:33000,maxBuffer:4*1024*1024});
        assert.ifError(run.error);assert.equal(run.status,0,run.stderr.slice(-1500));
        const result=run.stdout.match(/<div id="result"[^>]*>[\s\S]*?<\/div>/)?.[0]||run.stdout.slice(-1300);
        assert.match(result,/data-status="passed"/,result);
        assert.match(result,/"displayEquations":3/);
    }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
