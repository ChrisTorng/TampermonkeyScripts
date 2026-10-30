const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'YouTubeTools.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');
const fixturePath = path.join(repoRoot, 'tests', 'YouTube Tools', 'www.youtube.com_watch_v_nCg3aXn5F3M.html');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

function executeYouTubeTools(url, options = {}) {
    const harness = createHarness({ url, readyState: 'loading' });
    if (options.userAgent) {
        harness.window.navigator = { userAgent: options.userAgent };
    }
    if ('screenWidth' in options) {
        harness.window.screen = { width: options.screenWidth };
    }
    if ('viewportWidth' in options) {
        harness.window.innerWidth = options.viewportWidth;
    }
    if ('viewportHeight' in options) {
        harness.window.innerHeight = options.viewportHeight;
    }
    if (options.orientation) {
        harness.window.screen = {
            ...(harness.window.screen || {}),
            orientation: options.orientation
        };
    }
    if ('pinchScale' in options) {
        harness.window.visualViewport.scale = options.pinchScale;
    }
    const player = harness.document.createElement('div');
    player.className = 'html5-video-player';
    const video = harness.document.createElement('video');
    video.playbackRate = 1;
    if ('videoWidth' in options) video.videoWidth = options.videoWidth;
    if ('videoHeight' in options) video.videoHeight = options.videoHeight;
    player.appendChild(video);
    harness.appendToBody(player);
    if (options.history) {
        harness.window.history = options.history;
    }
    if (options.nativeFullscreen) {
        const createElement = harness.document.createElement.bind(harness.document);
        harness.document.createElement = (tagName) => {
            const element = createElement(tagName);
            if (tagName === 'div') {
                element.requestFullscreen = () => {
                    if (element.id === 'tm-yt-alternative-fullscreen-root') {
                        harness.document.fullscreenElement = element;
                        harness.dispatchDocumentEvent('fullscreenchange');
                        return Promise.resolve();
                    }
                    return Promise.reject(new Error('Unexpected fullscreen target'));
                };
            }
            return element;
        };
        harness.document.exitFullscreen = () => {
            harness.document.fullscreenElement = null;
            harness.dispatchDocumentEvent('fullscreenchange');
            return Promise.resolve();
        };
    }
    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    return { harness, video };
}

describe('YouTubeTools on captured watch pages', () => {
    test('fixture contains captured YouTube watch content', () => {
        assert.match(fixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(fixtureHtml, /ytPageType.*watch|youtube/i);
    });

    test('watch page creates overlay and updates playback rate controls', () => {
        const { harness, video } = executeYouTubeTools('https://www.youtube.com/watch?v=nCg3aXn5F3M');
        harness.dispatchDocumentEvent('DOMContentLoaded');
        harness.flushAnimationFrames();

        const overlay = harness.document.getElementById('tm-yt-speed-overlay');
        const buttons = overlay.querySelectorAll('button');
        const speedValue = overlay.querySelector('.tm-yt-speed-overlay__value');

        assert(overlay, 'Expected YouTube tools overlay.');
        assert.equal(buttons.length, 5);
        assert.equal(speedValue.textContent, '1x');

        buttons[1].click();
        assert.equal(video.playbackRate, 1.25);
        assert.equal(speedValue.textContent, '1.25x');

        const preset15 = [...buttons].find((button) => button.textContent === '1.5x');
        const preset2 = [...buttons].find((button) => button.textContent === '2x');

        assert(preset15, 'Expected a 1.5x preset button.');
        assert(preset2, 'Expected a 2x preset button.');

        preset15.click();
        assert.equal(video.playbackRate, 1.5);
        assert.equal(speedValue.textContent, '1.5x');

        preset2.click();
        assert.equal(video.playbackRate, 2);
        assert.equal(speedValue.textContent, '2x');
    });

    test('fullscreen hides the overlay until its top-right hover area is entered', () => {
        const { harness, video } = executeYouTubeTools('https://www.youtube.com/watch?v=nCg3aXn5F3M');
        harness.dispatchDocumentEvent('DOMContentLoaded');
        harness.flushAnimationFrames();

        const overlay = harness.document.getElementById('tm-yt-speed-overlay');
        const style = harness.document.getElementById('tm-yt-speed-overlay-style');

        assert(overlay, 'Expected YouTube tools overlay.');
        assert.equal(overlay.classList.contains('tm-yt-speed-overlay--fullscreen'), false);
        assert.match(style.textContent, /tm-yt-speed-overlay--fullscreen \{\s*position: absolute;\s*opacity: 0;/);
        assert.match(style.textContent, /tm-yt-speed-overlay--fullscreen:hover \{\s*opacity: 1;/);

        harness.document.fullscreenElement = video;
        harness.dispatchWindowEvent('fullscreenchange');

        assert.equal(overlay.classList.contains('tm-yt-speed-overlay--fullscreen'), true);
        assert.equal(overlay.parentElement, video);

        harness.document.fullscreenElement = null;
        harness.dispatchWindowEvent('fullscreenchange');

        assert.equal(overlay.classList.contains('tm-yt-speed-overlay--fullscreen'), false);
        assert.equal(overlay.parentElement, harness.document.body);
    });

    test('route change away from watch page removes the overlay', () => {
        const { harness } = executeYouTubeTools('https://www.youtube.com/watch?v=nCg3aXn5F3M');
        harness.dispatchDocumentEvent('DOMContentLoaded');
        harness.flushAnimationFrames();
        assert(harness.document.getElementById('tm-yt-speed-overlay'));

        harness.location.pathname = '/results';
        harness.dispatchWindowEvent('yt-navigate-finish');
        assert.equal(harness.document.getElementById('tm-yt-speed-overlay'), null);
    });
});



describe('Android Edge alternative YouTube fullscreen', () => {
    const url = 'https://m.youtube.com/watch?v=zeWBx3AePow';
    const androidEdge = 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150.0 Mobile Safari/537.36 EdgA/150.0';
    const androidChrome = 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150.0 Mobile Safari/537.36';
    const buttonId = 'tm-yt-alternative-fullscreen-button';
    const rootId = 'tm-yt-alternative-fullscreen-root';

    function load(options = {}) {
        const { harness, video } = executeYouTubeTools(url, { userAgent: androidEdge, ...options });
        harness.dispatchDocumentEvent('DOMContentLoaded');
        harness.flushAnimationFrames();
        const button = harness.document.getElementById(buttonId);
        return { harness, video, button, player: video.parentElement };
    }

    test('only Android Edge gets a Game View styled independent entry button', () => {
        const { harness, button } = load();
        assert(button, 'Expected Android Edge alternative fullscreen button.');
        assert.equal(button.textContent, '⛶');
        assert.equal(button.getAttribute('aria-pressed'), 'false');
        const style = harness.document.getElementById('tm-yt-speed-overlay-style').textContent;
        assert.match(style, /#tm-yt-alternative-fullscreen-button \{/);
        assert.match(style, /background: rgba\(0,0,0,\.55\) !important;/);
        assert.match(style, /width: 38px !important;/);
        assert.match(style, /height: 32px !important;/);
        assert.match(style, /100dvh !important;/);
        assert.match(style, /object-fit: contain !important;/);
        const chrome = load({userAgent: androidChrome});
        assert.equal(chrome.button, null);
        const desktop = load({userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/150.0'});
        assert.equal(desktop.button, null);
    });

    test('both 100% and 125% zoom use a custom player without native YouTube fullscreen', () => {
        for (const viewportWidth of [400, 320]) {
            const { harness, video, button, player } = load({
                screenWidth: 400, viewportWidth
            });
            video.playbackRate = 1.5;
            video.currentTime = 42;
            button.click();
            harness.flushAnimationFrames();
            const root = harness.document.getElementById(rootId);
            assert(root, 'Expected fullscreen root.');
            assert.equal(player.parentElement, root);
            assert.equal(video.parentElement, player);
            assert.equal(video.playbackRate, 1.5);
            assert.equal(video.currentTime, 42);
            assert.equal(harness.document.fullscreenElement ?? null, null);
            assert.equal(button.getAttribute('aria-pressed'), 'true');
            const speed = harness.document.getElementById('tm-yt-speed-overlay');
            assert.equal(speed.parentElement, root);
            const presets = [...speed.querySelectorAll('button')];
            presets.find((item) => item.textContent === '2x').click();
            assert.equal(video.playbackRate, 2);
            harness.document.dispatchEvent({type:'keydown',key:'Escape'});
            harness.flushAnimationFrames();
            assert.equal(harness.document.getElementById(rootId), null);
            assert.equal(player.parentElement, harness.document.body);
            assert.equal(button.getAttribute('aria-pressed'), 'false');
            assert.equal(harness.document.documentElement.classList.contains('tm-yt-alternative-fullscreen-active'), false);
            assert.equal(video.playbackRate, 2);
        }
    });

    test('requestFullscreen runs on our container, never the video player', () => {
        const { harness, button, player } = load({ nativeFullscreen: true });
        button.click();
        const root = harness.document.getElementById(rootId);
        assert(root);
        assert.equal(harness.document.fullscreenElement, root);
        assert.notEqual(harness.document.fullscreenElement, player);
        harness.document.fullscreenElement = null;
        harness.dispatchDocumentEvent('fullscreenchange');
        harness.flushAnimationFrames();
        assert.equal(harness.document.getElementById(rootId), null);
        assert.equal(player.parentElement, harness.document.body);
    });

    test('Android Back and YouTube SPA navigation both restore the player', () => {
        const history = { count: 0, pushState() { this.count++; }, back() { this.count--; } };
        const { harness, button, player } = load({ history });
        button.click();
        assert.equal(history.count, 1);
        harness.dispatchWindowEvent('popstate');
        harness.flushAnimationFrames();
        assert.equal(history.count, 1, 'Back was already performed by the browser.');
        assert.equal(player.parentElement, harness.document.body);
        button.click();
        harness.location.pathname = '/results';
        harness.dispatchWindowEvent('yt-navigate-finish');
        harness.flushAnimationFrames();
        assert.equal(harness.document.getElementById(rootId), null);
        assert.equal(harness.document.getElementById(buttonId), null);
        assert.equal(player.parentElement, harness.document.body);
        // The lightweight DOM harness does not detach the old child when
        // appendChild reparents a node. The player and route restoration
        // assertions above check the meaningful user-facing behavior.
    });


    test('speed overlay reserves the rightmost corner and uses compact hit targets', () => {
        const { harness } = load();
        const overlay = harness.document.getElementById('tm-yt-speed-overlay');
        const css = harness.document.getElementById('tm-yt-speed-overlay-style').textContent;
        assert(overlay.classList.contains('tm-yt-speed-overlay--android-edge'));
        assert.match(css, /tm-yt-speed-overlay--android-edge \{\s*right: calc\(50px \+ max\(4px, env\(safe-area-inset-right\)\)\);/);
        assert.match(css, /pointer-events: none;/);
        assert.match(css, /tm-yt-speed-overlay__click \{[^}]*width: 30px;[^}]*height: 30px;/s);
        assert.match(css, /tm-yt-speed-overlay__preset \{[^}]*pointer-events: auto;/s);
        const controls = overlay.querySelectorAll('button');
        assert.equal(controls.length, 5);
    });

    test('landscape video rotates by 90 degrees when the portrait viewport remains locked', () => {
        const { harness, button, video } = load({
            viewportWidth: 390, viewportHeight: 844,
            videoWidth: 1920, videoHeight: 1080
        });
        button.click();
        const root = harness.document.getElementById(rootId);
        assert(root.classList.contains('tm-yt-alternative-fullscreen-rotated'));
        const css = harness.document.getElementById('tm-yt-speed-overlay-style').textContent;
        assert.match(css, /tm-yt-alternative-fullscreen-rotated > .tm-yt-alternative-fullscreen-target/);
        assert.match(css, /left: 100dvw !important;/);
        assert.match(css, /width: 100dvh !important;/);
        assert.match(css, /height: 100dvw !important;/);
        assert.match(css, /transform: rotate\(90deg\) !important;/);
        assert.equal(video.parentElement.parentElement, root);
        harness.window.innerWidth = 844;
        harness.window.innerHeight = 390;
        harness.dispatchWindowEvent('resize');
        assert.equal(root.classList.contains('tm-yt-alternative-fullscreen-rotated'), false);
        harness.window.innerWidth = 390;
        harness.window.innerHeight = 844;
        harness.dispatchWindowEvent('orientationchange');
        assert(root.classList.contains('tm-yt-alternative-fullscreen-rotated'));
        harness.document.dispatchEvent({type:'keydown',key:'Escape'});
        assert.equal(harness.document.getElementById(rootId), null);
    });

    test('portrait video stays upright and metadata updates an initially unknown aspect ratio', () => {
        const portrait = load({
            viewportWidth: 390, viewportHeight: 844,
            videoWidth: 1080, videoHeight: 1920
        });
        portrait.button.click();
        assert.equal(portrait.harness.document.getElementById(rootId)
            .classList.contains('tm-yt-alternative-fullscreen-rotated'), false);
        const unknown = load({viewportWidth:390, viewportHeight:844});
        unknown.button.click();
        const root = unknown.harness.document.getElementById(rootId);
        assert.equal(root.classList.contains('tm-yt-alternative-fullscreen-rotated'), false);
        unknown.video.videoWidth = 1920;
        unknown.video.videoHeight = 1080;
        unknown.video.dispatchEvent({type:'loadedmetadata'});
        assert(root.classList.contains('tm-yt-alternative-fullscreen-rotated'));
    });

    test('tries the Screen Orientation API in our fullscreen wrapper; unlocks on exit', async () => {
        let locks = 0, unlocks = 0;
        const orientation = {
            lock(value) {
                assert.equal(value, 'landscape');
                locks++;
                return Promise.resolve();
            },
            unlock() { unlocks++; }
        };
        const { harness, button } = load({
            viewportWidth:390, viewportHeight:844,
            videoWidth:1920, videoHeight:1080,
            orientation, nativeFullscreen:true
        });
        button.click();
        await Promise.resolve();
        await Promise.resolve();
        assert.equal(locks, 1);
        const root = harness.document.getElementById(rootId);
        assert(root.classList.contains('tm-yt-alternative-fullscreen-rotated'));
        harness.window.innerWidth = 844;
        harness.window.innerHeight = 390;
        harness.dispatchWindowEvent('resize');
        assert.equal(root.classList.contains('tm-yt-alternative-fullscreen-rotated'), false);
        harness.document.dispatchEvent({type:'keydown',key:'Escape'});
        assert.equal(unlocks, 1);
    });

    test('a denied screen-orientation lock retains CSS rotation', async () => {
        let calls = 0;
        const orientation = {
            lock() { calls++; return Promise.reject(new Error('NotSupportedError')); },
            unlock() { assert.fail('Rejected locks must not be unlocked.'); }
        };
        const { harness, button } = load({
            viewportWidth:390, viewportHeight:844,
            videoWidth:1920, videoHeight:1080,
            orientation, nativeFullscreen:true
        });
        button.click();
        await Promise.resolve();
        await Promise.resolve();
        assert.equal(calls, 1);
        const root = harness.document.getElementById(rootId);
        assert(root.classList.contains('tm-yt-alternative-fullscreen-rotated'));
    });

    test('the generic Fullscreen Game View button is temporarily suppressed', () => {
        const { harness } = executeYouTubeTools(url, { userAgent: androidEdge });
        const existing = harness.document.createElement('button');
        existing.id = 'tm-fullscreen-game-view-button';
        harness.appendToBody(existing);
        harness.dispatchDocumentEvent('DOMContentLoaded');
        harness.flushAnimationFrames();
        assert.equal(existing.hidden, true);
        harness.location.pathname = '/results';
        harness.dispatchWindowEvent('yt-navigate-finish');
        assert.equal(existing.hidden, false);
    });
});
