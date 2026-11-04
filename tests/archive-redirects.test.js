'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ia=fs.readFileSync(path.join(__dirname,'../src/InternetArchive.user.js'),'utf8');
const at=fs.readFileSync(path.join(__dirname,'../src/ArchiveToday.user.js'),'utf8');
const hosts=["www.404media.co","www.bloomberg.com","www.economist.com","www.ft.com","www.nature.com","www.newscientist.com","www.newyorker.com","www.nytimes.com","www.theatlantic.com","www.wired.com","www.wsj.com"];
const originals=["https://www.404media.co/anyone-can-push-updates-to-the-doge-gov-website-2/","https://www.theatlantic.com/magazine/archive/2025/02/american-loneliness-personality-politics/681091/","https://www.wsj.com/world/dozens-feared-dead-in-crash-after-passenger-flight-diverts-from-russia-fb2cdf2c"];
const match=script=>script.split('\n').filter(l=>/^\/\/ @match\s+/.test(l)).map(l=>l.replace(/^\/\/ @match\s+/,''));
function navigate(script,url) {
 const next=[],location={href:url,hostname:new URL(url).hostname,replace(target){next.push(target)}};
 vm.runInNewContext(script,{window:{location,addEventListener(){}},document:{addEventListener(){}},URL,console:{log(){}}});
 return next;
}
test('Both run at document-start, only 13 Wayback and 11 Archive Today source hosts',()=>{
 for(const source of [ia,at]){assert.match(source,/^\/\/ @run-at\s+document-start$/m);assert.doesNotThrow(()=>new Function(source));}
 const wayback=match(ia).filter(x=>!x.includes('web.archive.org'));
 const today=match(at).filter(x=>!x.includes('archive.is')&&!x.includes('archive.ph'));
 assert.equal(wayback.length,13);assert.equal(today.length,11);
 for(const host of hosts){assert.ok(today.includes('https://'+host+'/*'));assert.ok(!wayback.includes('https://'+host+'/*'));}
});
test('All articles use generic submit even when snapshots are available',()=>{
 for(const original of originals) assert.deepEqual(navigate(at,original),['https://archive.is/submit/?url='+encodeURIComponent(original)]);
});
test('Other articles retain submit fallback including query parameters',()=>{
 const original='https://www.ft.com/content/sample?x=1&y=2';
 assert.deepEqual(navigate(at,original),['https://archive.is/submit/?url='+encodeURIComponent(original)]);
});
test('Wayback original redirect is immediate',()=>{
 const original='https://www.bbc.com/news/example';
 assert.deepEqual(navigate(ia,original),['https://web.archive.org/'+original]);
});
test('Archive Today pages do not recursively redirect',()=>{
 assert.deepEqual(navigate(at,'https://archive.is/example'),[]);
 assert.deepEqual(navigate(at,'https://archive.ph/example'),[]);
});
