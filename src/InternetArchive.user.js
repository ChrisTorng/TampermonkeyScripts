// ==UserScript==
// @name         InternetArchive Redirect
// @namespace    http://tampermonkey.net/
// @version      2025-01-02_1.1.1
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
// @match        https://www.economist.com/*
// @match        https://www.ft.com/*
// @match        https://www.nytimes.com/*
// @match        https://www.scientificamerican.com/*
// @match        https://www.rawstory.com/*
// @match        https://www.scmp.com/*
// @match        https://www.theatlantic.com/*
// @match        https://www.thetimes.com/*
// @match        https://www.theverge.com/*
// @match        https://www.washingtonpost.com/*
// @match        https://www.wsj.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    if (window.location.hostname === 'web.archive.org') {
        window.addEventListener('load', () => {
            // 設定標題列可捲動
            const wmIppBase = document.getElementById('wm-ipp');
            if (wmIppBase) {
                wmIppBase.style = '';
                console.log('已設定標題列元素可捲動');
            } else {
                console.log('未找到標題列元素');
            }

            // 修改提交按鈕並加入點擊事件
            const submitButton = document.querySelector('#wmtb > input[type=submit]');
            if (submitButton) {
                submitButton.type = 'button';
                submitButton.addEventListener('click', () => {
                    const urlInput = document.getElementById('wmtbURL');
                    if (urlInput) {
                        const targetUrl = urlInput.value;
                        if (targetUrl) {
                            console.log('導航至:', targetUrl);
                            window.location.href = targetUrl;
                        }
                    }
                });
                console.log('已設定提交按鈕點擊事件');
            } else {
                console.log('未找到提交按鈕');
            }
        });
        
        return; // 結束腳本執行，避免繼續執行下方的重定向邏輯
    }
    
    // 其他網站的重定向邏輯
    const archiveUrl = `https://web.archive.org/${window.location.href}`;
    
    console.log(`重定向至 web.archive.org: ${archiveUrl}`);
    
    // 重定向到 Internet Archive 頁面
    window.location.replace(archiveUrl);
})();
