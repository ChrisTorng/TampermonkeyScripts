// ==UserScript==
// @name         Hacker News External Links New Tab
// @namespace    http://tampermonkey.net/
// @version      2024-06-30_1.0.0
// @description  Open Hacker News external story links in new tabs and append an icon indicator.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HackerNewsExternalNewTab.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HackerNewsExternalNewTab.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=news.ycombinator.com
// @match        https://news.ycombinator.com/*
// @match        https://hackernews.betacat.io/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const INTERNAL_HOSTS = new Set([
        'news.ycombinator.com',
        'hackernews.betacat.io',
    ]);
    const ICON_CLASS_NAME = 'hn-new-tab-icon';
    const PROCESSED_FLAG = 'hnNewTabProcessed';

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
                text-decoration: none;
                color: inherit;
            }

            .${ICON_CLASS_NAME} svg {
                width: 0.9em;
                height: 0.9em;
                fill: currentColor;
            }
        `;
        document.head.appendChild(style);
    }

    function createIconElement() {
        const span = document.createElement('span');
        span.className = ICON_CLASS_NAME;
        span.setAttribute('aria-hidden', 'true');
        span.innerHTML = `
            <svg viewBox="0 0 24 24" role="presentation">
                <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"></path>
                <path d="M5 5h5V3H3v7h2V5zm0 14v-5H3v7h7v-2H5zm14 0h-5v2h7v-7h-2v5z"></path>
            </svg>
        `;
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
        link.relList.add('noopener', 'noreferrer');
    }

    function processLink(link) {
        if (hasBeenProcessed(link) || !isExternalLink(link)) {
            return;
        }

        ensureTargetAttributes(link);

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
