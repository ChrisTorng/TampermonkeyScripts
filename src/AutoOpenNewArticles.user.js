// ==UserScript==
// @name         Auto Open New Articles
// @namespace    http://tampermonkey.net/
// @version      2026-03-18_1.1.1
// @description  Track the latest seen article and open newly listed articles on Taipei Astronomical Museum and The Neuron Daily in background tabs with a yellow star.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AutoOpenNewArticles.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AutoOpenNewArticles.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tam.gov.taipei
// @match        https://tam.gov.taipei/News_Photo.aspx*
// @match        https://tam.gov.taipei/News_Link_pic.aspx*
// @match        https://www.theneurondaily.com/
// @match        https://www.theneurondaily.com/archive*
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

    function getSiteConfig() {
        const url = new URL(window.location.href);

        if (url.hostname === 'tam.gov.taipei') {
            const listId = url.searchParams.get('n');
            if (!listId) {
                return null;
            }

            return {
                scope: `${url.pathname}:${listId}`,
                collectArticleLinks: () => {
                    const contentRoot = document.querySelector('#CCMS_Content') || document.body;
                    const candidates = Array.from(contentRoot.querySelectorAll('a[href*="News_Content.aspx"]'));

                    return candidates.filter((link) => link.href.includes(`n=${listId}`));
                },
                getArticleId: (link) => {
                    try {
                        const articleUrl = new URL(link.href, window.location.href);
                        const contentId = articleUrl.searchParams.get('s');
                        if (contentId) {
                            return `${listId}:${contentId}`;
                        }
                        return `${listId}:${articleUrl.pathname}${articleUrl.search}`;
                    } catch (error) {
                        return `${listId}:${link.href}`;
                    }
                }
            };
        }

        if (url.hostname === 'www.theneurondaily.com') {
            const isListingPage = url.pathname === '/' || url.pathname === '/archive';
            if (!isListingPage) {
                return null;
            }

            return {
                scope: 'theneurondaily:listings',
                collectArticleLinks: () => {
                    const candidates = Array.from(document.querySelectorAll('a[href]'));
                    const seen = new Set();

                    return candidates.filter((link) => {
                        try {
                            const articleUrl = new URL(link.href, window.location.href);
                            const isArticle = articleUrl.origin === url.origin && articleUrl.pathname.startsWith('/p/');
                            if (!isArticle) {
                                return false;
                            }

                            const key = articleUrl.pathname;
                            if (seen.has(key)) {
                                return false;
                            }

                            seen.add(key);
                            return true;
                        } catch (error) {
                            return false;
                        }
                    });
                },
                getArticleId: (link) => {
                    try {
                        const articleUrl = new URL(link.href, window.location.href);
                        return `theneurondaily:${articleUrl.pathname}`;
                    } catch (error) {
                        return `theneurondaily:${link.href}`;
                    }
                }
            };
        }

        return null;
    }

    function getTitleElement(link) {
        if (window.location.hostname === 'www.theneurondaily.com') {
            return link;
        }

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

    function openNewArticles(articles, lastSeenId) {
        const lastSeenIndex = articles.findIndex((article) => article.id === lastSeenId);
        if (lastSeenIndex <= 0) {
            return {
                foundLastSeen: lastSeenIndex === 0,
            };
        }

        const newArticles = articles.slice(0, lastSeenIndex);
        newArticles.forEach((article) => {
            markArticle(article.link);
            GM_openInTab(article.link.href, { active: false, insert: true });
        });

        return {
            foundLastSeen: true,
        };
    }

    function handleArticles() {
        const siteConfig = getSiteConfig();
        if (!siteConfig) {
            return;
        }

        ensureStyles();

        const storageKey = `${STORAGE_PREFIX}:${siteConfig.scope}`;
        const lastSeenId = GM_getValue(storageKey, '');
        const links = siteConfig.collectArticleLinks();

        if (links.length === 0) {
            return;
        }

        const articles = links.map((link) => ({
            link,
            id: siteConfig.getArticleId(link),
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
