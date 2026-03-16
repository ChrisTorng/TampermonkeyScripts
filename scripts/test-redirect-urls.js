const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { describe, test } = require('node:test');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'RedirectUrls.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');

function loadFixture(relativePath) {
    const fixturePath = path.join(repoRoot, 'tests', 'RedirectUrls', relativePath);
    const html = fs.readFileSync(fixturePath, 'utf8');
    const contentClassMatch = html.match(/<!-- CONTENT_CLASS:\s*([^|]+)\|/);

    assert(contentClassMatch, `Expected fixture ${relativePath} to include a CONTENT_CLASS header.`);
    assert(
        contentClassMatch[1].trim().startsWith('VALID_'),
        `Expected fixture ${relativePath} to represent captured page content.`
    );
    assert(html.trim().length > 0, `Expected fixture ${relativePath} to contain captured content.`);

    return html;
}

function createSessionStorage(seed = {}) {
    const store = new Map(
        Object.entries(seed).map(([key, value]) => [key, String(value)])
    );

    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        },
        snapshot() {
            return Object.fromEntries(store.entries());
        }
    };
}

function executeUserScript({ sourceUrl, fixtureHtml, referrer = '', sessionStorageSeed = {} }) {
    const historyCalls = [];
    const locationState = {
        href: sourceUrl,
        hostname: new URL(sourceUrl).hostname,
        assignedUrl: null,
        assign(targetUrl) {
            this.assignedUrl = String(targetUrl);
        }
    };
    const sessionStorage = createSessionStorage(sessionStorageSeed);
    const logs = [];
    const warnings = [];
    const document = {
        referrer,
        documentElement: {
            outerHTML: fixtureHtml
        },
        body: {
            innerHTML: fixtureHtml
        }
    };
    const history = {
        pushState(state, _unused, url) {
            historyCalls.push({ state, url: String(url) });
            locationState.href = String(url);
            locationState.hostname = new URL(String(url)).hostname;
        }
    };
    const consoleMock = {
        log(...args) {
            logs.push(args.join(' '));
        },
        warn(...args) {
            warnings.push(args.join(' '));
        }
    };

    const windowObject = {
        document,
        history,
        location: locationState,
        sessionStorage,
        console: consoleMock
    };

    windowObject.window = windowObject;
    windowObject.self = windowObject;
    windowObject.top = windowObject;

    const context = {
        window: windowObject,
        document,
        history,
        location: locationState,
        sessionStorage,
        console: consoleMock,
        URL,
        URLSearchParams
    };

    context.globalThis = context;
    context.global = context;

    vm.runInNewContext(scriptContents, context, { filename: scriptPath });

    return {
        assignedUrl: locationState.assignedUrl,
        historyCalls,
        logs,
        warnings,
        sessionStorageSnapshot: sessionStorage.snapshot()
    };
}

function assertRedirectCase(testCase) {
    const fixtureHtml = loadFixture(testCase.fixture);
    const result = executeUserScript({
        sourceUrl: testCase.sourceUrl,
        fixtureHtml
    });

    assert.strictEqual(
        result.assignedUrl,
        testCase.expectedTargetUrl,
        `${testCase.name}: expected redirect target.`
    );
    assert.strictEqual(result.historyCalls.length, 1, `${testCase.name}: expected one history.pushState call.`);
    assert.strictEqual(
        result.historyCalls[0].url,
        testCase.sourceUrl,
        `${testCase.name}: expected pushed history entry to preserve back navigation.`
    );
    assert.strictEqual(
        result.historyCalls[0].state.redirectedByRedirectUrls,
        true,
        `${testCase.name}: expected redirectedByRedirectUrls history state.`
    );
    assert.strictEqual(
        result.sessionStorageSnapshot[testCase.sessionKey],
        testCase.redirectId,
        `${testCase.name}: expected redirect ID to be stored in sessionStorage.`
    );
    assert.deepStrictEqual(result.warnings, [], `${testCase.name}: expected no warnings.`);
}

function assertSkipBySessionCase(testCase) {
    const fixtureHtml = loadFixture(testCase.fixture);
    const result = executeUserScript({
        sourceUrl: testCase.sourceUrl,
        fixtureHtml,
        sessionStorageSeed: {
            [testCase.sessionKey]: testCase.redirectId
        }
    });

    assert.strictEqual(result.assignedUrl, null, `${testCase.name}: expected no redirect when sessionStorage matches.`);
    assert.strictEqual(result.historyCalls.length, 0, `${testCase.name}: expected no history.pushState on skip.`);
    assert.strictEqual(
        result.sessionStorageSnapshot[testCase.sessionKey],
        undefined,
        `${testCase.name}: expected skip path to clear the stored redirect ID.`
    );
    assert(
        result.logs.some((line) => line.includes('Skip redirect')),
        `${testCase.name}: expected a skip log entry.`
    );
}

function assertSkipByReferrerCase(testCase) {
    const fixtureHtml = loadFixture(testCase.fixture);
    const result = executeUserScript({
        sourceUrl: testCase.sourceUrl,
        fixtureHtml,
        referrer: testCase.referrer,
        sessionStorageSeed: {
            [testCase.sessionKey]: 'stale-value'
        }
    });

    assert.strictEqual(result.assignedUrl, null, `${testCase.name}: expected no redirect when referrer is already redirected site.`);
    assert.strictEqual(result.historyCalls.length, 0, `${testCase.name}: expected no history.pushState on referrer skip.`);
    assert.strictEqual(
        result.sessionStorageSnapshot[testCase.sessionKey],
        undefined,
        `${testCase.name}: expected referrer skip path to clear the stored redirect ID.`
    );
    assert(
        result.logs.some((line) => line.includes('Skip redirect')),
        `${testCase.name}: expected a skip log entry.`
    );
}

const redirectCases = [
    {
        name: 'x.com status',
        fixture: 'x.com_cocktailpeanut_status_1860756706357022812.html',
        sourceUrl: 'https://x.com/cocktailpeanut/status/1860756706357022812',
        expectedTargetUrl: 'https://nitter.net/cocktailpeanut/status/1860756706357022812',
        sessionKey: 'redirectx-last-redirect-x',
        redirectId: '1860756706357022812',
        skipReferrer: 'https://nitter.net/cocktailpeanut/status/1860756706357022812'
    },
    {
        name: 'reddit.com thread',
        fixture: 'www.reddit.com_r_robotics_comments_1ps2aw1_in_china_robots_are_now_handling_the_solar_panels.html',
        sourceUrl: 'https://www.reddit.com/r/robotics/comments/1ps2aw1/in_china_robots_are_now_handling_the_solar_panels/',
        expectedTargetUrl: 'https://rdx.overdevs.com/comments.html?url=https://www.reddit.com/r/robotics/comments/1ps2aw1/in_china_robots_are_now_handling_the_solar_panels/',
        sessionKey: 'redirectx-last-redirect-old-reddit',
        redirectId: 'https://www.reddit.com/r/robotics/comments/1ps2aw1/in_china_robots_are_now_handling_the_solar_panels/',
        skipReferrer: 'https://rdx.overdevs.com/comments.html?url=https://www.reddit.com/r/robotics/comments/1ps2aw1/in_china_robots_are_now_handling_the_solar_panels/'
    },
    {
        name: 'old.reddit.com thread',
        fixture: 'old.reddit.com_r_linux_comments_1puojsr_the_device_that_controls_my_insulin_pump_uses_the.html',
        sourceUrl: 'https://old.reddit.com/r/linux/comments/1puojsr/the_device_that_controls_my_insulin_pump_uses_the/',
        expectedTargetUrl: 'https://rdx.overdevs.com/comments.html?url=https://old.reddit.com/r/linux/comments/1puojsr/the_device_that_controls_my_insulin_pump_uses_the/',
        sessionKey: 'redirectx-last-redirect-old-reddit',
        redirectId: 'https://old.reddit.com/r/linux/comments/1puojsr/the_device_that_controls_my_insulin_pump_uses_the/',
        skipReferrer: 'https://rdx.overdevs.com/comments.html?url=https://old.reddit.com/r/linux/comments/1puojsr/the_device_that_controls_my_insulin_pump_uses_the/'
    },
    {
        name: 'GitHub readme tab',
        fixture: 'github.com_ChrisTorng_TampermonkeyScripts_tab_readme-ov-file.html',
        sourceUrl: 'https://github.com/ChrisTorng/TampermonkeyScripts?tab=readme-ov-file',
        expectedTargetUrl: 'https://github.com/ChrisTorng/TampermonkeyScripts',
        sessionKey: 'redirectx-last-redirect-github',
        redirectId: 'https://github.com/ChrisTorng/TampermonkeyScripts?tab=readme-ov-file'
    },
    {
        name: 'arXiv abs page',
        fixture: 'arxiv.org_abs_2402.07939v1.html',
        sourceUrl: 'https://arxiv.org/abs/2402.07939v1',
        expectedTargetUrl: 'https://arxiv.org/html/2402.07939v1',
        sessionKey: 'redirectx-last-redirect-arxiv',
        redirectId: 'https://arxiv.org/abs/2402.07939v1'
    },
    {
        name: 'arXiv pdf page',
        fixture: 'arxiv.org_pdf_2402.07939v1.html',
        sourceUrl: 'https://arxiv.org/pdf/2402.07939v1',
        expectedTargetUrl: 'https://arxiv.org/html/2402.07939v1',
        sessionKey: 'redirectx-last-redirect-arxiv',
        redirectId: 'https://arxiv.org/pdf/2402.07939v1'
    }
];

describe('RedirectUrls captured pages', () => {
    for (const testCase of redirectCases) {
        test(`${testCase.name} redirects to the expected target`, () => {
            assertRedirectCase(testCase);
        });
    }

    for (const testCase of redirectCases.filter((item) => item.skipReferrer)) {
        test(`${testCase.name} skips redirect when returning from the redirected site`, () => {
            assertSkipByReferrerCase({
                name: `${testCase.name} referrer skip`,
                fixture: testCase.fixture,
                sourceUrl: testCase.sourceUrl,
                sessionKey: testCase.sessionKey,
                referrer: testCase.skipReferrer
            });
        });
    }

    for (const testCase of redirectCases.filter((item) => !item.skipReferrer)) {
        test(`${testCase.name} skips redirect when sessionStorage already matches`, () => {
            assertSkipBySessionCase({
                name: `${testCase.name} session skip`,
                fixture: testCase.fixture,
                sourceUrl: testCase.sourceUrl,
                sessionKey: testCase.sessionKey,
                redirectId: testCase.redirectId
            });
        });
    }
});
