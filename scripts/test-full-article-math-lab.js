const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const repo = path.join(__dirname, '..');
const worker = fs.readFileSync(path.join(repo, 'tests/MathVisibilityLab/collector-worker.js'),'utf8');
const client = fs.readFileSync(path.join(repo, 'tests/MathVisibilityLab/full-article-telemetry.js'),'utf8');

test('complete live article is proxied with no diagnostic control panel and no cached content', () => {
    for(const name of ['alexwang','plover','mathjaxdocs'])
        assert.match(worker, new RegExp(name+':\\s*\\'https://'));
    assert.match(worker, /article-source-fetch-failed/);
    assert.match(worker, /text\/html/);
    assert.match(worker, /no-store, max-age=0/);
    assert.match(worker, /noindex,nofollow,noarchive/);
    assert.match(worker, /<base href=/);
    assert.match(worker, /const scripts='<script>window.__tmFullMathLab/);
    assert.match(worker, /const diagScript=/);
    assert.match(worker, /guardRef=/);
    assert.match(worker, /const \[diagResponse,guardResponse\]=await Promise\.all/);
    assert.doesNotMatch(worker, /const scripts='<script>window.__tmFullMathLab[\s\S]*?<script src=/);
    assert.match(worker, /\/full\/article\/\(\[a-z\]\+\)/);
});

test('telemetry uses automatic bounded lifecycle reports, records native translator/maths time series', () => {
    assert.match(client,/MutationObserver/);
    assert.match(client,/pagehide/);
    assert.match(client,/DOMContentLoaded/);
    assert.match(client,/visibilitychange/);
    assert.match(client,/scroll/);
    assert.match(client,/performance|Date\.now/);
    assert.match(client,/function rawNodes/);
    assert.match(client,/data-tm-math-display-guard/);
    assert.match(client,/mathJaxVersion/);
    assert.match(client,/observedTranslation/);
    assert.match(client,/method:'full-article'/);
    assert.match(client,/navigator\.sendBeacon/);
    assert.match(client,/sessionStorage/);
    assert.match(client,/pageLoad/);
    assert.match(client,/splice\(0,Math\.min\(entries\.length,12\)\)/);
    assert.doesNotMatch(client, /document\.body\.append|createElement\(['"]button['"]\)/);
    assert.doesNotMatch(client,/cookie|Authorization/i);
    assert.match(worker,/full-article\)\$\/\.test\(entry\.method/);
    assert.match(worker,/604800/);
});

test('worker limits mirror to allowlisted URLs, never allows arbitrary destinations', () => {
    assert.match(worker,/sourceUrl=fullArticles\[id\]/);
    assert.match(worker,/if \(!sourceUrl\)/);
    assert.doesNotMatch(worker,/searchParams\.get\(['"]url['"]\)/);
});
