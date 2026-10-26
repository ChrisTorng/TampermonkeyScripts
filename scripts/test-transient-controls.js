const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { createHarness } = require('./dom-harness');

const root = path.join(__dirname, '..');
const files = ['TranslatePreformattedText.user.js', 'FullscreenGameView.user.js'];
function execute(file) {
    const harness = createHarness({ url: 'https://example.com/article' });
    if (file === files[0]) {
        const pre = harness.document.createElement('pre');
        pre.textContent = 'example code';
        harness.appendToBody(pre);
    } else {
        const game = harness.document.createElement('main');
        game.appendChild(harness.document.createElement('canvas'));
        harness.appendToBody(game);
    }
    vm.runInNewContext(fs.readFileSync(path.join(root, 'src', file), 'utf8'), harness.context, { filename: file });
    const button = harness.document.querySelector(file === files[0] ? '.tm-translate-pre-one' : '#tm-fullscreen-game-view-button');
    const container = button.parentElement;
    container._rect = { left: 100, top: 100, right: 700, bottom: 1000, width: 600, height: 900 };
    const update = () => { harness.dispatchWindowEvent('scroll'); harness.flushAnimationFrames(); };
    update();
    // Pointer capture is a browser API absent from the local DOM harness.
    let captured;
    button.setPointerCapture = (id) => { captured = id; };
    button.hasPointerCapture = (id) => captured === id;
    button.releasePointerCapture = () => { captured = undefined; };
    const pointer = (type, x, y, pointerType = 'mouse') => button.dispatchEvent({
        type, clientX: x, clientY: y, pointerId: 1, pointerType, button: 0,
        preventDefault() {}, stopPropagation() {},
    });
    return { ...harness, button, container, update, pointer };
}

describe('transient in-content controls', () => {
    test('translation stays inside nested horizontal and vertical scrollports at every scroll position', () => {
        const harness = execute(files[0]);
        const horizontal = harness.document.createElement('div');
        const vertical = harness.document.createElement('div');
        harness.container.parentElement.insertBefore(vertical, harness.container);
        vertical.appendChild(horizontal);
        horizontal.appendChild(harness.container);
        horizontal._rect = { left: 100, top: 100, right: 702, bottom: 502, width: 602, height: 402 };
        horizontal.clientLeft = 1;
        horizontal.clientTop = 1;
        horizontal.clientWidth = 600;
        horizontal.clientHeight = 380; // Excludes the horizontal scrollbar and border.
        vertical._rect = { left: 50, top: 50, right: 850, bottom: 450, width: 800, height: 400 };
        vertical.clientWidth = 780;
        vertical.clientHeight = 400;
        const originalComputedStyle = harness.window.getComputedStyle;
        harness.window.getComputedStyle = (element) => element === horizontal
            ? { overflowX: 'auto', overflowY: 'auto' }
            : element === vertical ? { overflowX: 'visible', overflowY: 'hidden' } : originalComputedStyle(element);
        for (const scrollLeft of [0, 300, 600, 0]) {
            harness.container._rect = { left: 101 - scrollLeft, top: 101, right: 1301 - scrollLeft, bottom: 501, width: 1200, height: 400 };
            harness.update();
            assert.equal(harness.container._rect.left + parseFloat(harness.button.style.left), 671);
            assert.equal(harness.container._rect.top + parseFloat(harness.button.style.top), 420);
        }
        harness.pointer('pointerdown', 675, 425);
        harness.pointer('pointermove', 2000, 2000);
        harness.pointer('pointerup', 2000, 2000);
        assert(harness.container._rect.left + parseFloat(harness.button.style.left) + 24 <= 701);
        assert(harness.container._rect.top + parseFloat(harness.button.style.top) + 24 <= 450);
    });

    test('translation defaults to the bottom right of the visible part of a tall block', () => {
        const harness = execute(files[0]);
        assert.equal(harness.button.style.left, '570px');
        assert.equal(harness.button.style.top, '590px');
        assert.equal(harness.button.hidden, false);
        harness.container._rect = { left: -100, top: -400, right: 1500, bottom: 1000, width: 1600, height: 1400 };
        harness.update();
        assert.equal(harness.button.style.left, '1350px');
        assert.equal(harness.button.style.top, '1090px');
        assert.equal(-100 + parseFloat(harness.button.style.left) + 24, 1274);
        assert.equal(-400 + parseFloat(harness.button.style.top) + 24, 714);
    });

    test('translation follows the visible block bottom on scroll, conversion, and viewport resize', () => {
        const harness = execute(files[0]);
        harness.container._rect.bottom = 500;
        harness.update();
        assert.equal(harness.button.style.top, '370px');
        harness.button.click();
        harness.container._rect.bottom = 350;
        harness.flushAnimationFrames();
        assert.equal(harness.button.style.top, '220px');
        assert.equal(harness.button.getAttribute('aria-pressed'), 'true');
        harness.window.visualViewport.width = 360;
        harness.window.visualViewport.height = 300;
        harness.dispatchVisualViewportEvent('resize');
        harness.flushAnimationFrames();
        assert.equal(harness.button.style.left, '230px');
        assert.equal(harness.button.style.top, '170px');
    });

    for (const file of files) {
        test(`${file} supports mouse and touch dragging without activating or persisting`, () => {
            const harness = execute(file);
            harness.window.localStorage.setItem = () => { throw new Error('A transient drag must never write storage'); };
            const initialX = parseFloat(harness.button.style.left);
            const initialY = parseFloat(harness.button.style.top);
            harness.pointer('pointerdown', 600, 300);
            harness.pointer('pointermove', 500, 350);
            harness.pointer('pointerup', 500, 350);
            assert.equal(parseFloat(harness.button.style.left), initialX - 100);
            const draggedY = Math.min(initialY + 50, 720 - 100 - (file === files[0] ? 24 : 42));
            assert.equal(parseFloat(harness.button.style.top), draggedY);
            harness.button.click();
            assert.equal(harness.button.getAttribute('aria-pressed'), 'false');
            harness.pointer('pointerdown', 500, 350, 'touch');
            harness.pointer('pointermove', 450, 300, 'touch');
            harness.pointer('pointerup', 450, 300, 'touch');
            assert.equal(parseFloat(harness.button.style.left), initialX - 150);
            assert.equal(parseFloat(harness.button.style.top), draggedY - 50);
            harness.button.click();
            assert.equal(harness.button.getAttribute('aria-pressed'), 'false');
            harness.button.click();
            assert.equal(harness.button.getAttribute('aria-pressed'), 'true');
            assert.equal(execute(file).button.style.left, `${initialX}px`);
        });

        test(`${file} clamps dragging and hides when the block is offscreen`, () => {
            const harness = execute(file);
            harness.pointer('pointerdown', 500, 300);
            harness.pointer('pointermove', -2000, -1000);
            harness.pointer('pointerup', -2000, -1000);
            assert.equal(harness.button.style.left, '0px');
            assert.equal(harness.button.style.top, '0px');
            harness.container._rect.top = 800;
            harness.container._rect.bottom = 1700;
            harness.update();
            assert.equal(harness.button.hidden, true);
            harness.container._rect.top = 100;
            harness.container._rect.bottom = 1000;
            harness.update();
            assert.equal(harness.button.hidden, false);
            assert.equal(harness.button.style.left, '0px');
        });
    }

    test('fullscreen keeps the darker icon and border in both enter and exit states', () => {
        const harness = execute(files[1]);
        // Color rendering is outside this DOM harness; verify the emitted CSS.
        const css = harness.document.getElementById('tm-fullscreen-game-view-style').textContent;
        assert.match(css, /color: #999 !important/);
        assert.match(css, /border: 1px solid rgba\(255, 255, 255, 0\.3\) !important/);
        harness.button.click();
        assert.equal(harness.button.textContent, '×');
        harness.button.click();
        assert.equal(harness.button.textContent, '⛶');
    });

    test('both embedded helpers match their canonical source', () => {
        const shared = fs.readFileSync(path.join(root, 'src', 'TransientControl.js'), 'utf8').trimEnd().replace(/\r\n/g, '\n');
        for (const file of files) {
            const text = fs.readFileSync(path.join(root, 'src', file), 'utf8');
            const match = text.match(/    \/\/ BEGIN SHARED TRANSIENT CONTROL\r?\n([\s\S]*?)\r?\n    \/\/ END SHARED TRANSIENT CONTROL/);
            assert(match);
            assert.equal(match[1].replace(/\r\n/g, '\n'), shared);
        }
    });
});
