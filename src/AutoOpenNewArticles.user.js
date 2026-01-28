// ==UserScript==
// @name         Auto Open New Articles
// @namespace    http://tampermonkey.net/
// @version      2026-01-27_1.0.0
// @description  Track the latest seen article and open newly listed Taipei Astronomical Museum news items in background tabs with a yellow star.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AutoOpenNewArticles.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AutoOpenNewArticles.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tam.gov.taipei
// @match        https://tam.gov.taipei/News_Photo.aspx*
// @match        https://tam.gov.taipei/News_Link_pic.aspx*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_openInTab
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_PREFIX = 'autoOpenNewArticles:lastSeen';
    const STAR_CLASS = 'auto-open-new-articles-star';
    const STYLE_ID = 'auto-open-new-articles-style';

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .${STAR_CLASS} {
                color: #f5c842;
                font-weight: 700;
                margin-right: 0.35em;
                text-shadow: 0 0 1px rgba(0, 0, 0, 0.25);
            }
        `;
        document.head.appendChild(style);
    }

    function getStorageKey() {
        const url = new URL(window.location.href);
        const listId = url.searchParams.get('n') || 'unknown';
        return `${STORAGE_PREFIX}:${url.pathname}:${listId}`;
    }

    function getArticleId(link, listId) {
        try {
            const url = new URL(link.href, window.location.href);
            const contentId = url.searchParams.get('s');
            if (contentId) {
                return `${listId}:${contentId}`;
            }
            return `${listId}:${url.pathname}${url.search}`;
        } catch (error) {
            return `${listId}:${link.href}`;
        }
    }

    function getTitleElement(link) {
        if (link.classList.contains('caption')) {
            return link;
        }

        return link.querySelector('.figcaption span') || link.querySelector('.figcaption') || link;
    }

    function markArticle(link) {
        const titleElement = getTitleElement(link);
        if (!titleElement || titleElement.querySelector(`.${STAR_CLASS}`)) {
            return;
        }

        const star = document.createElement('span');
        star.className = STAR_CLASS;
        star.textContent = '★';
        titleElement.insertBefore(star, titleElement.firstChild);
    }

    function collectArticleLinks(listId) {
        const contentRoot = document.querySelector('#CCMS_Content') || document.body;
        const candidates = Array.from(contentRoot.querySelectorAll('a[href*="News_Content.aspx"]'));

        return candidates.filter((link) => link.href.includes(`n=${listId}`));
    }

    function openNewArticles(articles, lastSeenId) {
        const lastSeenIndex = articles.findIndex((article) => article.id === lastSeenId);
        if (lastSeenIndex <= 0) {
            return {
                newArticles: lastSeenIndex === 0 ? [] : [],
                foundLastSeen: lastSeenIndex === 0,
            };
        }

        const newArticles = articles.slice(0, lastSeenIndex);
        newArticles.forEach((article) => {
            markArticle(article.link);
            GM_openInTab(article.link.href, { active: false, insert: true });
        });

        return {
            newArticles,
            foundLastSeen: true,
        };
    }

    function handleArticles() {
        const listId = new URL(window.location.href).searchParams.get('n');
        if (!listId) {
            return;
        }

        ensureStyles();

        const storageKey = getStorageKey();
        const lastSeenId = GM_getValue(storageKey, '');
        const links = collectArticleLinks(listId);

        if (links.length === 0) {
            return;
        }

        const articles = links.map((link) => ({
            link,
            id: getArticleId(link, listId),
        }));

        const latestId = articles[0].id;
        if (!lastSeenId) {
            GM_setValue(storageKey, latestId);
            return;
        }

        const { foundLastSeen } = openNewArticles(articles, lastSeenId);

        if (!foundLastSeen) {
            GM_setValue(storageKey, latestId);
            return;
        }

        GM_setValue(storageKey, latestId);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleArticles);
    } else {
        handleArticles();
    }
})();
