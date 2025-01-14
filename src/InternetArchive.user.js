// ==UserScript==
// @name         InternetArchive Redirect
// @namespace    http://tampermonkey.net/
// @version      2025-01-14_1.2.0
// @description  Automatically redirect paywall articles to Internet Archive
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/InternetArchive.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/InternetArchive.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=web.archive.org
// @match        https://web.archive.org/*
// @match        https://fortune.com/*
// @match        https://nautil.us/*
// @match        https://www.australiangeographic.com.au/*
// @match        https://www.bbc.com/*
// @match        https://www.cnbc.com/*
/// @match        https://www.economist.com/*
/// @match        https://www.ft.com/*
// @match        https://www.newyorker.com/*
// @match        https://www.nytimes.com/*
// @match        https://www.scientificamerican.com/*
// @match        https://www.rawstory.com/*
// @match        https://www.scmp.com/*
// @match        https://www.theatlantic.com/*
// @match        https://www.thetimes.com/*
// @match        https://www.theverge.com/*
// @match        https://www.washingtonpost.com/*
//  / @match        https://www.wsj.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    if (window.location.hostname === 'web.archive.org') {
        function handleWmIppBase() {
            const wmIppBase = document.getElementById('wm-ipp-base');
            if (wmIppBase) {
                wmIppBase.style = 'display: none !important';
                console.log('已成功隱藏標題列元素');
                return true;
            }
            console.log('尚未找到標題列元素，繼續等待...');
            return false;
        }

        // 設定 MutationObserver 監控 DOM 變化
        const observer = new MutationObserver((mutations, obs) => {
            if (handleWmIppBase()) {
                obs.disconnect(); // 成功後停止觀察
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        // 設定 10 秒後停止觀察
        setTimeout(() => {
            observer.disconnect();
            console.log('觀察超時：停止監控 DOM 變化');
        }, 10000);

        return;
    }

    // 其他網站的重定向邏輯
    const archiveUrl = `https://web.archive.org/${window.location.href}`;
    
    console.log(`重定向至 web.archive.org: ${archiveUrl}`);
    
    // 重定向到 Internet Archive 頁面
    window.location.replace(archiveUrl);
})();
