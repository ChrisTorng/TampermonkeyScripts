const { test } = require('node:test');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url'),{spawnSync}=require('node:child_process');
const assert=require('node:assert/strict');
const browserProbe = function () {
 const result=document.querySelector('#test-result');
 const check=(x,msg)=>{if(!x)throw Error(msg)};
 const fail=e=>{result.dataset.status='failed';result.textContent=e.stack||e.message};
 setTimeout(()=>{
  try{
   const before=window.__tmIsolatedMathDiagnostics();
   check(before.captured===3,'expected 3 formulas: '+before.captured);
   check(before.rendered===3&&before.live===3&&before.orderBroken===0,'initial formula failure: '+JSON.stringify(before));
   check(!document.querySelector('#clean [data-tm-isolate-formula]'),'plain text changed');
   const t=document.querySelector('#translated [data-tm-math-isolated-unit]');
   check(t,'missing isolated unit');
   [...t.childNodes].find(n=>n.nodeType===3).nodeValue='方程式 ';
   document.querySelector('#removed [data-tm-isolate-formula]').remove();
   document.querySelector('#display [data-tm-isolate-formula]').replaceChildren(document.createTextNode('$$BROKEN$$'));
   setTimeout(()=>{
    try{
     const after=window.__tmIsolatedMathDiagnostics();
     check(after.live===3&&after.orderBroken===0,'failed recovery: '+JSON.stringify(after));
     check(after.fallbackCount>=1,'missing source fallback');
     check(after.restoreCount>=1,'missing in-place formula repair');
     check(after.withChinese>=1,'Chinese translation lost');
     check(document.querySelector('#translated').textContent.includes('方程式'),'translated fragment gone');
     check(!document.querySelector('#display').textContent.includes('$$BROKEN$$'),'broken LaTeX visible');
     check(document.querySelector('#removed').textContent.includes('y^2'),'original formula lost');
     result.dataset.status='passed';
     result.textContent=JSON.stringify({captured:after.captured,live:after.live,
       orderBroken:after.orderBroken,fallbacks:after.fallbackCount,chinese:after.withChinese});
    }catch(e){fail(e)}
   },850);
  }catch(e){fail(e)}
 },550);
};
test('Math source isolation protects formulas while preserving Chinese prose and source order',{
 skip:!process.env.CONTROL_BROWSER_BIN&&'Chromium required'
},()=>{
 const raw=fs.readFileSync(path.join(__dirname,'../tests/MathVisibilityLab/isolated-article.js'),'utf8');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tm-isolated-math-'));
 try{
 const head=[
 '<!doctype html><html><head><meta charset="utf-8">',
 '<script>',
 'window.MathJax={version:"4.1.3",startup:{promise:Promise.resolve()},',
 ' tex2chtml(tex,{display}){const mjx=document.createElement("mjx-container");',
 ' if(display)mjx.setAttribute("display","true");',
 ' const inner=document.createElement("mjx-math");inner.setAttribute("data-latex",tex);',
 ' inner.textContent=tex;mjx.append(inner);return mjx;}};',
 '</script>',
 '<script>'+raw.replace(/<\/script/gi,'<\\/script')+'</script>',
 '</head><body><main class="c-article__content">',
 '<p id="clean">No mathematical expressions are in this paragraph.</p>',
 '<p id="translated">The equation $x^2$ belongs here.</p>',
 '<p id="removed">A second $y^2$ is shown.</p>',
 '<div id="display">$$\\Scal_x = \\{y : r(x,y)=1\\}.$$</div>',
 '</main><div id="test-result"></div>',
 '<script>('+browserProbe.toString()+')()</script>',
 '</body></html>'
 ];
 const file=path.join(dir,'index.html');fs.writeFileSync(file,head.join('\n'));
 const run=spawnSync(process.env.CONTROL_BROWSER_BIN,[
 '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
 '--user-data-dir='+path.join(dir,'profile'),'--virtual-time-budget=3500',
 '--dump-dom',pathToFileURL(file).href],
 {encoding:'utf8',timeout:35000,maxBuffer:4*1024*1024});
 assert.ifError(run.error);assert.equal(run.status,0,run.stderr.slice(-1000));
 const result=run.stdout.match(/<div id="test-result"[^>]*>[\s\S]*?<\/div>/)?.[0]||run.stdout.slice(-1300);
 assert.match(result,/data-status="passed"/,result);
 assert.match(result,/"orderBroken":0/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});