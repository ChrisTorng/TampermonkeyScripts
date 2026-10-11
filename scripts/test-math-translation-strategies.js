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
