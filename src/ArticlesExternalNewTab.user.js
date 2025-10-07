// ==UserScript==
// @name         Articles External Links New Tab
// @namespace    http://tampermonkey.net/
// @version      2025-10-07_2.0.3
// @description  Keep article links on supported news hubs opening in background tabs with a ↗︎ indicator.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArticlesExternalNewTab.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArticlesExternalNewTab.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=news.ycombinator.com
// @match        https://news.ycombinator.com/*
// @match        https://hackernews.betacat.io/*
// @match        https://www.theneurondaily.com/*
// @match        https://tam.gov.taipei/News_Photo.aspx*
// @match        https://tam.gov.taipei/News_Link_pic.aspx*
// @grant        GM_openInTab
// ==/UserScript==

(function () {
    'use strict';

    const INTERNAL_HOSTS = new Set([
        'news.ycombinator.com',
        'hackernews.betacat.io',
    ]);
    const STYLE_ID = 'tampermonkey-articles-new-tab-style';
    const ICON_CLASS_NAME = 'articles-new-tab-icon';
    const PROCESSED_FLAG = 'articlesNewTabProcessed';
    const LISTENER_FLAG = 'articlesNewTabListenerAttached';
    const ICON_TEXT = '↗︎';

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
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
        span.textContent = ICON_TEXT;
        return span;
    }

    function markAsProcessed(link) {
        link.dataset[PROCESSED_FLAG] = 'true';
    }

    function hasBeenProcessed(link) {
        return link.dataset[PROCESSED_FLAG] === 'true';
    }

    function isLinkEligible(link) {
        if (!link || !link.href) {
            return false;
        }

        let url;
        try {
            url = new URL(link.href, window.location.href);
        } catch (error) {
            return false;
        }

        const pageHost = window.location.hostname;
        const pagePath = window.location.pathname || '';

        if (pageHost === 'news.ycombinator.com' || pageHost === 'hackernews.betacat.io') {
            return !INTERNAL_HOSTS.has(url.hostname);
        }

        if (pageHost === 'www.theneurondaily.com') {
            const isArticlePage = pagePath.startsWith('/p/');

            if (isArticlePage) {
                return url.hostname !== 'www.theneurondaily.com';
            }

            return (
                url.hostname === 'www.theneurondaily.com' &&
                url.pathname.startsWith('/p/')
            );
        }

        if (pageHost === 'tam.gov.taipei') {
            const isPhotoPage = pagePath.startsWith('/News_Photo.aspx');
            const isLinkPicPage = pagePath.startsWith('/News_Link_pic.aspx');

            if (isPhotoPage || isLinkPicPage) {
                return (
                    url.hostname === 'tam.gov.taipei' &&
                    url.pathname.startsWith('/News_Content.aspx')
                );
            }
        }

        return false;
    }

    function ensureTargetAttributes(link) {
        link.target = '_blank';

        if (link.relList && typeof link.relList.add === 'function') {
            link.relList.add('noopener', 'noreferrer');
        } else {
            link.rel = 'noopener noreferrer';
        }
    }

    function sanitizeTrackingParameters(link) {
        const pageHost = window.location.hostname;
        const pagePath = window.location.pathname || '';

        if (pageHost !== 'www.theneurondaily.com' || !pagePath.startsWith('/p/')) {
            return;
        }

        let url;
        try {
            url = new URL(link.href, window.location.href);
        } catch (error) {
            return;
        }

        let didModify = false;
        ['utm_source', 'utm_medium', 'utm_campaign'].forEach((key) => {
            if (url.searchParams.has(key)) {
                url.searchParams.delete(key);
                didModify = true;
            }
        });

        if (!didModify) {
            return;
        }

        link.href = url.toString();
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

    function appendIcon(link) {
        if (!link.parentElement) {
            return;
        }

        const icon = createIconElement();
        link.insertAdjacentElement('afterend', icon);
    }

    function processLink(link) {
        if (hasBeenProcessed(link) || !isLinkEligible(link)) {
            return;
        }

        sanitizeTrackingParameters(link);
        ensureTargetAttributes(link);
        attachClickListener(link);
        appendIcon(link);
        markAsProcessed(link);
    }

    function processAllLinks(root) {
        const isSupportedRoot =
            root === document ||
            root instanceof Element ||
            root instanceof DocumentFragment;

        if (!isSupportedRoot) {
            return;
        }

        const links = root.querySelectorAll ? root.querySelectorAll('a[href]') : [];
        links.forEach(processLink);
    }

    function observeMutations() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof Element) {
                        if (node.matches('a[href]')) {
                            processLink(node);
                        }

                        processAllLinks(node);
                        return;
                    }

                    if (node instanceof DocumentFragment) {
                        processAllLinks(node);
                    }
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
