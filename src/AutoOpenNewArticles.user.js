// ==UserScript==
// @name         Auto Open New Articles
// @namespace    http://tampermonkey.net/
// @version      2026-09-25_1.5.0
// @description  Collapse and mute previously listed Hacker News Summary items with item, page-wide, date, and read-all controls; track, star, auto-open, and refresh new items on other supported sites.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AutoOpenNewArticles.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AutoOpenNewArticles.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tam.gov.taipei
// @match        https://tam.gov.taipei/News_Photo.aspx*
// @match        https://tam.gov.taipei/News_Link_pic.aspx*
// @match        https://tam.gov.taipei/news_photo.aspx*
// @match        https://tam.gov.taipei/news_link_pic.aspx*
// @match        https://www.theneurondaily.com/
// @match        https://www.theneurondaily.com/archive*
// @match        https://wiwi.blog/blog/
// @match        https://hackernews.betacat.io/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_openInTab
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_PREFIX = 'autoOpenNewArticles:lastSeen';
    const STAR_CLASS = 'auto-open-new-articles-star';
    const SEEN_CLASS = 'auto-open-new-articles-seen';
    const COLLAPSED_CLASS = 'auto-open-new-articles-collapsed';
    const MANAGED_CLASS = 'auto-open-new-articles-managed';
    const ITEM_TOGGLE_CLASS = 'auto-open-new-articles-item-toggle';
    const ALL_TOGGLE_ID = 'auto-open-new-articles-all-toggle';
    const DATE_NAV_CLASS = 'auto-open-new-articles-date-nav';
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
            .${SEEN_CLASS} {
                opacity: 0.38 !important;
            }
            .${COLLAPSED_CLASS} > :not(.post-title):not(.${ITEM_TOGGLE_CLASS}) {
                display: none !important;
            }
            .${MANAGED_CLASS} {
                position: relative !important;
                padding-left: 30px !important;
            }
            .${ITEM_TOGGLE_CLASS} {
                position: absolute !important;
                left: 0 !important;
                top: 20px !important;
                width: 24px !important;
                height: 24px !important;
                margin: 0 !important;
                padding: 0 !important;
                border: 1px solid #888 !important;
                border-radius: 4px !important;
                background: #333 !important;
                color: #fff !important;
                line-height: 22px !important;
                text-align: center !important;
                cursor: pointer !important;
            }
            #${ALL_TOGGLE_ID} {
                position: fixed !important;
                left: 12px !important;
                bottom: 12px !important;
                z-index: 2147483647 !important;
                width: 44px !important;
                height: 34px !important;
                padding: 0 !important;
                border: 1px solid rgba(255, 255, 255, 0.65) !important;
                border-radius: 6px !important;
                background: rgba(34, 34, 34, 0.85) !important;
                color: #fff !important;
                opacity: 0.5 !important;
                cursor: pointer !important;
            }
            #${ALL_TOGGLE_ID}[aria-pressed="true"] {
                background: rgba(34, 139, 34, 0.85) !important;
                color: #fff !important;
            }
            .${DATE_NAV_CLASS} {
                display: grid !important;
                grid-template-columns: 1fr auto 1fr !important;
                align-items: center !important;
                margin: 12px 0 !important;
                font-weight: 700 !important;
            }
            .${DATE_NAV_CLASS} a:first-child { justify-self: start !important; }
            .${DATE_NAV_CLASS} a:last-child { justify-self: end !important; }
        `;
        document.head.appendChild(style);
    }

    function getSiteConfig() {
        const url = new URL(window.location.href);

        const hackerNewsDateMatch = url.pathname.match(/^\/daily\/(\d{4}-\d{2}-\d{2})\/?$/);
        if (url.hostname === 'hackernews.betacat.io' && (url.pathname === '/' || hackerNewsDateMatch)) {
            return {
                scope: 'hackernews-summary:listings',
                markPreviouslyListed: true,
                displayedDate: hackerNewsDateMatch ? hackerNewsDateMatch[1] : null,
                collectArticleLinks: () => Array.from(document.querySelectorAll('article.post-item'))
                    .filter((article) => !article.classList.contains('ad')),
                getArticleId: (article) => {
                    const commentLink = article.querySelector('a[rel="comment"]');
                    if (commentLink) {
                        try {
                            const itemId = new URL(commentLink.href, window.location.href).searchParams.get('id');
                            if (itemId) {
                                return `hackernews:${itemId}`;
                            }
                        } catch (error) {
                            // Fall through to the stable article URL below.
                        }
                    }

                    const titleLink = article.querySelector('.post-title a[href]');
                    return titleLink ? `hackernews:url:${titleLink.href}` : '';
                }
            };
        }

        if (url.hostname === 'tam.gov.taipei') {
            const listId = url.searchParams.get('n');
            if (!listId) {
                return null;
            }

            const normalizedPath = url.pathname.toLowerCase();
            const canonicalPath = normalizedPath === '/news_photo.aspx'
                ? '/News_Photo.aspx'
                : normalizedPath === '/news_link_pic.aspx'
                    ? '/News_Link_pic.aspx'
                    : url.pathname;

            return {
                scope: `${canonicalPath}:${listId}`,
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

        if (url.hostname === 'wiwi.blog') {
            if (url.pathname !== '/blog/' && url.pathname !== '/blog') {
                return null;
            }

            return {
                scope: 'wiwi:blog:listings',
                collectArticleLinks: () => {
                    const candidates = Array.from(document.querySelectorAll('a[href]'));
                    const seen = new Set();

                    return candidates.filter((link) => {
                        try {
                            const articleUrl = new URL(link.href, window.location.href);
                            const isArticle = articleUrl.origin === url.origin
                                && articleUrl.pathname.startsWith('/blog/')
                                && articleUrl.pathname !== '/blog/'
                                && articleUrl.pathname !== '/blog';
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
                        return `wiwi:${articleUrl.pathname}`;
                    } catch (error) {
                        return `wiwi:${link.href}`;
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

    function saveSeenIds(storageKey, articles, seenIds) {
        const updatedIds = Array.from(new Set([
            ...articles.map((article) => article.id),
            ...seenIds
        ])).slice(0, 2000);
        GM_setValue(storageKey, updatedIds);
        return new Set(updatedIds);
    }

    function setArticleCollapsed(article, collapsed) {
        const button = article.querySelector(`.${ITEM_TOGGLE_CLASS}`);
        article.classList.toggle(COLLAPSED_CLASS, collapsed);
        article.classList.toggle(SEEN_CLASS, collapsed);
        if (button) {
            button.textContent = collapsed ? '▶' : '▼';
            button.title = collapsed ? 'Expand this item' : 'Collapse this item';
            button.setAttribute('aria-label', button.title);
            button.setAttribute('aria-expanded', String(!collapsed));
        }
    }

    function addArticleToggle(article, initiallyCollapsed) {
        article.classList.add(MANAGED_CLASS);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = ITEM_TOGGLE_CLASS;
        button.addEventListener('click', () => {
            setArticleCollapsed(article, !article.classList.contains(COLLAPSED_CLASS));
        });
        article.insertBefore(button, article.firstChild);
        setArticleCollapsed(article, initiallyCollapsed);
    }

    function createDateNavigation(displayedDate) {
        const today = new Date();
        const dateText = displayedDate || [
            today.getUTCFullYear(),
            String(today.getUTCMonth() + 1).padStart(2, '0'),
            String(today.getUTCDate()).padStart(2, '0')
        ].join('-');
        const currentDate = new Date(`${dateText}T00:00:00Z`);
        if (Number.isNaN(currentDate.getTime())) {
            return null;
        }

        const adjacentDate = (offset) => {
            const date = new Date(currentDate);
            date.setUTCDate(date.getUTCDate() + offset);
            return date.toISOString().slice(0, 10);
        };
        const tomorrow = adjacentDate(1);
        const todayText = today.toISOString().slice(0, 10);
        const navigation = document.createElement('nav');
        navigation.className = DATE_NAV_CLASS;
        navigation.setAttribute('aria-label', 'Hacker News Summary date navigation');

        const previous = document.createElement('a');
        previous.href = `/daily/${adjacentDate(-1)}`;
        previous.textContent = '<';
        previous.title = 'Previous day';
        const current = document.createElement('a');
        current.href = `/daily/${dateText}`;
        current.textContent = `${dateText} ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][currentDate.getUTCDay()]}`;
        current.title = 'Open this daily archive';
        const next = document.createElement('a');
        next.href = tomorrow >= todayText ? '/' : `/daily/${tomorrow}`;
        next.textContent = '>';
        next.title = 'Next day';
        navigation.append(previous, current, next);
        return navigation;
    }

    function addDateNavigation(articles, displayedDate) {
        const first = articles[0].link;
        const last = articles[articles.length - 1].link;
        const topNavigation = createDateNavigation(displayedDate);
        const bottomNavigation = createDateNavigation(displayedDate);
        if (!topNavigation || !bottomNavigation || !first.parentNode || !last.parentNode) {
            return;
        }
        first.parentNode.insertBefore(topNavigation, first);
        last.insertAdjacentElement('afterend', bottomNavigation);
    }

    function setupHackerNewsControls(articles, storageKey, storedIds, displayedDate) {
        let seenIds = new Set(storedIds);
        articles.forEach((article) => addArticleToggle(article.link, seenIds.has(article.id)));

        const allToggle = document.createElement('button');
        allToggle.id = ALL_TOGGLE_ID;
        allToggle.type = 'button';
        const updateAllToggle = () => {
            const hasCollapsed = articles.some((article) => article.link.classList.contains(COLLAPSED_CLASS));
            allToggle.textContent = hasCollapsed ? '+' : '−';
            allToggle.title = hasCollapsed ? 'Expand all items' : 'Collapse all items';
            allToggle.setAttribute('aria-label', allToggle.title);
            allToggle.setAttribute('aria-pressed', String(!hasCollapsed));
        };
        allToggle.addEventListener('click', () => {
            const shouldCollapse = !articles.some((article) => article.link.classList.contains(COLLAPSED_CLASS));
            if (shouldCollapse) {
                seenIds = saveSeenIds(storageKey, articles, seenIds);
            }
            articles.forEach((article) => setArticleCollapsed(article.link, shouldCollapse));
            updateAllToggle();
        });
        document.body.appendChild(allToggle);
        updateAllToggle();

        const scrollUp = document.querySelector('#scrollUp');
        if (scrollUp) {
            scrollUp.addEventListener('click', (event) => {
                event.preventDefault();
                if (event.stopImmediatePropagation) {
                    event.stopImmediatePropagation();
                }
                seenIds = saveSeenIds(storageKey, articles, seenIds);
                articles.forEach((article) => {
                    article.link.classList.add(SEEN_CLASS);
                    article.link.classList.remove(COLLAPSED_CLASS);
                    const button = article.link.querySelector(`.${ITEM_TOGGLE_CLASS}`);
                    if (button) {
                        button.textContent = '▼';
                        button.title = 'Collapse this item';
                        button.setAttribute('aria-label', button.title);
                        button.setAttribute('aria-expanded', 'true');
                    }
                });
                updateAllToggle();
                window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            }, true);
        }

        addDateNavigation(articles, displayedDate);
        saveSeenIds(storageKey, articles, seenIds);
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
        })).filter((article) => article.id);

        if (siteConfig.markPreviouslyListed) {
            const storedIds = GM_getValue(storageKey, []);
            setupHackerNewsControls(
                articles,
                storageKey,
                Array.isArray(storedIds) ? storedIds : [],
                siteConfig.displayedDate
            );
            return;
        }

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

    function setupActiveTabReload() {
        const siteConfig = getSiteConfig();
        if (!siteConfig || siteConfig.markPreviouslyListed) {
            return;
        }

        let lastReloadAt = 0;

        const reloadIfVisible = () => {
            if (document.visibilityState && document.visibilityState !== 'visible') {
                return;
            }

            const now = Date.now();
            if (now - lastReloadAt < 1000) {
                return;
            }
            lastReloadAt = now;

            const nextUrl = new URL(window.location.href);
            nextUrl.searchParams.set('_tmr', String(now));
            window.location.replace(nextUrl.toString());
        };

        document.addEventListener('visibilitychange', reloadIfVisible);
        window.addEventListener('focus', reloadIfVisible);
    }

    setupActiveTabReload();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleArticles);
    } else {
        handleArticles();
    }
})();
