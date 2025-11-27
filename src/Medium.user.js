// ==UserScript==
// @name         Medium Auto Scroll
// @namespace    http://tampermonkey.net/
// @version      2025-11-04_1.2
// @description  Auto scroll to bottom then back to top on Medium sites
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/Medium.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/Medium.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=medium.com
// @match        *://*.medium.com/*
// @match        *://medium.com/*
// @match        *://uxdesign.cc/*
// @match        *://towardsdatascience.com/*
// @match        *://betterprogramming.pub/*
// @match        *://levelup.gitconnected.com/*
// @match        *://javascript.plainenglish.io/*
// @match        *://hackernoon.com/*
// @match        *://blog.angular.io/*
// @match        *://blog.logrocket.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function autoScroll() {
        // 等待頁面內容完全載入
        if (document.body) {
            // 等待 1 秒後跳到最下端
            setTimeout(() => {
                window.scrollTo(0, document.body.scrollHeight);

                // 再等待 1 秒後跳回最上端
                setTimeout(() => {
                    window.scrollTo(0, 0);
                }, 1000);
            }, 1000);
        }
    }

    // 確保在頁面完全載入後執行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoScroll);
    } else {
        autoScroll();
    }
})();
