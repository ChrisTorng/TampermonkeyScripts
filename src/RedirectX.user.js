// ==UserScript==
// @name         X/Twitter to Nitter RedirectX
// @namespace    http://tampermonkey.net/
// @version      2025-12-13_1.1.0
// @description  Redirect X/Twitter links to Nitter
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectX.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectX.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nitter.net
// @match        https://x.com/*/status/*
// @match        https://twitter.com/*/status/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Extract username and tweet ID from the current URL
    const urlPattern = /https?:\/\/(?:x\.com|twitter\.com)\/([^/]+)\/status\/(\d+)/;
    const match = window.location.href.match(urlPattern);

    if (match && match[1] && match[2]) {
        const [, username, tweetId] = match;
        const storageKey = 'redirectx-last-redirect';

        const lastRedirectId = sessionStorage.getItem(storageKey);

        if (lastRedirectId === tweetId ||
            document.referrer.includes('nitter.net') ||
            document.referrer.includes('twitter.com') ||
            document.referrer.includes('x.com')) {
            sessionStorage.removeItem(storageKey);
            console.log('[RedirectX] Skip redirect to keep current page in history');
            return;
        }

        // Build the Nitter URL
        const nitterUrl = `https://nitter.net/${username}/status/${tweetId}`;

        sessionStorage.setItem(storageKey, tweetId);

        try {
            // Push a history state first so the Back button returns to the source page
            history.pushState({ redirectedByNitter: true }, '', window.location.href);
        } catch (error) {
            console.warn('Unable to push history state before redirect', error);
        }

        window.location.assign(nitterUrl);
    }
})();
