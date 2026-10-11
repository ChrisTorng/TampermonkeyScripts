const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const {test} = require('node:test');

const projectRoot = path.join(__dirname, '..');
const sourcePath = path.join(projectRoot, 'tests', 'MathTranslationStrategies', 'index.html');
const html = fs.readFileSync(sourcePath, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];

test('HTML lab has parseable self-contained JavaScript', () => {
    assert.equal(scripts.length, 1);
    assert.doesNotThrow(() => new vm.Script(scripts[0][1], {filename: 'MathTranslationStrategies/index.html'}));
});

test('10 independent techniques, duplicated in above-fold and below-fold zones', () => {
    for (const method of ['plain','rendered','wrapped','nested','siblings','editable','script','svg','whole','mock']) {
        assert.match(html, new RegExp("\\['" + method + "'\\s*,"));
    }
    assert.match(html, /const ids=mode==='all'\?methods\.map/);
    assert.match(html, /makeProbe\(id,'first'\)/);
    assert.match(html, /makeSecond\(id,second\)/);
    assert.match(html, /min-height:155vh/);
    assert.match(html, /IntersectionObserver/);
    assert.match(html, /rootMargin:'240px 0px'/);
});

test('mock API never calls an external translator and preserves math placeholders', () => {
    assert.match(html, /function mockTranslateAPI/);
    assert.match(html, /⟦MATH_/);
    assert.match(html, /new Set\(indexes\)\.size!==3/);
    assert.match(html, /translate:'no'/);
    assert.match(html, /MathJax\.Hub\.Queue|hub\.Queue/);
    assert.doesNotMatch(html, /\bfetch\s*\(/);
    assert.doesNotMatch(html, /GM_xmlhttpRequest/);
});

test('browser smoke: focused mock method creates two independent translations', () => {
    const chrome = process.env.CHROME_BIN || 'google-chrome';
    const url = 'file://' + sourcePath + '?mode=focus&method=mock&late=present&noMathJax=1&selftest=1';
    const result = spawnSync(chrome, ['--headless=new','--no-sandbox','--disable-gpu',
        '--disable-dev-shm-usage','--no-first-run','--disable-background-networking',
        '--virtual-time-budget=2400','--dump-dom',url], {
        encoding:'utf8',timeout:35000,maxBuffer:16*1024*1024
    });
    if(result.error)throw result.error;
    assert.equal(result.status,0,result.stderr.slice(-3000));
    assert.match(result.stdout,/data-lab-ready="true"/);
    assert.match(result.stdout,/data-lab-cases="2"/);
    assert.match(result.stdout,/data-lab-selftest="passed"/,
        'Browser failed self test. '+result.stdout.slice(-3000));
});

test('browser smoke: all 10 methods are duplicated and mock translation is isolated', () => {
    const chrome = process.env.CHROME_BIN || 'google-chrome';
    const url = 'file://' + sourcePath + '?mode=all&late=present&noMathJax=1&selftest=1';
    const result = spawnSync(chrome, ['--headless=new','--no-sandbox','--disable-gpu',
        '--disable-dev-shm-usage','--no-first-run','--disable-background-networking',
        '--virtual-time-budget=2400','--dump-dom',url], {
        encoding:'utf8',timeout:35000,maxBuffer:16*1024*1024
    });
    if(result.error)throw result.error;
    assert.equal(result.status,0,result.stderr.slice(-3000));
    assert.match(result.stdout,/data-lab-cases="20"/);
    assert.match(result.stdout,/data-lab-selftest="passed"/,
        'Browser failed all-mode self test. '+result.stdout.slice(-3000));
});


test('browser smoke: actual MathJax 2 renders both copies of three formulas', () => {
    const chrome = process.env.CHROME_BIN || 'google-chrome';
    const url = 'file://' + sourcePath + '?mode=focus&method=plain&late=present';
    const result = spawnSync(chrome, ['--headless=new','--no-sandbox','--disable-gpu',
        '--disable-dev-shm-usage','--no-first-run','--virtual-time-budget=17000',
        '--dump-dom',url], {encoding:'utf8',timeout:45000,maxBuffer:16*1024*1024});
    if(result.error) throw result.error;
    assert.equal(result.status,0,result.stderr.slice(-3000));
    assert.match(result.stdout,/data-lab-cases="2"/);
    const rendered = (result.stdout.match(/class="MathJax"/g) || []).length;
    assert.ok(rendered >= 6, 'Expected at least six rendered MathJax equations; got ' + rendered +
        '. ' + result.stdout.slice(-2500) + ' ' + result.stderr.slice(-1200));
});

test('math order check uses the actual number of source text spans', () => {
    assert.match(html, /texts\.length!==pieces\.length/);
    assert.doesNotMatch(html, /texts\.length!==4/);
    assert.match(html, /originalText:pieces\.map\(\(text,i\)=>text\+\(i<math\.length\?'\[公式\]':'\'\)\)\.join\(''\)/);
});


const englishSourcePath = path.join(projectRoot, 'tests', 'MathTranslationStrategies', 'english-source.html');
const englishSource = fs.readFileSync(englishSourcePath, 'utf8');
test('English control fixture is static English content with two MathJax G samples', () => {
    assert.match(englishSource, /<html lang="en">/);
    assert.match(englishSource, /<title>English Math Translation Test/);
    assert.match(englishSource, /id="plain-first"/);
    assert.match(englishSource, /id="plain-second"/);
    assert.match(englishSource, /id="math-first"/);
    assert.match(englishSource, /id="math-second"/);
    assert.match(englishSource, /id="gap"/);
    assert.equal((englishSource.match(/<script type="math\/tex">/g) || []).length, 6);
    assert.equal((englishSource.match(/class="plain-control"/g) || []).length, 2);
    const firstSectionStart = englishSource.indexOf('<section id="first"');
    const initialScripts = englishSource.indexOf('<script>\n(function(){');
    assert.ok(firstSectionStart > 0 && initialScripts > firstSectionStart, 'static content precedes the diagnostic JavaScript');
    assert.ok(englishSource.indexOf('id="math-first"') < englishSource.indexOf('id="plain-first"'),
        'math appears near the top of the first screen');
    const scripts = [...englishSource.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 1, 'one inline diagnostic script');
    assert.doesNotThrow(() => new vm.Script(scripts[0][1]));
});

test('English control fixture reports native text changes separately from formula order', () => {
    assert.match(englishSource, /plainControlChanged:/);
    assert.match(englishSource, /mathTextChanged:/);
    assert.match(englishSource, /mathOrderCorrect:/);
    assert.match(englishSource, /CONTROL_NOT_TRANSLATED/);
    assert.match(englishSource, /CONTROL_CHANGED_BUT_MATH_TEXT_NOT_TRANSLATED/);
    assert.match(englishSource, /MATH_TEXT_CHANGED_FORMULAS_IN_ORDER/);
    assert.match(englishSource, /if\(touched\)report\(\)/,
        'diagnostic elements must not recursively trigger MutationObserver');
});

test('English control fixture renders six real MathJax 2 equations and detects simulated text changes', () => {
    const chrome = process.env.CHROME_BIN || 'google-chrome';
    const url = 'file://' + englishSourcePath + '?selftest=1';
    const result = spawnSync(chrome, ['--headless=new','--no-sandbox','--disable-gpu',
        '--disable-dev-shm-usage','--no-first-run','--virtual-time-budget=17000',
        '--dump-dom',url], {
        encoding:'utf8',timeout:45000,maxBuffer:16*1024*1024
    });
    if (result.error) throw result.error;
    assert.equal(result.status,0,result.stderr.slice(-3000));
    assert.match(result.stdout,/data-english-control-selftest="passed"/,
        'translation diagnostic did not recognize simulated text change');
    const outputs = (result.stdout.match(/class="MathJax"/g) || []).length;
    assert.ok(outputs >= 6, 'Expected six real MathJax outputs, got '+outputs+
        '\n'+result.stdout.slice(-2000)+'\n'+result.stderr.slice(-900));
});
