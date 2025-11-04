// ==UserScript==
// @name         Medium Auto Scroll
// @namespace    http://tampermonkey.net/
// @version      2025-11-04_2.0
// @description  Auto scroll to bottom then back to top on Medium sites and sites redirected from Medium
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/Medium.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/Medium.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=medium.com
// @match        *://*.medium.com/*
// @match        *://medium.com/*
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function autoScroll() {
        // 等待頁面內容完全載入
        if (document.body) {
            // 先跳到最下端
            window.scrollTo(0, document.body.scrollHeight);

            // 短暫延遲後跳回最上端
            setTimeout(() => {
                window.scrollTo(0, 0);
            }, 100);
        }
    }

    // 檢查是否應該執行自動捲動
    function shouldAutoScroll() {
        const hostname = window.location.hostname;

        // 1. 如果是 Medium 相關網站，直接執行
        if (hostname.includes('medium.com')) {
            return true;
        }

        // 2. 檢查是否來自 Medium 的 global-identity-2 重導向
        const referrer = document.referrer;
        if (referrer && referrer.includes('medium.com/m/global-identity-2')) {
            return true;
        }

        return false;
    }

    // 確保在頁面完全載入後執行
    function init() {
        if (shouldAutoScroll()) {
            autoScroll();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
