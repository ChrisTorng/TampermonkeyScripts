// ==UserScript==
// @name         Force Width View
// @namespace    http://tampermonkey.net/
// @version      2025-12-14_1.1.0
// @description  Prevent pages from exceeding the viewport width so horizontal scrolling is eliminated, especially on mobile screens.
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

    function buildStyleContent() {
        return `:root, body {\n` +
            `    width: 100vw !important;\n` +
            `    max-width: 100vw !important;\n` +
            `    overflow-x: hidden !important;\n` +
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
            `    width: 100vw !important;\n` +
            `    max-width: 100vw !important;\n` +
            `    table-layout: fixed !important;\n` +
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

    insertStyle();

    const observer = new MutationObserver(() => {
        if (!document.getElementById(STYLE_ID)) {
            insertStyle();
        }
    });

    observer.observe(document.documentElement, { childList: true });
})();
