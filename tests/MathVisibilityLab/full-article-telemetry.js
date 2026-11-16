/* Full-document native Edge translation telemetry.
 * No controls, no visible DOM changes, no content/cookies/IP/user identifiers sent.
 * Captures bounded diagnostic samples from public test articles only.
 */
(() => {
  'use strict';
  const conf = window.__tmFullMathLab || {};
  if (!conf.article || !conf.reportUrl) return;
  const key = 'tm-full-math-lab-session-v1';
  let session;
  try { session = sessionStorage.getItem(key); if (!session) sessionStorage.setItem(key, session=crypto.randomUUID()); }
  catch (_) { session = crypto.randomUUID(); }
  const pageLoad = crypto.randomUUID(), startedAt = Date.now();
  const entries = [];
  let sequence=0, oldSignature='', lastScroll=0, lastCaptured=0, scheduled=false;
  let posted=0, failed=0, pending=false, mutationCount=0, maxQueue=50;
  let observedTranslation=false, baselineMath=null;
  let lastSuccessAt=0;
  const chunkText=(s,n=190)=>String(s||'').replace(/\s+/g,' ').trim().slice(0,n);
  const formulaSelector='mjx-container, .katex, math, .MathJax, [role="math"]';
  const articleSelectors=['.c-article__content','article','.post-content','.entry-content','main'];
  const site = () => articleSelectors.map(x=>document.querySelector(x)).find(Boolean) || document.body;
  const path=(el)=>{
    if(!el||el.nodeType!==1)return '';
    const parts=[];
    for(let n=el,k=0;n&&n!==document.documentElement&&k<8;n=n.parentElement,k++){
      const tag=n.tagName.toLowerCase();
      const ix=n.parentElement?[...n.parentElement.children].filter(x=>x.tagName===n.tagName).indexOf(n)+1:1;
      parts.unshift(tag+':'+ix);
    }
    return parts.join('>');
  };
  const formulaStatus=(el)=>{
    const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
    const math=el.querySelector('mjx-math'),tex=math?.getAttribute('data-latex') ||
      el.getAttribute('data-latex') || el.getAttribute('alt') || '';
    const inViewport=r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;
    return {type:el.tagName.toLowerCase(),jax:el.getAttribute('jax')||'',
      display:el.getAttribute('display')||'',latex:chunkText(tex,155),
      text:chunkText(el.textContent,95),path:path(el),
      wh:[Math.round(r.width),Math.round(r.height)],
      top:Math.round(r.top),inViewport,
      hidden:cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0 ||
        (r.width<1&&r.height<1),
      translate:el.getAttribute('translate'),
      guard:!!el.closest('[data-tm-math-display-guard],[data-tm-math-dual-reference]')};
  };
  function rawNodes(root){
    if(!root)return [];
    const sample=[],walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let n,c=0,total=0;
    // TreeWalker only inspects the actual page, not hidden style/script sources.
    while((n=walk.nextNode())&&c++<7000){
      const p=n.parentElement;if(!p)continue;
      if(p.closest('script,style,noscript,code,pre,textarea,svg,mjx-container,.katex,math,[data-tm-math-dual-reference]'))continue;
      const v=n.nodeValue||'';
      if(!/(?:\$\$|\\Scal|\\frac|\\sqrt|\\begin\{|\\\(|\\\[|\$[A-Za-z0-9\\])/.test(v))continue;
      total++;
      const r=p.getBoundingClientRect(),cs=getComputedStyle(p);
      sample.push({text:chunkText(v,230),path:path(p),
        visible:cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0,
        top:Math.round(r.top),parent:p.tagName});
      if(sample.length>=300)break;
    }
    // The first 25 formulas in source order may be near the top; prioritise
    // currently visible/surrounding failures when the user scrolls deep.
    sample.sort((a,b)=>
      Math.abs(a.top-innerHeight/2)-Math.abs(b.top-innerHeight/2));
    return {samples:sample.slice(0,25),count:total};
  
  }
  function sample(reason){
    const root=site();if(!root)return;
    const math=[...root.querySelectorAll(formulaSelector)].filter(el=>
      !el.parentElement?.closest(formulaSelector));
    const outputs=math.map(formulaStatus);
    const {samples:raw,count:rawTotal}=rawNodes(root);
    const wholeText=root.innerText||'';
    const text=chunkText(wholeText,900);
    const cjk=(wholeText.match(/[\u3400-\u9fff]/g)||[]).length;
    const latin=(wholeText.match(/[A-Za-z]/g)||[]).length;
    const visible=outputs.filter(x=>!x.hidden).length;
    if(baselineMath===null&&outputs.length>0)baselineMath=outputs.length;
    if(cjk>=15)observedTranslation=true;
    const snap={at:new Date().toISOString(),ms:Date.now()-startedAt,seq:++sequence,reason,
      pageLoad,source:conf.article,variant:conf.variant||'baseline',
      viewport:{w:innerWidth,h:innerHeight,y:Math.round(scrollY),scale:visualViewport?.scale||1},
      ready:document.readyState,mathJaxVersion:window.MathJax?.version||null,
      mathJaxStartup:!!window.MathJax?.startup?.promise,
      formulas:{count:outputs.length,visible,hidden:outputs.length-visible,
        inline:outputs.filter(o=>o.display!=='true').length,display:outputs.filter(o=>o.display==='true').length,
        guards:root.querySelectorAll('[data-tm-math-display-guard]').length,
        references:root.querySelectorAll('[data-tm-math-dual-reference]').length,
        merged:root.querySelectorAll('[data-tm-math-merged=complete]').length,
        representative:outputs.filter(o=>o.inViewport).slice(0,12),
        // Fixed selection from whole document, including missing late formulas.
        anchors:outputs.filter(o=>o.display==='true').slice(0,12)},
      rawCount:rawTotal,raw,
      language:{cjk,latin,observedTranslation,textSample:chunkText(text,180)},
      scriptHints:{mathGuard:!!root.querySelector('[data-tm-math-dual-reference]'),
        crashGuard:!!Node.prototype[Symbol.for('translation-crash-guard-patched')],
        inlineOrder:!!root.querySelector('[data-tm-translation-order-anchor]')},
      mutationCount,
      isolation:typeof window.__tmIsolatedMathDiagnostics==='function'
        ?window.__tmIsolatedMathDiagnostics():null};
    const signature=JSON.stringify([outputs.length,visible,snap.formulas.guards,snap.formulas.merged,
      raw.map(r=>r.path+'-'+r.text).join('|'),Math.floor(cjk/5),Math.floor(scrollY/130),
      outputs.filter(o=>o.display==='true').map(o=>o.path+':'+o.hidden).join('|'),
      snap.isolation?.live,snap.isolation?.orderBroken,snap.isolation?.fallbackCount,
      snap.isolation?.withChinese]);
    if(signature===oldSignature&&reason==='mutation')return;
    oldSignature=signature;lastCaptured=Date.now();
    entries.push(snap);if(entries.length>maxQueue)entries.splice(0,entries.length-maxQueue);
    if(raw.length||outputs.some(o=>o.hidden))scheduleUpload(700);
  }
  let captureTimer;
  function schedule(reason,ms=300){
    if(scheduled)return;
    scheduled=true;captureTimer=setTimeout(()=>{scheduled=false;sample(reason);},ms);
  }
  let uploadTimer;
  function scheduleUpload(ms=5000){
    if(uploadTimer)return;
    uploadTimer=setTimeout(()=>{uploadTimer=null;send(false);},ms);
  }
  async function send(unloading=false){
    if(pending||!entries.length)return;
    pending=true;
    const batch=entries.splice(0,Math.min(entries.length,12));
    const payload=JSON.stringify({version:1,session,method:'full-article',kind:'dom',
      report:{format:'full-article-telemetry-v1',article:conf.article,
        variant:conf.variant||'baseline',pageLoad,at:new Date().toISOString(),
        updates:batch,posted,failed,firstRenderCount:baselineMath}});
    try {
      if(unloading&&navigator.sendBeacon){
        if(navigator.sendBeacon(conf.reportUrl,new Blob([payload],{type:'text/plain'}))){
          posted++;pending=false;return;
        }
      }
      const response=await fetch(conf.reportUrl,{method:'POST',body:payload,
        headers:{'Content-Type':'application/json'},keepalive:payload.length<59000,
        credentials:'omit',cache:'no-store'});
      if(!response.ok)throw new Error('HTTP '+response.status);
      posted++;lastSuccessAt=Date.now();
    }catch(e){
      failed++; entries.unshift(...batch); if(entries.length>maxQueue)entries.splice(maxQueue);
    }finally{pending=false;if(entries.length)scheduleUpload(5000);}
  }
  const watch=new MutationObserver(list=>{
    mutationCount+=list.length;
    schedule('mutation',300);
  });
  watch.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,
    attributeFilter:['style','class','translate','hidden','data-tm-math-merged']});
  addEventListener('scroll',()=>{
    const at=scrollY;if(Math.abs(at-lastScroll)>80){lastScroll=at;schedule('scroll',450);}
  },{passive:true});
  addEventListener('pageshow',()=>schedule('pageshow',100));
  addEventListener('pagehide',()=>{sample('pagehide');send(true);});
  document.addEventListener('visibilitychange',()=>{sample('visibility-'+document.visibilityState);scheduleUpload(100);});
  addEventListener('popstate',()=>schedule('popstate',50));
  setInterval(()=>{sample('heartbeat');scheduleUpload(1400);},4000);
  setInterval(()=>{if(Date.now()-lastSuccessAt>9000&&entries.length)send(false);},9000);
  schedule('document-start',0);
  document.addEventListener('DOMContentLoaded',()=>{sample('dom-ready');scheduleUpload(600);},{once:true});
  addEventListener('load',()=>{sample('window-load');scheduleUpload(600);},{once:true});
})();
