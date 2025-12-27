// ==UserScript==
// @name         Medium Auto Reload Once
// @namespace    http://tampermonkey.net/
// @version      2025-12-27_3.2.2
// @description  Reload Medium and Medium-powered domains once per session to avoid hangups.
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

    const RELOAD_FLAG_PREFIX = 'medium-auto-reload:';

    function isMediumSite() {
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

        const twitterAppId = document.querySelector('meta[name="twitter:app:id:iphone"]');
        if (twitterAppId?.getAttribute('content') === '828256236') {
            return true;
        }

        if (document.querySelector('[data-post-id]') && document.querySelector('[data-collection-id]')) {
            return true;
        }

        const scripts = document.querySelectorAll('script[src]');
        for (const script of scripts) {
            const src = script.getAttribute('src') || '';
            if (src.includes('medium.com/_/stat') || src.includes('cdn-client.medium.com')) {
                return true;
            }
        }

        return false;
    }

    function shouldReload() {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;

        if (hostname.includes('medium.com') && pathname.includes('/m/global-identity-2')) {
            return false;
        }

        if (hostname.includes('medium.com')) {
            return true;
        }

        const referrer = document.referrer;
        if (referrer && referrer.includes('medium.com/m/global-identity-2')) {
            return true;
        }

        if (isMediumSite()) {
            return true;
        }

        return false;
    }

    function reloadOncePerSession() {
        const { origin, pathname } = window.location;
        const reloadFlagKey = `${RELOAD_FLAG_PREFIX}${origin}${pathname}`;

        if (sessionStorage.getItem(reloadFlagKey) === 'true') {
            return;
        }

        sessionStorage.setItem(reloadFlagKey, 'true');
        window.location.reload();
    }

    function init() {
        if (shouldReload()) {
            reloadOncePerSession();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
