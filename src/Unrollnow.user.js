// ==UserScript==
// @name         X/Twitter to Unrollnow
// @namespace    http://tampermonkey.net/
// @version      2025-10-17_1.2.0
// @description  Redirect X/Twitter links to Unrollnow
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/Unrollnow.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/Unrollnow.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=x.com
// @match        https://x.com/*/status/*
// @match        https://twitter.com/*/status/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // 擷取目前網址中的數字 ID
    const urlPattern = /\/status\/(\d+)/;
    const match = window.location.href.match(urlPattern);

    if (match && match[1]) {
        const tweetId = match[1];
        const storageKey = 'unrollnow-last-redirect';

        const lastRedirectId = sessionStorage.getItem(storageKey);

        if (lastRedirectId === tweetId ||
            document.referrer.includes('unrollnow.com') ||
            document.referrer.includes('twitter.com')) {
            sessionStorage.removeItem(storageKey);
            console.log('Skip redirect to keep current page in history');
            return;
        }

        // 組合 Unrollnow 的網址
        const unrollnowUrl = `https://unrollnow.com/status/${tweetId}`;

        sessionStorage.setItem(storageKey, tweetId);

        // 使用 assign 以保留前一頁的歷史紀錄，便於使用者返回
        window.location.assign(unrollnowUrl);
    }
})();
