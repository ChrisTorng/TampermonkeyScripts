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

    // 檢查 DOM 中是否有 Medium 的特徵標記
    function isMediumSite() {
        // 1. 檢查 App Links meta tags (Medium 特有)
        const appLinkChecks = [
            'meta[property="al:ios:app_name"][content="Medium"]',
            'meta[property="al:android:app_name"][content="Medium"]',
            'meta[name="twitter:app:name:iphone"][content="Medium"]',
            'meta[name="twitter:app:name:ipad"][content="Medium"]'
        ];

        for (const selector of appLinkChecks) {
            if (document.querySelector(selector)) {
                return true;
            }
        }

        // 2. 檢查 App URL schemes (必須包含 medium://)
        const appUrlChecks = [
            'meta[property="al:ios:url"]',
            'meta[property="al:android:url"]',
            'meta[name="twitter:app:url:iphone"]'
        ];

        for (const selector of appUrlChecks) {
            const element = document.querySelector(selector);
            const content = element?.getAttribute('content') || '';
            if (content.startsWith('medium://')) {
                return true;
            }
        }

        // 3. 檢查 Twitter App ID (Medium 的 iOS app ID)
        const twitterAppId = document.querySelector('meta[name="twitter:app:id:iphone"]');
        if (twitterAppId?.getAttribute('content') === '828256236') {
            return true;
        }

        // 4. 檢查是否有 Medium 特有的 data attributes
        if (document.querySelector('[data-post-id]') &&
            document.querySelector('[data-collection-id]')) {
            return true;
        }

        // 5. 檢查頁面中是否有 Medium 的 script bundles
        const scripts = document.querySelectorAll('script[src]');
        for (const script of scripts) {
            const src = script.getAttribute('src') || '';
            if (src.includes('medium.com/_/stat') ||
                src.includes('cdn-client.medium.com')) {
                return true;
            }
        }

        return false;
    }

    // 檢查是否應該執行自動捲動
    function shouldAutoScroll() {
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

        // 3. 檢查 DOM 中是否有 Medium 特徵標記（自訂網域的 Medium 網站）
        if (isMediumSite()) {
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
