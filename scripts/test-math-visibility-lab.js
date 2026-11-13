const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..', 'tests', 'MathVisibilityLab');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'lab.js'), 'utf8');

test('native Edge lab has server-delivered English and all five modes', () => {
    assert.match(html, /<html lang="en"/);
    assert.match(html, /This ordinary English control sentence should be translated/);
    for (const mode of ['baseline', 'output', 'source', 'paragraph', 'image']) {
        assert.match(html, new RegExp('id="case-' + mode + '"'));
        assert.match(html, new RegExp('id="example-' + mode + '-near"'));
        assert.match(html, new RegExp('id="example-' + mode + '-late"'));
        assert.match(html, new RegExp('data-select-method="' + mode + '"'));
    }
    assert.match(html, /mathjax@4\/tex-mml-chtml\.js/);
    assert.match(html, /height:135vh/);
});

test('D case provides an independently translated paragraph and protected original in initial HTML', () => {
    for (const pos of ['near', 'late']) {
        assert.match(html, new RegExp('id="example-paragraph-' + pos + '">'));
        assert.match(html, new RegExp('id="example-paragraph-' + pos + '-reference"[^>]*translate="no"'));
    }
    assert.equal((html.match(/data-original-reference="true"/g) || []).length, 2);
    assert.doesNotMatch(html, /id="example-baseline-near" translate="no"/);
    assert.match(html, /id="example-source-near"/);
    assert.match(html, /data-part="M0" data-math-index="0" translate="no"/);
    assert.match(html, /\$1 \+ 2 \+ 3 \+ \\cdots \+ 10\$/);
});

test('static image case is independent of MathJax and cannot clip the sample formula', () => {
    const first = html.match(/id="example-image-near"[^>]*>([\s\S]*?)<\/p>/);
    assert(first);
    const images = Array.from(first[1].matchAll(/<img alt="([^"]+)" src="data:image\/svg\+xml,([^"]+)">/g));
    assert.equal(images.length, 5);
    const long = images[0];
    const svg = decodeURIComponent(long[2]);
    assert.match(svg, /width="3\d\d"|width="4\d\d"/);
    assert.match(svg, /⋯/);
    assert.match(svg, /fill="#ffe781"/);
    assert(!svg.includes('currentColor'));
});

test('diagnostic upload is opt-in, scoped and short-lived; screenshot remains manual', () => {
    assert.match(js, /let consent = settings\.consent === true/);
    assert.match(js, /if \(!consent \|\| uploadPending/);
    assert.match(js, /get\('enable-report'\)/);
    assert.match(js, /get\('capture-image'\)/);
    assert.match(js, /record\('initial'\)/);
    assert.match(js, /get\('download-json'\)/);
    const worker = fs.readFileSync(path.join(root, 'collector-worker.js'), 'utf8');
    assert.match(worker, /expirationTtl: 172800/);
    assert.match(worker, /No cookies, IP or headers stored/);
});
