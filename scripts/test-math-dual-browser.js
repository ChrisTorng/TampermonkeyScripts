const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('MathJax article: translated original and protected original remain independent without duplicate clones', {
    skip: !process.env.CONTROL_BROWSER_BIN && 'Set CONTROL_BROWSER_BIN to a Chromium executable'
}, () => {
    const root = path.join(__dirname, '..');
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-math-dual-'));
    try {
        const raw = fs.readFileSync(path.join(root, 'src', 'MathTranslationGuard.user.js'), 'utf8');
        // Inject the exact branch implementation under file:// for test only.
        // The real userscript is still restricted to alexwang.ai.
        const script = raw.replace(
            "if (location.hostname === 'alexwang.ai' || location.hostname.endsWith('.alexwang.ai')) {",
            'if (true) {'
        ).replace(/<\/script/gi, '<\\/script');
        assert.notEqual(script, raw, 'Expected article branch in script');
        const html = [
            '<!doctype html><html><head><meta charset="utf-8">',
            '<script>' + script + '</script>',
            '</head><body><main>',
            '<p id="math">What is $1 + 2 + 3 + \\cdots + 10$? Another $1 + 10$.</p>',
            '<p id="rendered">Before <mjx-container data-latex="x+y"><mjx-math><mjx-mi>xy</mjx-mi></mjx-math></mjx-container> after.</p>',
            '<p id="ordinary">This normal English sentence should not be duplicated.</p>',
            '</main><div id="test-result"></div>',
            '<script>',
            'setTimeout(() => {',
            '  const p=document.createElement("p");p.id="dynamic";',
            '  p.textContent="New dynamic inline $z$ math";document.querySelector("main").append(p);',
            '  setTimeout(() => {',
            '    const result=document.getElementById("test-result");',
            '    const check=(value,message)=>{if(!value)throw Error(message)};',
            '    try {',
            '      const originals=["math","rendered","dynamic"];',
            '      check(document.querySelectorAll("[data-tm-math-dual-reference]").length===3,"expected exactly 3 copies");',
            '      for(const id of originals){',
            '        const original=document.getElementById(id);',
            '        check(original.getAttribute("translate")!=="no","original translation must remain enabled: "+id);',
            '        check(original.getAttribute("data-tm-math-dual-original")==="true","missing original marker: "+id);',
            '        const wrapper=original.nextElementSibling;',
            '        check(wrapper?.getAttribute("data-tm-math-dual-reference")==="true","reference is not adjacent: "+id);',
            '        check(wrapper.getAttribute("translate")==="no","reference not protected: "+id);',
            '        const clone=wrapper.querySelector("p");',
            '        check(clone?.getAttribute("translate")==="no","copy has no translation protection: "+id);',
            '        check(clone.textContent===original.textContent,"reference text changed: "+id);',
            '        check(clone.id!==id,"original and copy share the same id: "+id);',
            '        const allIds=[...document.querySelectorAll("[id]")].map(el=>el.id);',
            '        check(new Set(allIds).size===allIds.length,"duplicate document IDs: "+id);',
            '      }',
            '      check(document.getElementById("rendered").nextElementSibling.querySelector("mjx-container"),"MathJax output not preserved");',
            '      check(document.querySelectorAll("[data-tm-math-protected]").length===0,"per-math wrappers reintroduced");',
            '      check(!document.getElementById("ordinary").hasAttribute("data-tm-math-dual-original"),"plain paragraph cloned");',
            '      result.dataset.testStatus="passed"; result.textContent="three original/translated pairs verified";',
            '    } catch(e) {result.dataset.testStatus="failed";result.textContent=e.stack||e.message;}',
            '  },200);',
            '},250);',
            '</script></body></html>'
        ].join('\n');
        const file = path.join(temporary, 'dual.html');
        fs.writeFileSync(file, html);
        const run = spawnSync(process.env.CONTROL_BROWSER_BIN, [
            '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
            '--no-first-run','--no-default-browser-check',
            '--user-data-dir=' + path.join(temporary, 'profile'),
            '--virtual-time-budget=2600', '--dump-dom', pathToFileURL(file).href
        ], { encoding: 'utf8', timeout: 32000, maxBuffer: 4*1024*1024 });
        assert.ifError(run.error);
        assert.equal(run.status, 0, run.stderr.slice(-2500));
        const report = run.stdout.match(/<div id="test-result"[^>]*>[\s\S]*?<\/div>/)?.[0] || run.stdout.slice(-1300);
        assert.match(report, /data-test-status="passed"/, report);
    } finally {
        fs.rmSync(temporary, { recursive: true, force: true });
    }
});
