const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness, createLink } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'AutoOpenNewArticles.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');

const fixtures = [
    {
        name: 'News_Photo listing',
        fixture: path.join('AutoOpenNewArticles', 'tam.gov.taipei_News_Photo.aspx_n_EF86D8AF23B9A85B.html'),
        sourceUrl: 'https://tam.gov.taipei/News_Photo.aspx?n=EF86D8AF23B9A85B',
        listId: 'EF86D8AF23B9A85B'
    },
    {
        name: 'News_Link_pic listing',
        fixture: path.join('AutoOpenNewArticles', 'tam.gov.taipei_News_Link_pic.aspx_n_B64052C7930D4913.html'),
        sourceUrl: 'https://tam.gov.taipei/News_Link_pic.aspx?n=B64052C7930D4913',
        listId: 'B64052C7930D4913'
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

function extractArticleUrls(html, listId) {
    const matches = Array.from(
        html.matchAll(new RegExp(`href="([^"]*News_Content\\.aspx\\?[^"]*n=${listId}[^"]*)"`, 'g'))
    ).map((match) => match[1]);

    return Array.from(new Set(matches)).slice(0, 3);
}

function buildListingDocument(harness, articleUrls) {
    const contentRoot = harness.document.createElement('div');
    contentRoot.id = 'CCMS_Content';
    harness.appendToBody(contentRoot);

    articleUrls.forEach((articleUrl, index) => {
        const link = createLink(harness.document, `https://tam.gov.taipei/${articleUrl.replace(/^\//, '')}`, {
            textContent: `Article ${index + 1}`
        });
        contentRoot.appendChild(link);
    });

    return contentRoot;
}

function createAutoOpenHarness(url, storageSeed, openCalls) {
    const gmStore = new Map(Object.entries(storageSeed || {}));
    const harness = createHarness({ url, readyState: 'loading' });
    harness.context.GM_getValue = (key, fallbackValue) => gmStore.has(key) ? gmStore.get(key) : fallbackValue;
    harness.context.GM_setValue = (key, value) => gmStore.set(key, value);
    harness.context.GM_openInTab = (href, options) => openCalls.push({ href, options });
    return { harness, gmStore };
}

function runAutoOpenScript(harness) {
    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
}

describe('AutoOpenNewArticles on captured Taipei museum listings', () => {
    for (const fixtureCase of fixtures) {
        test(`${fixtureCase.name} stores the newest article on first visit without opening tabs`, () => {
            const html = loadFixture(fixtureCase.fixture);
            const articleUrls = extractArticleUrls(html, fixtureCase.listId);
            assert(articleUrls.length >= 2, 'Expected at least two article URLs in the captured listing.');

            const openCalls = [];
            const { harness, gmStore } = createAutoOpenHarness(fixtureCase.sourceUrl, {}, openCalls);
            buildListingDocument(harness, articleUrls);
            runAutoOpenScript(harness);
            harness.dispatchDocumentEvent('DOMContentLoaded');

            const storageKey = `autoOpenNewArticles:lastSeen:${new URL(fixtureCase.sourceUrl).pathname}:${fixtureCase.listId}`;
            const latestArticleId = `${fixtureCase.listId}:${new URL(`https://tam.gov.taipei/${articleUrls[0].replace(/^\//, '')}`).searchParams.get('s')}`;

            assert.equal(openCalls.length, 0);
            assert.equal(gmStore.get(storageKey), latestArticleId);
            assert(harness.document.getElementById('auto-open-new-articles-style'));
        });

        test(`${fixtureCase.name} opens unseen articles and marks them with a star`, () => {
            const html = loadFixture(fixtureCase.fixture);
            const articleUrls = extractArticleUrls(html, fixtureCase.listId);
            const secondArticle = new URL(`https://tam.gov.taipei/${articleUrls[1].replace(/^\//, '')}`);
            const storageKey = `autoOpenNewArticles:lastSeen:${new URL(fixtureCase.sourceUrl).pathname}:${fixtureCase.listId}`;
            const openCalls = [];
            const { harness, gmStore } = createAutoOpenHarness(
                fixtureCase.sourceUrl,
                { [storageKey]: `${fixtureCase.listId}:${secondArticle.searchParams.get('s')}` },
                openCalls
            );
            const contentRoot = buildListingDocument(harness, articleUrls);
            runAutoOpenScript(harness);
            harness.dispatchDocumentEvent('DOMContentLoaded');

            assert.equal(openCalls.length, 1);
            assert.equal(openCalls[0].href, `https://tam.gov.taipei/${articleUrls[0].replace(/^\//, '')}`);
            assert.equal(openCalls[0].options.active, false);
            assert.equal(openCalls[0].options.insert, true);

            const latestArticle = new URL(`https://tam.gov.taipei/${articleUrls[0].replace(/^\//, '')}`);
            assert.equal(gmStore.get(storageKey), `${fixtureCase.listId}:${latestArticle.searchParams.get('s')}`);
            assert.equal(contentRoot.children[0].firstChild.textContent, '★');
        });
    }
});

describe('AutoOpenNewArticles on The Neuron Daily listings', () => {
    test('stores the latest article on first visit and does not open tabs', () => {
        const openCalls = [];
        const { harness, gmStore } = createAutoOpenHarness('https://www.theneurondaily.com/', {}, openCalls);
        const main = harness.document.createElement('main');
        harness.appendToBody(main);

        const firstLink = createLink(harness.document, 'https://www.theneurondaily.com/p/latest-ai-breakthrough', {
            textContent: 'Latest AI Breakthrough'
        });
        const secondLink = createLink(harness.document, 'https://www.theneurondaily.com/p/older-ai-news', {
            textContent: 'Older AI News'
        });
        main.append(firstLink, secondLink);

        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.equal(openCalls.length, 0);
        assert.equal(gmStore.get('autoOpenNewArticles:lastSeen:theneurondaily:listings'), 'theneurondaily:/p/latest-ai-breakthrough');
    });

    test('opens unseen Neuron Daily articles in background and marks the newest one', () => {
        const openCalls = [];
        const storageKey = 'autoOpenNewArticles:lastSeen:theneurondaily:listings';
        const { harness, gmStore } = createAutoOpenHarness(
            'https://www.theneurondaily.com/archive',
            { [storageKey]: 'theneurondaily:/p/older-ai-news' },
            openCalls
        );
        const section = harness.document.createElement('section');
        harness.appendToBody(section);

        const newLink = createLink(harness.document, 'https://www.theneurondaily.com/p/new-agent-release', {
            textContent: 'New Agent Release'
        });
        const seenLink = createLink(harness.document, 'https://www.theneurondaily.com/p/older-ai-news', {
            textContent: 'Older AI News'
        });
        const duplicateNewLink = createLink(harness.document, 'https://www.theneurondaily.com/p/new-agent-release', {
            textContent: 'Duplicate New Agent Release'
        });

        section.append(newLink, seenLink, duplicateNewLink);
        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.equal(openCalls.length, 1);
        assert.equal(openCalls[0].href, 'https://www.theneurondaily.com/p/new-agent-release');
        assert.equal(openCalls[0].options.active, false);
        assert.equal(openCalls[0].options.insert, true);
        assert.equal(gmStore.get(storageKey), 'theneurondaily:/p/new-agent-release');
        assert.equal(newLink.firstChild.textContent, '★');
    });
});
