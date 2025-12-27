// ==UserScript==
// @name         X/Twitter/Reddit RedirectX
// @namespace    http://tampermonkey.net/
// @version      2025-12-27_1.2.1
// @description  Redirect X/Twitter to Nitter and Reddit threads to rdx.overdevs.com
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectX.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectX.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nitter.net
// @match        https://x.com/*/status/*
// @match        https://twitter.com/*/status/*
// @match        https://www.reddit.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const currentUrl = window.location.href;
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
            match: /https?:\/\/www\.reddit\.com\/.+/,
            buildTarget: (_match, url) => `https://rdx.overdevs.com/comments.html?url=${url}`,
            sessionKey: 'redirectx-last-redirect-reddit',
            skipReferrers: ['rdx.overdevs.com'],
            getRedirectId: (_match, url) => url
        }
    ];

    for (const rule of redirectRules) {
        const match = currentUrl.match(rule.match);
        if (!match) {
            continue;
        }

        const redirectId = rule.getRedirectId ? rule.getRedirectId(match, currentUrl) : currentUrl;
        const lastRedirectId = sessionStorage.getItem(rule.sessionKey);
        const shouldSkip = lastRedirectId === redirectId ||
            (rule.skipReferrers || []).some((referrer) => document.referrer.includes(referrer));

        if (shouldSkip) {
            sessionStorage.removeItem(rule.sessionKey);
            console.log(`[RedirectX] Skip redirect (${rule.name}) to keep current page in history`);
            return;
        }

        const targetUrl = rule.buildTarget(match, currentUrl);
        sessionStorage.setItem(rule.sessionKey, redirectId);

        try {
            // Push a history state first so the Back button returns to the source page
            history.pushState({ redirectedByRedirectX: true }, '', currentUrl);
        } catch (error) {
            console.warn('Unable to push history state before redirect', error);
        }

        window.location.assign(targetUrl);
        return;
    }
})();
