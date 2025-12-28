// ==UserScript==
// @name         Google Translate Page Toggle
// @namespace    http://tampermonkey.net/
// @version      2025-12-28_1.0.3
// @description  Toggle the current page between original and Google Translate with Alt+S.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/GoogleTranslate.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/GoogleTranslate.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=translate.google.com
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    if (window !== window.top) {
        return;
    }

    const sourceLanguage = 'auto';
    const targetLanguage = 'zh-TW';
    const uiLanguage = 'en';
    const translateHostSuffix = 'translate.goog';
    const forwardTranslateKey = 'gt-toggle-forward-translate-url';
    let isNavigatingToTranslate = false;

    function isTranslatePage() {
        return window.location.hostname.endsWith(translateHostSuffix) &&
            window.location.search.includes('_x_tr_sl=');
    }

    function buildTranslateUrl(currentUrl) {
        const url = new URL(currentUrl);
        const translatedHost = `${url.hostname.replace(/\./g, '-')}.${translateHostSuffix}`;
        const translatedUrl = new URL(url.toString());
        translatedUrl.hostname = translatedHost;
        translatedUrl.searchParams.set('_x_tr_sl', sourceLanguage);
        translatedUrl.searchParams.set('_x_tr_tl', targetLanguage);
        translatedUrl.searchParams.set('_x_tr_hl', uiLanguage);
        translatedUrl.searchParams.set('_x_tr_pto', 'wapp');
        return translatedUrl.toString();
    }

    function handleToggle() {
        if (isTranslatePage()) {
            window.history.back();
            return;
        }

        const translatedUrl = buildTranslateUrl(window.location.href);
        const forwardTranslateUrl = sessionStorage.getItem(forwardTranslateKey);
        if (forwardTranslateUrl === translatedUrl) {
            isNavigatingToTranslate = true;
            window.history.forward();
            return;
        }

        sessionStorage.setItem(forwardTranslateKey, translatedUrl);
        isNavigatingToTranslate = true;
        window.location.assign(translatedUrl);
    }

    function hideTranslateBannerFrame() {
        const bannerFrame = document.getElementById('gt-nvframe');
        if (!bannerFrame) {
            return false;
        }
        bannerFrame.style.setProperty('display', 'none', 'important');
        if (document.body) {
            document.body.style.setProperty('margin-top', '0', 'important');
        }
        return true;
    }

    function observeTranslateBannerFrame() {
        if (!document.documentElement) {
            return;
        }

        if (hideTranslateBannerFrame()) {
            return;
        }

        const observer = new MutationObserver(() => {
            if (hideTranslateBannerFrame()) {
                observer.disconnect();
            }
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    function onKeyDown(event) {
        if (!event.altKey) {
            return;
        }

        const key = event.key ? event.key.toLowerCase() : '';
        if (key !== 's') {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        handleToggle();
    }

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('pageshow', () => {
        isNavigatingToTranslate = false;
    });
    window.addEventListener('pagehide', () => {
        if (!isNavigatingToTranslate) {
            sessionStorage.removeItem(forwardTranslateKey);
        }
    });

    if (isTranslatePage()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', observeTranslateBannerFrame, { once: true });
        } else {
            observeTranslateBannerFrame();
        }
    }
})();
