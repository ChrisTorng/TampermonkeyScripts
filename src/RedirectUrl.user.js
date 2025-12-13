// ==UserScript==
// @name         RedirectUrl
// @namespace    http://tampermonkey.net/
// @version      2025-12-13_1.2.1
// @description  Apply rule-based URL redirects so that site-specific patterns are sent to their canonical destinations while keeping the source page in history.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectUrl.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedirectUrl.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @match        https://github.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const redirectConfig = {
        'github.com': [
            {
                id: 'github-readme-tab',
                pattern: '(\\?|&)tab=readme-ov-file(&)?',
                flags: 'i',
                description: 'Drop the readme-ov-file tab parameter so the repository opens on its main page.',
            },
        ],
    };

    const currentUrlString = window.location.href;
    const currentHostname = window.location.hostname;
    const siteRules = redirectConfig[currentHostname];
    if (!siteRules || siteRules.length === 0) {
        return;
    }

    const lastSourceKey = 'redirecturl:last-source';
    const lastSourceUrl = sessionStorage.getItem(lastSourceKey);
    if (lastSourceUrl && lastSourceUrl === currentUrlString) {
        sessionStorage.removeItem(lastSourceKey);
        return;
    }

    function normalizeUrlString(urlString) {
        const url = new URL(urlString);
        const params = new URLSearchParams(url.search);
        url.search = params.toString() ? `?${params.toString()}` : '';
        return url.toString();
    }

    function applyRule(urlString, rule) {
        const regex = new RegExp(rule.pattern, rule.flags || '');
        if (!regex.test(urlString)) {
            return null;
        }

        const replaced = urlString.replace(regex, (match, leading, trailing) => {
            if (leading === '?' && trailing) {
                return '?';
            }
            if (leading === '?') {
                return '';
            }
            if (leading === '&' && trailing) {
                return '&';
            }
            return '';
        });

        const normalized = normalizeUrlString(replaced);
        return normalized === urlString ? null : normalized;
    }

    const redirectTargetString = siteRules.reduce((found, rule) => {
        if (found) {
            return found;
        }
        return applyRule(currentUrlString, rule);
    }, null);

    if (!redirectTargetString || redirectTargetString === currentUrlString) {
        return;
    }

    sessionStorage.setItem(lastSourceKey, currentUrlString);

    try {
        history.pushState({ redirectedByRedirectUrl: true }, '', currentUrlString);
    } catch (error) {
        console.warn('Unable to push history state before redirect', error);
    }

    window.location.assign(redirectTargetString);
})();
