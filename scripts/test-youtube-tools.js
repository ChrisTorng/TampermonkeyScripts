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


describe('YouTube Tools in-flow playback toolbar', () => {
    const url = 'https://m.youtube.com/watch?v=zeWBx3AePow';
    const androidEdge = 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150.0 Mobile Safari/537.36 EdgA/150.0';
    const androidChrome = 'Mozilla/5.0 (Linux; Android 16) Chrome/150.0 Mobile Safari/537.36';
    const barId = 'tm-yt-speed-overlay';
    const fullscreenId = 'tm-yt-alternative-fullscreen-button';
    const rootId = 'tm-yt-alternative-fullscreen-root';

    function load(options = {}) {
        const { harness, video } = executeYouTubeTools(url, {
            userAgent: androidEdge, ...options
        });
        harness.dispatchDocumentEvent('DOMContentLoaded');
        harness.flushAnimationFrames();
        return {
            harness, video, player: video.parentElement,
            bar: harness.document.getElementById(barId),
            fullscreen: harness.document.getElementById(fullscreenId),
        };
    }

    test('captured watch fixture remains available', () => {
        assert.match(fixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(fixtureHtml, /ytPageType.*watch|youtube/i);
    });

    test('toolbar sits immediately before the video in the normal document flow', () => {
        const { harness, bar, player, fullscreen } = load();
        assert(bar, 'Expected the toolbar.');
        assert(fullscreen, 'Expected the Android Edge fullscreen button.');
        assert.equal(bar.parentElement, player.parentElement);
        assert.equal(bar.nextElementSibling, player);
        assert.equal(fullscreen.parentElement, bar);
        assert.equal(bar.querySelector('.tm-yt-toolbar__controls').parentElement, bar);
        assert.equal(bar.querySelectorAll('button').length, 7);
        assert.equal(bar.querySelector('.tm-yt-speed-overlay__value').textContent, '1x');
        assert.equal(harness.document.getElementById('tm-yt-fullscreen-game-view-button'), null);
        const css = harness.document.getElementById('tm-yt-speed-overlay-style').textContent;
        assert.match(css, /#tm-yt-speed-overlay \{[^}]*position: relative !important;[^}]*display: flex !important;/s);
        assert.match(css, /#tm-yt-speed-overlay button,[\s\S]*min-width: 43px !important;/);
        assert.match(css, /height: 44px !important;/);
        assert.match(css, /overflow-x: auto !important;/);
        assert.match(css, /tm-yt-toolbar__fullscreen[^{]*\{[^}]*flex: 0 0 44px !important;/s);
        assert.doesNotMatch(css.slice(css.lastIndexOf('/* In-flow controls:')), /position: fixed !important;/);
    });

    test('speed controls retain step behavior, current-value display and presets', () => {
        const { bar, video } = load();
        const buttons = [...bar.querySelectorAll('button')];
        const display = bar.querySelector('.tm-yt-speed-overlay__value');
        assert.equal(display.textContent, '1x');
        const plus = buttons.find(b => b.getAttribute('aria-label') === 'Increase playback speed');
        const minus = buttons.find(b => b.getAttribute('aria-label') === 'Decrease playback speed');
        plus.click();
        assert.equal(video.playbackRate, 1.25);
        assert.equal(display.textContent, '1.25x');
        minus.click();
        assert.equal(video.playbackRate, 1);
        for (const rate of [0.5, 1, 1.5, 2]) {
            const formatted = rate + 'x';
            const button = buttons.find(b => b.textContent === formatted);
            assert(button, 'Missing preset ' + formatted);
            button.click();
            assert.equal(video.playbackRate, rate);
            assert.equal(display.textContent, formatted);
        }
    });

    test('desktop and Android Chrome use the same inline toolbar without custom fullscreen', () => {
        for (const userAgent of [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/150.0',
            androidChrome
        ]) {
            const { bar, player, fullscreen } = load({userAgent});
            assert(bar);
            assert.equal(fullscreen, null);
            assert.equal(bar.querySelectorAll('button').length, 6);
            assert.equal(bar.nextElementSibling, player);
        }
    });

    test('custom fullscreen retains a non-overlapping toolbar and restores it on Escape', () => {
        const { harness, video, player, bar, fullscreen } = load({
            viewportWidth: 390, viewportHeight: 844, videoWidth: 1920, videoHeight: 1080
        });
        video.currentTime = 42;
        video.playbackRate = 1.5;
        fullscreen.click();
        const root = harness.document.getElementById(rootId);
        assert(root);
        const stage = root.querySelector('.tm-yt-alternative-fullscreen-stage');
        assert(stage);
        assert.equal(bar.parentElement, stage);
        assert.equal(bar.nextElementSibling, player);
        assert.equal(player.parentElement, stage);
        assert.equal(video.currentTime, 42);
        assert.equal(video.playbackRate, 1.5);
        assert.equal(root.classList.contains('tm-yt-alternative-fullscreen-rotated'), true);
        assert.equal(fullscreen.getAttribute('aria-pressed'), 'true');

        bar.querySelector('.tm-yt-speed-overlay__click--right').click();
        assert.equal(video.playbackRate, 1.75);
        harness.document.dispatchEvent({type: 'keydown', key: 'Escape'});
        harness.flushAnimationFrames();
        assert.equal(harness.document.getElementById(rootId), null);
        assert.equal(bar.parentElement, harness.document.body);
        assert.equal(bar.nextElementSibling, player);
        assert.equal(player.parentElement, harness.document.body);
        assert.equal(video.currentTime, 42);
        assert.equal(video.playbackRate, 1.75);
        assert.equal(fullscreen.getAttribute('aria-pressed'), 'false');
    });

    test('rotation switches with viewport direction while landscape video stays within stage', () => {
        const { harness, fullscreen } = load({
            viewportWidth: 390, viewportHeight: 844, videoWidth: 1920, videoHeight: 1080
        });
        fullscreen.click();
        const root = harness.document.getElementById(rootId);
        const css = harness.document.getElementById('tm-yt-speed-overlay-style').textContent;
        assert.match(css, /tm-yt-alternative-fullscreen-rotated > .tm-yt-alternative-fullscreen-stage/);
        assert.match(css, /width: 100dvh !important;/);
        assert.match(css, /height: 100dvw !important;/);
        assert.match(css, /transform: rotate\(90deg\) !important;/);
        harness.window.innerWidth = 844;
        harness.window.innerHeight = 390;
        harness.dispatchWindowEvent('resize');
        assert.equal(root.classList.contains('tm-yt-alternative-fullscreen-rotated'), false);
        harness.window.innerWidth = 390;
        harness.window.innerHeight = 844;
        harness.dispatchWindowEvent('orientationchange');
        assert.equal(root.classList.contains('tm-yt-alternative-fullscreen-rotated'), true);
    });

    test('portrait videos remain upright and missing metadata can be updated later', () => {
        const portrait = load({
            viewportWidth: 390, viewportHeight: 844, videoWidth:1080, videoHeight:1920
        });
        portrait.fullscreen.click();
        assert.equal(portrait.harness.document.getElementById(rootId)
            .classList.contains('tm-yt-alternative-fullscreen-rotated'), false);
        const unknown = load({viewportWidth:390,viewportHeight:844});
        unknown.fullscreen.click();
        const root = unknown.harness.document.getElementById(rootId);
        assert.equal(root.classList.contains('tm-yt-alternative-fullscreen-rotated'), false);
        unknown.video.videoWidth = 1920;
        unknown.video.videoHeight = 1080;
        unknown.video.dispatchEvent({type:'loadedmetadata'});
        assert.equal(root.classList.contains('tm-yt-alternative-fullscreen-rotated'), true);
    });

    test('requests orientation lock only on our fullscreen root, releasing it on exit', async () => {
        let locks = 0, unlocks = 0;
        const orientation = {
            lock(value) { assert.equal(value,'landscape'); locks++; return Promise.resolve(); },
            unlock() { unlocks++; }
        };
        const { harness, fullscreen } = load({
            nativeFullscreen: true, viewportWidth: 390, viewportHeight:844,
            videoWidth:1920, videoHeight:1080, orientation
        });
        fullscreen.click();
        const root = harness.document.getElementById(rootId);
        assert.equal(harness.document.fullscreenElement, root);
        await Promise.resolve();
        await Promise.resolve();
        assert.equal(locks, 1);
        harness.document.dispatchEvent({type:'keydown',key:'Escape'});
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(unlocks, 1);
    });

    test('denied orientation lock keeps CSS fallback without forcing portrait video rotation', async () => {
        const orientation = {
            lock() { return Promise.reject(new Error('NotSupportedError')); },
            unlock() { assert.fail('Rejected orientation lock was not acquired'); }
        };
        const { harness, fullscreen } = load({
            nativeFullscreen:true, viewportWidth:390, viewportHeight:844,
            videoWidth:1920, videoHeight:1080, orientation
        });
        fullscreen.click();
        await Promise.resolve();
        await Promise.resolve();
        assert.equal(harness.document.getElementById(rootId)
            .classList.contains('tm-yt-alternative-fullscreen-rotated'), true);
    });

    test('browser Back, SPA navigation and generic game control are handled', () => {
        const history = { count:0, pushState() {this.count++;}, back() {this.count--;} };
        const { harness, fullscreen, bar, player } = load({history});
        const generic = harness.document.createElement('button');
        generic.id = 'tm-fullscreen-game-view-button';
        harness.appendToBody(generic);
        harness.triggerMutation([generic]);
        assert.equal(generic.hidden, true);
        fullscreen.click();
        harness.dispatchWindowEvent('popstate');
        assert.equal(player.parentElement, harness.document.body);
        assert.equal(bar.parentElement, harness.document.body);
        fullscreen.click();
        harness.location.pathname = '/results';
        harness.dispatchWindowEvent('yt-navigate-finish');
        assert.equal(bar.isConnected, false);
        assert.equal(generic.hidden, false);
    });
});
