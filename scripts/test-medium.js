const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'Medium.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');
const articleFixturePath = path.join(repoRoot, 'tests', 'Medium Auto Reload Once', 'karpathy.medium.com_yes-you-should-understand-backprop-e2f06eab496b.html');
const redirectFixturePath = path.join(repoRoot, 'tests', 'Medium Auto Reload Once', 'medium.com_m_global-identity-2_redirectUrl_https_3A_2F_2Fuxdesign.cc_2Ffear-of-missing-out-on-ai-is-overshadowing-the-fear-of-losing-our-humanity-d628aacfb950.html');
const articleFixtureHtml = fs.readFileSync(articleFixturePath, 'utf8');
const redirectFixtureHtml = fs.readFileSync(redirectFixturePath, 'utf8');

function executeMedium({ url, sessionStorageSeed = {}, referrer = '', setupDom = null }) {
    const harness = createHarness({
        url,
        readyState: 'loading',
        referrer,
        sessionStorageSeed
    });

    if (typeof setupDom === 'function') {
        setupDom(harness);
    }

    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    harness.dispatchDocumentEvent('DOMContentLoaded');
    return harness;
}

describe('Medium auto reload on captured pages', () => {
    test('fixtures contain captured Medium detection signals', () => {
        assert.match(articleFixtureHtml, /CONTENT_CLASS:\s*INVALID_ANTI_BOT/);
        assert.match(articleFixtureHtml, /twitter:app:name:iphone" content="Medium"/);
        assert.match(articleFixtureHtml, /cdn-client\.medium\.com/);
        assert.match(redirectFixtureHtml, /CONTENT_CLASS:\s*INVALID_ANTI_BOT/);
        assert.match(redirectFixtureHtml, /property="al:ios:app_name" content="Medium"/);
        assert.match(redirectFixtureHtml, /cdn-client\.medium\.com/);
    });

    test('Medium-hosted article reloads only once per session', () => {
        const url = 'https://karpathy.medium.com/yes-you-should-understand-backprop-e2f06eab496b';
        const firstRun = executeMedium({ url });
        const sessionKey = 'medium-auto-reload:https://karpathy.medium.com/yes-you-should-understand-backprop-e2f06eab496b';

        assert.equal(firstRun.location.reloadCallCount, 1);
        assert.equal(firstRun.sessionStorage.getItem(sessionKey), 'true');

        const secondRun = executeMedium({
            url,
            sessionStorageSeed: {
                [sessionKey]: 'true'
            }
        });

        assert.equal(secondRun.location.reloadCallCount, 0);
    });

    test('global identity redirect page does not trigger reload', () => {
        const harness = executeMedium({
            url: 'https://medium.com/m/global-identity-2?redirectUrl=https%3A%2F%2Fuxdesign.cc%2Ffear-of-missing-out-on-ai-is-overshadowing-the-fear-of-losing-our-humanity-d628aacfb950'
        });

        assert.equal(harness.location.reloadCallCount, 0);
    });

    test('Medium-powered non-medium domain reloads when detection meta tags are present', () => {
        const url = 'https://uxdesign.cc/fear-of-missing-out-on-ai-is-overshadowing-the-fear-of-losing-our-humanity-d628aacfb950';
        const harness = executeMedium({
            url,
            setupDom(currentHarness) {
                const iosAppName = currentHarness.document.createElement('meta');
                iosAppName.setAttribute('property', 'al:ios:app_name');
                iosAppName.setAttribute('content', 'Medium');
                currentHarness.appendToHead(iosAppName);

                const mediumBundle = currentHarness.document.createElement('script');
                mediumBundle.setAttribute('src', 'https://cdn-client.medium.com/lite/static/js/main.js');
                currentHarness.appendToHead(mediumBundle);
            }
        });
        const sessionKey = 'medium-auto-reload:https://uxdesign.cc/fear-of-missing-out-on-ai-is-overshadowing-the-fear-of-losing-our-humanity-d628aacfb950';

        assert.equal(harness.location.reloadCallCount, 1);
        assert.equal(harness.sessionStorage.getItem(sessionKey), 'true');
    });
});
