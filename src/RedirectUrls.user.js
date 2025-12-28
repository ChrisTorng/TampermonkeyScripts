// ==UserScript==
// @name         RedirectUrls
// @namespace    http://tampermonkey.net/
// @version      2025-12-28_1.3.1
// @description  Redirect supported pages to more readable destinations while preserving back navigation.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectUrls.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectUrls.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nitter.net
// @match        https://x.com/*/status/*
// @match        https://twitter.com/*/status/*
// @match        https://www.reddit.com/*
// @match        https://old.reddit.com/*
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
            buildTarget: (match) => `https://nitter.net/${match[1]}/status/${match[2]}`,
            sessionKey: 'redirectx-last-redirect-x',
            skipReferrers: ['nitter.net', 'twitter.com', 'x.com'],
            getRedirectId: (match) => match[2]
        },
        {
            name: 'twitter.com status',
            match: /https?:\/\/twitter\.com\/([^/]+)\/status\/(\d+)/,
            buildTarget: (match) => `https://nitter.net/${match[1]}/status/${match[2]}`,
            sessionKey: 'redirectx-last-redirect-twitter',
            skipReferrers: ['nitter.net', 'twitter.com', 'x.com'],
            getRedirectId: (match) => match[2]
        },
        {
            name: 'reddit.com',
            match: /https?:\/\/(?:www|old)\.reddit\.com\/.+/,
            buildTarget: (_match, url) => `https://rdx.overdevs.com/comments.html?url=${url}`,
            sessionKey: 'redirectx-last-redirect-old-reddit',
            skipReferrers: ['rdx.overdevs.com'],
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
