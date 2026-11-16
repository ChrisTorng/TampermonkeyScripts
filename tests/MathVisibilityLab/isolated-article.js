/* Test-only: isolate raw TeX before Edge Translate and MathJax mutation.
   No controls, storage, network, or changes to installed userscripts.
   Report through the existing full-article telemetry observer. */
(() => {
 'use strict';
 const source=new Map(), units=[];
 const prefix='tm-iso-', attr='data-tm-isolate-formula';
 const expression=/\$\$([\s\S]{1,6000}?)\$\$|\$([^\r\n$]{1,900}?)\$|\\\(([\s\S]{1,900}?)\\\)|\\\[([\s\S]{1,6000}?)\\\]/g;
 let next=0, started=false, rendering=false, locked=false, timer=null;
 let fullArticle=null, frozenArticle=null, sourceParent=null, sourceNext=null, fullFallbackActive=false;
 const counts={captured:0,rendered:0,renderErrors:0,restoreCount:0,fallbackCount:0,
   lostUnitCount:0,earlyRendererCount:0,restoredMathCount:0,
   fullFallbackCount:0,mutationTicks:0,
   repairCauses:{noContainer:0,noMath:0,error:0,raw:0}};
 const failReasons=[];
 const isFormula=e=>!!e&&e.nodeType===1&&e.hasAttribute(attr);
 function ignored(node) {
   const p=node.parentElement;
   return !p || !!p.closest('script,style,noscript,textarea,pre,code,svg,math,mjx-container,.katex,'+
     '[data-tm-math-isolated-fallback],['+attr+'],[contenteditable],.mathjax_ignore');
 }
 function capture() {
   const article=document.querySelector('.c-article__content');
   if(!article||started)return;
   started=true;
   fullArticle=article;sourceParent=article.parentNode;sourceNext=article.nextSibling;
   counts.earlyRendererCount=article.querySelectorAll('mjx-container,.katex,math').length;
   const nodes=[];
   const walk=document.createTreeWalker(article,NodeFilter.SHOW_TEXT);
   let node;
   while((node=walk.nextNode())){
     if(ignored(node))continue;
     expression.lastIndex=0;
     if(expression.test(node.nodeValue||''))nodes.push(node);
   }
   for(const n of nodes){
     if(!n.isConnected)continue;
     const text=n.nodeValue||'';
     expression.lastIndex=0;
     let match,last=0,frag=document.createDocumentFragment(),seen=false;
     const wrapper=document.createElement('span');
     wrapper.className='tm-isolated-text-unit';
     wrapper.setAttribute('data-tm-math-isolated-unit',String(units.length+1));
     // Each original text node is an independent unit. Using the entire article
     // as the fallback for standalone display formula nodes accidentally
     // nested all other units and led to repeated full-article replacements.
     const unit={id:String(units.length+1),block:wrapper,parent:n.parentNode,
       next:n.nextSibling,ids:[],fallback:false};
     units.push(unit);
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
       wrapper.append(frag);
       if(unit.ids.some(id=>source.get(id)?.display) && !text.replace(expression,'').trim())
         wrapper.style.display='block';
       n.parentNode.replaceChild(wrapper,n);
     }
   }
   for(const u of units)u.template=u.block.cloneNode(true);
   // Keep a second canonical source tree in JS memory only; it is not
   // visible or translated. This is the final safe fallback if Edge
   // replaces ancestor paragraphs and makes individual anchors unusable.
   frozenArticle=article.cloneNode(true);
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
         // MathJax 4 can request lazy async resources for macros, fonts,
         // and extensions. The synchronous API intermittently throws
         // "MathJax retry -- an asynchronous action is required".
         const node=typeof mjx.tex2chtmlPromise==='function'
           ?await mjx.tex2chtmlPromise(x.tex,{display:x.display})
           :mjx.tex2chtml(x.tex,{display:x.display});
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
     if(frozenArticle)populate(frozenArticle);
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
   for(const id of u.ids){
     const node=restored.querySelector('['+attr+'="'+id+'"]');
     const math=source.get(id)?.markup;
     if(node&&math)node.replaceChildren(math.cloneNode(true));
   }
   return restored;
 }
 function restoreFullArticle(){
   if(fullFallbackActive||!frozenArticle)return false;
   const replacement=frozenArticle.cloneNode(true);
   replacement.setAttribute('translate','no');
   replacement.classList.add('notranslate');
   replacement.setAttribute('data-tm-math-isolated-full-fallback','true');
   const current=fullArticle?.isConnected ? fullArticle :
     document.querySelector('.c-article__content');
   if(current?.isConnected)current.replaceWith(replacement);
   else if(sourceParent?.isConnected)
     sourceParent.insertBefore(replacement,sourceNext?.isConnected?sourceNext:null);
   else {failReasons.push('Article container detached and cannot be recovered');return false;}
   fullFallbackActive=true;counts.fullFallbackCount++;
   fullArticle=replacement;
   for(const unit of units){
     const n=replacement.querySelector('[data-tm-math-isolated-unit="'+unit.id+'"]');
     if(!n){counts.lostUnitCount++;continue;}
     unit.block=n;unit.parent=n.parentNode;unit.next=n.nextSibling;unit.fallback=true;
   }
   return true;
 }
 function monitor(){
   if(locked||!started)return;
   locked=true;counts.mutationTicks++;
   try{
     for(const u of units){
       const order=liveEquations(u);
       if(!u.block.isConnected&&!u.parent?.isConnected) {
         // Native Edge may discard an entire paragraph, including the
         // saved sibling anchor. Recover the whole source tree once.
         if(!restoreFullArticle()) {counts.lostUnitCount++;continue;}
       }
       if(!u.block.isConnected||liveEquations(u).join(',')!==u.ids.join(',')){
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
         const currentMath=rendered?.querySelector('mjx-math');
         // MathJax can asynchronously attach accessibility content to
         // mjx-math, making textContent differ without any visible glyph
         // changes. Structural corruption, deleted math or raw TeX is the
         // only repair trigger here. Do not repeatedly replace valid output.
         const rawSiblings=[...anchor.childNodes].some(n=>
           n.nodeType===3&&/(?:\$\$|\\Scal|\\frac|\\begin\{)/.test(n.nodeValue||''));
         const broken=!rendered||!currentMath||!!rendered.querySelector('mjx-merror')||rawSiblings;
         if(broken){
           if(!rendered)counts.repairCauses.noContainer++;
           else if(!currentMath)counts.repairCauses.noMath++;
           else if(rendered.querySelector('mjx-merror'))counts.repairCauses.error++;
           else if(rawSiblings)counts.repairCauses.raw++;
           anchor.replaceChildren(item.markup.cloneNode(true));counts.restoreCount++;
         }
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
   return {version:'experiment-2',...counts,live:alive,formulaTotal:source.size,
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