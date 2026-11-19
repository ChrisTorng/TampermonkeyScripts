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

describe('YouTube Tools owns fullscreen on YouTube hosts', () => {
    for (const url of [
        'https://m.youtube.com/watch?v=nCg3aXn5F3M',
        'https://www.youtube.com/watch?v=nCg3aXn5F3M',
        'https://www.youtube-nocookie.com/embed/nCg3aXn5F3M',
    ]) {
        test(`no duplicate Fullscreen Game View button or fullscreen CSS on ${url}`, () => {
            const h = createHarness({url});
            const player = h.document.createElement('video');
            player._rect = {left:0, top:140, width:360, height:230, right:360, bottom:370};
            h.document.body.appendChild(player);
            h.context.globalThis = h.context;
            vm.runInNewContext(scriptContents, h.context, {filename:scriptPath});
            assert.equal(h.document.querySelector('.tm-fullscreen-game-view-button'), null);
            assert.equal(h.document.getElementById('tm-fullscreen-game-view-style'), null);
        });
    }
});

describe('Fullscreen control must not modify unrelated article widgets', () => {
    test('two separate canvases get distinct outside buttons and expand only their own block', () => {
        const h = createHarness({ url: 'https://example.com/two-games' });
        const make = (r) => {
            const box = h.document.createElement('section');
            const canvas = h.document.createElement('canvas');
            box._rect = { ...r };
            canvas._rect = { ...r };
            box.appendChild(canvas);
            h.document.body.appendChild(box);
            return box;
        };
        const upper = make({left: 350, top: 100, right: 720, bottom: 350, width: 370, height: 250});
        const lower = make({left: 20, top: 380, right: 280, bottom: 560, width: 260, height: 180});
        h.context.globalThis = h.context;
        vm.runInNewContext(scriptContents, h.context, { filename: scriptPath });
        const buttons = h.document.querySelectorAll('.tm-fullscreen-game-view-button');
        assert.equal(buttons.length, 2, 'Each independent block owns its own control.');
        assert.equal(buttons[0].parentElement, upper);
        assert.equal(buttons[1].parentElement, lower);
        assert.deepEqual(buttons.map(button => button.style.top), ['-36px', '-36px'],
            'Each icon is positioned above its own local media edge, independent of page scroll.');
        assert.equal(upper.style.getPropertyValue('position'), 'relative');
        buttons[1].click();
        assert(lower.classList.contains('tm-fullscreen-game-view-fallback'));
        assert(!upper.classList.contains('tm-fullscreen-game-view-fallback'));
        assert.equal(h.document.getElementById('tm-fullscreen-game-view-exit-button'), null);
        h.dispatchWindowEvent('popstate');
        assert(!lower.classList.contains('tm-fullscreen-game-view-fallback'));
    });

    test('generic article photos no longer receive intrusive fullscreen controls', () => {
        const h = createHarness({url:'https://example.com/article'});
        const article = h.document.createElement('article');
        const img = h.document.createElement('img');
        img._rect = {left:20,top:180,right:670,bottom:510,width:650,height:330};
        img.naturalWidth = 1600;
        img.naturalHeight = 900;
        article.appendChild(img);
        h.document.body.appendChild(article);
        h.context.globalThis = h.context;
        vm.runInNewContext(scriptContents, h.context, {filename:scriptPath});
        assert.equal(h.document.querySelector('.tm-fullscreen-game-view-button'), null);
        assert.equal(article.style.getPropertyValue('position'), '');
    });

    test('fullscreen position does not re-measure media on scroll, including off-screen edges', () => {
        const h = createHarness({url:'https://example.com/canvas'});
        const wrap = h.document.createElement('section');
        const canvas = h.document.createElement('canvas');
        wrap._rect = {left:20,top:160,right:620,bottom:480,width:600,height:320};
        canvas._rect = {...wrap._rect};
        wrap.appendChild(canvas);
        h.document.body.appendChild(wrap);
        h.context.globalThis = h.context;
        vm.runInNewContext(scriptContents, h.context, {filename:scriptPath});
        const b = h.document.querySelector('.tm-fullscreen-game-view-button');
        assert.equal(b.parentElement, wrap);
        const initial = [b.style.left, b.style.top];
        canvas.getBoundingClientRect = () => { throw new Error('No layout measurement while scrolling'); };
        wrap.getBoundingClientRect = () => { throw new Error('No layout measurement while scrolling'); };
        h.dispatchWindowEvent('scroll');
        h.dispatchWindowEvent('scroll');
        assert.deepEqual([b.style.left, b.style.top], initial);
        assert.equal(b.hidden, false);
        assert.equal(b.style.position || 'absolute', 'absolute');
    });

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
        assert.equal(media.style.getPropertyValue('position'), '', 'Preserve the sticky media wrapper.');
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
        assert.equal(document.getElementById('tm-fullscreen-game-view-exit-button'), null,
            'Back provides exit; the fallback must not cover media with an ×.');
        document.dispatchEvent({ type: 'keydown', key: 'Escape' });
        await Promise.resolve();
        assert(!game.classList.contains('tm-fullscreen-game-view-fallback'));
        assert(!document.documentElement.classList.contains('tm-fullscreen-game-view-active'));
        assert.equal(button.getAttribute('aria-label'), 'Enter fullscreen game view');
        assert.equal(button.disabled, false);
    });

    test('browser Back exits fallback without an overlaid close button', () => {
        const harness = executeOnArcTask();
        const button = harness.document.getElementById('tm-fullscreen-game-view-button');
        button.click();
        assert.equal(button.getAttribute('aria-pressed'), 'true');
        assert.equal(harness.document.getElementById('tm-fullscreen-game-view-exit-button'), null);
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
        const firstButton = harness.document.querySelectorAll('.tm-fullscreen-game-view-button')[0];
        assert(firstButton);
        assert.equal(firstButton.id, 'tm-fullscreen-game-view-button');
        const second = activate(1);
        assert(harness.document.querySelectorAll('.tm-fullscreen-game-view-button')[1]);
        activate(2);
        assert.equal(harness.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 3);
        assert.equal(harness.document.querySelectorAll('.tm-fullscreen-game-view-button')[0], firstButton,
            'A later embed must not replace the first already working control.');

        const secondButton = harness.document.querySelectorAll('.tm-fullscreen-game-view-button')[1];
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
        assert.equal(harness.document.querySelectorAll('.tm-fullscreen-game-view-button')[0], firstButton);
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
        const button = harness.document.querySelectorAll('.tm-fullscreen-game-view-button')[1];
        assert(button);
        assert.equal(harness.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 2);

        const replacement = harness.document.createElement('iframe');
        replacement.src = 'https://www.youtube.com/embed/new-player';
        replacement.contentWindow = {postMessage() {}};
        lazy.remove();
        lower.appendChild(replacement);
        harness.triggerMutation([replacement], {removedNodes: [lazy]});
        harness.flushAnimationFrames();
        assert.equal(harness.document.querySelectorAll('.tm-fullscreen-game-view-button')[1], button);
        assert.equal(harness.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 2);
        harness.triggerMutation([], {type: 'attributes', target: lower, attributeName: 'class'});
        harness.flushAnimationFrames();
        assert.equal(harness.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 2);
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
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(calledWith.navigationUI, 'hide');
        assert.equal(h.getLocks(), 1);
        assert(h.video.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        assert.match(h.document.getElementById('tm-fullscreen-game-view-style').textContent,
            /video\.tm-fullscreen-game-view-media\.tm-fullscreen-game-view-landscape-rotated:fullscreen,[\s\S]*img\.tm-fullscreen-game-view-media\.tm-fullscreen-game-view-landscape-rotated:fullscreen\s*\{\s*width:\s*100dvh/i);
        assert.equal(h.button.disabled, true);
        assert.equal(h.document.querySelector('dialog'), null);
        h.document.fullscreenElement = null;
        h.dispatchDocumentEvent('fullscreenchange');
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(h.getUnlocks(), 1);
        assert(!h.video.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        assert.equal(h.button.disabled, false);
    });

    test('rejected native fullscreen uses only the video in a top-layer dialog; Escape restores it', async () => {
        const h = setupNitter(1920, 1080, { rejectLock: true });
        h.video.requestFullscreen = () => Promise.reject(new Error('NotAllowedError'));
        h.button.click();
        await new Promise(resolve => setImmediate(resolve));
        const dialog = h.document.getElementById('tm-fullscreen-video-dialog');
        assert(dialog);
        assert.equal(h.video.parentNode, dialog);
        assert.equal(dialog.open, true);
        assert.equal(h.button.disabled, true);
        assert.equal(h.document.getElementById('tm-fullscreen-game-view-exit-button'), null,
            'Nitter fullscreen must not add an unwanted × overlay.');
        assert(dialog.classList.contains('tm-fullscreen-game-view-landscape-rotated'),
            'Fallback rotates visually on a portrait viewport when screen lock is rejected.');
        const fallbackCss = h.document.getElementById('tm-fullscreen-game-view-style').textContent;
        assert.match(fallbackCss,
            /#tm-fullscreen-video-dialog\[open\]\.tm-fullscreen-game-view-landscape-rotated/);
        assert.doesNotMatch(fallbackCss, /tm-fullscreen-game-view-exit-button/,
            'No exit control or style should obscure the video.');
        assert.equal(h.getLocks(), 1);
        h.triggerMutation([h.video]);
        h.flushAnimationFrames();
        assert.equal(h.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 1,
            'Moving a playing video into the dialog must not remount duplicate controls.');
        h.dispatchWindowEvent('popstate');
        assert.equal(h.video.parentNode, h.media);
        assert.equal(h.document.getElementById('tm-fullscreen-video-dialog'), null);
        assert.equal(h.button.disabled, false);
        assert.equal(h.getUnlocks(), 0);
        assert.equal(h.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 1);
    });

    test('landscape video without loaded intrinsic metadata keeps its original orientation after dialog reparenting', async () => {
        const h = setupNitter(0, 0, { rejectLock: true });
        h.video._rect = { left: 20, top: 220, right: 370, bottom: 420, width: 350, height: 200 };
        h.video.requestFullscreen = () => Promise.reject(new Error('NotAllowedError'));
        h.button.click();
        await new Promise(resolve => setImmediate(resolve));
        const dialog = h.document.getElementById('tm-fullscreen-video-dialog');
        assert(dialog);
        assert(dialog.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        // A media element may become portrait-shaped because the fallback
        // dialog's CSS styles it to fill a portrait viewport. That is not
        // evidence of a portrait video; preserve the pre-modal media ratio.
        h.video._rect = { left: 0, top: 0, right: 390, bottom: 844, width: 390, height: 844 };
        h.dispatchWindowEvent('resize');
        assert(dialog.classList.contains('tm-fullscreen-game-view-landscape-rotated'),
            'Portrait-shaped fallback layout must not override the originally landscape video.');
        h.dispatchWindowEvent('popstate');
        assert.equal(h.video.parentNode, h.media);
    });

    test('portrait video attempts native fullscreen even when the policy hint says false', async () => {
        const h = setupNitter(720, 1280);
        h.document.fullscreenEnabled = false;
        let nativeCalls = 0;
        h.video.requestFullscreen = () => { nativeCalls++; return Promise.reject(new Error('NotAllowedError')); };
        h.button.click();
        // Allow the rejected fullscreen Promise to cross the VM realm microtask boundary.
        await new Promise(resolve => setImmediate(resolve));
        const dialog = h.document.getElementById('tm-fullscreen-video-dialog');
        assert(dialog);
        assert.equal(nativeCalls, 1);
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


describe('Nitter poster-to-video controls outside clipped media wrappers', () => {
    function makeGallery(previewTag = 'img') {
        const h = createHarness({
            url: 'https://nitter.tiekoetter.com/cocktailpeanut/status/2117295340697047214'
        });
        h.window.navigator = { userAgent: 'Mozilla/5.0 (Linux; Android 16) EdgA/157.0' };
        const tweet = h.document.createElement('section');
        tweet.className = 'status-el';
        tweet._rect = { left: 8, top: 90, right: 385, bottom: 700, width: 377, height: 610 };
        const body = h.document.createElement('div');
        body.className = 'status-body';
        const content = h.document.createElement('div');
        content.className = 'status-content media-body';
        const attachments = h.document.createElement('div');
        attachments.className = 'attachments card';
        const gallery = h.document.createElement('div');
        gallery.className = 'gallery-video';
        const attachment = h.document.createElement('div');
        attachment.className = 'attachment video-container';
        attachment._rect = { left: 30, top: 350, right: 362, bottom: 540, width: 332, height: 190 };
        const preview = h.document.createElement(previewTag);
        preview._rect = { left: 30, top: 350, right: 362, bottom: 540, width: 332, height: 190 };
        if (previewTag === 'video') {
            preview.setAttribute('poster', '/pic/media%2Ftest.jpg');
            preview.videoWidth = 1920;
            preview.videoHeight = 1080;
        } else {
            preview.naturalWidth = 1920;
            preview.naturalHeight = 1080;
        }
        attachment.appendChild(preview);
        gallery.appendChild(attachment);
        attachments.appendChild(gallery);
        content.appendChild(attachments);
        body.appendChild(content);
        tweet.appendChild(body);
        h.document.body.appendChild(tweet);
        h.window.getComputedStyle = element => ({
            position: 'static',
            overflowX: element === attachment || element === gallery ? 'hidden' : 'visible',
            overflowY: element === attachment || element === gallery ? 'hidden' : 'visible'
        });
        h.context.globalThis = h.context;
        vm.runInNewContext(scriptContents, h.context, { filename: scriptPath });
        return { ...h, tweet, attachment, gallery, preview,
            button: h.document.querySelector('.tm-fullscreen-game-view-button') };
    }

    test('poster-only Nitter image has one visible media control outside overflow:hidden wrappers', async () => {
        const h = makeGallery('img');
        assert(h.button, 'The video poster must receive a control before playback.');
        assert.equal(h.button.parentElement, h.tweet,
            'Place the control in the tweet, outside clipped attachment/gallery wrappers.');
        assert.equal(h.button.style.position || 'absolute', 'absolute');
        assert.equal(h.button.style.left, '316px');
        assert.equal(h.button.style.top, '224px');
        assert.equal(h.button.hidden, false);
        assert.equal(h.attachment.querySelector('.tm-fullscreen-game-view-button'), null);
        h.button.click();
        await new Promise(resolve => setImmediate(resolve));
        const dialog = h.document.getElementById('tm-fullscreen-video-dialog');
        assert(dialog, 'The poster must be enlargeable even if the player has not loaded.');
        assert.equal(h.preview.parentElement, dialog);
        h.dispatchWindowEvent('popstate');
        assert.equal(h.preview.parentElement, h.attachment);
    });

    test('preview IMG changing to VIDEO retains one stable button without scroll-position chasing', () => {
        const h = makeGallery('img');
        const initialButton = h.button;
        const initialPosition = [initialButton.style.left, initialButton.style.top];
        const video = h.document.createElement('video');
        video.setAttribute('poster', '/pic/media%2Ftest.jpg');
        video._rect = { ...h.preview._rect };
        video.videoWidth = 1920;
        video.videoHeight = 1080;
        h.attachment.removeChild(h.preview);
        h.attachment.appendChild(video);
        h.triggerMutation([video], {target:h.attachment, removedNodes:[h.preview]});
        h.flushAnimationFrames();
        assert.equal(h.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 1);
        assert.equal(h.document.querySelector('.tm-fullscreen-game-view-button'), initialButton);
        assert.equal(initialButton.parentElement, h.tweet);
        assert.deepEqual([initialButton.style.left, initialButton.style.top], initialPosition);
        video.getBoundingClientRect = () => { throw new Error('Scroll must not chase media position'); };
        h.dispatchWindowEvent('scroll');
        assert.deepEqual([initialButton.style.left, initialButton.style.top], initialPosition);
    });

    test('VIDEO poster and playing video share the same attachment-level button', () => {
        const h = makeGallery('video');
        assert(h.button);
        assert.equal(h.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 1);
        assert.equal(h.button.parentElement, h.tweet);
        h.preview.setAttribute('src', '/video/test.mp4');
        h.triggerMutation([], {target:h.preview, type:'attributes', attributeName:'src'});
        h.flushAnimationFrames();
        assert.equal(h.document.querySelector('.tm-fullscreen-game-view-button'), h.button);
        assert.equal(h.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 1);
    });
});

describe('Android Nitter and ARC fullscreen visibility regressions', () => {
    function addVideo(h, rectangle) {
        const wrapper = h.document.createElement('section');
        const video = h.document.createElement('video');
        video.controls = true;
        video._rect = { ...rectangle };
        wrapper._rect = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
        wrapper.appendChild(video);
        h.document.body.appendChild(wrapper);
        return { wrapper, video };
    }

    test('Nitter gives the visible video a control even when a larger video is off-screen', () => {
        const h = createHarness({
            url: 'https://nitter.tiekoetter.com/cocktailpeanut/status/2117295340697047214'
        });
        h.window.navigator = { userAgent: 'Mozilla/5.0 (Linux; Android 16) EdgA/157.0' };
        h.window.innerWidth = 390;
        h.window.innerHeight = 844;
        h.window.visualViewport.width = 390;
        h.window.visualViewport.height = 844;
        const distant = addVideo(h, { left: 12, top: 1420, right: 378, bottom: 1770, width: 366, height: 350 });
        const visible = addVideo(h, { left: 20, top: 220, right: 370, bottom: 420, width: 350, height: 200 });
        h.context.globalThis = h.context;
        vm.runInNewContext(scriptContents, h.context, { filename: scriptPath });

        const buttons = h.document.querySelectorAll('.tm-fullscreen-game-view-button');
        assert.equal(buttons.length, 2);
        assert.equal(buttons.filter((b) => !b.hidden).length, 2,
            'Off-screen controls must remain in their media blocks; viewport naturally clips them.');
        const visibleControl = buttons[1];
        assert(visibleControl && !visibleControl.hidden);
        assert.equal(visibleControl.parentElement, visible.wrapper,
            'Control should be a CSS-positioned child of the media, not a viewport overlay.');
        assert.equal(distant.wrapper.querySelector('button') !== null, true,
            'Off-screen media keeps its own control in the document without forced hiding.');
        assert.equal(visible.wrapper.querySelector('button'), visibleControl);
        assert(Number.parseFloat(visibleControl.style.left) >= 20);
        assert.equal(Number.parseFloat(visibleControl.style.top), 184,
            'Media control must appear 4px ABOVE the 220px video edge.');
        assert.equal(Number.parseFloat(visibleControl.style.left), 332,
            'Media control must align with the video right edge, not the window menu.');
    });

    test('Nitter video inserted after initial page render receives an independent control', () => {
        const h = createHarness({ url: 'https://nitter.tiekoetter.com/cocktailpeanut/status/2117295340697047214' });
        h.window.visualViewport.width = 390;
        h.window.visualViewport.height = 844;
        h.window.innerWidth = 390;
        h.window.innerHeight = 844;
        h.context.globalThis = h.context;
        vm.runInNewContext(scriptContents, h.context, { filename: scriptPath });
        assert.equal(h.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 0);
        const media = addVideo(h, { left: 20, top: 200, right: 370, bottom: 420, width: 350, height: 220 });
        h.triggerMutation([media.video]);
        h.flushAnimationFrames();
        const button = h.document.querySelector('.tm-fullscreen-game-view-button');
        assert(button, 'New Nitter video must mount on the mutation tick.');
        assert.equal(button.hidden, false);
        h.document.body.removeChild(media.wrapper);
        h.triggerMutation([], { removedNodes: [media.wrapper] });
        h.flushAnimationFrames();
        assert.equal(h.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 0,
            'Removed Nitter videos must clean up their associated controls.');
    });

    test('late ARC game root without a canvas still mounts its fullscreen control', () => {
        const h = createHarness({ url: 'https://arcprize.org/tasks/ls20' });
        h.context.globalThis = h.context;
        vm.runInNewContext(scriptContents, h.context, { filename: scriptPath });
        assert.equal(h.document.querySelectorAll('.tm-fullscreen-game-view-button').length, 0);
        const playground = h.document.createElement('section');
        playground.id = 'playground';
        const game = h.document.createElement('div');
        game.className = 'game-page-inner';
        playground.appendChild(game);
        h.document.body.appendChild(playground);
        h.triggerMutation([playground]);
        h.flushAnimationFrames();
        const button = h.document.getElementById('tm-fullscreen-game-view-button');
        assert(button, 'Hydrated game container must be recognized even without a video/canvas descendant.');
        assert.equal(button.parentElement, game);
    });
});

describe('Fullscreen photos, orientation, and actual Back history', () => {
    const imageUrl = 'https://nitter.tiekoetter.com/example/status/123456789';
    function imageHarness(width = 1920, height = 1080) {
        const h = createHarness({ url: imageUrl });
        h.window.navigator = { userAgent: 'Mozilla/5.0 (Linux; Android 16) EdgA/157.0' };
        h.window.innerWidth = 390;
        h.window.innerHeight = 844;
        h.window.visualViewport.width = 390;
        h.window.visualViewport.height = 844;
        let pushes = 0, backs = 0, locks = 0;
        h.window.history = {
            pushState(state, unused, url) { pushes++; assert.equal(url, imageUrl); },
            back() { backs++; }
        };
        h.window.screen = { orientation: {
            lock() { locks++; return Promise.reject(new Error('Unsupported')); },
            unlock() {}
        } };
        const anchor = h.document.createElement('a');
        anchor.className = 'still-image';
        const img = h.document.createElement('img');
        img.naturalWidth = width;
        img.naturalHeight = height;
        img._rect = {left: 20, top: 240, right: 370, bottom: 460, width: 350, height: 220};
        img.closest = (selector) => selector.includes('a.still-image') ? anchor : null;
        anchor.appendChild(img);
        h.document.body.appendChild(anchor);
        const nativeCreate = h.document.createElement.bind(h.document);
        h.document.createElement = tag => {
            const node = nativeCreate(tag);
            if (tag === 'dialog') {
                node.showModal = () => { node.open = true; node.setAttribute('open', ''); };
                node.close = () => { node.open = false; node.removeAttribute('open'); };
            }
            return node;
        };
        h.context.globalThis = h.context;
        vm.runInNewContext(scriptContents, h.context, { filename: scriptPath });
        return {
            ...h, anchor, img,
            button: h.document.querySelector('.tm-fullscreen-game-view-button'),
            pushes: () => pushes, backs: () => backs, locks: () => locks
        };
    }

    test('native fullscreen for a landscape image uses intrinsic aspect ratio', async () => {
        const h = imageHarness();
        assert(h.button, 'Large Nitter still-image gets an independent control.');
        assert.equal(h.button.parentElement, h.anchor);
        h.img.requestFullscreen = async () => {
            h.document.fullscreenElement = h.img;
            h.dispatchDocumentEvent('fullscreenchange');
        };
        h.button.click();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(h.locks(), 1, 'Intrinsic landscape dimensions require an orientation attempt.');
        assert(h.img.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        assert.equal(h.pushes(), 0, 'Do not intercept Back for real browser fullscreen.');
        assert(!h.document.getElementById('tm-fullscreen-video-dialog'));
    });

    test('landscape image fallback rotates and browser Back closes it without an overlay', async () => {
        const h = imageHarness();
        h.img.requestFullscreen = () => Promise.reject(new Error('NotAllowedError'));
        h.button.click();
        await new Promise(resolve => setImmediate(resolve));
        const dialog = h.document.getElementById('tm-fullscreen-video-dialog');
        assert(dialog);
        assert.equal(h.document.getElementById('tm-fullscreen-game-view-exit-button'), null);
        assert.equal(h.img.parentElement, dialog);
        assert(dialog.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        assert.equal(h.pushes(), 1, 'Entering fallback should push one same-page Back entry.');
        const css = h.document.getElementById('tm-fullscreen-game-view-style').textContent;
        assert.doesNotMatch(css, /tm-fullscreen-game-view-exit-button/,
            'Do not create any close overlay in the CSS.');
        h.dispatchWindowEvent('popstate');
        assert.equal(h.img.parentElement, h.anchor);
        assert.equal(h.document.getElementById('tm-fullscreen-video-dialog'), null);
        assert.equal(h.backs(), 0, 'Actual Back already consumed the synthetic entry.');
    });

    test('portrait photo remains upright; browser Back unwinds history', async () => {
        const h = imageHarness(720, 1280);
        h.img.requestFullscreen = () => Promise.reject(new Error('NotAllowedError'));
        h.button.click();
        await new Promise(resolve => setImmediate(resolve));
        const dialog = h.document.getElementById('tm-fullscreen-video-dialog');
        assert(dialog && !dialog.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        assert.equal(h.document.getElementById('tm-fullscreen-game-view-exit-button'), null);
        h.dispatchWindowEvent('popstate');
        assert.equal(h.backs(), 0, 'Actual Back already consumed the one synthetic entry.');
        assert.equal(h.img.parentElement, h.anchor);
        assert.equal(h.button.disabled, false);
    });

    test('landscape game canvas rotates in CSS fallback and Back restores it', () => {
        const h = executeOnArcTask();
        h.window.navigator = { userAgent: 'Mozilla/5.0 (Linux; Android 16) EdgA/157.0' };
        h.window.innerWidth = 390;
        h.window.innerHeight = 844;
        h.game._rect = {left: 20, top: 180, right: 380, bottom: 410, width: 360, height: 230};
        const canvas = h.document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 450;
        h.game.appendChild(canvas);
        let pushed = 0, goneBack = 0;
        h.window.history = {
            pushState() { pushed++; },
            back() { goneBack++; }
        };
        // Re-run in a fresh harness for the Android user agent to be observed at init.
        // The orientation handler is registered at script initialization.
        const android = createHarness({ url: 'https://arcprize.org/tasks/ls20' });
        android.window.navigator = h.window.navigator;
        android.window.innerWidth = 390;
        android.window.innerHeight = 844;
        android.window.history = h.window.history;
        const playground = android.document.createElement('div');
        playground.id = 'playground';
        const game = android.document.createElement('div');
        game.className = 'game-page-inner';
        game._rect = {left:20, top:180, right:380, bottom:410, width:360, height:230};
        const gameCanvas = android.document.createElement('canvas');
        gameCanvas.width = 800;
        gameCanvas.height = 450;
        game.appendChild(gameCanvas);
        playground.appendChild(game);
        android.document.body.appendChild(playground);
        android.context.globalThis = android.context;
        vm.runInNewContext(scriptContents, android.context, { filename: scriptPath });
        const button = android.document.getElementById('tm-fullscreen-game-view-button');
        button.click();
        assert(game.classList.contains('tm-fullscreen-game-view-fallback'));
        assert(game.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        assert.equal(pushed, 1);
        android.dispatchWindowEvent('popstate');
        assert(!game.classList.contains('tm-fullscreen-game-view-fallback'));
        assert(!game.classList.contains('tm-fullscreen-game-view-landscape-rotated'));
        assert.equal(goneBack, 0);
    });
});
