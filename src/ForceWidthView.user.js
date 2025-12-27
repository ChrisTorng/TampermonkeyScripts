// ==UserScript==
// @name         Force Width View
// @namespace    http://tampermonkey.net/
// @version      2025-12-27_1.2.3
// @description  Prevent pages from exceeding the viewport width to minimize horizontal scrolling while keeping native scrollbars available.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceWidthView.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ForceWidthView.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.tampermonkey.net
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const STYLE_ID = 'tm-force-width-style';
    let isEnabled = false;
    let styleObserver;
    let isObserving = false;

    function buildStyleContent() {
        return `:root, body {\n` +
            `    width: auto !important;\n` +
            `    max-width: 100vw !important;\n` +
            `    overflow-x: auto !important;\n` +
            `}\n` +
        `body {\n` +
            `    margin-left: auto !important;\n` +
            `    margin-right: auto !important;\n` +
            `    padding-left: 0 !important;\n` +
            `    padding-right: 0 !important;\n` +
            `}\n` +
            `body, body * {\n` +
            `    box-sizing: border-box !important;\n` +
            `}\n` +
            `body * {\n` +
            `    max-width: 100% !important;\n` +
            `    min-width: 0 !important;\n` +
            `    word-break: break-word !important;\n` +
            `    overflow-wrap: anywhere !important;\n` +
            `}\n` +
            `img, video, canvas, svg, iframe {\n` +
            `    max-width: 100% !important;\n` +
            `    height: auto !important;\n` +
            `}\n` +
            `table {\n` +
            `    width: 100% !important;\n` +
            `    max-width: 100vw !important;\n` +
            `    table-layout: auto !important;\n` +
            `    border-collapse: collapse !important;\n` +
            `    border-spacing: 0 !important;\n` +
            `}\n` +
            `td, th {\n` +
            `    word-break: break-word !important;\n` +
            `    overflow-wrap: anywhere !important;\n` +
            `}\n` +
            `pre, code, kbd, samp {\n` +
            `    white-space: pre-wrap !important;\n` +
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

    function ensureObserver() {
        if (!styleObserver) {
            styleObserver = new MutationObserver(() => {
                if (isEnabled && !document.getElementById(STYLE_ID)) {
                    insertStyle();
                }
            });
        }
        if (!isObserving) {
            styleObserver.observe(document.documentElement, { childList: true });
            isObserving = true;
        }
    }

    function stopObserver() {
        if (styleObserver && isObserving) {
            styleObserver.disconnect();
            isObserving = false;
        }
    }

    function enableForceWidth() {
        if (isEnabled) {
            return;
        }
        isEnabled = true;
        insertStyle();
        ensureObserver();
    }

    function disableForceWidth() {
        if (!isEnabled) {
            return;
        }
        isEnabled = false;
        removeStyle();
        stopObserver();
    }

    function toggleForceWidth() {
        if (isEnabled) {
            disableForceWidth();
        } else {
            enableForceWidth();
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
        toggleButton.textContent = '↔';
        toggleButton.title = 'Toggle Force Width View';
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

        toggleButton.style.top = '104px';
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
                toggleButton.title = 'Force Width View is ON (click to disable)';
            } else {
                toggleButton.style.backgroundColor = 'rgba(0, 0, 0, 0.55)';
                toggleButton.style.color = '#f0f0f0';
                toggleButton.setAttribute('aria-pressed', 'false');
                toggleButton.title = 'Force Width View is OFF (click to enable)';
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
            toggleForceWidth();
            updateButtonAppearance();
        });

        updateButtonAppearance();
    }

    onDocumentReady(createFloatingToggleButton);
})();
