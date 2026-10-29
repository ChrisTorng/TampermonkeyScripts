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
    if ('pinchScale' in options) {
        harness.window.visualViewport.scale = options.pinchScale;
    }
    const video = harness.document.createElement('video');
    video.playbackRate = 1;
    harness.appendToBody(video);
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


describe('Android Edge fullscreen page-zoom compensation', () => {
    const url = 'https://m.youtube.com/watch?v=zeWBx3AePow';
    const androidEdge = 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150.0 Mobile Safari/537.36 EdgA/150.0';
    const androidChrome = 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/150.0 Mobile Safari/537.36';

    function enterFullscreen(options) {
        const { harness, video } = executeYouTubeTools(url, options);
        harness.dispatchDocumentEvent('DOMContentLoaded');
        harness.flushAnimationFrames();
        harness.document.fullscreenElement = video;
        video._rect = { left: 80, top: 24, width: 480, height: 900, right: 560, bottom: 924 };
        harness.dispatchWindowEvent('fullscreenchange');
        harness.flushAnimationFrames();
        return { harness, video };
    }

    test('125% Android Edge page zoom inversely scales and offsets the fullscreen player', () => {
        const { harness, video } = enterFullscreen({
            userAgent: androidEdge, screenWidth: 400, viewportWidth: 320
        });
        assert.equal(video.style.getPropertyValue('width'), '125.00vw');
        assert.equal(video.style.getPropertyValue('height'), '125.00vh');
        assert.equal(video.style.getPropertyValue('transform-origin'), 'top left');
        assert.equal(video.style.getPropertyValue('transform'),
            'translate(-80px, -24px) scale(0.8)');
        assert.equal(video.style.getPropertyPriority('transform'), 'important');
        const speed = harness.document.getElementById('tm-yt-speed-overlay');
        assert(speed, 'Existing speed controls must remain in fullscreen.');
    });

    test('100% page zoom does not modify fullscreen geometry', () => {
        const { video } = enterFullscreen({
            userAgent: androidEdge, screenWidth: 400, viewportWidth: 400
        });
        assert.equal(video.style.getPropertyValue('transform'), '');
        assert.equal(video.style.getPropertyValue('width'), '');
    });

    test('other Android browsers are never changed, even at 125%', () => {
        const { video } = enterFullscreen({
            userAgent: androidChrome, screenWidth: 400, viewportWidth: 320
        });
        assert.equal(video.style.getPropertyValue('transform'), '');
    });

    test('Android Edge falls back to 125% if page zoom cannot be read', () => {
        const { video } = enterFullscreen({ userAgent: androidEdge });
        assert.equal(video.style.getPropertyValue('transform'),
            'translate(-80px, -24px) scale(0.8)');
    });

    test('a pinch zoom does not trigger the 125% fallback', () => {
        const { video } = enterFullscreen({
            userAgent: androidEdge, screenWidth: 400, viewportWidth: 400, pinchScale: 1.25
        });
        assert.equal(video.style.getPropertyValue('transform'), '');
    });

    test('exiting fullscreen restores existing styles', () => {
        const { harness, video } = enterFullscreen({
            userAgent: androidEdge, screenWidth: 400, viewportWidth: 320
        });
        harness.document.fullscreenElement = null;
        harness.dispatchWindowEvent('fullscreenchange');
        assert.equal(video.style.getPropertyValue('transform'), '');
        assert.equal(video.style.getPropertyValue('height'), '');
        assert.equal(video.style.getPropertyValue('width'), '');
        assert.equal(video.style.getPropertyValue('transform-origin'), '');
        const overlay = harness.document.getElementById('tm-yt-speed-overlay');
        assert.equal(overlay.parentElement, harness.document.body);
    });

    test('desktop Edge remains unaffected', () => {
        const { video } = enterFullscreen({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/150.0',
            screenWidth: 400, viewportWidth: 320
        });
        assert.equal(video.style.getPropertyValue('transform'), '');
    });
});
