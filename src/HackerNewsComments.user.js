// ==UserScript==
// @name         Hacker News Comments
// @namespace    http://tampermonkey.net/
// @version      2026-08-28_1.0.0
// @description  Add a button after the main article when Hacker News comments are available for the current page.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HackerNewsComments.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HackerNewsComments.user.js
// @icon         https://news.ycombinator.com/favicon.ico
// @match        http://*/*
// @match        https://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const BUTTON_ID = 'tm-hacker-news-comments';
    const SEARCH_API = 'https://hn.algolia.com/api/v1/search';

    function normalizeUrl(value) {
        try {
            const url = new URL(value);
            url.hash = '';
            url.search = '';
            url.pathname = url.pathname.replace(/\/$/, '') || '/';
            return url.href;
        } catch {
            return '';
        }
    }

    function getPageUrls() {
        const canonical = document.querySelector('link[rel="canonical"]')?.href;
        return [...new Set([canonical, window.location.href].filter(Boolean))];
    }

    async function findStory(pageUrls) {
        const normalizedPageUrls = new Set(pageUrls.map(normalizeUrl));

        for (const pageUrl of pageUrls) {
            const parameters = new URLSearchParams({
                tags: 'story',
                restrictSearchableAttributes: 'url',
                query: pageUrl
            });
            const response = await fetch(`${SEARCH_API}?${parameters}`);
            if (!response.ok) {
                continue;
            }

            const { hits = [] } = await response.json();
            const exactMatches = hits.filter((hit) => normalizedPageUrls.has(normalizeUrl(hit.url)));
            if (exactMatches.length > 0) {
                return exactMatches.sort((a, b) => (b.num_comments || 0) - (a.num_comments || 0))[0];
            }
        }

        return null;
    }

    function addCommentsButton(story) {
        if (document.getElementById(BUTTON_ID)) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.id = BUTTON_ID;
        wrapper.style.cssText = 'display: flex; justify-content: flex-end; clear: both; margin: 1rem 0;';

        const link = document.createElement('a');
        link.href = `https://news.ycombinator.com/item?id=${encodeURIComponent(story.objectID)}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = `Hacker News comments (${story.num_comments || 0})`;
        link.title = 'Open the Hacker News discussion in a new tab';
        link.style.cssText = [
            'display: inline-block',
            'box-sizing: border-box',
            'padding: 0.55rem 0.8rem',
            'border: 1px solid #ff6600',
            'border-radius: 0.35rem',
            'background: #fff7f2',
            'color: #b34700',
            'font: 600 14px/1.2 system-ui, sans-serif',
            'text-decoration: none'
        ].join(';');
        wrapper.appendChild(link);

        const article = document.querySelector('article');
        const footer = document.querySelector('footer');
        if (article) {
            article.appendChild(wrapper);
        } else if (footer?.parentNode) {
            footer.parentNode.insertBefore(wrapper, footer);
        } else {
            document.body.appendChild(wrapper);
        }
    }

    async function initialize() {
        try {
            const story = await findStory(getPageUrls());
            if (story) {
                addCommentsButton(story);
            }
        } catch (error) {
            console.debug('Hacker News comment lookup failed.', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
