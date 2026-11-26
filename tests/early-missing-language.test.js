'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/TranslatePreformattedText.user.js'), 'utf8');
const code = source.split('// BEGIN EARLY MISSING LANGUAGE')[1].split('// END EARLY MISSING LANGUAGE')[0].replace('    watchEarlyMissingLanguage();', '');
const infer = vm.runInNewContext(code + '\ninferEarlyEnglishLanguage');
function page({lang = '', title = 'Declare — a UI language for you and your AI', description = 'Designed from the ground up for interfaces that act and move like the best native apps, in a few hundred lines your AI can write and its compiler can check.', locale = '', contentLanguage = ''} = {}) {
    const html = { getAttribute: () => lang, setAttribute: (key, value) => { assert.equal(key, 'lang'); lang = value; } };
    const meta = value => value ? { getAttribute: () => value } : null;
    return { documentElement: html, head: { querySelector: selector => selector === 'title' ? {textContent: title} : selector.includes('og:locale') ? meta(locale) : selector.includes('http-equiv') ? meta(contentLanguage) : meta(description) } };
}
test('Declare metadata supplies English before rendering', () => { const doc = page(); assert.equal(infer(doc), true); assert.equal(doc.documentElement.getAttribute('lang'), 'en'); assert.equal(infer(doc), false); });
test('preserves explicit original and translated languages', () => { for (const lang of ['fr','zh-TW','en-US']) assert.equal(infer(page({lang})), false); });
test('rejects conflicting locales, weak metadata, non-English and mixed text', () => {
    for (const options of [{locale:'de_DE'}, {contentLanguage:'ja'}, {description:''}, {title:'Declare'}, {title:'繁體中文網站'}, {description:'これは日本語で書かれている説明文です。'}, {description:'English words and the text for a page that is mainly 中文中文中文中文中文中文中文中文中文中文中文中文中文中文中文中文中文中文'}]) assert.equal(infer(page(options)), false);
});
test('waits for late head metadata and disconnects after setting language', () => {
    const doc = page({description:''});
    let cb, disconnected = false, cancelled = false;
    const later = page();
    doc.readyState = 'loading';
    doc.addEventListener = () => {};
    doc.removeEventListener = () => {};
    const win = {}; win.top = win;
    const context = {document:doc, window:win, MutationObserver:class {constructor(fn){cb=fn;} observe(){} disconnect(){disconnected=true;}}, setTimeout:()=>1, clearTimeout:()=>{cancelled=true;}};
    vm.runInNewContext(code + '\nwatchEarlyMissingLanguage();', context);
    assert.equal(doc.documentElement.getAttribute('lang'), '');
    doc.head = later.head; cb();
    assert.equal(doc.documentElement.getAttribute('lang'), 'en');
    assert.equal(disconnected && cancelled, true);
});
