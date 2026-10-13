// ==UserScript==
// @name         Exclude ChrisTorng Blog from Cloudflare Analytics
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-10-13
// @description  Refresh the Cloudflare Web Analytics exclusion cookie on the blog home page.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/CloudflareAnalyticsExclude.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/CloudflareAnalyticsExclude.user.js
// @match        https://christorng.idv.tw/
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Renew for 400 days whenever the blog home page is opened.
    document.cookie = 'cf_analytics_ignore=1; Path=/; Max-Age=34560000; SameSite=Lax; Secure';
})();
