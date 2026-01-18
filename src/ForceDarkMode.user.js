// ==UserScript==
// @name         Force Dark Mode
// @namespace    http://tampermonkey.net/
// @version      2026-01-18_1.0.0
// @description  Toggle a draggable dark mode button to force readable dark colors when auto darkening misfires.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceDarkMode.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceDarkMode.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.tampermonkey.net
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const STYLE_ID = 'tm-force-dark-mode-style';
    const BUTTON_TOP_PX = 144;
    let isEnabled = false;

    function buildStyleContent() {
        return `:root {\n` +
            `    color-scheme: dark !important;\n` +
            `}\n` +
            `html, body {\n` +
            `    background-color: #121212 !important;\n` +
            `    color: #e0e0e0 !important;\n` +
            `}\n` +
            `body *:not(img):not(video):not(svg):not(canvas) {\n` +
            `    background-color: #121212 !important;\n` +
            `    color: inherit !important;\n` +
            `    border-color: #3a3a3a !important;\n` +
            `}\n` +
            `a {\n` +
            `    color: #8ab4f8 !important;\n` +
            `}\n` +
            `input, textarea, select, button {\n` +
            `    background-color: #1b1b1b !important;\n` +
            `    color: #e0e0e0 !important;\n` +
            `    border-color: #3a3a3a !important;\n` +
            `}`;
    }

    function insertStyle() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.type = 'text/css';
        style.textContent = buildStyleContent();

        const target = document.head || document.documentElement;
        target.appendChild(style);
    }

    function removeStyle() {
        const style = document.getElementById(STYLE_ID);
        if (style && style.parentNode) {
            style.parentNode.removeChild(style);
        }
    }

    function enableDarkMode() {
        if (isEnabled) {
            return;
        }
        isEnabled = true;
        insertStyle();
    }

    function disableDarkMode() {
        if (!isEnabled) {
            return;
        }
        isEnabled = false;
        removeStyle();
    }

    function toggleDarkMode() {
        if (isEnabled) {
            disableDarkMode();
        } else {
            enableDarkMode();
        }
    }

    function onDocumentReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
        } else {
            callback();
        }
    }

    function createFloatingToggleButton() {
        if (!document.body) {
            return;
        }

        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.textContent = '🌙';
        toggleButton.title = 'Toggle Force Dark Mode';
        toggleButton.style.cssText = `
            position: absolute;
            z-index: 2147483647;
            padding: 6px 10px;
            background-color: rgba(0, 0, 0, 0.55);
            color: #f0f0f0;
            border: none;
            border-radius: 6px;
            cursor: move;
            font-size: 15px;
            user-select: none;
            touch-action: none;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
        `;
        document.body.appendChild(toggleButton);

        toggleButton.style.top = `${BUTTON_TOP_PX}px`;
        toggleButton.style.right = '0px';
        toggleButton.style.left = 'auto';
        toggleButton.style.bottom = 'auto';

        const dragThreshold = 3;
        let isDragging = false;
        let hasMoved = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let startClientX;
        let startClientY;
        let hasSwitchedToLeft = false;

        function updateButtonAppearance() {
            if (isEnabled) {
                toggleButton.style.backgroundColor = 'rgba(34, 139, 34, 0.85)';
                toggleButton.style.color = '#ffffff';
                toggleButton.setAttribute('aria-pressed', 'true');
                toggleButton.title = 'Force Dark Mode is ON (click to disable)';
            } else {
                toggleButton.style.backgroundColor = 'rgba(0, 0, 0, 0.55)';
                toggleButton.style.color = '#f0f0f0';
                toggleButton.setAttribute('aria-pressed', 'false');
                toggleButton.title = 'Force Dark Mode is OFF (click to enable)';
            }
        }

        function dragStart(e) {
            if (e.target !== toggleButton) {
                return;
            }

            isDragging = true;
            hasMoved = false;

            if (e.type === 'touchstart') {
                startClientX = e.touches[0].clientX;
                startClientY = e.touches[0].clientY;
                initialX = startClientX - toggleButton.offsetLeft;
                initialY = startClientY - toggleButton.offsetTop;
            } else {
                startClientX = e.clientX;
                startClientY = e.clientY;
                initialX = startClientX - toggleButton.offsetLeft;
                initialY = startClientY - toggleButton.offsetTop;
            }
            hasSwitchedToLeft = false;
        }

        function drag(e) {
            if (!isDragging) {
                return;
            }
            if (e.type === 'touchmove') {
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
            } else {
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
            }

            const deltaX = Math.abs((e.type === 'touchmove' ? e.touches[0].clientX : e.clientX) - startClientX);
            const deltaY = Math.abs((e.type === 'touchmove' ? e.touches[0].clientY : e.clientY) - startClientY);
            if (!hasMoved && deltaX < dragThreshold && deltaY < dragThreshold) {
                return;
            }

            if (!hasMoved) {
                hasMoved = true;
            }
            if (!hasSwitchedToLeft) {
                toggleButton.style.right = 'auto';
                toggleButton.style.bottom = 'auto';
                hasSwitchedToLeft = true;
            }
            e.preventDefault();

            const maxX = Math.max(document.documentElement.clientWidth, window.innerWidth) - toggleButton.offsetWidth;
            const maxY = Math.max(document.documentElement.clientHeight, window.innerHeight) - toggleButton.offsetHeight;

            currentX = Math.min(Math.max(currentX, 0), maxX);
            currentY = Math.min(Math.max(currentY, 0), maxY);

            toggleButton.style.left = `${currentX}px`;
            toggleButton.style.top = `${currentY}px`;
        }

        function dragEnd() {
            isDragging = false;
        }

        toggleButton.addEventListener('mousedown', dragStart);
        toggleButton.addEventListener('touchstart', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchend', dragEnd);

        toggleButton.addEventListener('click', (event) => {
            if (hasMoved) {
                hasMoved = false;
                return;
            }
            event.preventDefault();
            toggleDarkMode();
            updateButtonAppearance();
        });

        updateButtonAppearance();
    }

    onDocumentReady(createFloatingToggleButton);
})();
