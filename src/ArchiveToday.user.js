// ==UserScript==
// @name         ArchiveToday Redirect
// @namespace    http://tampermonkey.net/
// @version      2025-03-18_1.2.7
// @description  Automatically redirect paywall articles to Archive Today
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArchiveToday.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArchiveToday.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=archive.is
// @match        https://archive.is/*
// @match        https://archive.ph/*
// @match        https://www.404media.co/*
// @match        https://www.bloomberg.com/*
// @match        https://www.economist.com/*
// @match        https://www.ft.com/*
// @match        https://www.nature.com/*
// @match        https://www.newscientist.com/*
// @match        https://www.newyorker.com/*
// @match        https://www.nytimes.com/*
// @match        https://www.theatlantic.com/*
// @match        https://www.wired.com/*
// @match        https://www.wsj.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    const hostname = window.location.hostname;
    
    if (hostname === 'archive.is' ||
        hostname === 'archive.ph') {
        // 當前網址為 Archive Today，執行相關操作
        window.addEventListener('load', () => {
            // 檢查並隱藏 DIVALREADY 元素
            const divAlready = document.getElementById('DIVALREADY');
            if (divAlready && divAlready.style.display !== 'none') {
                divAlready.style.display = 'none';
                console.log('DIVALREADY 已被隱藏。');
            }

            // 查找 SOLID 元素並自動捲動到該位置
            const solidDiv = document.getElementById('SOLID');
            if (solidDiv) {
                // 將 SOLID 元素的上端捲動到顯示內容的最上端，不使用平滑捲動
                solidDiv.scrollIntoView();
                console.log('已捲動到 SOLID 元素。');
            } else {
                console.log('未找到 ID 為 SOLID 的元素。');
            }
        });
        
        return; // 結束腳本執行，避免繼續執行下方的重定向邏輯
    }
    
    // 其他網站的重定向邏輯
    const archiveUrl = `https://archive.is/submit/?url=${window.location.href}`;
    
    console.log(`重定向至 archive.is: ${archiveUrl}`);
    
    // 重定向到 Archive Today 頁面
    window.location.replace(archiveUrl);
})();
