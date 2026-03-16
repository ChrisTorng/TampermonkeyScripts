const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'ArchiveToday.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');

const redirectCases = [
    {
        name: '404 Media',
        fixture: 'www.404media.co_anyone-can-push-updates-to-the-doge-gov-website-2.html',
        sourceUrl: 'https://www.404media.co/anyone-can-push-updates-to-the-doge-gov-website-2/'
    },
    {
        name: 'Economist',
        fixture: 'www.economist.com_interactive_christmas-specials_2024_12_21_the-chart-of-everything.html',
        sourceUrl: 'https://www.economist.com/interactive/christmas-specials/2024/12/21/the-chart-of-everything',
        allowBlockedFixture: true
    },
    {
        name: 'Financial Times',
        fixture: 'www.ft.com_content_a3eeb268-5daa-4525-858b-eab93b28d3c7.html',
        sourceUrl: 'https://www.ft.com/content/a3eeb268-5daa-4525-858b-eab93b28d3c7'
    },
    {
        name: 'Nature',
        fixture: 'www.nature.com_articles_d41586-025-00648-5.html',
        sourceUrl: 'https://www.nature.com/articles/d41586-025-00648-5'
    },
    {
        name: 'New Scientist',
        fixture: 'www.newscientist.com_article_2458385-ai-uses-throat-vibrations-to-work-out-what-someone-is-trying-to-say.html',
        sourceUrl: 'https://www.newscientist.com/article/2458385-ai-uses-throat-vibrations-to-work-out-what-someone-is-trying-to-say/'
    },
    {
        name: 'New Yorker',
        fixture: 'www.newyorker.com_magazine_2025_02_17_the-long-flight-to-teach-an-endangered-ibis-species-to-migrate.html',
        sourceUrl: 'https://www.newyorker.com/magazine/2025/02/17/the-long-flight-to-teach-an-endangered-ibis-species-to-migrate'
    },
    {
        name: 'New York Times',
        fixture: 'www.nytimes.com_2024_12_23_health_mpox-spread-congo-kinshasa.html.html',
        sourceUrl: 'https://www.nytimes.com/2024/12/23/health/mpox-spread-congo-kinshasa.html',
        allowBlockedFixture: true
    },
    {
        name: 'The Atlantic magazine',
        fixture: 'www.theatlantic.com_magazine_archive_2025_02_american-loneliness-personality-politics_681091.html',
        sourceUrl: 'https://www.theatlantic.com/magazine/archive/2025/02/american-loneliness-personality-politics/681091/'
    },
    {
        name: 'The Atlantic health',
        fixture: 'www.theatlantic.com_health_archive_2015_07_split-brain-research-sperry-gazzaniga_399290.html',
        sourceUrl: 'https://www.theatlantic.com/health/archive/2015/07/split-brain-research-sperry-gazzaniga/399290/'
    },
    {
        name: 'Wired',
        fixture: 'www.wired.com_story_elon-musk-government-young-engineers.html',
        sourceUrl: 'https://www.wired.com/story/elon-musk-government-young-engineers/'
    },
    {
        name: 'Wall Street Journal',
        fixture: 'www.wsj.com_world_dozens-feared-dead-in-crash-after-passenger-flight-diverts-from-russia-fb2cdf2c.html',
        sourceUrl: 'https://www.wsj.com/world/dozens-feared-dead-in-crash-after-passenger-flight-diverts-from-russia-fb2cdf2c',
        allowBlockedFixture: true
    }
];

function loadFixture(relativePath, allowBlockedFixture = false) {
    const fixturePath = path.join(repoRoot, 'tests', 'Archive Today', relativePath);
    const html = fs.readFileSync(fixturePath, 'utf8');
    const contentClassMatch = html.match(/<!-- CONTENT_CLASS:\s*([^|]+)\|/);

    assert(contentClassMatch, `Expected fixture ${relativePath} to include a CONTENT_CLASS header.`);
    if (!allowBlockedFixture) {
        assert(
            contentClassMatch[1].trim().startsWith('VALID_'),
            `Expected fixture ${relativePath} to represent captured page content.`
        );
    }
    return html;
}

function executeArchiveToday(url) {
    const harness = createHarness({ url });
    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    return harness;
}

describe('ArchiveToday redirects captured pages', () => {
    for (const testCase of redirectCases) {
        test(`${testCase.name} redirects to archive.is submit`, () => {
            loadFixture(testCase.fixture, testCase.allowBlockedFixture === true);
            const harness = executeArchiveToday(testCase.sourceUrl);
            assert.equal(
                harness.location.replacedUrl,
                `https://archive.is/submit/?url=${testCase.sourceUrl}`
            );
        });
    }

    test('archive.is host hides DIVALREADY and scrolls SOLID on load', () => {
        const harness = executeArchiveToday('https://archive.is/example');
        const divAlready = harness.document.createElement('div');
        divAlready.id = 'DIVALREADY';
        divAlready.style.display = 'block';
        const solid = harness.document.createElement('div');
        solid.id = 'SOLID';

        harness.appendToBody(divAlready);
        harness.appendToBody(solid);
        harness.dispatchWindowEvent('load');

        assert.equal(harness.location.replacedUrl, null);
        assert.equal(divAlready.style.display, 'none');
        assert.equal(solid.scrollIntoViewCallCount, 1);
    });
});
