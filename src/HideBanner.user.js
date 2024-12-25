// ==UserScript==
// @name         Hide Banner script
// @namespace    http://tampermonkey.net/
// @version      2023-12-25_1.1.0
// @description  Hide specified elements on multiple websites
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HideBanner.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HideBanner.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.tampermonkey.net
// @match        https://pansci.asia/*
// @match        https://www.infoq.cn/*
// @match        https://www.inside.com.tw/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Define domain-selector mapping
    const domainSelectors = {
        'pansci.asia': {
            hide: [
                '#main_navbar',
                '#s-progress-wrap'
            ],
            click: [],
            scrollTo: 'h1'
        },
        'www.infoq.cn': {
            hide: [
                'div.audioPlayer.AudioPlayer_main_HiF3z',
                'div.header.common-header-pc.layout-header',
                'div.sub-nav-wrap'
            ],
            click: [],
            scrollTo: null
        },
        'www.inside.com.tw': {
            hide: [],
            click: [
                '.article-header'
            ],
            scrollTo: 'picture'
        }
    };

    // Get selectors for current domain
    const currentConfig = domainSelectors[window.location.hostname] || { hide: [], click: [], scrollTo: null };

    function hideElements() {
        if (currentConfig.hide.length === 0) return;

        currentConfig.hide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = 'none';
            });
        });
    }

    function clickElements() {
        if (currentConfig.click.length === 0) return;

        currentConfig.click.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.click();
            });
        });
    }

    function scrollToElement() {
        if (!currentConfig.scrollTo) return;

        const element = document.querySelector(currentConfig.scrollTo);
        if (element) {
            console.log('Scrolling to element:', element);
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function processPage() {
        hideElements();
        clickElements();
        scrollToElement();
    }

    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', processPage);
    } else {
        processPage();
    }

    // Watch for dynamic content changes
    const observer = new MutationObserver(processPage);
    observer.observe(document.body, { childList: true, subtree: true });
})();
