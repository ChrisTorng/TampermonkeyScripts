// ==UserScript==
// @name         Medium Auto Scroll
// @namespace    http://tampermonkey.net/
// @version      2025-11-04_3.0
// @description  Auto scroll to bottom then back to top on Medium sites, custom domain Medium sites, and sites redirected from Medium
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

    // 檢查 DOM 中是否有 Medium 的特徵標記（快速檢查）
    function hasMediumDOMFeatures() {
        // 檢查是否有 Medium 特有的 meta tags
        const mediumMetaTags = [
            'meta[property="al:android:app_name"][content="Medium"]',
            'meta[property="al:ios:app_name"][content="Medium"]',
            'meta[property="al:android:url"]',
            'meta[property="al:ios:url"]'
        ];

        for (const selector of mediumMetaTags) {
            const element = document.querySelector(selector);
            if (element && element.getAttribute('content')?.includes('medium')) {
                return true;
            }
        }

        return false;
    }

    // 檢查 HTTP header 是否有 medium-missing-time（自訂網域的 Medium 網站）
    async function hasMediumMissingTimeHeader() {
        try {
            // 發送 HEAD 請求來檢查 headers（避免下載整個頁面）
            const response = await fetch(window.location.href, {
                method: 'HEAD',
                cache: 'no-cache'
            });

            // 檢查是否有 medium-missing-time header
            return response.headers.has('medium-missing-time');
        } catch (error) {
            // 如果 fetch 失敗（例如 CORS 問題），回退到 DOM 檢查
            console.log('Failed to check headers:', error);
            return false;
        }
    }

    // 檢查是否應該執行自動捲動
    async function shouldAutoScroll() {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;

        // 0. 排除 global-identity-2 頁面本身（它只是重導向頁面）
        if (hostname.includes('medium.com') && pathname.includes('/m/global-identity-2')) {
            return false;
        }

        // 1. 如果是 Medium 網站（但不是 global-identity-2），執行捲動
        if (hostname.includes('medium.com')) {
            return true;
        }

        // 2. 檢查是否來自 Medium 的 global-identity-2 重導向
        const referrer = document.referrer;
        if (referrer && referrer.includes('medium.com/m/global-identity-2')) {
            return true;
        }

        // 3. 快速檢查 DOM 中是否有 Medium 特徵
        if (hasMediumDOMFeatures()) {
            return true;
        }

        // 4. 檢查 HTTP header 是否有 medium-missing-time（自訂網域的 Medium 網站）
        if (await hasMediumMissingTimeHeader()) {
            return true;
        }

        return false;
    }

    // 確保在頁面完全載入後執行
    async function init() {
        if (await shouldAutoScroll()) {
            autoScroll();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
