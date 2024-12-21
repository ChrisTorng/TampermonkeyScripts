// ==UserScript==
// @name         Hide Banner script
// @namespace    http://tampermonkey.net/
// @version      2023-12-21_1.0
// @description  Hide specified elements on multiple websites
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HideBanner.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HideBanner.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.tampermonkey.net
// @match        https://pansci.asia/*
// @match        https://www.infoq.cn/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Define domain-selector mapping
    const domainSelectors = {
        'www.infoq.cn': [
            'div.audioPlayer.AudioPlayer_main_HiF3z',
            'div.header.common-header-pc.layout-header',
            'div.sub-nav-wrap'
        ],
        'pansci.asia': [
            '#main_navbar',
            '#scroll_progress_bar'
        ]
    };

    // Get selectors for current domain
    const currentSelectors = domainSelectors[window.location.hostname] || [];

    function hideElements() {
        if (currentSelectors.length === 0) return;

        currentSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = 'none';
            });
        });
    }

    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hideElements);
    } else {
        hideElements();
    }

    // Watch for dynamic content changes
    const observer = new MutationObserver(hideElements);
    observer.observe(document.body, { childList: true, subtree: true });
})();
