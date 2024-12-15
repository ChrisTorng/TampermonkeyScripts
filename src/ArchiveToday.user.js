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
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    const currentUrl = window.location.href;
    const encodedUrl = encodeURIComponent(currentUrl);
    const archiveUrl = `https://archive.is/submit/?url=${encodedUrl}`;
    
    window.location.replace(archiveUrl);
})();
