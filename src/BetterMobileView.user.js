// ==UserScript==
// @name         Better Mobile View
// @namespace    http://tampermonkey.net/
// @version      2026-01-27_1.0.0
// @description  Expand Hacker News Summary article images to full width in portrait mobile view.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/BetterMobileView.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/BetterMobileView.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.tampermonkey.net
// @match        https://hackernews.betacat.io/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const STYLE_ID = 'tm-better-mobile-view-style';
    const STYLE_CONTENT = `
@media (max-width: 768px) and (orientation: portrait) {
    .post-summary {
        display: block !important;
    }

    .post-summary .feature-image {
        display: block !important;
        float: none !important;
        margin: 0 0 12px 0 !important;
        width: 100% !important;
    }

    .post-summary .feature-image img {
        display: block !important;
        height: auto !important;
        max-width: 100% !important;
        width: 100% !important;
    }

    .post-summary .summary-text {
        clear: both !important;
        float: none !important;
        margin-left: 0 !important;
        width: 100% !important;
    }
}
`;

    function insertStyle() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = STYLE_CONTENT;

        const target = document.head || document.documentElement;
        target.appendChild(style);
    }

    insertStyle();
})();
