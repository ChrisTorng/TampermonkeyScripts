// ==UserScript==
// @name         X/Twitter to Unrollnow
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Redirect X/Twitter links to Unrollnow
// @author       YourName
// @match        https://x.com/status/*
// @match        https://twitter.com/status/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 擷取目前網址中的數字 ID
    const urlPattern = /\/status\/(\d+)/;
    const match = window.location.href.match(urlPattern);

    if (match && match[1]) {
        // 組合 Unrollnow 的網址
        const unrollnowUrl = `https://unrollnow.com/status/${match[1]}`;
        
        // 跳轉到新網址
        window.location.replace(unrollnowUrl);
    }
})();
