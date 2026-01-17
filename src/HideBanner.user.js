// ==UserScript==
// @name         Hide Banner script
// @namespace    http://tampermonkey.net/
// @version      2026-01-17_1.5.2
// @description  Hide/click/scroll to specified elements on multiple websites
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HideBanner.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HideBanner.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.tampermonkey.net
// @match        https://pansci.asia/*
// @match        https://www.infoq.cn/*
// @match        https://www.inside.com.tw/*
// @match        https://www.latimes.com/*
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
                'div.header',
                'div.sub-nav-wrap',
                '.geo-banner.fixed'
            ],
            click: [],
            scrollTo: '.article-title'
        },
        'www.inside.com.tw': {
            hide: [],
            click: [
                '#article_content'
            ],
            scrollTo: 'picture'
        },
        'www.latimes.com': {
            hide: [
                'nav',
                '.modality-content'
            ],
            click: [
                // Trigger 403 error
                // 'shadow:modality-custom-element .met-button'
                'shadow:modality-custom-element .met-flyout-close'
            ],
            scrollTo: '.head-line'
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

    // Track clicked elements to avoid repeated clicks
    const clickedElements = new WeakSet();

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
                if (!clickedElements.has(element)) {
                    console.log('Clicking element:', element);
                    element.click();
                    clickedElements.add(element);
                }
            });
        });
    }

    function scrollToElement() {
        if (!currentConfig.scrollTo) return;

        const element = queryAll(currentConfig.scrollTo)[0];
        if (!element) return;

        const elementRect = element.getBoundingClientRect();

        // Only scroll when the target element is below the current viewport
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
