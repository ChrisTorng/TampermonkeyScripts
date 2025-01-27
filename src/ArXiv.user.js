// ==UserScript==
// @name         ArXiv site
// @namespace    http://tampermonkey.net/
// @version      2025-01-24_1.1
// @description  ArXiv site
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArXiv.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArXiv.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=arxiv.org
// @match        https://arxiv.org/abs/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Wait for the DOM to fully load
    window.addEventListener('load', function() {
        // Find the "HTML (experimental)" link
        const htmlLink = this.document.getElementById('latexml-download-link');

        // If the link exists, redirect to it
        if (htmlLink) {
            window.location.href = htmlLink.href;
        }
    });
})();
