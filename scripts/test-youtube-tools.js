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
    let actualPlayer = player;
    if (options.mobileControls) {
        const host = harness.document.createElement('ytm-player');
        host.appendChild(player);
        const native = harness.document.createElement('ytm-custom-control');
        native.setAttribute('aria-label', 'YouTube CC, gear and seek controls');
        native.textContent = 'Captions Settings Progress';
        host.appendChild(native);
        actualPlayer = host;
    }
    if (options.watchWrapper || options.metadataGroup) {
        const section = harness.document.createElement(options.watchWrapper ? 'ytm-watch' : 'div');
        section.className = 'ytm-watch-content';
        section.appendChild(actualPlayer);
        const metadata = harness.document.createElement('ytm-slim-video-metadata-section-renderer');
        metadata.textContent = 'Sample title and details';
        section.appendChild(metadata);
        harness.appendToBody(section);
    } else {
        harness.appendToBody(actualPlayer);
    }
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
        assert.equal(bar.previousElementSibling, player);
        assert.equal(fullscreen.parentElement, bar);
        assert.equal(bar.querySelector('.tm-yt-toolbar__controls').parentElement, bar);
        assert.equal(bar.querySelectorAll('button').length, 7);
        assert.equal(bar.querySelector('.tm-yt-speed-overlay__value').textContent, '1x');
        assert.equal(harness.document.getElementById('tm-yt-fullscreen-game-view-button'), null);
        const css = harness.document.getElementById('tm-yt-speed-overlay-style').textContent;
        const v15 = css.slice(css.indexOf('/* V1.5 normal layout:'));
        assert.match(v15, /#tm-yt-speed-overlay \{[^}]*position: relative !important;/s);
        assert.match(v15, /height: 44px !important;/);
        assert.match(v15, /\.tm-yt-speed-overlay__stepper \{[^}]*flex: 0 0 88px !important;/s);
        assert.match(v15, /\.tm-yt-speed-overlay__value \{[^}]*position: absolute !important;/s);
        assert.match(v15, /\.tm-yt-speed-overlay__value \{[^}]*pointer-events: none !important;/s);
        assert.match(v15, /\.tm-yt-toolbar__fullscreen \{[^}]*flex: 0 0 44px !important;/s);
        const stepper = bar.querySelector('.tm-yt-speed-overlay__stepper');
        assert.equal(stepper.querySelectorAll('button').length, 2);
        assert.equal(stepper.querySelector('.tm-yt-speed-overlay__value').textContent, '1x');
        assert.equal(stepper.children.length, 3);
    });

    test('toolbar is inserted below the video, above metadata, without moving the player', () => {
        for (const option of [{watchWrapper: true}, {metadataGroup: true}]) {
            const { harness, bar, player } = load(option);
            const wrapper = player.parentElement;
            const meta = wrapper.querySelector('ytm-slim-video-metadata-section-renderer');
            assert(meta, 'Expected test metadata beside the player.');
            assert.equal(bar.parentElement, wrapper);
            assert.equal(bar.previousElementSibling, player);
            assert.equal(bar.nextElementSibling, meta);
            assert.equal(meta.parentElement, wrapper);
            assert.equal(harness.document.querySelectorAll('#tm-yt-speed-overlay').length, 1);
        }
    });

    test('normal speed row is opaque and fullscreen uses three separate stepper cells', () => {
        const { harness, bar, fullscreen } = load();
        const css = harness.document.getElementById('tm-yt-speed-overlay-style').textContent;
        const v17 = css.slice(css.indexOf('/* Non-fullscreen watch page:'));
        assert.match(v17, /:not\(\.tm-yt-toolbar--custom-fullscreen\) \{[^}]*background: #202020 !important;/s);
        assert.match(v17, /tm-yt-toolbar--custom-fullscreen \.tm-yt-speed-overlay__stepper \{[^}]*width: 136px !important;/s);
        assert.match(v17, /tm-yt-toolbar--custom-fullscreen \.tm-yt-speed-overlay__stepper \.tm-yt-speed-overlay__click--left \{[^}]*order: 0 !important;/s);
        assert.match(v17, /tm-yt-toolbar--custom-fullscreen \.tm-yt-speed-overlay__stepper \.tm-yt-speed-overlay__click--right \{[^}]*order: 2 !important;/s);
        assert.match(v17, /tm-yt-toolbar--custom-fullscreen \.tm-yt-speed-overlay__stepper \.tm-yt-speed-overlay__value \{[^}]*position: static !important;[^}]*order: 1 !important;/s);
        const stepper = bar.querySelector('.tm-yt-speed-overlay__stepper');
        assert.equal(stepper.children.length, 3);
        assert.equal(stepper.querySelector('.tm-yt-speed-overlay__value').textContent, '1x');
        fullscreen.click();
        assert(bar.classList.contains('tm-yt-toolbar--custom-fullscreen'));
        assert.equal(bar.classList.contains('tm-yt-toolbar--revealed'), false);
    });

    test('only Android Edge watch pages suppress native YouTube fullscreen / restore icons', () => {
        const edge = load();
        const css = edge.harness.document.getElementById('tm-yt-speed-overlay-style').textContent;
        const nativeStyle = css.slice(css.indexOf('/* Keep YouTube'));
        assert.match(nativeStyle, /html\.tm-yt-edge-alt-fullscreen \.ytp-fullscreen-button/);
        assert.doesNotMatch(nativeStyle, /\.ytp-size-button/, 'Theater mode must remain available.');
        assert.match(nativeStyle, /ytm-player button\[aria-label\*="full screen" i\]/);
        assert.match(nativeStyle, /display: none !important;/);
        assert(edge.harness.document.documentElement.classList.contains('tm-yt-edge-alt-fullscreen'));
        const chrome = load({ userAgent: androidChrome });
        assert.equal(chrome.harness.document.documentElement.classList.contains('tm-yt-edge-alt-fullscreen'), false);
        const desktop = load({ userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/150.0' });
        assert.equal(desktop.harness.document.documentElement.classList.contains('tm-yt-edge-alt-fullscreen'), false);
        edge.harness.location.pathname = '/results';
        edge.harness.dispatchWindowEvent('yt-navigate-finish');
        assert.equal(edge.harness.document.documentElement.classList.contains('tm-yt-edge-alt-fullscreen'), false);
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


    test('responsive layout separates desktop speed controls and compresses only portrait touch screens', () => {
        const desktop = load({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/150.0' });
        const css = desktop.harness.document.getElementById('tm-yt-speed-overlay-style').textContent;
        const responsive = css.slice(css.indexOf('/* Wide by default (desktop or landscape):'));
        assert(responsive.length > 0);
        assert.match(responsive, /#tm-yt-speed-overlay:not\(\.tm-yt-toolbar--custom-fullscreen\) \.tm-yt-speed-overlay__stepper \{[^}]*width: 144px !important;/s);
        assert.match(responsive, /\.tm-yt-speed-overlay__stepper \.tm-yt-speed-overlay__click--left \{[^}]*order: 0 !important;/s);
        assert.match(responsive, /\.tm-yt-speed-overlay__stepper \.tm-yt-speed-overlay__click--right \{[^}]*order: 2 !important;/s);
        assert.match(responsive, /\.tm-yt-speed-overlay__stepper \.tm-yt-speed-overlay__value \{[^}]*position: static !important;[^}]*order: 1 !important;/s);
        assert.match(responsive, /@media \(max-width: 600px\) and \(orientation: portrait\) and \(pointer: coarse\)/);
        assert.match(responsive, /@media [^{]*\{[\s\S]*?\.tm-yt-speed-overlay__stepper \{[^}]*width: 88px !important;/);
        assert.match(responsive, /@media [^{]*\{[\s\S]*?\.tm-yt-speed-overlay__value \{[^}]*position: absolute !important;/);
        assert.match(responsive, /button:not\(:disabled\):hover \{[^}]*background: #676767 !important;/s);
        assert.match(responsive, /\.tm-yt-speed-overlay__stepper button:not\(:disabled\):hover \{[^}]*background: rgba\(255,255,255,\.24\) !important;/s);
    });

    test('selected speed presets are highlighted, disabled, and synced with manual and native rate changes', () => {
        const { video, bar } = load();
        const display = bar.querySelector('.tm-yt-speed-overlay__value');
        const preset = (rate) => bar.querySelector('.tm-yt-speed-overlay__preset[data-rate="' + rate + '"]');
        const presets = [...bar.querySelectorAll('.tm-yt-speed-overlay__preset')];
        const selected = () => presets.filter(b => b.disabled);
        assert.equal(selected().length, 1);
        assert.equal(selected()[0].getAttribute('data-rate'), '1');
        assert.equal(preset(1).getAttribute('aria-pressed'), 'true');
        assert(preset(1).classList.contains('tm-yt-speed-overlay__preset--selected'));
        assert.equal(preset(0.5).disabled, false);
        let rate = video.playbackRate;
        let writes = 0;
        Object.defineProperty(video, 'playbackRate', {
            configurable: true,
            get() { return rate; },
            set(value) { writes++; rate = value; }
        });
        preset(1).click();
        assert.equal(writes, 0, 'Clicking the selected speed must not write the same rate.');
        preset(1.5).click();
        assert.equal(writes, 1);
        assert.equal(video.playbackRate, 1.5);
        assert.equal(display.textContent, '1.5x');
        assert.equal(preset(1.5).disabled, true);
        assert.equal(preset(1).disabled, false);
        assert.equal(preset(1.5).getAttribute('aria-pressed'), 'true');
        assert.equal(preset(1).getAttribute('aria-pressed'), 'false');
        preset(1.5).click();
        assert.equal(writes, 1);
        // A user choosing a rate in YouTube's own native speed settings
        // produces ratechange without calling our button handlers.
        video.playbackRate = 2;
        video.dispatchEvent({ type:'ratechange' });
        assert.equal(selected().length, 1);
        assert.equal(preset(2).disabled, true);
        assert.equal(preset(1.5).disabled, false);
        assert.equal(display.textContent, '2x');
        video.playbackRate = 1.25;
        video.dispatchEvent({ type:'ratechange' });
        assert.equal(selected().length, 0);
        assert.equal(display.textContent, '1.25x');
        assert(presets.every(b => b.getAttribute('aria-pressed') === 'false'));
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
            assert.equal(bar.previousElementSibling, player);
        }
    });

    test('fullscreen root includes YouTube native captions, settings and progress controls', () => {
        const { harness, bar, video, fullscreen } = load({
            mobileControls: true, videoWidth: 1920, videoHeight: 1080
        });
        const host = video.closest('ytm-player');
        const native = host.querySelector('ytm-custom-control');
        assert(native, 'Expected mocked mobile YouTube native controls.');
        assert.equal(bar.previousElementSibling, host);
        fullscreen.click();
        const root = harness.document.getElementById(rootId);
        assert.equal(host.parentElement.className, 'tm-yt-alternative-fullscreen-stage');
        assert.equal(root.querySelector('ytm-custom-control'), native);
        assert.equal(root.querySelector('video'), video);
        harness.document.dispatchEvent({type: 'keydown', key: 'Escape'});
        assert.equal(host.parentElement, harness.document.body);
        assert.equal(bar.previousElementSibling, host);
        assert.equal(host.querySelector('ytm-custom-control'), native);
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
        assert.equal(bar.classList.contains('tm-yt-toolbar--custom-fullscreen'), true);
        const css = harness.document.getElementById('tm-yt-speed-overlay-style').textContent;
        const fullscreenCSS = css.slice(css.indexOf('/* Fullscreen: player occupies 100%'));
        assert.match(fullscreenCSS, /position: absolute !important;/);
        assert.match(css, /top: 12px !important;/);
        const centeredCSS = css.slice(css.indexOf('/* The alternative fullscreen player uses real, separately sized step controls.'));
        assert.match(centeredCSS, /#tm-yt-speed-overlay\.tm-yt-toolbar--custom-fullscreen \{[^}]*left: 50% !important;[^}]*transform: translateX\(-50%\) !important;/s);
        assert.match(centeredCSS, /width: min\(410px, calc\(100% - 24px\)\) !important;/);
        // At 844px landscape width, a 410px centered overlay begins at 217px:
        // the left-side YouTube mute control retains its own touch region.
        assert.equal((844 - 410) / 2, 217);
        assert.match(css, /opacity: 0 !important;/);
        assert.match(css, /visibility: hidden !important;/);
        assert.match(css, /pointer-events: none !important;/);
        assert.match(fullscreenCSS, /tm-yt-toolbar--custom-fullscreen \.tm-yt-toolbar__fullscreen \{\s*display: none !important;/);
        assert.match(fullscreenCSS, /height: 100% !important;/);
        assert.equal(bar.classList.contains('tm-yt-toolbar--revealed'), false);
        const previousSetTimeout = harness.window.setTimeout;
        const timers = [];
        harness.window.setTimeout = (callback, delay) => {
            timers.push(delay);
            return previousSetTimeout(callback, delay);
        };
        root.dispatchEvent({type: 'click'});
        assert.equal(bar.classList.contains('tm-yt-toolbar--revealed'), true);
        assert.deepEqual(timers, [1000], 'Fullscreen controls should hide after one second.');
        harness.runAllTimeouts();
        assert.equal(bar.classList.contains('tm-yt-toolbar--revealed'), false);
        root.dispatchEvent({type: 'click'});
        assert.equal(bar.classList.contains('tm-yt-toolbar--revealed'), true);
        // Native YouTube gestures must not be cancelled when revealing speed.
        const originalVideo = video.currentTime;
        assert.equal(video.currentTime, originalVideo);
        bar.querySelector('.tm-yt-speed-overlay__click--right').click();
        assert.equal(video.playbackRate, 1.75);
        harness.document.dispatchEvent({type: 'keydown', key: 'Escape'});
        harness.flushAnimationFrames();
        assert.equal(harness.document.getElementById(rootId), null);
        assert.equal(bar.parentElement, harness.document.body);
        assert.equal(bar.previousElementSibling, player);
        assert.equal(player.parentElement, harness.document.body);
        assert.equal(video.currentTime, 42);
        assert.equal(video.playbackRate, 1.75);
        assert.equal(fullscreen.getAttribute('aria-pressed'), 'false');
        assert.equal(bar.classList.contains('tm-yt-toolbar--custom-fullscreen'), false);
        assert.equal(bar.classList.contains('tm-yt-toolbar--revealed'), false);
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
