const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'HideBanner.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');

function loadFixture(relativePath) {
    return fs.readFileSync(path.join(repoRoot, 'tests', 'HideBanner', relativePath), 'utf8');
}

function executeHideBanner(url) {
    const harness = createHarness({ url, readyState: 'loading' });
    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    return harness;
}

describe('HideBanner on captured pages', () => {
    test('fixtures contain captured content for supported domains', () => {
        const pansci = loadFixture('pansci.asia_archives_380040.html');
        const infoq = loadFixture('www.infoq.cn_article_mjPeD7eDL2XKNNd6zs3M.html');
        const inside = loadFixture('www.inside.com.tw_article_40278-is-taiwan-the-worlds-best-use-case-for-stablecoins.html');

        assert.match(pansci, /CONTENT_CLASS:\s*VALID_/);
        assert.match(pansci, /pansci/i);
        assert.match(infoq, /CONTENT_CLASS:\s*VALID_/);
        assert.match(infoq, /infoq/i);
        assert.match(inside, /CONTENT_CLASS:\s*VALID_/);
        assert.match(inside, /inside/i);
    });

    test('pansci hides configured banners and scrolls to h1', () => {
        const harness = executeHideBanner('https://pansci.asia/archives/380040');
        const navbar = harness.document.createElement('div');
        navbar.id = 'main_navbar';
        const progress = harness.document.createElement('div');
        progress.id = 's-progress-wrap';
        const title = harness.document.createElement('h1');
        title._rect = { top: 120, left: 0, right: 200, bottom: 160, width: 200, height: 40 };
        harness.appendToBody(navbar);
        harness.appendToBody(progress);
        harness.appendToBody(title);

        harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.equal(navbar.style.display, 'none');
        assert.equal(progress.style.display, 'none');
        assert.equal(title.scrollIntoViewCallCount, 1);
    });

    test('inside clicks the article content and scrolls to picture', () => {
        const harness = executeHideBanner('https://www.inside.com.tw/article/40278-is-taiwan-the-worlds-best-use-case-for-stablecoins');
        const article = harness.document.createElement('div');
        article.id = 'article_content';
        let clickCount = 0;
        article.addEventListener('click', () => {
            clickCount += 1;
        });
        const picture = harness.document.createElement('picture');
        picture._rect = { top: 80, left: 0, right: 200, bottom: 280, width: 200, height: 200 };
        harness.appendToBody(article);
        harness.appendToBody(picture);

        harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.ok(clickCount >= 1);
        assert.equal(picture.scrollIntoViewCallCount, 1);
    });

    test('infoq hides fixed chrome and scrolls to article title', () => {
        const harness = executeHideBanner('https://www.infoq.cn/article/mjPeD7eDL2XKNNd6zs3M');
        const audio = harness.document.createElement('div');
        audio.className = 'audioPlayer AudioPlayer_main_HiF3z';
        const header = harness.document.createElement('div');
        header.className = 'header';
        const subNav = harness.document.createElement('div');
        subNav.className = 'sub-nav-wrap';
        const banner = harness.document.createElement('div');
        banner.className = 'geo-banner fixed';
        const title = harness.document.createElement('div');
        title.className = 'article-title';
        title._rect = { top: 100, left: 0, right: 400, bottom: 140, width: 400, height: 40 };
        harness.appendToBody(audio);
        harness.appendToBody(header);
        harness.appendToBody(subNav);
        harness.appendToBody(banner);
        harness.appendToBody(title);

        harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.equal(audio.style.display, 'none');
        assert.equal(header.style.display, 'none');
        assert.equal(subNav.style.display, 'none');
        assert.equal(banner.style.display, 'none');
        assert.equal(title.scrollIntoViewCallCount, 1);
    });

    test('latimes hides overlays, clicks the flyout close button inside shadow DOM, and scrolls to headline', () => {
        const harness = executeHideBanner('https://www.latimes.com/environment/story/2025-12-18/state-regulators-vote-to-keep-utility-profits-high-angering-customers');
        const nav = harness.document.createElement('nav');
        const modalityContent = harness.document.createElement('div');
        modalityContent.className = 'modality-content';
        const modalHost = harness.document.createElement('modality-custom-element');
        modalHost.shadowRoot = harness.document.createDocumentFragment();
        const closeButton = harness.document.createElement('button');
        closeButton.className = 'met-flyout-close';
        let clickCount = 0;
        closeButton.addEventListener('click', () => {
            clickCount += 1;
        });
        modalHost.shadowRoot.appendChild(closeButton);
        const headline = harness.document.createElement('div');
        headline.className = 'head-line';
        headline._rect = { top: 96, left: 0, right: 400, bottom: 136, width: 400, height: 40 };

        harness.appendToBody(nav);
        harness.appendToBody(modalityContent);
        harness.appendToBody(modalHost);
        harness.appendToBody(headline);

        harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.equal(nav.style.display, 'none');
        assert.equal(modalityContent.style.display, 'none');
        assert.equal(clickCount, 1);
        assert.equal(headline.scrollIntoViewCallCount, 1);
    });

    test('antikythera hides menu chrome including shadow content', () => {
        const harness = executeHideBanner('https://whatisintelligence.antikythera.org/chapter-02/');
        const menuHost = harness.document.createElement('antikythera-menu');
        menuHost.shadowRoot = harness.document.createDocumentFragment();
        const menuArticle = harness.document.createElement('article');
        menuHost.shadowRoot.appendChild(menuArticle);
        const chapterHeader = harness.document.createElement('div');
        chapterHeader.id = 'chapter-header';
        const tocButton = harness.document.createElement('button');
        tocButton.className = 'toc-btn';

        harness.appendToBody(menuHost);
        harness.appendToBody(chapterHeader);
        harness.appendToBody(tocButton);

        harness.dispatchDocumentEvent('DOMContentLoaded');

        assert.equal(menuArticle.style.display, 'none');
        assert.equal(chapterHeader.style.display, 'none');
        assert.equal(tocButton.style.display, 'none');
    });
});
