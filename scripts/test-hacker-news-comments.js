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
    harness.context.fetch = async (requestUrl) => {
        requests.push(String(requestUrl));
        const searchedUrl = new URL(requestUrl).searchParams.get('query');
        return {
            ok: true,
            async json() {
                return { hits: responseForUrl(searchedUrl) };
            }
        };
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
            num_comments: 100
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
        assert.equal(link.textContent, 'Hacker News comments (100)');
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
