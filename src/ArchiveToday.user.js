// ==UserScript==
// @name         ArchiveToday Redirect
// @namespace    http://tampermonkey.net/
// @version      2026-11-05_1.2.9
// @description  Redirect selected paywall pages to Archive Today, hide prompts, and jump into the content.
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
// @run-at       document-start
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
    
    // Only exact source URLs with publicly referenced or user-observed fixed
    // snapshots use direct links. Others retain the regular submit fallback.
    const VERIFIED_SNAPSHOTS = new Map([
        ['https://www.404media.co/anyone-can-push-updates-to-the-doge-gov-website-2/', 'https://archive.ph/wy1Wt'],
        ['https://www.theatlantic.com/magazine/archive/2025/02/american-loneliness-personality-politics/681091/', 'https://archive.is/20250108154250/https://www.theatlantic.com/magazine/archive/2025/02/american-loneliness-personality-politics/681091'],
        ['https://www.wsj.com/world/dozens-feared-dead-in-crash-after-passenger-flight-diverts-from-russia-fb2cdf2c', 'https://archive.is/T0atg']
    ]);
    const sourceUrl = new URL(window.location.href);
    sourceUrl.hash = '';
    const archiveUrl = VERIFIED_SNAPSHOTS.get(sourceUrl.href) ||
        `https://archive.is/submit/?url=${encodeURIComponent(sourceUrl.href)}`;
    
    console.log(`重定向至 archive.is: ${archiveUrl}`);
    
    // 重定向到 Archive Today 頁面
    window.location.replace(archiveUrl);
})();
