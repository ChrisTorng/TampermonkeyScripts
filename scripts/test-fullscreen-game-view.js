const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'FullscreenGameView.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');

function executeOnArcTask() {
    const harness = createHarness({ url: 'https://arcprize.org/tasks/ls20' });
    const playground = harness.document.createElement('section');
    playground.id = 'playground';
    const taskRoot = harness.document.createElement('div');
    taskRoot.id = 'task-detail-root';
    const game = harness.document.createElement('div');
    game.className = 'game-page-inner';
    const shell = harness.document.createElement('div');
    shell.className = 'shell-root';
    const controls = harness.document.createElement('div');
    controls.className = 'shell-controls';
    const dPad = harness.document.createElement('div');
    dPad.className = 'd-pad-grid';
    controls.appendChild(dPad);
    shell.appendChild(controls);
    game.appendChild(shell);
    playground.append(taskRoot, game);
    harness.document.body.appendChild(playground);
    harness.context.globalThis = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    return { ...harness, game, dPad };
}

describe('Fullscreen control must not modify unrelated article widgets', () => {
    test('Nieman Lab advertising iframe is not treated as a playable media surface', () => {
        const url = 'https://www.niemanlab.org/2026/11/ai-is-becoming-an-information-gateway-audiences-still-dont-want-it-making-their-news/';
        const harness = createHarness({ url });
        const adWrapper = harness.document.createElement('section');
        adWrapper.id = 'advertisement-slot';
        adWrapper.style.setProperty('position', 'absolute');
        const adFrame = harness.document.createElement('iframe');
        adFrame.src = 'https://ads.example.org/banner.html';
        adFrame._rect = { left: 0, top: 0, right: 1200, bottom: 450, width: 1200, height: 450 };
        adWrapper.appendChild(adFrame);
        harness.document.body.appendChild(adWrapper);
        harness.context.globalThis = harness.context;

        vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });

        assert.equal(harness.document.querySelector('.tm-fullscreen-game-view-button'), null);
        assert.equal(adWrapper.classList.contains('tm-fullscreen-game-view-target'), false);
        assert.equal(adWrapper.style.getPropertyValue('position'), 'absolute',
            'An advertisement must retain its original layout positioning.');
    });

    test('recognizes an embedded Vimeo player without overriding a sticky wrapper', () => {
        const harness = createHarness({ url: 'https://example.com/article' });
        const media = harness.document.createElement('section');
        const frame = harness.document.createElement('iframe');
        frame.src = 'https://player.vimeo.com/video/1234';
        media.appendChild(frame);
        harness.document.body.appendChild(media);
        harness.window.getComputedStyle = (element) => ({
            position: element === media ? 'sticky' : 'static'
        });
        harness.context.globalThis = harness.context;

        vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });

        const button = harness.document.querySelector('.tm-fullscreen-game-view-button');
        assert(button, 'A known embedded video must keep its fullscreen entry.');
        assert.equal(button.parentElement, media);
        assert.equal(media.classList.contains('tm-fullscreen-game-view-target'), true);
        assert.equal(media.classList.contains('tm-fullscreen-game-view-local-position'), false,
            'Do not replace an existing fixed, sticky, or absolute positioning context.');
    });
});

describe('Fullscreen Game View on ARC Prize tasks', () => {
    test('repairs narrow-screen sizing and mounts an accessible button', () => {
        const { document, game } = executeOnArcTask();
        const style = document.getElementById('tm-fullscreen-game-view-style');
        const button = document.getElementById('tm-fullscreen-game-view-button');

        assert(style, 'Expected responsive game style.');
        assert.match(style.textContent, /#playground \.shell-root/);
        assert.match(style.textContent, /max-width: min\(540px, 100%\) !important/);
        assert.match(style.textContent, /box-sizing: border-box !important/);
        assert.match(style.textContent, /overflow: visible !important/);
        assert.match(style.textContent, /#playground \.d-pad-grid[\s\S]*transform: translateX\(2rem\) !important/);
        assert(game.classList.contains('tm-fullscreen-game-view-target'));
        assert.equal(button.parentElement, game);
        assert.equal(button.getAttribute('aria-label'), 'Enter fullscreen game view');
    });

    test('enters and exits the distraction-free fallback view', async () => {
        const { document, game } = executeOnArcTask();
        const button = document.getElementById('tm-fullscreen-game-view-button');

        button.click();
        await Promise.resolve();
        assert(game.classList.contains('tm-fullscreen-game-view-fallback'));
        assert(document.documentElement.classList.contains('tm-fullscreen-game-view-active'));
        assert.equal(button.textContent, '⛶');
        assert.equal(button.getAttribute('aria-pressed'), 'true');
        assert.equal(button.disabled, true);

        document.dispatchEvent({ type: 'keydown', key: 'Escape' });
        await Promise.resolve();
        assert(!game.classList.contains('tm-fullscreen-game-view-fallback'));
        assert(!document.documentElement.classList.contains('tm-fullscreen-game-view-active'));
        assert.equal(button.getAttribute('aria-label'), 'Enter fullscreen game view');
        assert.equal(button.disabled, false);
    });

    test('browser Back exits the expanded fallback without a close button', () => {
        const harness = executeOnArcTask();
        const button = harness.document.getElementById('tm-fullscreen-game-view-button');
        button.click();
        assert.equal(button.getAttribute('aria-pressed'), 'true');
        harness.dispatchWindowEvent('popstate');
        assert(!harness.game.classList.contains('tm-fullscreen-game-view-fallback'));
        assert.equal(button.getAttribute('aria-pressed'), 'false');
        assert.equal(button.disabled, false);
    });

    test('native fullscreen changes hide and restore the entry control', async () => {
        const { document, game } = executeOnArcTask();
        const button = document.getElementById('tm-fullscreen-game-view-button');
        game.requestFullscreen = async () => {
            document.fullscreenElement = game;
            document.dispatchEvent({ type: 'fullscreenchange' });
        };
        button.click();
        await Promise.resolve();
        assert.equal(button.getAttribute('aria-pressed'), 'true');
        assert.equal(button.disabled, true);
        document.fullscreenElement = null; // The browser handles Escape for native fullscreen.
        document.dispatchEvent({ type: 'fullscreenchange' });
        assert.equal(button.getAttribute('aria-pressed'), 'false');
        assert.equal(button.disabled, false);
        assert.equal(button.textContent, '⛶');
    });


    test('embedded YouTube orientation reaches the generic fullscreen entry and restores on exit', async () => {
        const harness = createHarness({ url: 'https://www.anthropic.com/claude-fable-and-mythos-5-2' });
        harness.window.navigator = { userAgent: 'Mozilla/5.0 (Linux; Android 16) EdgA/150.0' };
        harness.window.innerWidth = 390;
        harness.window.innerHeight = 844;
        let locks = 0, unlocks = 0;
        harness.window.screen = { orientation: {
            lock(value) { assert.equal(value, 'landscape'); locks++; return Promise.resolve(); },
            unlock() { unlocks++; }
        } };
        const wrapper = harness.document.createElement('div');
        const frame = harness.document.createElement('iframe');
        frame.src = 'https://www.youtube.com/embed/nCg3aXn5F3M';
        const sent = [];
        frame.contentWindow = {postMessage(data, origin) { sent.push({data, origin}); }};
        wrapper.appendChild(frame);
        harness.document.body.appendChild(wrapper);
        harness.context.globalThis = harness.context;
        vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
        assert(sent.some(x => x.data.tmYoutubeOrientationRequest === 1),
            'Request true video dimensions from embedded player rather than guessing the iframe shape.');
        const button = harness.document.getElementById('tm-fullscreen-game-view-button');
        assert(button);
        wrapper.requestFullscreen = () => {
            harness.document.fullscreenElement = wrapper;
            harness.dispatchDocumentEvent('fullscreenchange');
            return Promise.resolve();
        };
        harness.window.dispatchEvent({
            type: 'message', origin: 'https://www.youtube.com', source: frame.contentWindow,
            data: {tmYoutubeVideoOrientation: 1, width: 1920, height: 1080}
        });
        button.click();
        await Promise.resolve();
        await Promise.resolve();
        assert.equal(locks, 1);
        assert(wrapper.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        harness.window.innerWidth = 844;
        harness.window.innerHeight = 390;
        harness.dispatchWindowEvent('resize');
        assert(!wrapper.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        harness.document.fullscreenElement = null;
        harness.dispatchDocumentEvent('fullscreenchange');
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(unlocks, 1);
    });

    test('native iframe fullscreen uses video dimensions and rejects spoofed/portrait metadata', () => {
        const harness = createHarness({ url: 'https://www.anthropic.com/claude-fable-and-mythos-5-2' });
        harness.window.navigator = { userAgent: 'Mozilla/5.0 (Linux; Android 16) EdgA/150.0' };
        harness.window.innerWidth = 390;
        harness.window.innerHeight = 844;
        let locks = 0;
        harness.window.screen = { orientation: {
            lock() { locks++; return Promise.reject(new Error('NotSupportedError')); }
        } };
        const wrapper = harness.document.createElement('div');
        const frame = harness.document.createElement('iframe');
        frame.src = 'https://www.youtube.com/embed/nCg3aXn5F3M';
        frame.contentWindow = { postMessage() {} };
        wrapper.appendChild(frame);
        harness.document.body.appendChild(wrapper);
        harness.context.globalThis = harness.context;
        vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
        harness.document.fullscreenElement = frame;
        harness.dispatchDocumentEvent('fullscreenchange');
        assert.equal(locks, 0, 'Unknown video dimensions cannot be assumed landscape.');
        const dispatch = (origin, source, width, height) => harness.window.dispatchEvent({
            type: 'message', origin, source,
            data: {tmYoutubeVideoOrientation: 1, width, height}
        });
        dispatch('https://malicious.example', frame.contentWindow, 1920, 1080);
        dispatch('https://www.youtube.com', {}, 1920, 1080);
        assert.equal(locks, 0);
        dispatch('https://www.youtube.com', frame.contentWindow, 1080, 1920);
        assert.equal(locks, 0);
        harness.window.dispatchEvent({type: 'message', origin: 'https://www.youtube.com',
            source: frame.contentWindow,
            data: {tmYoutubeNativeFullscreen: 1, active: true}});
        dispatch('https://www.youtube.com', frame.contentWindow, 1920, 1080);
        assert.equal(locks, 0, 'Child-owned fullscreen must not be rotated or locked again by the parent.');
        assert(!frame.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        harness.window.dispatchEvent({type: 'message', origin: 'https://www.youtube.com',
            source: frame.contentWindow,
            data: {tmYoutubeNativeFullscreen: 1, active: false}});
        assert.equal(locks, 1);
        assert(frame.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        harness.document.fullscreenElement = null;
        harness.dispatchDocumentEvent('fullscreenchange');
        assert(!frame.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
    });

    test('each lazy YouTube embed gets a fullscreen button after poster-to-iframe replacement', async () => {
        const harness = createHarness({
            url: 'https://www.anthropic.com/claude-fable-and-mythos-5-2'
        });
        harness.window.navigator = { userAgent: 'Mozilla/5.0 (Linux; Android 16) EdgA/150.0' };
        harness.window.innerWidth = 390;
        harness.window.innerHeight = 844;
        const slots = [];
        for (let i = 0; i < 3; i++) {
            const slot = harness.document.createElement('div');
            slot.className = 'video-preview';
            const poster = harness.document.createElement('img');
            poster.src = 'https://example.com/poster-' + i + '.gif';
            slot.appendChild(poster);
            harness.document.body.appendChild(slot);
            slots.push(slot);
        }
        harness.context.globalThis = harness.context;
        vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
        assert.equal(harness.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 0,
            'Image/GIF preview alone does not create a YouTube fullscreen control.');

        const activate = (index) => {
            const frame = harness.document.createElement('iframe');
            frame.src = 'https://www.youtube.com/embed/dynamic-video-' + index;
            frame.contentWindow = { postMessage() {} };
            slots[index].appendChild(frame);
            harness.triggerMutation([frame]);
            harness.flushAnimationFrames();
            return frame;
        };
        const first = activate(0);
        const firstButton = slots[0].querySelector('.tm-fullscreen-game-view-button');
        assert(firstButton);
        assert.equal(firstButton.id, 'tm-fullscreen-game-view-button');
        const second = activate(1);
        assert(slots[1].querySelector('.tm-fullscreen-game-view-button'));
        activate(2);
        assert.equal(harness.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 3);
        assert.equal(slots[0].querySelector('.tm-fullscreen-game-view-button'), firstButton,
            'A later embed must not replace the first already working control.');

        const secondButton = slots[1].querySelector('.tm-fullscreen-game-view-button');
        assert.notEqual(secondButton, firstButton);
        harness.window.dispatchEvent({
            type: 'message', origin: 'https://www.youtube.com', source: second.contentWindow,
            data: { tmYoutubeVideoOrientation: 1, width: 1920, height: 1080 }
        });
        secondButton.click();
        await Promise.resolve();
        assert(slots[1].classList.contains('tm-fullscreen-game-view-fallback'),
            'The second button enters its own player, not the first.');
        assert(slots[1].classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        assert(!slots[0].classList.contains('tm-fullscreen-game-view-fallback'));
        harness.document.dispatchEvent({type: 'keydown', key: 'Escape'});
        assert(!slots[1].classList.contains('tm-fullscreen-game-view-fallback'));
        assert.equal(slots[0].querySelector('.tm-fullscreen-game-view-button'), firstButton);
        assert.equal(first.parentElement, slots[0]);
    });

    test('changing a lazy iframe src or replacing its child does not duplicate the button', () => {
        const harness = createHarness({url: 'https://www.anthropic.com/claude-fable-and-mythos-5-2'});
        const top = harness.document.createElement('section');
        const initial = harness.document.createElement('iframe');
        initial.src = 'https://www.youtube.com/embed/first';
        top.appendChild(initial);
        const lower = harness.document.createElement('section');
        const lazy = harness.document.createElement('iframe');
        lazy.src = 'about:blank';
        lower.appendChild(lazy);
        harness.document.body.append(top, lower);
        harness.context.globalThis = harness.context;
        vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
        assert.equal(lower.querySelector('.tm-fullscreen-game-view-button'), null);

        lazy.src = 'https://www.youtube-nocookie.com/embed/after-click';
        harness.triggerMutation([], {type: 'attributes', target: lazy, attributeName: 'src'});
        harness.flushAnimationFrames();
        const button = lower.querySelector('.tm-fullscreen-game-view-button');
        assert(button);
        assert.equal(harness.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 2);

        const replacement = harness.document.createElement('iframe');
        replacement.src = 'https://www.youtube.com/embed/new-player';
        replacement.contentWindow = {postMessage() {}};
        lazy.remove();
        lower.appendChild(replacement);
        harness.triggerMutation([replacement], {removedNodes: [lazy]});
        harness.flushAnimationFrames();
        assert.equal(lower.querySelector('.tm-fullscreen-game-view-button'), button);
        assert.equal(harness.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 2);
        harness.triggerMutation([], {type: 'attributes', target: lower, attributeName: 'class'});
        harness.flushAnimationFrames();
        assert.equal(lower.querySelectorAll('.tm-fullscreen-game-view-button').length, 1);
    });

    test('uses the largest generic game surface outside ARC Prize', () => {
        const harness = createHarness({ url: 'https://example.com/game' });
        const wrapper = harness.document.createElement('main');
        const canvas = harness.document.createElement('canvas');
        canvas.clientWidth = 640;
        canvas.clientHeight = 480;
        wrapper.appendChild(canvas);
        harness.document.body.appendChild(wrapper);
        harness.context.globalThis = harness.context;

        vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });

        assert(wrapper.classList.contains('tm-fullscreen-game-view-target'));
        assert.equal(harness.document.getElementById('tm-fullscreen-game-view-button').parentElement, wrapper);
    });

    for (const mode of ['native', 'fallback-escape', 'fallback-back']) {
        test(`${mode} restores document, ancestor, game scrolling, and focus after exit`, async () => {
            const harness = executeOnArcTask();
            const { window, document, game } = harness;
            // The harness does not implement browser window scrolling or focus.
            window.scrollX = 120;
            window.scrollY = 950;
            window.scrollTo = ({ left, top, behavior }) => {
                assert.equal(behavior, 'instant');
                window.scrollX = left;
                window.scrollY = top;
            };
            const shell = game.querySelector('.shell-root');
            const parent = game.parentElement;
            parent.scrollLeft = 35;
            parent.scrollTop = 80;
            game.scrollLeft = 14;
            game.scrollTop = 28;
            shell.scrollLeft = 60;
            shell.scrollTop = 75;
            const button = document.getElementById('tm-fullscreen-game-view-button');
            document.activeElement = button;
            let focusOptions;
            button.focus = (options) => { focusOptions = options; };
            if (mode === 'native') game.requestFullscreen = async () => {
                document.fullscreenElement = game;
                document.dispatchEvent({ type: 'fullscreenchange' });
            };
            button.click();
            await Promise.resolve();
            window.scrollX = 0;
            window.scrollY = 0;
            for (const element of [parent, game, shell]) { element.scrollLeft = 0; element.scrollTop = 0; }
            if (mode === 'native') {
                document.fullscreenElement = null;
                document.dispatchEvent({ type: 'fullscreenchange' });
            } else if (mode === 'fallback-back') harness.dispatchWindowEvent('popstate');
            else document.dispatchEvent({ type: 'keydown', key: 'Escape' });
            assert.equal(window.scrollX, 120);
            assert.equal(window.scrollY, 950);
            assert.equal(focusOptions.preventScroll, true);
            // Simulate a late browser layout reset after the exit event.
            window.scrollY = 0;
            harness.flushAnimationFrames();
            harness.flushAnimationFrames();
            assert.equal(window.scrollY, 950);
            assert.deepEqual([parent.scrollLeft, parent.scrollTop, game.scrollLeft, game.scrollTop, shell.scrollLeft, shell.scrollTop], [35, 80, 14, 28, 60, 75]);
        });
    }

    test('pending restoration cannot overwrite a new fullscreen session', () => {
        const harness = executeOnArcTask();
        const { window, document } = harness;
        window.scrollY = 900;
        window.scrollTo = ({ top }) => { window.scrollY = top; };
        const button = document.getElementById('tm-fullscreen-game-view-button');
        button.click();
        document.dispatchEvent({ type: 'keydown', key: 'Escape' });
        window.scrollY = 500;
        button.click();
        harness.flushAnimationFrames();
        assert.equal(window.scrollY, 500);
        document.dispatchEvent({ type: 'keydown', key: 'Escape' });
        harness.flushAnimationFrames();
        harness.flushAnimationFrames();
        assert.equal(window.scrollY, 500);
    });
});


describe('Nitter video fullscreen migration', () => {
    function setupNitter(width, height, options = {}) {
        const harness = createHarness({
            url: 'https://nitter.tiekoetter.com/cocktailpeanut/status/2117295340697047214'
        });
        harness.window.navigator = { userAgent: 'Mozilla/5.0 (Linux; Android 16) EdgA/157.0' };
        harness.window.innerWidth = 390;
        harness.window.innerHeight = 844;
        const media = harness.document.createElement('div');
        const video = harness.document.createElement('video');
        video.videoWidth = width;
        video.videoHeight = height;
        video.controls = true;
        media.appendChild(video);
        harness.document.body.appendChild(media);
        let locks = 0;
        let unlocks = 0;
        harness.window.screen = { orientation: {
            lock(direction) {
                assert.equal(direction, 'landscape');
                locks += 1;
                return options.rejectLock ? Promise.reject(new Error('NotSupportedError')) : Promise.resolve();
            },
            unlock() { unlocks += 1; }
        } };
        const create = harness.document.createElement.bind(harness.document);
        harness.document.createElement = (tagName) => {
            const node = create(tagName);
            if (tagName.toLowerCase() === 'dialog') {
                node.showModal = () => {
                    node.open = true;
                    node.setAttribute('open', '');
                };
                node.close = () => {
                    node.open = false;
                    node.removeAttribute('open');
                };
            }
            return node;
        };
        harness.context.globalThis = harness.context;
        vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
        return {
            ...harness, media, video,
            getLocks: () => locks, getUnlocks: () => unlocks,
            button: harness.document.getElementById('tm-fullscreen-game-view-button')
        };
    }

    test('uses the Nitter video directly and locks landscape when native fullscreen succeeds', async () => {
        const h = setupNitter(1920, 1080);
        assert(h.button);
        let calledWith;
        h.video.requestFullscreen = (options) => {
            calledWith = options;
            h.document.fullscreenElement = h.video;
            h.dispatchDocumentEvent('fullscreenchange');
            return Promise.resolve();
        };
        h.button.click();
        await Promise.resolve();
        await Promise.resolve();
        assert.equal(calledWith.navigationUI, 'hide');
        assert.equal(h.getLocks(), 1);
        assert(h.video.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        assert.equal(h.button.disabled, true);
        assert.equal(h.document.querySelector('dialog'), null);
        h.document.fullscreenElement = null;
        h.dispatchDocumentEvent('fullscreenchange');
        assert.equal(h.getUnlocks(), 1);
        assert(!h.video.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        assert.equal(h.button.disabled, false);
    });

    test('rejected native fullscreen uses only the video in a top-layer dialog; Escape restores it', async () => {
        const h = setupNitter(1920, 1080, { rejectLock: true });
        h.video.requestFullscreen = () => Promise.reject(new Error('NotAllowedError'));
        h.button.click();
        await Promise.resolve();
        await Promise.resolve();
        const dialog = h.document.getElementById('tm-fullscreen-video-dialog');
        assert(dialog);
        assert.equal(h.video.parentNode, dialog);
        assert.equal(dialog.open, true);
        assert.equal(h.button.disabled, true);
        assert(dialog.classList.contains('tm-fullscreen-game-view-landscape-rotated'),
            'Fallback rotates visually on a portrait viewport when screen lock is rejected.');
        assert.match(h.document.getElementById('tm-fullscreen-game-view-style').textContent,
            /#tm-fullscreen-video-dialog\[open\]\.tm-fullscreen-game-view-landscape-rotated/);
        assert.equal(h.getLocks(), 1);
        h.triggerMutation([h.video]);
        h.flushAnimationFrames();
        assert.equal(h.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 1,
            'Moving a playing video into the dialog must not remount duplicate controls.');
        h.document.dispatchEvent({ type: 'keydown', key: 'Escape' });
        assert.equal(h.video.parentNode, h.media);
        assert.equal(h.document.getElementById('tm-fullscreen-video-dialog'), null);
        assert.equal(h.button.disabled, false);
        assert.equal(h.getUnlocks(), 0);
        assert.equal(h.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 1);
    });

    test('portrait video remains upright, and Back closes the dialog under denied fullscreen policy', () => {
        const h = setupNitter(720, 1280);
        h.document.fullscreenEnabled = false;
        let nativeCalls = 0;
        h.video.requestFullscreen = () => { nativeCalls++; return Promise.resolve(); };
        h.button.click();
        const dialog = h.document.getElementById('tm-fullscreen-video-dialog');
        assert(dialog);
        assert.equal(nativeCalls, 0);
        assert.equal(h.getLocks(), 0);
        assert(!dialog.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        h.dispatchWindowEvent('popstate');
        assert.equal(h.video.parentNode, h.media);
        assert.equal(h.button.disabled, false);
    });

    test('landscape dialog rotation is removed when the viewport turns landscape', () => {
        const h = setupNitter(1920, 1080, { rejectLock: true });
        h.document.fullscreenEnabled = false;
        h.button.click();
        const dialog = h.document.getElementById('tm-fullscreen-video-dialog');
        assert(dialog.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        h.window.innerWidth = 844;
        h.window.innerHeight = 390;
        h.dispatchWindowEvent('resize');
        assert(!dialog.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        h.document.dispatchEvent({ type: 'keydown', key: 'Escape' });
    });
});
