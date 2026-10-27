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
