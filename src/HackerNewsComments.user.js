// ==UserScript==
// @name         Hacker News Comments
// @namespace    http://tampermonkey.net/
// @version      2026-08-30_1.2.0
// @description  Add an article button for Hacker News comments, including pages reached through redirects.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HackerNewsComments.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/HackerNewsComments.user.js
// @icon         https://news.ycombinator.com/favicon.ico
// @match        http://*/*
// @match        https://*/*
// @connect      hn.algolia.com
// @grant        GM_getTab
// @grant        GM_saveTab
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
    'use strict';

    const BUTTON_ID = 'tm-hacker-news-comments';
    const SEARCH_API = 'https://hn.algolia.com/api/v1/search';
    const HISTORY_LIMIT = 20;
    const REDIRECT_WINDOW_MS = 15000;

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

    function getTabState() {
        return new Promise((resolve) => {
            if (typeof GM_getTab !== 'function') {
                resolve({});
                return;
            }
            GM_getTab((tab) => resolve(tab || {}));
        });
    }

    async function captureNavigation() {
        const currentUrl = window.location.href;
        const referrer = document.referrer;
        const tab = await getTabState();
        const previousHistory = Array.isArray(tab.hackerNewsCommentsHistory)
            ? tab.hackerNewsCommentsHistory
            : [];
        const previousUrl = previousHistory.at(-1);
        const followsPreviousPage = normalizeUrl(referrer) === normalizeUrl(previousUrl);
        const followsRecentNavigation = Date.now() - (tab.hackerNewsCommentsRecordedAt || 0) < REDIRECT_WINDOW_MS;
        const history = followsPreviousPage || followsRecentNavigation
            ? previousHistory.slice()
            : [];

        if (referrer && normalizeUrl(referrer) !== normalizeUrl(history.at(-1))) {
            history.push(referrer);
        }
        if (normalizeUrl(currentUrl) !== normalizeUrl(history.at(-1))) {
            history.push(currentUrl);
        }

        tab.hackerNewsCommentsHistory = history.slice(-HISTORY_LIMIT);
        tab.hackerNewsCommentsRecordedAt = Date.now();
        if (typeof GM_saveTab === 'function') {
            GM_saveTab(tab);
        }
        return tab.hackerNewsCommentsHistory;
    }

    function getPageUrls(history) {
        const canonical = document.querySelector('link[rel="canonical"]')?.href;
        const previousUrls = history.slice(0, -1).reverse();
        return [...new Set([canonical, window.location.href, document.referrer, ...previousUrls].filter(Boolean))];
    }

    function requestJson(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                timeout: 10000,
                onload(response) {
                    if (response.status < 200 || response.status >= 300) {
                        reject(new Error(`Hacker News search returned HTTP ${response.status}.`));
                        return;
                    }
                    try {
                        resolve(JSON.parse(response.responseText));
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: () => reject(new Error('Hacker News search request failed.')),
                ontimeout: () => reject(new Error('Hacker News search request timed out.'))
            });
        });
    }

    async function findStory(pageUrls) {
        const normalizedPageUrls = new Set(pageUrls.map(normalizeUrl));

        for (const pageUrl of pageUrls) {
            const parameters = new URLSearchParams({
                tags: 'story',
                restrictSearchableAttributes: 'url',
                query: pageUrl
            });
            const { hits = [] } = await requestJson(`${SEARCH_API}?${parameters}`);
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

    async function initialize(historyPromise) {
        try {
            const history = await historyPromise;
            const story = await findStory(getPageUrls(history));
            if (story) {
                addCommentsButton(story);
            }
        } catch (error) {
            console.debug('Hacker News comment lookup failed.', error);
        }
    }

    const historyPromise = captureNavigation();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initialize(historyPromise), { once: true });
    } else {
        initialize(historyPromise);
    }
})();
