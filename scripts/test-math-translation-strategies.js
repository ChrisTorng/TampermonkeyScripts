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


const inlinePages = [
    ['mathjax4-chtml', 'MathJax 4 / CommonHTML', 'mjx-container'],
    ['mathjax4-svg', 'MathJax 4 / SVG', 'mjx-container'],
    ['katex', 'KaTeX 0.19 / HTML+MathML', 'katex'],
];

for (const [engine, label, renderedSelector] of inlinePages) {
    const fixturePath = path.join(projectRoot, 'tests', 'MathTranslationStrategies', 'inline-' + engine + '.html');
    const fixture = fs.readFileSync(fixturePath, 'utf8');

    test('static inline-math test page has valid diagnostics and duplicates: ' + label, () => {
        assert.match(fixture, /<html lang="en">/);
        assert.equal((fixture.match(/class="formula-paragraph"/g) || []).length, 8);
        assert.equal((fixture.match(/class="simple-control"/g) || []).length, 2);
        assert.equal((fixture.match(/data-math="[012]"/g) || []).length, 24);
        assert.equal((fixture.match(/id="gap"/g) || []).length, 1);
        assert.match(fixture, /min-height:160vh/);
        assert.match(fixture, /INLINE_FORMULAS_MISSING_OR_INVISIBLE/);
        assert.match(fixture, /TRANSLATION_NOT_CONFIRMED/);
        assert.match(fixture, /FORMULA_PARAGRAPH_NOT_TRANSLATED/);
        assert.match(fixture, /Math Translation Guard 1.2.0/);
        assert.match(fixture, /dataset\.inlineRenderedCases/);
        const inlineScripts = [...fixture.matchAll(/<script>([\s\S]*?)<\/script>/g)];
        assert.equal(inlineScripts.length, 2);
        for (const match of inlineScripts) assert.doesNotThrow(() => new vm.Script(match[1]));
    });

    test('real headless Chrome typesets all eight three-formula inline paragraphs: ' + label, () => {
        const chrome = process.env.CHROME_BIN || 'google-chrome';
        const result = spawnSync(chrome, ['--headless=new','--no-sandbox','--disable-gpu',
            '--disable-dev-shm-usage','--no-first-run','--virtual-time-budget=27000',
            '--dump-dom','file://' + fixturePath], {
            encoding:'utf8',timeout:55000,maxBuffer:16*1024*1024,
        });
        if (result.error) throw result.error;
        assert.equal(result.status, 0, result.stderr.slice(-3000));
        assert.match(result.stdout, /data-inline-engine-state="rendered"/,
            'Failed to load ' + engine + ': '+result.stdout.slice(-2300));
        assert.match(result.stdout, /data-inline-case-count="8"/);
        assert.match(result.stdout, /data-inline-rendered-cases="8"/,
            engine + ' failed to produce all 24 inline formulas');
        const formulaOutputs = engine === 'katex'
            ? (result.stdout.match(/class="katex"/g) || []).length
            : (result.stdout.match(/<mjx-container/g) || []).length;
        assert.ok(formulaOutputs >= 24,
            engine + ' rendered only ' + formulaOutputs + ' output nodes');
    });
}


test('focused viewport position is measured rather than inferred from first/second', () => {
    for (const [engine] of inlinePages) {
        const page = fs.readFileSync(path.join(projectRoot,'tests','MathTranslationStrategies','inline-'+engine+'.html'),'utf8');
        assert.match(page, /focusInitiallyVisible/);
        assert.match(page, /caseFirstVisible:/);
        assert.match(page, /enteredWithoutScrolling:/);
        assert.match(page, /scrollY:Math\.round\(window\.scrollY\)/);
    }
});

test('focused KaTeX method is actually visible without scrolling on mobile-sized Chrome window', () => {
    const chrome = process.env.CHROME_BIN || 'google-chrome';
    const target = path.join(projectRoot,'tests','MathTranslationStrategies','inline-katex.html');
    const result = spawnSync(chrome, ['--headless=new','--no-sandbox','--disable-gpu',
        '--disable-dev-shm-usage','--no-first-run','--window-size=288,439',
        '--virtual-time-budget=4000','--dump-dom',
        'file://'+target+'?mode=focus&method=siblings'], {
        encoding:'utf8',timeout:40000,maxBuffer:16*1024*1024
    });
    if(result.error)throw result.error;
    assert.equal(result.status,0,result.stderr.slice(-1000));
    assert.match(result.stdout,/data-focus="siblings"/);
    assert.match(result.stdout,/data-focus-initially-visible="true"/,
        'Selected first case must reach the initial viewport; '+result.stdout.slice(0,1000));
});

const atomicPath = path.join(projectRoot, 'tests', 'MathTranslationStrategies', 'atomic-math.html');
const atomicHtml = fs.readFileSync(atomicPath,'utf8');
test('atomic SVG/image/shadow/iframe lab is static and has its own case-level viewport instrumentation', () => {
    assert.match(atomicHtml, /<html lang="en">/);
    for(const method of ['svg','image','shadow','iframe']){
        assert.match(atomicHtml, new RegExp('data-case="'+method+'-first"'));
        assert.match(atomicHtml, new RegExp('data-case="'+method+'-second"'));
    }
    assert.match(atomicHtml, /tex2svgPromise/);
    assert.match(atomicHtml, /caseFirstVisible:/);
    assert.match(atomicHtml, /data\.initialFocusedCase/);
    assert.match(atomicHtml, /mediaLoaded:/);
    assert.match(atomicHtml, /freezeSvgPaint/);
    assert.match(atomicHtml, /linebreaks:\{inline:false\}/);
    assert.match(atomicHtml, /imagePixelBrightness/);
    assert.match(atomicHtml, /FORMULA_SLOT_CONTAMINATED_BY_TRANSLATION/);
    assert.match(atomicHtml, /mathOrderEvidence/);
    assert.match(atomicHtml, /directChildSequence/);
    assert.match(atomicHtml, /adjacentTranslatedProse/);
    assert.match(atomicHtml, /TRANSLATION_WRAPPED_FORMULAS_VERIFY_VISUAL/);
    assert.match(atomicHtml, /svgSourceDiagnostics/);
    assert.match(atomicHtml, /contentDocument/);
    assert.equal((atomicHtml.match(/class="mixed"/g) || []).length,8);
    const scripts=[...atomicHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length,2);
    for(const script of scripts)assert.doesNotThrow(()=>new vm.Script(script[1]));
});


test('atomic isolation alternatives render all 24 math formula instances in real Chrome', () => {
    const chrome = process.env.CHROME_BIN || 'google-chrome';
    const result = spawnSync(chrome,['--headless=new','--no-sandbox','--disable-gpu',
        '--disable-dev-shm-usage','--no-first-run','--virtual-time-budget=24000',
        '--dump-dom','file://'+atomicPath], {
        encoding:'utf8',timeout:55000,maxBuffer:16*1024*1024
    });
    if(result.error)throw result.error;
    assert.equal(result.status,0,result.stderr.slice(-1000));
    assert.match(result.stdout,/data-atomic-render-status="ready"/,
        'The MathJax 4 SVG isolation fixture did not initialize: '+result.stdout.slice(-2100));
    assert.match(result.stdout,/data-atomic-case-count="8"/);
    assert.match(result.stdout,/data-atomic-complete-cases="8"/,
        'Not all original SVG, image, shadow-root or iframe formulas rendered');
    assert.match(result.stdout,/data-atomic-image-bright="true"/,
        'Serialized SVG images must contain light painted pixels, not black currentColor');
    assert.match(result.stdout,/data-atomic-complete-math="true"/,
        'MathJax SVG export must contain full formula, not only first line-break piece');
    assert.match(result.stdout,/data-atomic-image-no-initial-tex="true"/,
        'Translated image cases must not expose stale TeX text before scripts run');
    assert.match(result.stdout,/data-atomic-original-image-order="true"/,
        'Source DOM must contain T0 M0 T1 M1 T2 M2 T3 before Edge translation');
    assert.match(result.stdout,/data-atomic-image-order-correct="true"/,
        'Chrome must keep the correct sequence in both cases without native translation');
});


const anchoredPath=path.join(projectRoot,'tests','MathTranslationStrategies','anchored-math.html');
const anchoredHtml=fs.readFileSync(anchoredPath,'utf8');
test('anchored translation comparison contains four strategies and two separate DOM copies',()=>{
    for(const strategy of ['baseline','nested','pseudo','grouped']){
        assert.match(anchoredHtml,new RegExp('data-case="'+strategy+'-first"'));
        assert.match(anchoredHtml,new RegExp('data-case="'+strategy+'-second"'));
    }
    assert.match(anchoredHtml,/const query=new URLSearchParams/);
    assert.equal((anchoredHtml.match(/class="mixed"/g)||[]).length,8);
    assert.equal((anchoredHtml.match(/data-formula="[012]"/g)||[]).length,18);
    assert.equal((anchoredHtml.match(/data-formula-after="[012]"/g)||[]).length,6);
    assert.match(anchoredHtml,/output:\{linebreaks:\{inline:false\}\}/);
    assert.match(anchoredHtml,/formula-anchor|css-formula::after/);
    assert.match(anchoredHtml,/mathAnchorAssociation/);
    const scripts=[...anchoredHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length,2);
    for(const script of scripts)assert.doesNotThrow(()=>new vm.Script(script[1]));
});

test('real Chrome renders separate, nested, grouped and CSS-anchored formula images twice',()=>{
    const chrome=process.env.CHROME_BIN||'google-chrome';
    const result=spawnSync(chrome,['--headless=new','--no-sandbox','--disable-gpu',
        '--disable-dev-shm-usage','--no-first-run','--virtual-time-budget=26000',
        '--dump-dom','file://'+anchoredPath+'?mode=focus&method=nested'],{
        encoding:'utf8',timeout:60000,maxBuffer:16*1024*1024
    });
    if(result.error)throw result.error;
    assert.equal(result.status,0,result.stderr.slice(-1500));
    assert.match(result.stdout,/data-anchor-render-status="ready"/,
        'Anchored translation lab did not load MathJax: '+result.stdout.slice(-1800));
    assert.match(result.stdout,/data-anchor-image-methods-complete="true"/,
        'Inline and nested SVG image methods did not render all 18 images');
    assert.match(result.stdout,/data-anchor-pseudo-ready="true"/,
        'CSS pseudo-elements did not receive all six SVG image backgrounds');
});
