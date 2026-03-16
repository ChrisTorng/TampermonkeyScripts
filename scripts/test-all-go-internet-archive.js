const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'AllGoInternetArchive.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');
const archiveTodayFixturePath = path.join(repoRoot, 'tests', 'Archive Today', 'www.404media.co_anyone-can-push-updates-to-the-doge-gov-website-2.html');
const previousArchiveFixturePath = path.join(repoRoot, 'tests', 'Previous Internet Archive, now Archive Today, waiting for next sample', 'www.newyorker.com_news_the-lede_geothermal-power-is-a-climate-moon-shot-beneath-our-feet.html');
const archiveTodayFixtureHtml = fs.readFileSync(archiveTodayFixturePath, 'utf8');
const previousArchiveFixtureHtml = fs.readFileSync(previousArchiveFixturePath, 'utf8');

function executeAllGo(url, setupDom = null) {
    const harness = createHarness({ url, readyState: 'loading' });

    if (typeof setupDom === 'function') {
        setupDom(harness);
    }

    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    harness.dispatchDocumentEvent('DOMContentLoaded');
    return harness;
}

describe('AllGoInternetArchive on captured pages', () => {
    test('fixtures contain captured content for archive-ready hosts', () => {
        assert.match(archiveTodayFixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(archiveTodayFixtureHtml, /404media/i);
        assert.match(previousArchiveFixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(previousArchiveFixtureHtml, /newyorker/i);
    });

    test('supported outbound links receive Archive Today icons and the floating button opens Internet Archive on non-archive hosts', () => {
        const harness = executeAllGo('https://indieweb.org/POSSE', (currentHarness) => {
            const archiveLink = currentHarness.document.createElement('a');
            archiveLink.setAttribute('href', 'https://www.404media.co/anyone-can-push-updates-to-the-doge-gov-website-2/');
            archiveLink.textContent = 'Archived target';

            const regularLink = currentHarness.document.createElement('a');
            regularLink.setAttribute('href', 'https://example.com/plain');
            regularLink.textContent = 'Plain target';

            currentHarness.appendToBody(archiveLink);
            currentHarness.appendToBody(regularLink);
        });

        const links = harness.document.querySelectorAll('a[href]');
        const archiveLink = links[0];
        const regularLink = links[1];
        const button = harness.document.body.children.find((element) => element.tagName === 'BUTTON' && element.textContent === '→');

        assert(archiveLink.querySelector('.agi-archive-today-icon'));
        assert.equal(regularLink.querySelector('.agi-archive-today-icon'), null);
        assert(button, 'Expected floating archive button to be created.');

        button.click();
        assert.equal(harness.location.href, 'https://web.archive.org/https://indieweb.org/POSSE');
    });

    test('mutation observer updates icons for newly added or changed links', () => {
        const harness = executeAllGo('https://indieweb.org/POSSE');
        const dynamicLink = harness.document.createElement('a');
        dynamicLink.setAttribute('href', 'https://example.com/plain');
        harness.appendToBody(dynamicLink);

        harness.triggerMutation([dynamicLink]);
        assert.equal(dynamicLink.querySelector('.agi-archive-today-icon'), null);

        dynamicLink.setAttribute('href', 'https://www.newyorker.com/news/the-lede/geothermal-power-is-a-climate-moon-shot-beneath-our-feet');
        harness.triggerMutation([], {
            type: 'attributes',
            target: dynamicLink,
            attributeName: 'href'
        });

        assert(dynamicLink.querySelector('.agi-archive-today-icon'));
    });

    test('archive.is pages are excluded entirely', () => {
        const harness = executeAllGo('https://archive.is/75aY9');
        const button = harness.document.body.children.find((element) => element.tagName === 'BUTTON' && element.textContent === '→');

        assert.equal(button, undefined);
    });

    test('archive-today-host button opens archive submission url for the current page', () => {
        const harness = executeAllGo('https://www.404media.co/anyone-can-push-updates-to-the-doge-gov-website-2/');
        const button = harness.document.body.children.find((element) => element.tagName === 'BUTTON' && element.textContent === '→');

        assert(button, 'Expected floating archive button on archive-today host.');
        button.click();
        assert.equal(
            harness.location.href,
            'https://archive.is/submit/?url=https://www.404media.co/anyone-can-push-updates-to-the-doge-gov-website-2/'
        );
    });
});
