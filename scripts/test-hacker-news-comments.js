const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const fixturePath = path.join(repoRoot, 'tests', 'Hacker News Comments', 'blog.exe.dev_engineering-with-ai.html');
const scriptPath = path.join(repoRoot, 'src', 'HackerNewsComments.user.js');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');

function waitForPromises() {
    return new Promise((resolve) => setImmediate(resolve));
}

function executeScript({
    url = 'https://blog.exe.dev/engineering-with-ai',
    referrer = '',
    history = [],
    responseForUrl = () => []
} = {}) {
    const harness = createHarness({ url, referrer });
    const article = harness.document.createElement('article');
    harness.appendToBody(article);
    const requests = [];

    const tab = {
        hackerNewsCommentsHistory: history,
        hackerNewsCommentsRecordedAt: Date.now()
    };
    harness.context.GM_getTab = (callback) => callback(tab);
    harness.context.GM_saveTab = (savedTab) => Object.assign(tab, savedTab);
    harness.context.GM_xmlhttpRequest = ({ url: requestUrl, onload }) => {
        requests.push(String(requestUrl));
        const searchedUrl = new URL(requestUrl).searchParams.get('query');
        queueMicrotask(() => onload({
            status: 200,
            responseText: JSON.stringify({ hits: responseForUrl(searchedUrl) })
        }));
    };
    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });

    return { harness, article, requests };
}

describe('Hacker News Comments on the captured article', () => {
    test('fixture contains the requested article structure', () => {
        assert.match(fixtureHtml, /CONTENT_CLASS:\s*VALID_ARTICLE_CONTENT/);
        assert.match(fixtureHtml, /<article class="post-content">/);
        assert.match(fixtureHtml, /<footer class="post-footer">/);
    });

    test('adds a right-aligned new-tab link inside the article for an exact URL match', async () => {
        const story = {
            objectID: '49465119',
            url: 'https://blog.exe.dev/engineering-with-ai',
            num_comments: 100,
            points: 68,
            title: 'Six months of writing code exclusively with agents',
            author: 'bryanmikaelian'
        };
        const { harness, article, requests } = executeScript({
            responseForUrl: () => [story]
        });
        await waitForPromises();

        const wrapper = harness.document.getElementById('tm-hacker-news-comments');
        const link = wrapper?.querySelector('a');
        assert(wrapper);
        assert.equal(wrapper.parentNode, article);
        assert.match(wrapper.style.cssText, /justify-content: flex-end/);
        assert.equal(link.href, 'https://news.ycombinator.com/item?id=49465119');
        assert.equal(link.target, '_blank');
        assert.equal(link.rel, 'noopener noreferrer');
        assert.equal(link.textContent, 'Y 100 · ▲68');
        assert.equal(link.title, 'Six months of writing code exclusively with agents · 100 comments · 68 points · submitted by bryanmikaelian');
        assert.equal(link.getAttribute('aria-label'), 'Open Hacker News discussion with 100 comments and 68 points');
        assert.match(link.style.cssText, /background: #ff6600/);
        assert.match(requests[0], /^https:\/\/hn\.algolia\.com\/api\/v1\/search\?/);
    });

    test('does not add a link for a search result with a different URL', async () => {
        const { harness } = executeScript({
            responseForUrl: () => [{
                objectID: '1',
                url: 'https://example.com/a-different-article',
                num_comments: 20
            }]
        });
        await waitForPromises();

        assert.equal(harness.document.getElementById('tm-hacker-news-comments'), null);
    });

    test('ignores Bing and other search-engine referrers when matching a destination page', async () => {
        const destinationUrl = 'https://example.com/article-found-through-search';
        const bingUrl = 'https://www.bing.com/search?q=article+found+through+search';
        const bingStory = {
            objectID: '6937686',
            url: 'https://www.bing.com/',
            num_comments: 24
        };
        const { harness, requests } = executeScript({
            url: destinationUrl,
            referrer: bingUrl,
            history: [
                'https://www.google.com/search?q=another+query',
                'https://duckduckgo.com/?q=another+query',
                bingUrl
            ],
            responseForUrl: () => [bingStory]
        });
        await waitForPromises();

        assert.equal(harness.document.getElementById('tm-hacker-news-comments'), null);
        const searchedUrls = requests.map((request) => new URL(request).searchParams.get('query'));
        assert.deepEqual(searchedUrls, [destinationUrl]);
    });

    test('does not treat a query-specific app URL as its Hacker News-listed root URL', async () => {
        const jawboneUrl = 'https://chatgpt.com/?model=gpt-4o-jawbone';
        const { harness } = executeScript({
            url: jawboneUrl,
            responseForUrl: () => [{
                objectID: '42704795',
                url: 'https://chatgpt.com/',
                title: 'GPT-4o with scheduled tasks (jawbone) is available in beta',
                num_comments: 135,
                points: 249
            }]
        });
        await waitForPromises();

        assert.equal(harness.document.getElementById('tm-hacker-news-comments'), null);
    });

    test('uses a privileged cross-origin request on an OpenAI page with a restrictive CSP', async () => {
        const openAiUrl = 'https://openai.com/index/our-decision-on-cursor-following-its-acquisition-by-spacex/';
        const { harness, requests } = executeScript({
            url: openAiUrl,
            responseForUrl: (searchedUrl) => searchedUrl === openAiUrl ? [{
                objectID: '49486172',
                url: openAiUrl,
                num_comments: 493
            }] : []
        });
        await waitForPromises();

        const link = harness.document.querySelector('#tm-hacker-news-comments a');
        assert.equal(link.href, 'https://news.ycombinator.com/item?id=49486172');
        assert.equal(link.textContent, 'Y 493');
        assert.match(requests[0], /^https:\/\/hn\.algolia\.com\/api\/v1\/search\?/);
        assert.equal(harness.context.fetch, undefined);
    });

    test('remounts the button after a Los Angeles Times client render replaces it', async () => {
        const latimesUrl = 'https://www.latimes.com/environment/story/2026-08-26/highest-ever-ocean-temperature-measured-as-powerful-el-nino-forms';
        const { harness, article } = executeScript({
            url: latimesUrl,
            responseForUrl: (searchedUrl) => searchedUrl === latimesUrl ? [{
                objectID: '49494231',
                url: latimesUrl,
                num_comments: 104
            }] : []
        });
        await waitForPromises();

        const originalWrapper = harness.document.getElementById('tm-hacker-news-comments');
        article.removeChild(originalWrapper);
        harness.triggerMutation([], { target: article, removedNodes: [originalWrapper] });

        const remountedWrapper = harness.document.getElementById('tm-hacker-news-comments');
        assert.equal(remountedWrapper, originalWrapper);
        assert.equal(remountedWrapper.parentNode, article);
        assert.equal(remountedWrapper.querySelector('a').href, 'https://news.ycombinator.com/item?id=49494231');
    });

    test('uses a visible fixed fallback until a dynamically rendered article appears', async () => {
        const url = 'https://example.com/dynamic-article';
        const harness = createHarness({ url });
        const tab = {};
        harness.context.GM_getTab = (callback) => callback(tab);
        harness.context.GM_saveTab = (savedTab) => Object.assign(tab, savedTab);
        harness.context.GM_xmlhttpRequest = ({ onload }) => queueMicrotask(() => onload({
            status: 200,
            responseText: JSON.stringify({ hits: [{ objectID: '123', url, num_comments: 4 }] })
        }));
        harness.context.globalThis = harness.context;
        harness.context.global = harness.context;
        vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
        await waitForPromises();

        const wrapper = harness.document.getElementById('tm-hacker-news-comments');
        assert.equal(wrapper.parentNode, harness.document.body);
        assert.match(wrapper.style.cssText, /position: fixed/);

        const article = harness.document.createElement('article');
        harness.appendToBody(article);
        harness.triggerMutation([article]);
        assert.equal(wrapper.parentNode, article);
        assert.doesNotMatch(wrapper.style.cssText, /position: fixed/);
    });

    test('walks backward through per-tab URLs when a redirect target has no story', async () => {
        const sourceUrl = 'https://blog.exe.dev/engineering-with-ai';
        const { harness, requests } = executeScript({
            url: 'https://web.archive.org/web/20260828/https://blog.exe.dev/engineering-with-ai',
            referrer: sourceUrl,
            history: [sourceUrl],
            responseForUrl: (searchedUrl) => searchedUrl === sourceUrl ? [{
                objectID: '49465119',
                url: sourceUrl,
                num_comments: 100
            }] : []
        });
        await waitForPromises();

        const link = harness.document.querySelector('#tm-hacker-news-comments a');
        assert.equal(link.href, 'https://news.ycombinator.com/item?id=49465119');
        assert.equal(new URL(requests[0]).searchParams.get('query'), 'https://web.archive.org/web/20260828/https://blog.exe.dev/engineering-with-ai');
        assert(requests.some((request) => new URL(request).searchParams.get('query') === sourceUrl));
    });
});
