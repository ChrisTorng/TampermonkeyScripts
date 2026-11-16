/* Test-only: isolate raw TeX before Edge Translate and MathJax mutation.
   No controls, storage, network, or changes to installed userscripts.
   Report through the existing full-article telemetry observer. */
(() => {
 'use strict';
 const source=new Map(), units=[];
 const prefix='tm-iso-', attr='data-tm-isolate-formula';
 const expression=/\$\$([\s\S]{1,6000}?)\$\$|\$([^\r\n$]{1,900}?)\$|\\\(([\s\S]{1,900}?)\\\)|\\\[([\s\S]{1,6000}?)\\\]/g;
 let next=0, started=false, rendering=false, locked=false, timer=null;
 const counts={captured:0,rendered:0,renderErrors:0,restoreCount:0,fallbackCount:0,
   lostUnitCount:0,earlyRendererCount:0,restoredMathCount:0,mutationTicks:0};
 const failReasons=[];
 const isFormula=e=>!!e&&e.nodeType===1&&e.hasAttribute(attr);
 function ignored(node) {
   const p=node.parentElement;
   return !p || !!p.closest('script,style,noscript,textarea,pre,code,svg,math,mjx-container,.katex,'+
     '[data-tm-math-isolated-fallback],['+attr+'],[contenteditable],.mathjax_ignore');
 }
 const hostBlock=(node,article)=>{
   let p=node.parentElement;
   while(p&&p!==article&&!p.matches('p,li,blockquote,div,h1,h2,h3,h4,h5,h6'))p=p.parentElement;
   // For direct-text block math, the article itself is the unit.
   if(!p||p===article)return article;
   return p;
 };
 function capture() {
   const article=document.querySelector('.c-article__content');
   if(!article||started)return;
   started=true;
   counts.earlyRendererCount=article.querySelectorAll('mjx-container,.katex,math').length;
   const nodes=[];
   const walk=document.createTreeWalker(article,NodeFilter.SHOW_TEXT);
   let node;
   while((node=walk.nextNode())){
     if(ignored(node))continue;
     expression.lastIndex=0;
     if(expression.test(node.nodeValue||''))nodes.push(node);
   }
   const blockMap=new Map();
   for(const n of nodes){
     if(!n.isConnected)continue;
     const text=n.nodeValue||'';
     expression.lastIndex=0;
     let match,last=0,frag=document.createDocumentFragment(),seen=false;
     const block=hostBlock(n,article);
     let unit=blockMap.get(block);
     if(!unit){
       unit={block, parent:block.parentNode, next:block.nextSibling, ids:[],fallback:false};
       blockMap.set(block,unit);units.push(unit);
     }
     while((match=expression.exec(text))){
       if(match.index>last)frag.append(document.createTextNode(text.slice(last,match.index)));
       const display=!!(match[1]||match[4]);
       const tex=match[1]||match[2]||match[3]||match[4]||'';
       const id=prefix+(++next);
       const target=document.createElement('span');
       target.setAttribute(attr,id);
       target.setAttribute('translate','no');
       target.className='notranslate mathjax_ignore tm-isolated-equation';
       if(display)target.style.display='block';
       target.textContent=''; // Never expose raw TeX to the native translator.
       source.set(id,{id,tex,display,markup:null,error:null,unit});
       unit.ids.push(id);
       frag.append(target);seen=true;
       last=expression.lastIndex;
     }
     if(seen){
       if(last<text.length)frag.append(document.createTextNode(text.slice(last)));
       n.parentNode.replaceChild(frag,n);
     }
   }
   for(const u of units)u.template=u.block.cloneNode(true);
   counts.captured=source.size;
   document.documentElement.dataset.tmIsolationSourceCount=String(source.size);
   void renderAll();
 }
 async function renderAll(){
   if(rendering)return;rendering=true;
   try{
     let mjx=window.MathJax;
     if(mjx?.startup?.promise)await mjx.startup.promise;
     // A late-loaded MathJax must not make the original TeX visible.
     for(let i=0;i<55&&typeof window.MathJax?.tex2chtml!=='function';i++)
       await new Promise(resolve=>setTimeout(resolve,100));
     mjx=window.MathJax;
     if(typeof mjx?.tex2chtml!=='function'){
       failReasons.push('MathJax.tex2chtml unavailable');return;
     }
     for(const x of source.values()){
       try{
         const node=mjx.tex2chtml(x.tex,{display:x.display});
         if(node.querySelector('mjx-merror'))throw Error('MathJax reported merror');
         x.markup=node.cloneNode(true);
         counts.rendered++;
       }catch(e){
         x.error=String(e?.message||e).slice(0,110);counts.renderErrors++;
         if(failReasons.length<12)failReasons.push(x.id+':'+x.error);
       }
     }
     for(const u of units) {
       populate(u.block);
       populate(u.template);
     }
   }finally{rendering=false;monitor();}
 }
 function populate(root){
   for(const x of source.values()){
     if(!x.markup)continue;
     const target=root.querySelector('['+attr+'="'+x.id+'"]');
     if(target)target.replaceChildren(x.markup.cloneNode(true));
   }
 }
 function liveEquations(u){
   return [...u.block.querySelectorAll('['+attr+']')].map(e=>e.getAttribute(attr));
 }
 function createFallback(u){
   // The isolated source is stored in JS, independent from any translated DOM
   // or a discarded guard wrapper. It remains recoverable even after removal.
   const restored=u.template.cloneNode(true);
   restored.setAttribute('translate','no');
   restored.classList.add('notranslate');
   restored.setAttribute('data-tm-math-isolated-fallback','true');
   restored.removeAttribute('data-tm-math-isolated-unit');
   for(const id of u.ids){
     const node=restored.querySelector('['+attr+'="'+id+'"]');
     const math=source.get(id)?.markup;
     if(node&&math)node.replaceChildren(math.cloneNode(true));
   }
   return restored;
 }
 function monitor(){
   if(locked||!started)return;
   locked=true;counts.mutationTicks++;
   try{
     for(const u of units){
       const order=liveEquations(u);
       if(!u.block.isConnected||order.join(',')!==u.ids.join(',')){
         // Do not guess formula locations after native Edge reparenting:
         // show the immutable canonical source in the original block position.
         const restored=createFallback(u);
         if(u.block.isConnected)u.block.replaceWith(restored);
         else if(u.parent?.isConnected)u.parent.insertBefore(restored,u.next?.isConnected?u.next:null);
         else {counts.lostUnitCount++;continue;}
         u.block=restored;u.fallback=true;
         counts.fallbackCount++;
       }
       for(const id of u.ids){
         const anchor=u.block.querySelector('['+attr+'="'+id+'"]');
         const item=source.get(id);
         if(!anchor||!item?.markup)continue;
         const rendered=anchor.querySelector('mjx-container');
         const broken=!rendered||!rendered.querySelector('mjx-math')||
           rendered.querySelector('mjx-merror')||
           rendered.querySelector('mjx-math')?.getAttribute('data-latex')!==item.tex;
         if(broken){anchor.replaceChildren(item.markup.cloneNode(true));counts.restoreCount++;}
       }
     }
   }finally{locked=false;}
 }
 function schedule(){
   if(timer!==null)return;
   timer=setTimeout(()=>{timer=null;monitor()},280);
 }
 function diagnostics(){
   let alive=0,errors=0,orderBroken=0,withChinese=0;
   for(const [id,x] of source){
     const found=document.querySelector('['+attr+'="'+id+'"]');
     if(found&&found.querySelector('mjx-container mjx-math'))alive++;
     if(x.error)errors++;
   }
   for(const u of units){
     if(!u.block.isConnected||liveEquations(u).join(',')!==u.ids.join(','))orderBroken++;
     if(/[\u3400-\u9fff]/.test(u.block.textContent||''))withChinese++;
   }
   return {version:'experiment-1',...counts,live:alive,formulaTotal:source.size,
     units:units.length,orderBroken,withChinese,sourceErrors:errors,
     failures:failReasons.slice(0,6)};
 }
 window.__tmIsolatedMathDiagnostics=diagnostics;
 document.addEventListener('DOMContentLoaded',capture,{once:true});
 // Mutation-driven repairs and a bounded heartbeat cover progressive
 // page translation. The controller never depends on a saved DOM node surviving.
 const watcher=new MutationObserver(schedule);
 watcher.observe(document,{subtree:true,childList:true,characterData:true});
 setInterval(monitor,1400);
 if(document.readyState!=='loading')capture();
})();