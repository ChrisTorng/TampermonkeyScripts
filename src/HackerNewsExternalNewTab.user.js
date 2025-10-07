// ==UserScript==
// @name         Hacker News External Links New Tab
// @namespace    http://tampermonkey.net/
// @version      2025-01-10_1.1.0
// @description  Open Hacker News external story links in new tabs, append an icon indicator, and keep focus on the current tab.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HackerNewsExternalNewTab.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HackerNewsExternalNewTab.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=news.ycombinator.com
// @match        https://news.ycombinator.com/*
// @match        https://hackernews.betacat.io/*
// @grant        GM_openInTab
// ==/UserScript==

(function () {
    'use strict';

    const INTERNAL_HOSTS = new Set([
        'news.ycombinator.com',
        'hackernews.betacat.io',
    ]);
    const ICON_CLASS_NAME = 'hn-new-tab-icon';
    const PROCESSED_FLAG = 'hnNewTabProcessed';
    const LISTENER_FLAG = 'hnNewTabListenerAttached';

    function ensureStyles() {
        if (document.getElementById('tampermonkey-hn-new-tab-style')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'tampermonkey-hn-new-tab-style';
        style.textContent = `
            .${ICON_CLASS_NAME} {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-left: 0.35em;
                font-size: 0.8em;
                line-height: 1;
                text-decoration: none;
                color: inherit;
            }
        `;
        document.head.appendChild(style);
    }

    function createIconElement() {
        const span = document.createElement('span');
        span.className = ICON_CLASS_NAME;
        span.setAttribute('aria-hidden', 'true');
        span.textContent = '↗︎';
        return span;
    }

    function markAsProcessed(link) {
        link.dataset[PROCESSED_FLAG] = 'true';
    }

    function hasBeenProcessed(link) {
        return link.dataset[PROCESSED_FLAG] === 'true';
    }

    function isExternalLink(link) {
        if (!link || !link.href) {
            return false;
        }

        try {
            const url = new URL(link.href, window.location.href);
            return !INTERNAL_HOSTS.has(url.hostname);
        } catch (error) {
            return false;
        }
    }

    function ensureTargetAttributes(link) {
        link.target = '_blank';

        if (link.relList && typeof link.relList.add === 'function') {
            link.relList.add('noopener', 'noreferrer');
        } else {
            link.rel = 'noopener noreferrer';
        }
    }

    function openInBackgroundTab(url) {
        if (typeof GM_openInTab === 'function') {
            GM_openInTab(url, { active: false, insert: true });
            return;
        }

        window.open(url, '_blank', 'noopener');
    }

    function attachClickListener(link) {
        if (link.dataset[LISTENER_FLAG] === 'true') {
            return;
        }

        link.addEventListener('click', (event) => {
            if (event.defaultPrevented) {
                return;
            }

            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                return;
            }

            event.preventDefault();
            openInBackgroundTab(link.href);
        });

        link.dataset[LISTENER_FLAG] = 'true';
    }

    function processLink(link) {
        if (hasBeenProcessed(link) || !isExternalLink(link)) {
            return;
        }

        ensureTargetAttributes(link);
        attachClickListener(link);

        const icon = createIconElement();
        link.insertAdjacentElement('afterend', icon);
        markAsProcessed(link);
    }

    function processAllLinks(root) {
        const links = root.querySelectorAll('a[href]');
        links.forEach(processLink);
    }

    function observeMutations() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach((node) => {
                    if (!(node instanceof HTMLElement)) {
                        return;
                    }

                    if (node.matches('a[href]')) {
                        processLink(node);
                    }

                    processAllLinks(node);
                });
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function init() {
        ensureStyles();
        processAllLinks(document);
        observeMutations();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
