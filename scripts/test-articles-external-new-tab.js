const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness, createLink, createMouseEvent } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'ArticlesExternalNewTab.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');

function loadFixture(relativePath) {
    const fixturePath = path.join(repoRoot, 'tests', 'ArticlesExternalNewTab', relativePath);
    const html = fs.readFileSync(fixturePath, 'utf8');
    const contentClassMatch = html.match(/<!-- CONTENT_CLASS:\s*([^|]+)\|/);

    assert(contentClassMatch, `Expected fixture ${relativePath} to include a CONTENT_CLASS header.`);
    return html;
}

function createArticlesHarness(url, openCalls) {
    const harness = createHarness({ url, readyState: 'loading' });
    harness.context.GM_openInTab = (href, options) => openCalls.push({ href, options });
    return harness;
}

function runArticlesScript(harness) {
    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
}

describe('ArticlesExternalNewTab on captured listings', () => {
    test('news.ycombinator.com opens external articles in background tabs but leaves internal links alone', () => {
        const html = loadFixture('news.ycombinator.com.html');
        const externalUrl = html.match(/titleline"><a href="(https:\/\/[^"]+)"/)[1];
        assert(externalUrl, 'Expected an external article link in the Hacker News fixture.');

        const openCalls = [];
        const harness = createArticlesHarness('https://news.ycombinator.com/', openCalls);
        const externalLink = createLink(harness.document, externalUrl, { textContent: 'external' });
        const internalLink = createLink(harness.document, 'https://news.ycombinator.com/item?id=46868759', { textContent: 'internal' });
        harness.appendToBody(externalLink);
        harness.appendToBody(internalLink);
        runArticlesScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.equal(externalLink.target, '_blank');
        assert.match(externalLink.rel, /noopener/);
        assert.equal(internalLink.target, '');
        assert.equal(harness.document.body.children.some((child) => child.textContent === '↗︎'), true);

        const clickEvent = createMouseEvent('click');
        externalLink.dispatchEvent(clickEvent);
        assert.equal(clickEvent.defaultPrevented, true);
        assert.equal(openCalls[0].href, externalUrl);
        assert.equal(openCalls[0].options.active, false);
        assert.equal(openCalls[0].options.insert, true);
    });

    test('hackernews.betacat.io opens comment links on news.ycombinator.com in a background tab', () => {
        const html = loadFixture('hackernews.betacat.io.html');
        const commentUrl = html.match(/href="(https:\/\/news\.ycombinator\.com\/item\?id=\d+)"/)[1];
        assert(commentUrl, 'Expected a comment link in the Hacker News Summary fixture.');

        const openCalls = [];
        const harness = createArticlesHarness('https://hackernews.betacat.io/', openCalls);
        const commentLink = createLink(harness.document, commentUrl, { textContent: 'comments' });
        const summaryLink = createLink(harness.document, 'https://hackernews.betacat.io/#internal', { textContent: 'summary' });
        harness.appendToBody(commentLink);
        harness.appendToBody(summaryLink);
        runArticlesScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.equal(commentLink.target, '_blank');
        assert.equal(summaryLink.target, '');

        const clickEvent = createMouseEvent('click');
        commentLink.dispatchEvent(clickEvent);
        assert.equal(clickEvent.defaultPrevented, true);
        assert.equal(openCalls[0].href, commentUrl);
        assert.equal(openCalls[0].options.active, false);
        assert.equal(openCalls[0].options.insert, true);
    });

    test('Taipei museum listing opens News_Content links in background tabs', () => {
        const html = loadFixture('tam.gov.taipei_News_Photo_EF86D8AF23B9A85B.html');
        const contentUrl = html.match(/href="(News_Content\.aspx[^"]+)"/)[1];
        assert(contentUrl, 'Expected a News_Content link in the Taipei museum fixture.');

        const openCalls = [];
        const harness = createArticlesHarness('https://tam.gov.taipei/News_Photo.aspx?n=EF86D8AF23B9A85B', openCalls);
        const contentLink = createLink(harness.document, `https://tam.gov.taipei/${contentUrl}`, { textContent: 'news' });
        const unrelatedLink = createLink(harness.document, 'https://tam.gov.taipei/cp.aspx?n=foo', { textContent: 'cp' });
        harness.appendToBody(contentLink);
        harness.appendToBody(unrelatedLink);
        runArticlesScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.equal(contentLink.target, '_blank');
        assert.equal(unrelatedLink.target, '');

        const clickEvent = createMouseEvent('click');
        contentLink.dispatchEvent(clickEvent);
        assert.equal(clickEvent.defaultPrevented, true);
        assert.equal(openCalls[0].href, `https://tam.gov.taipei/${contentUrl}`);
        assert.equal(openCalls[0].options.active, false);
        assert.equal(openCalls[0].options.insert, true);
    });

    test('Taipei museum link-pic listing opens News_Content links in background tabs', () => {
        const html = loadFixture('tam.gov.taipei_News_Link_pic_B64052C7930D4913.html');
        const contentUrl = html.match(/href="(News_Content\.aspx[^"]+)"/)[1];
        assert(contentUrl, 'Expected a News_Content link in the Taipei museum link-pic fixture.');

        const openCalls = [];
        const harness = createArticlesHarness('https://tam.gov.taipei/News_Link_pic.aspx?n=B64052C7930D4913&sms=2CF1F5E2E0B96411', openCalls);
        const contentLink = createLink(harness.document, `https://tam.gov.taipei/${contentUrl}`, { textContent: 'news' });
        harness.appendToBody(contentLink);
        runArticlesScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const clickEvent = createMouseEvent('click');
        contentLink.dispatchEvent(clickEvent);
        assert.equal(clickEvent.defaultPrevented, true);
        assert.equal(openCalls[0].href, `https://tam.gov.taipei/${contentUrl}`);
        assert.equal(openCalls[0].options.active, false);
        assert.equal(openCalls[0].options.insert, true);
    });

    test('The Neuron Daily homepage opens article links in background tabs', () => {
        const html = loadFixture('www.theneurondaily.com.html');
        assert.match(html, /CONTENT_CLASS:\s*INVALID_ANTI_BOT/);

        const openCalls = [];
        const harness = createArticlesHarness('https://www.theneurondaily.com/', openCalls);
        const articleLink = createLink(harness.document, 'https://www.theneurondaily.com/p/you-can-now-build-agents-and-apps-inside-chatgpt', {
            textContent: 'article'
        });
        const internalLink = createLink(harness.document, 'https://www.theneurondaily.com/about', {
            textContent: 'about'
        });
        harness.appendToBody(articleLink);
        harness.appendToBody(internalLink);
        runArticlesScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        const clickEvent = createMouseEvent('click');
        articleLink.dispatchEvent(clickEvent);
        assert.equal(clickEvent.defaultPrevented, true);
        assert.equal(articleLink.target, '_blank');
        assert.equal(internalLink.target, '');
        assert.equal(openCalls[0].href, 'https://www.theneurondaily.com/p/you-can-now-build-agents-and-apps-inside-chatgpt');
    });

    test('The Neuron Daily article sanitizes tracking parameters for external links', () => {
        const html = loadFixture('www.theneurondaily.com_p_you-can-now-build-agents-and-apps-inside-chatgpt.html');
        assert.match(html, /CONTENT_CLASS:\s*INVALID_ANTI_BOT/);

        const openCalls = [];
        const harness = createArticlesHarness(
            'https://www.theneurondaily.com/p/you-can-now-build-agents-and-apps-inside-chatgpt',
            openCalls
        );
        const externalLink = createLink(
            harness.document,
            'https://openai.com/index/chatgpt/?utm_source=neuron&utm_medium=email&utm_campaign=test',
            { textContent: 'external' }
        );
        harness.appendToBody(externalLink);
        runArticlesScript(harness);
        harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.equal(
            externalLink.href,
            'https://openai.com/index/chatgpt/'
        );

        const clickEvent = createMouseEvent('click');
        externalLink.dispatchEvent(clickEvent);
        assert.equal(clickEvent.defaultPrevented, true);
        assert.equal(openCalls[0].href, 'https://openai.com/index/chatgpt/');
    });
});
