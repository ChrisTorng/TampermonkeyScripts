const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'InternetArchive.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');

const redirectCases = [
    {
        name: 'London Review of Books',
        fixture: path.join('Internet Archive', 'www.lrb.co.uk_the-paper_v47_n01_fraser-macdonald_diary.html'),
        sourceUrl: 'https://www.lrb.co.uk/the-paper/v47/n01/fraser-macdonald/diary'
    },
    {
        name: 'Raw Story',
        fixture: path.join('Internet Archive', 'www.rawstory.com_laura-loomer-vs-elon-musk.html'),
        sourceUrl: 'https://www.rawstory.com/laura-loomer-vs-elon-musk/'
    },
    {
        name: 'Sydney Morning Herald',
        fixture: path.join('Internet Archive', 'www.smh.com.au_business_the-economy_trump-is-changing-the-narratives-on-both-sides-of-the-atlantic-20250310-p5liav.html.html'),
        sourceUrl: 'https://www.smh.com.au/business/the-economy/trump-is-changing-the-narratives-on-both-sides-of-the-atlantic-20250310-p5liav.html'
    },
    {
        name: 'The Verge',
        fixture: path.join('Internet Archive', 'www.theverge.com_2025_1_15_24343794_google-workspace-ai-features-free.html'),
        sourceUrl: 'https://www.theverge.com/2025/1/15/24343794/google-workspace-ai-features-free'
    },
    {
        name: 'Previous New Yorker sample',
        fixture: path.join('Previous Internet Archive, now Archive Today, waiting for next sample', 'www.newyorker.com_news_the-lede_geothermal-power-is-a-climate-moon-shot-beneath-our-feet.html'),
        sourceUrl: 'https://www.newyorker.com/news/the-lede/geothermal-power-is-a-climate-moon-shot-beneath-our-feet'
    }
];

function loadFixture(relativePath) {
    const fixturePath = path.join(repoRoot, 'tests', relativePath);
    const html = fs.readFileSync(fixturePath, 'utf8');
    const contentClassMatch = html.match(/<!-- CONTENT_CLASS:\s*([^|]+)\|/);

    assert(contentClassMatch, `Expected fixture ${relativePath} to include a CONTENT_CLASS header.`);
    assert(
        contentClassMatch[1].trim().startsWith('VALID_'),
        `Expected fixture ${relativePath} to represent captured page content.`
    );
    return html;
}

function executeInternetArchive(url) {
    const harness = createHarness({ url });
    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    return harness;
}

describe('InternetArchive redirects captured pages', () => {
    for (const testCase of redirectCases) {
        test(`${testCase.name} redirects to web.archive.org`, () => {
            loadFixture(testCase.fixture);
            const harness = executeInternetArchive(testCase.sourceUrl);
            assert.equal(harness.location.replacedUrl, `https://web.archive.org/${testCase.sourceUrl}`);
        });
    }

    test('web.archive.org host creates Go button and hides Wayback header when content appears', () => {
        const sourceUrl = 'https://web.archive.org/web/20250106005830/https://www.rawstory.com/laura-loomer-vs-elon-musk/';
        const harness = executeInternetArchive(sourceUrl);

        const goButton = harness.document.body.children.find((child) => child.tagName === 'BUTTON');
        assert(goButton, 'Expected a Go button on web.archive.org pages.');
        assert.equal(goButton.textContent, '→');

        goButton.click();
        assert.equal(
            harness.location.href,
            'https://archive.is/submit/?url=https://www.rawstory.com/laura-loomer-vs-elon-musk/'
        );

        const wmIppBase = harness.document.createElement('div');
        wmIppBase.id = 'wm-ipp-base';
        harness.appendToBody(wmIppBase);
        harness.dispatchWindowEvent('load');
        harness.triggerMutation([wmIppBase]);

        assert.equal(wmIppBase.style, 'display: none !important');
    });
});
