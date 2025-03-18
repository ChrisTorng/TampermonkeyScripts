// ==UserScript==
// @name         InternetArchive Redirect
// @namespace    http://tampermonkey.net/
// @version      2025-03-18_1.4.5
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
// @match        https://www.lrb.co.uk/*
/// @match        https://www.newyorker.com/*
/// @match        https://www.nytimes.com/*
// @match        https://www.scientificamerican.com/*
// @match        https://www.rawstory.com/*
// @match        https://www.scmp.com/*
// @match        https://www.smh.com.au/*
/// @match        https://www.theatlantic.com/*
// @match        https://www.thetimes.com/*
// @match        https://www.theverge.com/*
// @match        https://www.washingtonpost.com/*
/// @match        https://www.wsj.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (window.location.hostname === 'web.archive.org') {
        const currentUrl = window.location.href;
        const match = currentUrl.match(/\/web\/\d+\*?\/(.*)/);
        if (match) {
            console.log('開始建立 Go 按鈕...');
            // 創建並添加 Go 按鈕
            const goButton = document.createElement('button');
            goButton.textContent = '→';
            goButton.style.cssText = `
                position: fixed;
                top: 70px;
                right: 0px;
                z-index: 2147483647;
                padding: 5px 10px;
                background-color: rgba(0, 0, 0, 0.3);
                color: darkgray;
                border: none;
                border-radius: 4px;
                cursor: move;
                font-size: 14px;
                user-select: none;
                touch-action: none;
            `;
                document.body.appendChild(goButton);
            console.log('Go 按鈕已建立');

            // 添加按鈕點擊事件
            goButton.addEventListener('click', () => {
                const targetUrl = match[1];
                const archiveIsUrl = `https://archive.is/submit/?url=${targetUrl}`;
                window.location.href = archiveIsUrl;
            });
        }

        // 等待 DOM 完全載入後再執行
        window.addEventListener('load', function () {
            try {
                let timer;

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
                        console.log('成功：停止監控 DOM 變化');
                        obs.disconnect(); // 成功後停止觀察
                        clearTimeout(timer);
                    }
                });

                observer.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });

                // 設定 10 秒後停止觀察
                timer = setTimeout(() => {
                    observer.disconnect();
                    console.log('觀察超時：停止監控 DOM 變化');
                }, 10000);

            } catch (error) {
                console.error('執行腳本時發生錯誤:', error);
            }
        });
        return;
    }

    // 其他網站的重定向邏輯
    const archiveUrl = `https://web.archive.org/${window.location.href}`;

    console.log(`重定向至 web.archive.org: ${archiveUrl}`);

    // 重定向到 Internet Archive 頁面
    window.location.replace(archiveUrl);
})();
