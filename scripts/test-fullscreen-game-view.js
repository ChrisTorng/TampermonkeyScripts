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
        assert.equal(button.getAttribute('aria-label'), 'Exit fullscreen game view');

        button.click();
        await Promise.resolve();
        assert(!game.classList.contains('tm-fullscreen-game-view-fallback'));
        assert(!document.documentElement.classList.contains('tm-fullscreen-game-view-active'));
        assert.equal(button.getAttribute('aria-label'), 'Enter fullscreen game view');
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
});
