// ==UserScript==
// @name         ArchiveToday Redirect
// @namespace    http://tampermonkey.net/
// @version      2024-12-15_1.0
// @description  Automatically redirect paywall articles to archive.is for archiving
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArchiveToday.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/ArchiveToday.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @match        https://www.bloomberg.com/*
// @match        https://archive.is/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    const hostname = window.location.hostname;
    
    if (hostname === 'archive.is') {
        // 當前網址為 archive.is，執行相關操作
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
    const currentUrl = window.location.href;
    const encodedUrl = encodeURIComponent(currentUrl);
    const archiveUrl = `https://archive.is/submit/?url=${encodedUrl}`;
    
    console.log(`重定向至 archive.is: ${archiveUrl}`);
    
    // 重定向到 archive.is 的提交頁面
    window.location.replace(archiveUrl);
})();
