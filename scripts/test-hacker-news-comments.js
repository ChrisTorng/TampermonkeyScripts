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

function executeScript(hits) {
    const harness = createHarness({ url: 'https://blog.exe.dev/engineering-with-ai' });
    const article = harness.document.createElement('article');
    harness.appendToBody(article);
    const requests = [];

    harness.context.fetch = async (url) => {
        requests.push(String(url));
        return {
            ok: true,
            async json() {
                return { hits };
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
        const { harness, article, requests } = executeScript([story]);
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
        const { harness } = executeScript([{
            objectID: '1',
            url: 'https://example.com/a-different-article',
            num_comments: 20
        }]);
        await waitForPromises();

        assert.equal(harness.document.getElementById('tm-hacker-news-comments'), null);
    });
});
