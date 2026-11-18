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

function createAutoOpenHarness(url, storageSeed, openCalls, browserNow = null) {
    const gmStore = new Map(Object.entries(storageSeed || {}));
    const harness = createHarness({ url, readyState: 'loading' });
    harness.context.GM_getValue = (key, fallbackValue) => gmStore.has(key) ? gmStore.get(key) : fallbackValue;
    harness.context.GM_setValue = (key, value) => gmStore.set(key, value);
    harness.context.GM_openInTab = (href, options) => openCalls.push({ href, options });
    if (browserNow !== null) {
        harness.context.Date = class BrowserDate extends Date {
            constructor(...args) {
                super(...(args.length > 0 ? args : [browserNow]));
            }
            static now() {
                return browserNow;
            }
        };
    }
    return { harness, gmStore };
}

function runAutoOpenScript(harness) {
    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
}

function assertCollapseControlLayout(button) {
    assert.equal(button.style.getPropertyValue('position'), 'fixed');
    assert.equal(button.style.getPropertyValue('top'), 'auto');
    assert.equal(button.style.getPropertyValue('right'), 'auto');
    assert.equal(button.style.getPropertyValue('bottom'), '16px');
    assert.equal(button.style.getPropertyValue('left'), '16px');
    assert.equal(button.style.getPropertyValue('opacity'), '0.5');
    assert.equal(button.style.getPropertyValue('width'), '44px');
    assert.equal(button.style.getPropertyValue('height'), '34px');
    for (const property of ['position', 'top', 'right', 'bottom', 'left', 'opacity', 'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height']) {
        assert.equal(button.style.getPropertyPriority(property), 'important', `${property} must resist page CSS`);
    }
}

function buildHackerNewsDateMenu(harness, dates) {
    const menu = harness.document.createElement('ul');
    menu.id = 'daily-links-menu';
    dates.forEach((date) => {
        menu.appendChild(createLink(harness.document, `https://hackernews.betacat.io/daily/${date}`, {
            textContent: date
        }));
    });
    harness.appendToBody(menu);
}

function buildHackerNewsUpdateFooter(harness, isoTimestamp) {
    const footer = harness.document.createElement('footer');
    const updated = harness.document.createElement('li');
    updated.className = 'last-updated';
    updated.setAttribute('data-submitted', isoTimestamp);
    footer.appendChild(updated);
    harness.appendToBody(footer);
}

function localTimeLabel(isoTimestamp, referenceTime = new Date()) {
    const date = new Date(isoTimestamp);
    const now = new Date(referenceTime);
    const hhmm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth()
        && date.getDate() === now.getDate()
        ? hhmm
        : `${date.getMonth() + 1}/${date.getDate()} ${hhmm}`;
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
    test('collapses seen items without marking newly listed items as read during page load or review', () => {
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

        const injectedStyle = harness.document.getElementById('auto-open-new-articles-style').textContent;
        assert.match(injectedStyle, /\.auto-open-new-articles-seen\s*\{\s*opacity: 0\.68 !important;/);
        assert.match(injectedStyle, /article\.post-item\.auto-open-new-articles-managed > \.post-title/);
        assert.match(injectedStyle, /padding-left: 34px !important/);
        assert.match(injectedStyle, /:not\(\.tm-blog-bookmarks-save\)/);
        assert.equal(newest.classList.contains('auto-open-new-articles-seen'), false);
        assert.equal(previouslyListed.classList.contains('auto-open-new-articles-seen'), true);
        assert.equal(previouslyListed.classList.contains('auto-open-new-articles-collapsed'), true);
        assert.equal(lateArrival.classList.contains('auto-open-new-articles-seen'), false);
        assert.equal(lateArrival.querySelector('.post-title a').href, 'https://example.com/99');
        const itemToggle = previouslyListed.querySelector('.auto-open-new-articles-item-toggle');
        assert.equal(itemToggle.textContent, '▶');
        assert.equal(itemToggle.getAttribute('aria-expanded'), 'false');
        assert.equal(itemToggle.parentNode, previouslyListed.querySelector('.post-title'));
        assert.equal(previouslyListed.querySelector('.tm-betacat-article-tools'), null);
        itemToggle.click();
        assert.equal(previouslyListed.classList.contains('auto-open-new-articles-collapsed'), false);
        assert.equal(previouslyListed.classList.contains('auto-open-new-articles-seen'), false);
        assert.equal(itemToggle.textContent, '▼');

        const allToggle = harness.document.getElementById('auto-open-new-articles-all-toggle');
        assert(allToggle);
        assertCollapseControlLayout(allToggle);
        assert.equal(allToggle.getAttribute('aria-pressed'), 'false');
        assert.equal(allToggle.style.getPropertyValue('background-color'), 'rgba(0, 0, 0, 0.55)');
        allToggle.click();
        assert.equal(newest.classList.contains('auto-open-new-articles-collapsed'), true);
        assert.equal(previouslyListed.classList.contains('auto-open-new-articles-collapsed'), true);
        assert.equal(lateArrival.classList.contains('auto-open-new-articles-collapsed'), true);
        allToggle.click();
        assert.equal(newest.classList.contains('auto-open-new-articles-collapsed'), false);
        assert.equal(allToggle.getAttribute('aria-pressed'), 'true');
        assert.equal(allToggle.style.getPropertyValue('background-color'), 'rgba(34, 139, 34, 0.85)');
        assert.equal(previouslyListed.classList.contains('auto-open-new-articles-seen'), false);
        assert.deepEqual(Array.from(gmStore.get(storageKey)), ['hackernews:101', 'hackernews:100']);
        assert.equal(openCalls.length, 0);
    });

    test('does not mark Hacker News Summary items as read when the page is reloaded', () => {
        const storageKey = 'autoOpenNewArticles:lastSeen:hackernews-summary:listings';
        const storageSeed = { [storageKey]: ['hackernews:401'] };
        const firstRun = createAutoOpenHarness(
            'https://hackernews.betacat.io/#sort=time&order=asc',
            storageSeed,
            []
        );
        buildHackerNewsArticle(firstRun.harness, '402', 'Unread before reload');
        buildHackerNewsArticle(firstRun.harness, '401', 'Already read');
        runAutoOpenScript(firstRun.harness);
        firstRun.harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.deepEqual(Array.from(firstRun.gmStore.get(storageKey)), ['hackernews:401']);

        const secondRun = createAutoOpenHarness(
            'https://hackernews.betacat.io/#sort=time&order=asc',
            Object.fromEntries(firstRun.gmStore),
            []
        );
        const unreadAfterReload = buildHackerNewsArticle(secondRun.harness, '402', 'Unread after reload');
        const alreadyReadAfterReload = buildHackerNewsArticle(secondRun.harness, '401', 'Already read after reload');
        runAutoOpenScript(secondRun.harness);
        secondRun.harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.equal(unreadAfterReload.classList.contains('auto-open-new-articles-seen'), false);
        assert.equal(unreadAfterReload.classList.contains('auto-open-new-articles-collapsed'), false);
        assert.equal(alreadyReadAfterReload.classList.contains('auto-open-new-articles-seen'), true);
        assert.deepEqual(Array.from(secondRun.gmStore.get(storageKey)), ['hackernews:401']);
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

    test('adds larger short-date navigation using only dates available in the archive menu', () => {
        const openCalls = [];
        const { harness } = createAutoOpenHarness('https://hackernews.betacat.io/daily/2026-03-07', {}, openCalls);
        buildHackerNewsDateMenu(harness, ['2026-03-08', '2026-03-07', '2026-03-05']);
        buildHackerNewsArticle(harness, '302', 'First archive item');
        buildHackerNewsArticle(harness, '301', 'Last archive item');

        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const navigation = harness.document.querySelectorAll('.auto-open-new-articles-date-nav');
        assert.equal(navigation.length, 2);
        navigation.forEach((nav) => {
            assert.equal(nav.children[0].textContent, '‹ 03-05');
            assert.equal(nav.children[0].href, '/daily/2026-03-05');
            assert.equal(nav.children[1].textContent, '03-07');
            assert.equal(nav.children[1].href, '/daily/2026-03-07');
            assert.equal(nav.children[2].textContent, '03-08 ›');
            assert.equal(nav.children[2].href, '/daily/2026-03-08');
        });
        const injectedStyle = harness.document.getElementById('auto-open-new-articles-style').textContent;
        assert.match(injectedStyle, /font-size: 18px !important/);
        assert.match(injectedStyle, /min-height: 44px !important/);
    });

    test('treats the homepage as Latest rather than the newest dated archive', () => {
        const { harness } = createAutoOpenHarness('https://hackernews.betacat.io/#sort=time&order=asc', {}, []);
        buildHackerNewsDateMenu(harness, ['2026-03-08', '2026-03-07', '2026-03-05']);
        buildHackerNewsArticle(harness, '402', 'Live latest item');

        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const navigations = harness.document.querySelectorAll('.auto-open-new-articles-date-nav');
        assert.equal(navigations.length, 2);
        navigations.forEach((navigation) => {
            assert.equal(navigation.children[0].textContent, '‹ 03-08');
            assert.equal(navigation.children[0].href, '/daily/2026-03-08');
            assert.equal(navigation.children[1].textContent, 'Latest');
            assert.equal(navigation.children[1].href, '/');
            assert.equal(navigation.children[2].textContent, '›');
            assert.equal(navigation.children[2].tagName, 'SPAN');
            assert.equal(navigation.children[2].getAttribute('aria-disabled'), 'true');
            assert.equal(navigation.children[2].getAttribute('href'), null);
        });
    });

    test('Latest records the browser load at 23:44 instead of the site footer at 23:22', () => {
        const key = 'autoOpenNewArticles:hackerNewsSummary:latestLoads';
        const oldKey = 'autoOpenNewArticles:hackerNewsSummary:updateHistory';
        const browserNow = new Date(2026, 10, 17, 23, 44).getTime();
        const { harness, gmStore } = createAutoOpenHarness('https://hackernews.betacat.io/', {
            [oldKey]: { current: '2026-11-17T15:22:00Z', previous: '2026-11-17T08:54:00Z' }
        }, [], browserNow);
        buildHackerNewsDateMenu(harness, ['2026-11-16', '2026-11-15']);
        buildHackerNewsArticle(harness, '900', 'Fresh story');
        buildHackerNewsUpdateFooter(harness, '2026-11-17T15:22:00Z');

        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const navigations = harness.document.querySelectorAll('.auto-open-new-articles-date-nav');
        assert.equal(navigations.length, 2);
        navigations.forEach((nav) => {
            assert.equal(nav.children.length, 5);
            assert.equal(nav.children[0].textContent, '‹ 11-16');
            assert.equal(nav.children[1].textContent, 'Latest');
            assert.equal(nav.children[2].textContent, '›');
            assert.equal(nav.children[3].tagName, 'TIME');
            assert.equal(nav.children[3].textContent, '—');
            assert.equal(nav.children[3].getAttribute('datetime'), null);
            assert.equal(nav.children[4].textContent, '23:44');
            assert.equal(nav.children[4].getAttribute('datetime'), new Date(browserNow).toISOString());
        });
        assert.equal(gmStore.get(key).current, new Date(browserNow).toISOString());
        assert.equal(gmStore.get(key).previous, null);
        assert.equal(gmStore.get(oldKey).current, '2026-11-17T15:22:00Z');

        const styles = harness.document.getElementById('auto-open-new-articles-style').textContent;
        assert.match(styles, /\.auto-open-new-articles-update-time\.previous\s*\{\s*grid-column: 1 !important;/);
        assert.match(styles, /\.auto-open-new-articles-update-time\.current\s*\{\s*grid-column: 2 !important;/);
        assert.match(styles, /white-space: nowrap !important;/);
    });

    test('repeated browser refreshes rotate the latest and previous load times even if website timestamp stays the same', () => {
        const key = 'autoOpenNewArticles:hackerNewsSummary:latestLoads';
        const footerTime = '2026-11-17T15:22:00Z';
        const t1 = new Date(2026, 10, 17, 23, 44).getTime();
        const t2 = new Date(2026, 10, 18, 0, 14).getTime();
        const t3 = new Date(2026, 10, 18, 0, 30).getTime();
        const render = (browserTime, storage) => {
            const { harness, gmStore } = createAutoOpenHarness('https://hackernews.betacat.io/', storage, [], browserTime);
            buildHackerNewsDateMenu(harness, ['2026-11-16', '2026-11-15']);
            buildHackerNewsArticle(harness, '901', 'Unchanged story');
            buildHackerNewsUpdateFooter(harness, footerTime);
            runAutoOpenScript(harness);
            harness.dispatchDocumentEvent('DOMContentLoaded');
            return { nav: harness.document.querySelector('.auto-open-new-articles-date-nav'), gmStore };
        };

        const visit1 = render(t1, {});
        assert.equal(visit1.nav.children[3].textContent, '—');
        assert.equal(visit1.nav.children[4].textContent, '23:44');

        const visit2 = render(t2, Object.fromEntries(visit1.gmStore));
        assert.equal(visit2.nav.children[3].textContent, '11/17 23:44');
        assert.equal(visit2.nav.children[4].textContent, '00:14');
        assert.equal(visit2.gmStore.get(key).previous, new Date(t1).toISOString());
        assert.equal(visit2.gmStore.get(key).current, new Date(t2).toISOString());

        const visit3 = render(t3, Object.fromEntries(visit2.gmStore));
        assert.equal(visit3.nav.children[3].textContent, '00:14');
        assert.equal(visit3.nav.children[4].textContent, '00:30');
        assert.equal(visit3.gmStore.get(key).previous, new Date(t2).toISOString());
        assert.equal(visit3.gmStore.get(key).current, new Date(t3).toISOString());
    });

    test('Latest shows browser times with no footer; opening a dated archive never changes Latest load history', () => {
        const key = 'autoOpenNewArticles:hackerNewsSummary:latestLoads';
        const browserNow = new Date(2026, 10, 17, 23, 44).getTime();
        const { harness, gmStore } = createAutoOpenHarness('https://hackernews.betacat.io/', {}, [], browserNow);
        buildHackerNewsDateMenu(harness, ['2026-11-16', '2026-11-15']);
        buildHackerNewsArticle(harness, '902', 'No footer needed');
        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');
        const latestNav = harness.document.querySelector('.auto-open-new-articles-date-nav');
        assert.equal(latestNav.children.length, 5);
        assert.equal(latestNav.children[4].textContent, '23:44');
        assert.equal(gmStore.get(key).current, new Date(browserNow).toISOString());

        const archive = createAutoOpenHarness(
            'https://hackernews.betacat.io/daily/2026-11-16',
            Object.fromEntries(gmStore), [], browserNow + 60000
        );
        buildHackerNewsDateMenu(archive.harness, ['2026-11-16', '2026-11-15']);
        buildHackerNewsArticle(archive.harness, '903', 'Archived story');
        buildHackerNewsUpdateFooter(archive.harness, '2026-11-16T01:02:03Z');
        runAutoOpenScript(archive.harness);
        archive.harness.dispatchDocumentEvent('DOMContentLoaded');
        assert.equal(archive.harness.document.querySelector('.auto-open-new-articles-date-nav').children.length, 3);
        assert.equal(archive.gmStore.get(key).current, new Date(browserNow).toISOString());
    });

    test('links the newest dated archive forward to the separate Latest view', () => {
        const { harness } = createAutoOpenHarness('https://hackernews.betacat.io/daily/2026-10-28', {}, []);
        buildHackerNewsDateMenu(harness, ['2026-10-28', '2026-10-27', '2026-10-26']);
        buildHackerNewsArticle(harness, '403', 'Newest dated archive item');

        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const navigations = harness.document.querySelectorAll('.auto-open-new-articles-date-nav');
        assert.equal(navigations.length, 2);
        navigations.forEach((navigation) => {
            assert.equal(navigation.children[0].textContent, '‹ 10-27');
            assert.equal(navigation.children[0].href, '/daily/2026-10-27');
            assert.equal(navigation.children[1].textContent, '10-28');
            assert.equal(navigation.children[1].href, '/daily/2026-10-28');
            assert.equal(navigation.children[2].textContent, 'Latest ›');
            assert.equal(navigation.children[2].href, '/');
        });
    });

    test('disables navigation before the earliest available dated archive', () => {
        const { harness } = createAutoOpenHarness('https://hackernews.betacat.io/daily/2026-03-05', {}, []);
        buildHackerNewsDateMenu(harness, ['2026-03-08', '2026-03-07', '2026-03-05']);
        buildHackerNewsArticle(harness, '404', 'Oldest archive item');

        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const navigation = harness.document.querySelector('.auto-open-new-articles-date-nav');
        assert.equal(navigation.children[0].tagName, 'SPAN');
        assert.equal(navigation.children[0].getAttribute('aria-disabled'), 'true');
        assert.equal(navigation.children[1].textContent, '03-05');
        assert.equal(navigation.children[2].textContent, '03-07 ›');
        assert.equal(navigation.children[2].href, '/daily/2026-03-07');
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

function buildPopularityArticle(harness, id, points, comments, timestamp) {
    const article = buildHackerNewsArticle(harness, id, `Popularity story ${id}`);
    const meta = harness.document.createElement('div');
    meta.className = 'post-meta';

    const score = harness.document.createElement('span');
    score.className = 'score';
    score.title = 'Score';
    const pointsNumber = harness.document.createElement('span');
    pointsNumber.textContent = String(points);
    score.appendChild(pointsNumber);

    const comment = harness.document.createElement('span');
    comment.className = 'comment';
    comment.title = 'Comments';
    const commentLink = createLink(harness.document, `https://news.ycombinator.com/item?id=${id}`);
    const commentNumber = harness.document.createElement('span');
    commentNumber.textContent = String(comments);
    commentLink.appendChild(commentNumber);
    comment.appendChild(commentLink);

    const date = harness.document.createElement('span');
    date.className = 'last-updated';
    if (timestamp) date.setAttribute('data-submitted', timestamp);

    meta.append(score, comment, date);
    article.insertBefore(meta, article.querySelector('.post-summary'));
    return { article, score, comment, pointsNumber, commentNumber, commentLink };
}

function popularityLightness(metric) {
    const color = metric.style.getPropertyValue('--tm-popularity-color');
    const match = color.match(/hsl\(50 [\d.]+% ([\d.]+)%\)/);
    assert(match, `Expected computed popularity color, received ${color}`);
    return Number(match[1]);
}

describe('BetaCat time-normalized popularity highlighting', () => {
    test('uses the score, comment and submitted-time markup from a captured BetaCat page', () => {
        const html = fs.readFileSync(path.join(repoRoot, 'tests', 'Better Mobile View', 'hackernews.betacat.io.html'), 'utf8');
        assert.match(html, /class="post-meta"/);
        assert.match(html, /class="score" title="Score"/);
        assert.match(html, /class="comment" title="Comments"/);
        assert.match(html, /class="last-updated"[\s\S]*?data-submitted="/);
    });

    test('same totals are brighter when earned in fewer hours and links remain functional', () => {
        const now = Date.parse('2026-11-18T08:00:00Z');
        const { harness } = createAutoOpenHarness('https://hackernews.betacat.io/', {}, [], now);
        const recent = buildPopularityArticle(harness, '610', 90, 36, new Date(now - 3600000).toISOString());
        const older = buildPopularityArticle(harness, '611', 90, 36, new Date(now - 12 * 3600000).toISOString());

        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        for (const metric of [recent.pointsNumber, recent.commentNumber, older.pointsNumber, older.commentNumber]) {
            assert(metric.classList.contains('auto-open-new-articles-popularity'));
            assert(metric.classList.contains('auto-open-new-articles-popularity-hot'));
        }
        assert(popularityLightness(recent.pointsNumber) < popularityLightness(older.pointsNumber));
        assert(popularityLightness(recent.commentNumber) < popularityLightness(older.commentNumber));
        // Only numeric glyphs get backgrounds, not chevrons, comment icons or delimiters.
        assert(!recent.score.classList.contains('auto-open-new-articles-popularity'));
        assert(!recent.comment.classList.contains('auto-open-new-articles-popularity'));
        assert.equal(recent.pointsNumber.style.getPropertyValue('--tm-popularity-color').startsWith('hsl(50 '), true);
        assert.equal(recent.pointsNumber.textContent, '90');
        assert.equal(recent.commentNumber.textContent, '36');
        assert.equal(recent.commentLink.href, 'https://news.ycombinator.com/item?id=610');
        assert.match(recent.score.title, /平滑平均/);
        assert.match(recent.comment.title, /非即時增量/);
        assert.equal(recent.article.classList.contains('auto-open-new-articles-collapsed'), false);
    });

    test('page maxima reach full yellow and other values retain continuous proportional differences', () => {
        const now = Date.parse('2026-11-18T08:00:00Z');
        const { harness } = createAutoOpenHarness('https://hackernews.betacat.io/', {}, [], now);
        const medium = buildPopularityArticle(harness, '700', 86, 43, new Date(now - 3600000).toISOString());
        const large = buildPopularityArticle(harness, '701', 190, 90, new Date(now - 3600000).toISOString());
        const huge = buildPopularityArticle(harness, '702', 500, 240, new Date(now - 3600000).toISOString());
        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');
        assert(popularityLightness(medium.pointsNumber) > popularityLightness(large.pointsNumber));
        assert(popularityLightness(large.pointsNumber) > popularityLightness(huge.pointsNumber));
        assert(popularityLightness(medium.commentNumber) > popularityLightness(large.commentNumber));
        assert(popularityLightness(large.commentNumber) > popularityLightness(huge.commentNumber));
        // The hottest score AND the hottest comment value each use the vivid yellow maximum.
        assert.equal(popularityLightness(huge.pointsNumber), 54);
        assert.equal(popularityLightness(huge.commentNumber), 54);
        assert(popularityLightness(medium.pointsNumber) >= 80);
        assert.match(huge.score.title, /本頁相對熱度 100\.0%/);
    });

    test('a nearly uniform page gives every article a bright yellow, without a fixed global threshold', () => {
        const now = Date.parse('2026-11-18T08:00:00Z');
        const { harness } = createAutoOpenHarness('https://hackernews.betacat.io/', {}, [], now);
        const a = buildPopularityArticle(harness, '710', 12, 5, new Date(now - 3600000).toISOString());
        const b = buildPopularityArticle(harness, '711', 13, 6, new Date(now - 3600000).toISOString());
        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');
        assert.equal(popularityLightness(b.pointsNumber), 54);
        assert.equal(popularityLightness(b.commentNumber), 54);
        assert(popularityLightness(a.pointsNumber) <= 60);
        assert(popularityLightness(a.commentNumber) <= 62);
    });

    test('each metric uses its own page maximum instead of combined score and comment counts', () => {
        const now = Date.parse('2026-11-18T08:00:00Z');
        const { harness } = createAutoOpenHarness('https://hackernews.betacat.io/', {}, [], now);
        const mostPoints = buildPopularityArticle(harness, '720', 300, 5, new Date(now - 3600000).toISOString());
        const mostComments = buildPopularityArticle(harness, '721', 50, 65, new Date(now - 3600000).toISOString());
        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');
        assert.equal(popularityLightness(mostPoints.pointsNumber), 54);
        assert.equal(popularityLightness(mostComments.commentNumber), 54);
        assert(popularityLightness(mostPoints.commentNumber) > popularityLightness(mostComments.commentNumber));
        assert(popularityLightness(mostComments.pointsNumber) > popularityLightness(mostPoints.pointsNumber));
    });

    test('a handful of new votes never appears hotter than a sustained fast-growing story', () => {
        const now = Date.parse('2026-11-18T08:00:00Z');
        const { harness } = createAutoOpenHarness('https://hackernews.betacat.io/', {}, [], now);
        const tiny = buildPopularityArticle(harness, '620', 3, 1, new Date(now - 5 * 60000).toISOString());
        const fast = buildPopularityArticle(harness, '621', 110, 45, new Date(now - 2 * 3600000).toISOString());

        runAutoOpenScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        assert(tiny.pointsNumber.classList.contains('auto-open-new-articles-popularity-hot'));
        assert(tiny.commentNumber.classList.contains('auto-open-new-articles-popularity-hot'));
        assert(fast.pointsNumber.classList.contains('auto-open-new-articles-popularity-hot'));
        assert(fast.commentNumber.classList.contains('auto-open-new-articles-popularity-hot'));
        assert(popularityLightness(tiny.pointsNumber) > popularityLightness(fast.pointsNumber));
        assert(popularityLightness(tiny.commentNumber) > popularityLightness(fast.commentNumber));
    });

    test('historical archives and missing timestamps keep legible neutral totals, not misleading heat', () => {
        const now = Date.parse('2026-11-18T08:00:00Z');
        const archived = createAutoOpenHarness('https://hackernews.betacat.io/daily/2026-11-17', {}, [], now);
        const old = buildPopularityArticle(archived.harness, '630', 900, 300, new Date(now - 24 * 3600000).toISOString());
        runAutoOpenScript(archived.harness);
        archived.harness.dispatchDocumentEvent('DOMContentLoaded');
        assert(old.pointsNumber.classList.contains('auto-open-new-articles-popularity'));
        assert(!old.pointsNumber.classList.contains('auto-open-new-articles-popularity-hot'));
        assert(!old.commentNumber.classList.contains('auto-open-new-articles-popularity-hot'));

        const latest = createAutoOpenHarness('https://hackernews.betacat.io/', {}, [], now);
        const undated = buildPopularityArticle(latest.harness, '631', 900, 300, null);
        runAutoOpenScript(latest.harness);
        latest.harness.dispatchDocumentEvent('DOMContentLoaded');
        assert(undated.pointsNumber.classList.contains('auto-open-new-articles-popularity'));
        assert(!undated.pointsNumber.classList.contains('auto-open-new-articles-popularity-hot'));
        assert.match(undated.score.title, /不計算熱度/);
    });
});
