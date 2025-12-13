// ==UserScript==
// @name         Hide Banner script
// @namespace    http://tampermonkey.net/
// @version      2025-12-13_1.2.3
// @description  Hide/click/scroll to specified elements on multiple websites
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HideBanner.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HideBanner.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.tampermonkey.net
// @match        https://pansci.asia/*
// @match        https://www.infoq.cn/*
// @match        https://www.inside.com.tw/*
// @match        https://whatisintelligence.antikythera.org/*
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
                'div.sub-nav-wrap',
                '.geo-banner.fixed'
            ],
            click: [],
            scrollTo: null
        },
        'www.inside.com.tw': {
            hide: [],
            click: [
                '#article_content'
            ],
            scrollTo: 'picture'
        },
        'whatisintelligence.antikythera.org': {
            hide: [
                'shadow:antikythera-menu article',
                '#chapter-header',
                '.toc-btn'
            ],
            click: [],
            scrollTo: null
        }
    };

    // Get selectors for current domain
    const currentConfig = domainSelectors[window.location.hostname] || { hide: [], click: [], scrollTo: null };

    // Support selectors inside a single shadow host via the syntax "shadow:<host-selector> <descendant>"
    function queryAll(selector) {
        const shadowMatch = selector.match(/^shadow:([^ ]+)\s+(.+)$/);
        if (shadowMatch) {
            const host = document.querySelector(shadowMatch[1]);
            if (!host || !host.shadowRoot) return [];
            return host.shadowRoot.querySelectorAll(shadowMatch[2]);
        }

        return document.querySelectorAll(selector);
    }

    function hideElements() {
        if (currentConfig.hide.length === 0) return;

        currentConfig.hide.forEach(selector => {
            const elements = queryAll(selector);
            elements.forEach(element => {
                element.style.display = 'none';
            });
        });
    }

    function clickElements() {
        if (currentConfig.click.length === 0) return;

        currentConfig.click.forEach(selector => {
            const elements = queryAll(selector);
            elements.forEach(element => {
                element.click();
            });
        });
    }

    function scrollToElement() {
        if (!currentConfig.scrollTo) return;

        const element = queryAll(currentConfig.scrollTo)[0];
        if (!element) return;

        const elementRect = element.getBoundingClientRect();

        // 只有當目標元素位置在目前視窗之下方時才捲動
        if (elementRect.top > 0) {
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
