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

const redditOldThread = 'https://old.reddit.com/r/linux/comments/1puojsr/the_device_that_controls_my_insulin_pump_uses_the/';
const redditNewThread = 'https://www.reddit.com/r/linux/comments/1puojsr/the_device_that_controls_my_insulin_pump_uses_the/';
const redditOldLogin = `https://www.reddit.com/login/?reason=lor2&dest=${encodeURIComponent(redditOldThread)}`;

// Reddit's current www UI is readable without an account. In particular,
// neither threads nor subreddit listings should be sent to broken frontends.
const noRedirectCases = [
    {
        name: 'www.reddit.com thread',
        fixture: 'www.reddit.com_r_robotics_comments_1ps2aw1_in_china_robots_are_now_handling_the_solar_panels.html',
        sourceUrl: 'https://www.reddit.com/r/robotics/comments/1ps2aw1/in_china_robots_are_now_handling_the_solar_panels/'
    },
    {
        name: 'www.reddit.com subreddit listing (URL-only)',
        // The redirect depends only on the URL; reuse the captured Reddit HTML.
        fixture: 'www.reddit.com_r_robotics_comments_1ps2aw1_in_china_robots_are_now_handling_the_solar_panels.html',
        sourceUrl: 'https://www.reddit.com/r/robotics/'
    },
    {
        name: 'normal Reddit login remains available (URL-only)',
        fixture: 'www.reddit.com_r_robotics_comments_1ps2aw1_in_china_robots_are_now_handling_the_solar_panels.html',
        sourceUrl: `https://www.reddit.com/login/?dest=${encodeURIComponent(redditOldThread)}`
    },
    {
        name: 'other Reddit login reasons remain unchanged (URL-only)',
        fixture: 'www.reddit.com_r_robotics_comments_1ps2aw1_in_china_robots_are_now_handling_the_solar_panels.html',
        sourceUrl: `https://www.reddit.com/login/?reason=other&dest=${encodeURIComponent(redditOldThread)}`
    },
    {
        name: 'external login destination is not followed (URL-only)',
        fixture: 'www.reddit.com_r_robotics_comments_1ps2aw1_in_china_robots_are_now_handling_the_solar_panels.html',
        sourceUrl: 'https://www.reddit.com/login/?reason=lor2&dest=https%3A%2F%2Fexample.com%2F'
    },
    {
        name: 'lookalike old-Reddit hostname is not followed (URL-only)',
        fixture: 'www.reddit.com_r_robotics_comments_1ps2aw1_in_china_robots_are_now_handling_the_solar_panels.html',
        sourceUrl: 'https://www.reddit.com/login/?reason=lor2&dest=https%3A%2F%2Fold.reddit.com.example.com%2F'
    },
    {
        name: 'www-Reddit login destination is not rewritten (URL-only)',
        fixture: 'www.reddit.com_r_robotics_comments_1ps2aw1_in_china_robots_are_now_handling_the_solar_panels.html',
        sourceUrl: `https://www.reddit.com/login/?reason=lor2&dest=${encodeURIComponent(redditNewThread)}`
    }
];

const redirectCases = [
    {
        name: 'x.com status',
        fixture: 'x.com_cocktailpeanut_status_1860756706357022812.html',
        sourceUrl: 'https://x.com/cocktailpeanut/status/1860756706357022812',
        expectedTargetUrl: 'https://shitter.thepixora.com/cocktailpeanut/status/1860756706357022812',
        sessionKey: 'redirectx-last-redirect-x',
        redirectId: '1860756706357022812',
        skipReferrer: 'https://shitter.thepixora.com/cocktailpeanut/status/1860756706357022812'
    },
    {
        name: 'twitter.com status',
        fixture: 'x.com_cocktailpeanut_status_1860756706357022812.html',
        sourceUrl: 'https://twitter.com/cocktailpeanut/status/1860756706357022812',
        expectedTargetUrl: 'https://shitter.thepixora.com/cocktailpeanut/status/1860756706357022812',
        sessionKey: 'redirectx-last-redirect-twitter',
        redirectId: '1860756706357022812',
        skipReferrer: 'https://shitter.thepixora.com/cocktailpeanut/status/1860756706357022812'
    },
    {
        name: 'Reddit old-site login recovery (URL-only)',
        // Reddit's login page is auth-only; only the URL decision is tested.
        fixture: 'old.reddit.com_r_linux_comments_1puojsr_the_device_that_controls_my_insulin_pump_uses_the.html',
        sourceUrl: redditOldLogin,
        expectedTargetUrl: redditNewThread,
        sessionKey: 'redirectx-last-redirect-reddit-login',
        redirectId: redditOldLogin
    },
    {
        name: 'old.reddit.com thread',
        fixture: 'old.reddit.com_r_linux_comments_1puojsr_the_device_that_controls_my_insulin_pump_uses_the.html',
        sourceUrl: 'https://old.reddit.com/r/linux/comments/1puojsr/the_device_that_controls_my_insulin_pump_uses_the/',
        expectedTargetUrl: 'https://www.reddit.com/r/linux/comments/1puojsr/the_device_that_controls_my_insulin_pump_uses_the/',
        sessionKey: 'redirectx-last-redirect-old-reddit',
        redirectId: 'https://old.reddit.com/r/linux/comments/1puojsr/the_device_that_controls_my_insulin_pump_uses_the/'
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
    test('Tampermonkey activates the script for Reddit login redirects', () => {
        assert.match(scriptContents, /^\/\/ @match\s+https:\/\/www\.reddit\.com\/login\*$/m);
    });

    test('Reddit login recovery preserves destination path, query, and fragment', () => {
        const destination = 'https://old.reddit.com/r/linux/comments/1puojsr/?sort=new#comments';
        const sourceUrl = `https://www.reddit.com/login?reason=lor2&dest=${encodeURIComponent(destination)}`;
        const result = executeUserScript({ sourceUrl, fixtureHtml: '<html></html>' });
        assert.strictEqual(result.assignedUrl, 'https://www.reddit.com/r/linux/comments/1puojsr/?sort=new#comments');
        assert.strictEqual(result.historyCalls.length, 1);
    });

    test('Reddit login recovery does not follow login destinations with credentials or a port', () => {
        for (const destination of [
            'https://attacker@old.reddit.com/r/linux/',
            'https://old.reddit.com:8080/r/linux/'
        ]) {
            const sourceUrl = `https://www.reddit.com/login/?reason=lor2&dest=${encodeURIComponent(destination)}`;
            const result = executeUserScript({ sourceUrl, fixtureHtml: '<html></html>' });
            assert.strictEqual(result.assignedUrl, null);
        }
    });

    for (const testCase of noRedirectCases) {
        test(`${testCase.name} stays on Reddit without redirect`, () => {
            const result = executeUserScript({
                sourceUrl: testCase.sourceUrl,
                fixtureHtml: loadFixture(testCase.fixture)
            });
            assert.strictEqual(result.assignedUrl, null);
            assert.strictEqual(result.historyCalls.length, 0);
            assert.deepStrictEqual(result.sessionStorageSnapshot, {});
        });
    }

    test('old.reddit.com subreddit redirects to www while retaining URL parts', () => {
        const sourceUrl = 'https://old.reddit.com/r/linux/?sort=new#overview';
        const result = executeUserScript({
            sourceUrl,
            fixtureHtml: loadFixture('old.reddit.com_r_linux_comments_1puojsr_the_device_that_controls_my_insulin_pump_uses_the.html')
        });
        assert.strictEqual(result.assignedUrl, 'https://www.reddit.com/r/linux/?sort=new#overview');
        assert.strictEqual(result.historyCalls.length, 1);
    });

    for (const testCase of redirectCases.filter((item) => item.name.endsWith('status'))) {
        test(`${testCase.name} skips redirect after Back using sessionStorage`, () => {
            assertSkipBySessionCase(testCase);
        });

        test(`${testCase.name} opens the canonical Shitter post from a shared photo link`, () => {
            assertRedirectCase({
                ...testCase,
                sourceUrl: `${testCase.sourceUrl}/photo/1?s=20#media`
            });
        });
    }

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

