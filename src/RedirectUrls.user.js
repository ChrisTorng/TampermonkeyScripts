// ==UserScript==
// @name         RedirectUrls
// @namespace    http://tampermonkey.net/
// @version      2026-11-01_1.6.2
// @description  Redirect supported pages to readable destinations, with a compact X viewer fallback arrow and normal browsing history.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectUrls.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectUrls.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nitter.tiekoetter.com
// @match        https://x.com/*/status/*
// @match        https://twitter.com/*/status/*
// @match        https://nitter.tiekoetter.com/*
// @match        https://xnologin.com/*
// @match        https://nitter.meowing.monster/*
// @match        https://shitter.thepixora.com/*
// @match        https://old.reddit.com/*
// @match        https://www.reddit.com/login*
// @match        https://github.com/*
// @match        https://arxiv.org/abs/*
// @match        https://arxiv.org/pdf/*
// @run-at       document-start
// @noframes
// @grant        GM_getTab
// @grant        GM_saveTab
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    const currentUrl = window.location.href;
    const currentHostname = window.location.hostname;
    const readmeTabRegex = new RegExp('(\\?|&)tab=readme-ov-file(&)?', 'i');

    const xHosts = ['x.com', 'twitter.com'];
    const xViewers = ['nitter.tiekoetter.com', 'nitter.meowing.monster'];
    const viewerHosts = [...xViewers, 'xnologin.com', 'shitter.thepixora.com'];

    function getPost(urlString, hosts) {
        try {
            const url = new URL(urlString);
            const match = url.pathname.match(/^\/([^/]+)\/status\/(\d+)(?:\/|$)/);
            if (!hosts.includes(url.hostname) || !match) return null;
            return { id: match[2], path: `/${match[1]}/status/${match[2]}` };
        } catch {
            return null;
        }
    }

    function visitXPage(targetUrl) {
        const navigate = () => window.location.assign(targetUrl);
        // Before load completes, Location.assign may replace the current history entry.
        if (document.readyState === 'complete') navigate();
        else window.addEventListener('load', () => window.setTimeout(navigate, 0), { once: true });
    }

    function markOriginalPage() {
        try {
            history.replaceState({ ...history.state, redirectUrlsXOriginal: currentUrl }, '', currentUrl);
        } catch (error) {
            console.warn('[RedirectUrls] Unable to mark original page', error);
        }
    }

    function handleXSource() {
        const post = getPost(currentUrl, xHosts);
        if (!post) return false;
        GM_getTab((tab) => {
            const saved = tab.redirectUrlsX;
            const pending = saved?.returnOnce;
            if (pending) delete saved.returnOnce;
            const age = pending ? Date.now() - pending.createdAt : -1;
            const returning = pending?.url === currentUrl && age >= 0 && age < 30000;
            const navigation = window.performance?.getEntriesByType?.('navigation')[0];
            // Only the existing history entry is exempt; fresh visits to the same URL redirect again.
            if (history.state?.redirectUrlsXOriginal === currentUrl ||
                navigation?.type === 'back_forward' || returning) {
                markOriginalPage();
                if (pending) GM_saveTab(tab);
                console.log('[RedirectUrls] Skip redirect (X history entry)');
                return;
            }
            // Tab-scoped extension storage keeps the exact source across viewer origins.
            tab.redirectUrlsX = { originalUrl: currentUrl, postId: post.id };
            GM_saveTab(tab, () => {
                markOriginalPage();
                visitXPage(`https://${xViewers[0]}${post.path}`);
            });
        });
        return true;
    }

    function handleXViewer() {
        if (!viewerHosts.includes(currentHostname)) return false;
        GM_getTab((tab) => {
            const post = getPost(currentUrl, viewerHosts);
            const savedUrl = history.state?.redirectUrlsXSource || tab.redirectUrlsX?.originalUrl;
            const originalPost = savedUrl && getPost(savedUrl, xHosts);
            const useSaved = originalPost && (!post || originalPost.id === post.id);
            const originalUrl = useSaved ? savedUrl :
                (post ? `https://x.com${post.path}` : null);
            const targetPost = post || (useSaved ? originalPost : null);
            if (!originalUrl || !targetPost) return;
            // Preserve source context with this viewer entry even after visiting other posts.
            history.replaceState({ ...history.state, redirectUrlsXSource: originalUrl }, '', currentUrl);

            const index = currentHostname === 'xnologin.com' ? 0 : xViewers.indexOf(currentHostname);
            const nextHost = xViewers[index + 1];
            // Every arrow click adds a normal history entry, including the final return to X.
            const goOriginal = () => {
                const target = new URL(originalUrl);
                const state = { originalUrl, postId: targetPost.id,
                    returnOnce: { url: target.href, createdAt: Date.now() } };
                tab.redirectUrlsX = state;
                GM_saveTab(tab, () => visitXPage(target.href));
            };
            const goNext = () => {
                if (nextHost) {
                    visitXPage(`https://${nextHost}${targetPost.path}`);
                } else {
                    goOriginal();
                }
            };
            const nextLabel = nextHost ? 'Next viewer' : 'Return to original';
            GM_registerMenuCommand(nextLabel, goNext);
            if (nextHost) GM_registerMenuCommand('Return to original', goOriginal);

            function mountControls() {
                if (!document.documentElement || document.getElementById('redirecturls-x-controls')) return;
                const host = document.createElement('div');
                host.id = 'redirecturls-x-controls';
                // Independent, out-of-flow control; never add a nav element or offset the site header.
                host.style.cssText = `all:initial!important;display:block!important;position:absolute!important;top:${(window.scrollY || 0) + 106}px!important;right:0!important;width:38px!important;height:32px!important;margin:0!important;padding:0!important;z-index:2147483647!important;`;
                const root = host.attachShadow({ mode: 'closed' });
                const style = document.createElement('style');
                style.textContent = 'button{all:initial;appearance:none;display:block;box-sizing:border-box;width:38px;height:32px;margin:0;padding:0;border:0;border-radius:5px;box-shadow:0 2px 6px rgba(0,0,0,.25);background:rgba(0,0,0,.55);color:#f0f0f0;font:600 15px/32px system-ui,sans-serif;text-align:center;cursor:pointer;user-select:none;text-decoration:none}button:hover,button:focus-visible{background:rgba(0,0,0,.75);text-decoration:none}';
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = '→';
                button.title = nextHost ? `Next viewer: ${nextHost}` : 'Return to original';
                button.setAttribute('aria-label', button.title);
                button.addEventListener('click', goNext);
                root.appendChild(style);
                root.appendChild(button);
                document.documentElement.appendChild(host);

                let menuObserver;
                function placeBelowMenu() {
                    const menu = document.getElementById('tm-shared-floating-menu');
                    const handle = menu?.querySelector('[data-floating-toggle]');
                    if (!handle) return false;
                    const rect = handle.getBoundingClientRect();
                    if (rect.width && rect.height && !menu.hidden) {
                        host.style.setProperty('left', `${rect.left + (window.scrollX || 0)}px`, 'important');
                        host.style.setProperty('right', 'auto', 'important');
                        host.style.setProperty('top', `${rect.bottom + (window.scrollY || 0) + 4}px`, 'important');
                    }
                    // Do not cover the existing archive action when its menu is expanded.
                    host.style.setProperty('display', !menu.hidden && menu.getAttribute('data-floating-expanded') === 'true' ? 'none' : 'block', 'important');
                    if (!menuObserver) {
                        menuObserver = new MutationObserver(placeBelowMenu);
                        menuObserver.observe(menu, { attributes: true,
                            attributeFilter: ['data-floating-expanded', 'hidden'] });
                    }
                    return true;
                }
                // Only initial discovery and menu expansion matter; no scrolling, zoom, or drag tracking.
                if (!placeBelowMenu()) {
                    const discovery = new MutationObserver(() => {
                        if (placeBelowMenu()) discovery.disconnect();
                    });
                    discovery.observe(document.documentElement, { childList: true, subtree: true });
                    window.setTimeout(() => discovery.disconnect(), 5000);
                }
            }

            // Controls stay available on HTTP error/challenge HTML without auto-skipping verification.
            if (document.body) mountControls();
            else document.addEventListener('DOMContentLoaded', mountControls, { once: true });
        });
        return true;
    }

    if (handleXViewer()) return;

    if (handleXSource()) return;

    function normalizeUrlString(urlString) {
        const url = new URL(urlString);
        const params = new URLSearchParams(url.search);
        url.search = params.toString() ? `?${params.toString()}` : '';
        return url.toString();
    }

    function stripReadmeTab(urlString) {
        if (!readmeTabRegex.test(urlString)) {
            return null;
        }

        const replaced = urlString.replace(readmeTabRegex, (match, leading, trailing) => {
            if (leading === '?' && trailing) {
                return '?';
            }
            if (leading === '?') {
                return '';
            }
            if (leading === '&' && trailing) {
                return '&';
            }
            return '';
        });

        const normalized = normalizeUrlString(replaced);
        return normalized === urlString ? null : normalized;
    }

    function getArxivHtmlTarget(urlString) {
        const url = new URL(urlString);
        if (url.hostname !== 'arxiv.org') {
            return null;
        }

        const absPrefix = '/abs/';
        const pdfPrefix = '/pdf/';
        let identifier = null;

        if (url.pathname.startsWith(absPrefix)) {
            identifier = url.pathname.slice(absPrefix.length);
        } else if (url.pathname.startsWith(pdfPrefix)) {
            identifier = url.pathname.slice(pdfPrefix.length);
            if (identifier.endsWith('.pdf')) {
                identifier = identifier.slice(0, -4);
            }
        }

        if (!identifier) {
            return null;
        }

        return `https://arxiv.org/html/${identifier}`;
    }

    function getOldRedditLoginTarget(urlString) {
        const loginUrl = new URL(urlString);
        if (loginUrl.hostname !== 'www.reddit.com' ||
            !/^\/login\/?$/.test(loginUrl.pathname) ||
            loginUrl.searchParams.get('reason') !== 'lor2') {
            return null;
        }

        const destination = loginUrl.searchParams.get('dest');
        if (!destination) {
            return null;
        }

        try {
            const target = new URL(destination);
            // Only recover Reddit's old-site login redirect, never general login flows.
            if (!['http:', 'https:'].includes(target.protocol) ||
                target.hostname !== 'old.reddit.com' ||
                target.username || target.password || target.port) {
                return null;
            }
            target.protocol = 'https:';
            target.hostname = 'www.reddit.com';
            return target.href;
        } catch {
            return null;
        }
    }

    function getMatch(rule, urlString) {
        if (rule.match instanceof RegExp) {
            return urlString.match(rule.match);
        }
        if (typeof rule.match === 'function') {
            return rule.match(urlString);
        }
        return null;
    }

    const redirectRules = [
        {
            name: 'reddit old-site login recovery',
            match: getOldRedditLoginTarget,
            buildTarget: (target) => target,
            sessionKey: 'redirectx-last-redirect-reddit-login',
            getRedirectId: (_match, url) => url
        },
        {
            name: 'old.reddit.com',
            match: /^https?:\/\/old\.reddit\.com(?:\/|[?#]|$)/,
            buildTarget: (_match, url) => {
                const target = new URL(url);
                target.hostname = 'www.reddit.com';
                return target.toString();
            },
            sessionKey: 'redirectx-last-redirect-old-reddit',
            getRedirectId: (_match, url) => url
        },
        {
            name: 'github readme tab',
            match: () => currentHostname === 'github.com' ? stripReadmeTab(currentUrl) : null,
            buildTarget: (match) => match,
            sessionKey: 'redirectx-last-redirect-github',
            getRedirectId: (_match, url) => url
        },
        {
            name: 'arxiv abs/pdf',
            match: getArxivHtmlTarget,
            buildTarget: (match) => match,
            sessionKey: 'redirectx-last-redirect-arxiv',
            getRedirectId: (_match, url) => url
        }
    ];

    for (const rule of redirectRules) {
        const match = getMatch(rule, currentUrl);
        if (!match) {
            continue;
        }

        const redirectId = rule.getRedirectId ? rule.getRedirectId(match, currentUrl) : currentUrl;
        const lastRedirectId = sessionStorage.getItem(rule.sessionKey);
        const shouldSkip = lastRedirectId === redirectId ||
            (rule.skipReferrers || []).some((referrer) => document.referrer.includes(referrer));

        if (shouldSkip) {
            sessionStorage.removeItem(rule.sessionKey);
            console.log(`[RedirectUrls] Skip redirect (${rule.name}) to keep current page in history`);
            return;
        }

        const targetUrl = rule.buildTarget(match, currentUrl);
        if (!targetUrl || targetUrl === currentUrl) {
            sessionStorage.removeItem(rule.sessionKey);
            return;
        }
        sessionStorage.setItem(rule.sessionKey, redirectId);

        try {
            // Push a history state first so the Back button returns to the source page
            history.pushState({ redirectedByRedirectUrls: true }, '', currentUrl);
        } catch (error) {
            console.warn('Unable to push history state before redirect', error);
        }

        window.location.assign(targetUrl);
        return;
    }
})();
