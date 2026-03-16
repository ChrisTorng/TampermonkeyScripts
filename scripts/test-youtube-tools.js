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

function executeYouTubeTools(url) {
    const harness = createHarness({ url, readyState: 'loading' });
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
        assert.equal(buttons.length, 2);
        assert.equal(speedValue.textContent, '1x');

        buttons[1].click();
        assert.equal(video.playbackRate, 1.25);
        assert.equal(speedValue.textContent, '1.25x');

        video.playbackRate = 1.5;
        video.dispatchEvent({ type: 'ratechange' });
        assert.equal(speedValue.textContent, '1.5x');
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
