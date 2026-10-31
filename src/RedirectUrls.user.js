// ==UserScript==
// @name         RedirectUrls
// @namespace    http://tampermonkey.net/
// @version      2026-11-01_1.6.0
// @description  Redirect supported pages to readable destinations, with X viewer fallback and original-page Back navigation.
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

    function isViewerReferrer() {
        try {
            return [...viewerHosts, ...xHosts].includes(new URL(document.referrer).hostname);
        } catch {
            return false;
        }
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
        const sessionKey = currentHostname === 'x.com' ?
            'redirectx-last-redirect-x' : 'redirectx-last-redirect-twitter';
        const navigation = window.performance?.getEntriesByType?.('navigation')[0];
        // History markers survive reloads and Back even when referrers are stripped.
        const shouldSkip = history.state?.redirectUrlsXOriginal === currentUrl ||
            sessionStorage.getItem(sessionKey) === post.id ||
            navigation?.type === 'back_forward' || isViewerReferrer();
        if (shouldSkip) {
            sessionStorage.removeItem(sessionKey);
            markOriginalPage();
            console.log('[RedirectUrls] Skip redirect (X original page) to preserve Back navigation');
            return true;
        }

        GM_getTab((tab) => {
            // Tab-scoped extension storage keeps the exact source across viewer origins.
            tab.redirectUrlsX = { originalUrl: currentUrl, postId: post.id };
            GM_saveTab(tab, () => {
                sessionStorage.setItem(sessionKey, post.id);
                try {
                    history.pushState({ ...history.state, redirectedByRedirectUrls: true,
                        redirectUrlsXOriginal: currentUrl }, '', currentUrl);
                } catch (error) {
                    console.warn('Unable to push history state before redirect', error);
                }
                window.location.assign(`https://${xViewers[0]}${post.path}`);
            });
        });
        return true;
    }

    function handleXViewer() {
        if (!viewerHosts.includes(currentHostname)) return false;
        GM_getTab((tab) => {
            const post = getPost(currentUrl, viewerHosts);
            const saved = tab.redirectUrlsX;
            const originalPost = saved && getPost(saved.originalUrl, xHosts);
            const useSaved = originalPost && saved.postId === originalPost.id &&
                (!post || saved.postId === post.id);
            const originalUrl = useSaved ? saved.originalUrl :
                (post ? `https://x.com${post.path}` : null);
            const targetPost = post || (useSaved ? originalPost : null);
            if (!originalUrl || !targetPost) return;

            const index = currentHostname === 'xnologin.com' ? 0 : xViewers.indexOf(currentHostname);
            const nextHost = xViewers[index + 1];
            // Replace failed viewers so Back goes straight to the original source entry.
            const goOriginal = () => {
                const target = new URL(originalUrl);
                const state = { originalUrl, postId: targetPost.id, bypass: true };
                tab.redirectUrlsX = state;
                GM_saveTab(tab, () => window.location.replace(target.href));
            };
            const goNext = () => {
                if (nextHost) {
                    window.location.replace(`https://${nextHost}${targetPost.path}`);
                } else {
                    goOriginal();
                }
            };
            const nextLabel = nextHost ? 'Next viewer' : 'Return to original';
            GM_registerMenuCommand(nextLabel, goNext);
            if (nextHost) GM_registerMenuCommand('Return to original', goOriginal);

            function mountControls() {
                if (!document.body || document.getElementById('redirecturls-x-controls')) return;
                const host = document.createElement('div');
                host.id = 'redirecturls-x-controls';
                host.style.cssText = 'all:initial!important;display:block!important;position:relative!important;z-index:2147483647!important;';
                const root = host.attachShadow({ mode: 'closed' });
                const style = document.createElement('style');
                style.textContent = ':host{color-scheme:light dark}nav{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:6px;background:#202124;color:#fff;font:14px/1.4 system-ui,sans-serif}button{font:inherit;color:#fff;background:#3c4043;border:1px solid #777;border-radius:5px;min-height:40px;padding:6px 12px;cursor:pointer}button:hover,button:focus-visible{background:#555}';
                const nav = document.createElement('nav');
                nav.setAttribute('aria-label', 'X viewer navigation');
                const label = document.createElement('span');
                label.textContent = index < 0 ? 'X viewer' : `X viewer ${index + 1}/${xViewers.length}`;
                nav.appendChild(label);
                for (const [text, action] of [[nextLabel, goNext],
                    ...(nextHost ? [['Return to original', goOriginal]] : [])]) {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.textContent = text;
                    button.addEventListener('click', action);
                    nav.appendChild(button);
                }
                root.appendChild(style);
                root.appendChild(nav);
                document.body.prepend(host);
            }

            // Controls stay available on HTTP error/challenge HTML without auto-skipping verification.
            if (document.body) mountControls();
            else document.addEventListener('DOMContentLoaded', mountControls, { once: true });
        });
        return true;
    }

    if (handleXViewer()) return;

    // Explicit return also works with no referrer and with unavailable source storage.
    if (getPost(currentUrl, xHosts)) {
        GM_getTab((tab) => {
            const saved = tab.redirectUrlsX;
            if (saved?.bypass && saved.originalUrl === currentUrl) {
                markOriginalPage();
                return;
            }
            handleXSource();
        });
        return;
    }

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
