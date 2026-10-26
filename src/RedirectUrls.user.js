// ==UserScript==
// @name         RedirectUrls
// @namespace    http://tampermonkey.net/
// @version      2026-10-24_1.5.3
// @description  Redirect supported pages to more readable destinations while preserving back navigation.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectUrls.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectUrls.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=shitter.thepixora.com
// @match        https://x.com/*/status/*
// @match        https://twitter.com/*/status/*
// @match        https://old.reddit.com/*
// @match        https://www.reddit.com/login*
// @match        https://github.com/*
// @match        https://arxiv.org/abs/*
// @match        https://arxiv.org/pdf/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const currentUrl = window.location.href;
    const currentHostname = window.location.hostname;
    const readmeTabRegex = new RegExp('(\\?|&)tab=readme-ov-file(&)?', 'i');

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
            name: 'x.com status',
            match: /https?:\/\/x\.com\/([^/]+)\/status\/(\d+)/,
            buildTarget: (match) => `https://shitter.thepixora.com/${match[1]}/status/${match[2]}`,
            sessionKey: 'redirectx-last-redirect-x',
            skipReferrers: ['shitter.thepixora.com', 'twitter.com', 'x.com'],
            getRedirectId: (match) => match[2]
        },
        {
            name: 'twitter.com status',
            match: /https?:\/\/twitter\.com\/([^/]+)\/status\/(\d+)/,
            buildTarget: (match) => `https://shitter.thepixora.com/${match[1]}/status/${match[2]}`,
            sessionKey: 'redirectx-last-redirect-twitter',
            skipReferrers: ['shitter.thepixora.com', 'twitter.com', 'x.com'],
            getRedirectId: (match) => match[2]
        },
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

