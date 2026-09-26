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
        sourceUrl: 'https://tam.gov.taipei/news_photo.aspx?n=EF86D8AF23B9A85B&sms=F32C4FF0AC5C2801&page=1&PageSize=20',
        storagePath: '/News_Photo.aspx',
        listId: 'EF86D8AF23B9A85B'
    },
    {
        name: 'News_Link_pic listing',
        fixture: path.join('AutoOpenNewArticles', 'tam.gov.taipei_News_Link_pic.aspx_n_B64052C7930D4913.html'),
        sourceUrl: 'https://tam.gov.taipei/News_Link_pic.aspx?n=B64052C7930D4913',
        storagePath: '/News_Link_pic.aspx',
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

function buildHackerNewsArticle(harness, id, title) {
    const article = harness.document.createElement('article');
    article.className = 'post-item';
    const titleContainer = harness.document.createElement('div');
    titleContainer.className = 'post-title';
    titleContainer.appendChild(createLink(harness.document, `https://example.com/${id}`, { textContent: title }));
    article.appendChild(titleContainer);
    const commentLink = createLink(harness.document, `https://news.ycombinator.com/item?id=${id}`, {
        textContent: 'comments'
    });
    commentLink.setAttribute('rel', 'comment');
    article.appendChild(commentLink);
    const summary = harness.document.createElement('div');
    summary.className = 'post-summary';
    summary.textContent = `Summary for ${title}`;
    article.appendChild(summary);
    harness.appendToBody(article);
    return article;
}

describe('AutoOpenNewArticles on Hacker News Summary', () => {
    test('collapses seen items and supports individual and page-wide expansion without opening tabs', () => {
        const storageKey = 'autoOpenNewArticles:lastSeen:hackernews-summary:listings';
        const openCalls = [];
        const { harness, gmStore } = createAutoOpenHarness(
            'https://hackernews.betacat.io/#sort=time&order=asc',
            { [storageKey]: ['hackernews:101', 'hackernews:100'] },
            openCalls
        );
        const newest = buildHackerNewsArticle(harness, '102', 'Newly submitted');
        const previouslyListed = buildHackerNewsArticle(harness, '101', 'Previously listed');
        const lateArrival = buildHackerNewsArticle(harness, '99', 'Older but newly promoted');

        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.equal(newest.classList.contains('auto-open-new-articles-seen'), false);
        assert.equal(previouslyListed.classList.contains('auto-open-new-articles-seen'), true);
        assert.equal(previouslyListed.classList.contains('auto-open-new-articles-collapsed'), true);
        assert.equal(lateArrival.classList.contains('auto-open-new-articles-seen'), false);
        assert.equal(lateArrival.querySelector('.post-title a').href, 'https://example.com/99');
        const itemToggle = previouslyListed.querySelector('.auto-open-new-articles-item-toggle');
        assert.equal(itemToggle.textContent, '▶');
        assert.equal(itemToggle.getAttribute('aria-expanded'), 'false');
        itemToggle.click();
        assert.equal(previouslyListed.classList.contains('auto-open-new-articles-collapsed'), false);
        assert.equal(previouslyListed.classList.contains('auto-open-new-articles-seen'), false);
        assert.equal(itemToggle.textContent, '▼');

        const allToggle = harness.document.getElementById('auto-open-new-articles-all-toggle');
        assert(allToggle);
        allToggle.click();
        assert.equal(newest.classList.contains('auto-open-new-articles-collapsed'), true);
        assert.equal(previouslyListed.classList.contains('auto-open-new-articles-collapsed'), true);
        assert.equal(lateArrival.classList.contains('auto-open-new-articles-collapsed'), true);
        allToggle.click();
        assert.equal(newest.classList.contains('auto-open-new-articles-collapsed'), false);
        assert.equal(previouslyListed.classList.contains('auto-open-new-articles-seen'), false);
        assert.deepEqual(
            Array.from(gmStore.get(storageKey)),
            ['hackernews:102', 'hackernews:101', 'hackernews:99', 'hackernews:100']
        );
        assert.equal(openCalls.length, 0);
    });

    test('marks every item as seen and jumps immediately to the top when scrollUp is clicked', () => {
        const storageKey = 'autoOpenNewArticles:lastSeen:hackernews-summary:listings';
        const openCalls = [];
        const { harness, gmStore } = createAutoOpenHarness(
            'https://hackernews.betacat.io/#sort=time&order=asc',
            {},
            openCalls
        );
        const first = buildHackerNewsArticle(harness, '202', 'First');
        const second = buildHackerNewsArticle(harness, '201', 'Second');
        const scrollUp = harness.document.createElement('a');
        scrollUp.id = 'scrollUp';
        harness.appendToBody(scrollUp);
        const scrollCalls = [];
        harness.context.window.scrollTo = (options) => scrollCalls.push(options);

        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');
        scrollUp.click();

        assert.equal(first.classList.contains('auto-open-new-articles-seen'), true);
        assert.equal(second.classList.contains('auto-open-new-articles-seen'), true);
        assert.equal(first.classList.contains('auto-open-new-articles-collapsed'), false);
        assert.equal(first.querySelector('.auto-open-new-articles-item-toggle').textContent, '▼');
        assert.deepEqual(Array.from(gmStore.get(storageKey)), ['hackernews:202', 'hackernews:201']);
        assert.equal(scrollCalls.length, 1);
        assert.equal(scrollCalls[0].top, 0);
        assert.equal(scrollCalls[0].left, 0);
        assert.equal(scrollCalls[0].behavior, 'auto');
    });

    test('adds previous, dated weekday, and next navigation above and below a daily archive', () => {
        const openCalls = [];
        const { harness } = createAutoOpenHarness('https://hackernews.betacat.io/daily/2026-03-07', {}, openCalls);
        buildHackerNewsArticle(harness, '302', 'First archive item');
        buildHackerNewsArticle(harness, '301', 'Last archive item');

        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const navigation = harness.document.querySelectorAll('.auto-open-new-articles-date-nav');
        assert.equal(navigation.length, 2);
        navigation.forEach((nav) => {
            assert.equal(nav.children[0].textContent, '<');
            assert.equal(nav.children[0].href, '/daily/2026-03-06');
            assert.equal(nav.children[1].textContent, '2026-03-07 Sat');
            assert.equal(nav.children[1].href, '/daily/2026-03-07');
            assert.equal(nav.children[2].textContent, '>');
            assert.equal(nav.children[2].href, '/daily/2026-03-08');
        });
    });
});

describe('AutoOpenNewArticles on captured Taipei museum listings', () => {
    test('matches lowercase Taipei museum listing URLs used by the site', () => {
        assert.match(scriptContents, /^\/\/ @match\s+https:\/\/tam\.gov\.taipei\/news_photo\.aspx\*$/m);
        assert.match(scriptContents, /^\/\/ @match\s+https:\/\/tam\.gov\.taipei\/news_link_pic\.aspx\*$/m);
    });

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

            const storageKey = `autoOpenNewArticles:lastSeen:${fixtureCase.storagePath}:${fixtureCase.listId}`;
            const latestArticleId = `${fixtureCase.listId}:${new URL(`https://tam.gov.taipei/${articleUrls[0].replace(/^\//, '')}`).searchParams.get('s')}`;

            assert.equal(openCalls.length, 0);
            assert.equal(gmStore.get(storageKey), latestArticleId);
            assert(harness.document.getElementById('auto-open-new-articles-style'));
        });

        test(`${fixtureCase.name} opens unseen articles and marks them with a star`, () => {
            const html = loadFixture(fixtureCase.fixture);
            const articleUrls = extractArticleUrls(html, fixtureCase.listId);
            const secondArticle = new URL(`https://tam.gov.taipei/${articleUrls[1].replace(/^\//, '')}`);
            const storageKey = `autoOpenNewArticles:lastSeen:${fixtureCase.storagePath}:${fixtureCase.listId}`;
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

        const newLink = createLink(harness.document, 'https://www.theneurondaily.com/p/new-agent-release');
        const hiddenMetaSpan = harness.document.createElement('span');
        hiddenMetaSpan.textContent = 'Hidden Meta';
        const titleHeading = harness.document.createElement('h3');
        titleHeading.textContent = 'New Agent Release';
        newLink.append(hiddenMetaSpan, titleHeading);

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
        assert.equal(hiddenMetaSpan.firstChild, null);
    });

    test('reloads the listing page with cache-busting query when the tab becomes active', () => {
        const openCalls = [];
        const { harness } = createAutoOpenHarness('https://www.theneurondaily.com/', {}, openCalls);
        const main = harness.document.createElement('main');
        harness.appendToBody(main);
        main.appendChild(createLink(harness.document, 'https://www.theneurondaily.com/p/latest-ai-breakthrough'));

        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');
        assert.equal(harness.location.reloadCallCount, 0);

        harness.document.visibilityState = 'hidden';
        harness.dispatchDocumentEvent('visibilitychange');
        assert.equal(harness.location.replacedUrl, null);

        harness.document.visibilityState = 'visible';
        harness.dispatchDocumentEvent('visibilitychange');
        assert(harness.location.replacedUrl);
        const replacedUrl = new URL(harness.location.replacedUrl);
        assert.equal(replacedUrl.origin, 'https://www.theneurondaily.com');
        assert.equal(replacedUrl.pathname, '/');
        assert.match(replacedUrl.search, /_tmr=\d+/);
    });
});

describe('AutoOpenNewArticles on Wiwi Blog listing', () => {
    test('stores the latest article and opens unseen Wiwi articles in background tabs', () => {
        const storageKey = 'autoOpenNewArticles:lastSeen:wiwi:blog:listings';
        const openCalls = [];
        const { harness, gmStore } = createAutoOpenHarness(
            'https://wiwi.blog/blog/',
            { [storageKey]: 'wiwi:/blog/older-post' },
            openCalls
        );
        const main = harness.document.createElement('main');
        harness.appendToBody(main);

        const latestLink = createLink(harness.document, 'https://wiwi.blog/blog/new-post', { textContent: 'New Post' });
        const seenLink = createLink(harness.document, 'https://wiwi.blog/blog/older-post', { textContent: 'Older Post' });
        const duplicateLatest = createLink(harness.document, 'https://wiwi.blog/blog/new-post', { textContent: 'Duplicate New Post' });
        const nonArticle = createLink(harness.document, 'https://wiwi.blog/about', { textContent: 'About' });
        main.append(latestLink, seenLink, duplicateLatest, nonArticle);

        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.equal(openCalls.length, 1);
        assert.equal(openCalls[0].href, 'https://wiwi.blog/blog/new-post');
        assert.equal(openCalls[0].options.active, false);
        assert.equal(openCalls[0].options.insert, true);
        assert.equal(gmStore.get(storageKey), 'wiwi:/blog/new-post');
        assert.equal(latestLink.firstChild.textContent, '★');
    });

    test('reloads Wiwi listing with cache-busting query when tab becomes active', () => {
        const openCalls = [];
        const { harness } = createAutoOpenHarness('https://wiwi.blog/blog/', {}, openCalls);
        const main = harness.document.createElement('main');
        harness.appendToBody(main);
        main.appendChild(createLink(harness.document, 'https://wiwi.blog/blog/new-post'));

        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        harness.document.visibilityState = 'visible';
        harness.dispatchDocumentEvent('visibilitychange');
        assert(harness.location.replacedUrl);
        const replacedUrl = new URL(harness.location.replacedUrl);
        assert.equal(replacedUrl.origin, 'https://wiwi.blog');
        assert.equal(replacedUrl.pathname, '/blog/');
        assert.match(replacedUrl.search, /_tmr=\d+/);
    });
});
