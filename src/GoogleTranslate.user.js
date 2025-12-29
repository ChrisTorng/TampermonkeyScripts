// ==UserScript==
// @name         Google Translate Page Toggle
// @namespace    http://tampermonkey.net/
// @version      2025-12-29_1.0.6
// @description  Toggle the current page between original and Google Translate with Ctrl+Alt+S.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/GoogleTranslate.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/GoogleTranslate.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=translate.google.com
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
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
    const historyIndexKey = 'gt-toggle-history-index';
    const historyMapKey = 'gt-toggle-history-map';
    const translateMapKey = 'gt-toggle-translate-original-map';

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

    function buildOriginalUrl(currentUrl) {
        const url = new URL(currentUrl);
        const suffix = `.${translateHostSuffix}`;
        if (url.hostname.endsWith(suffix)) {
            url.hostname = url.hostname.slice(0, -suffix.length).replace(/-/g, '.');
        }
        url.searchParams.delete('_x_tr_sl');
        url.searchParams.delete('_x_tr_tl');
        url.searchParams.delete('_x_tr_hl');
        url.searchParams.delete('_x_tr_pto');
        return url.toString();
    }

    function loadJson(key, fallbackValue) {
        const raw = GM_getValue(key, null);
        if (!raw) {
            return fallbackValue;
        }
        try {
            return JSON.parse(raw);
        } catch (error) {
            return fallbackValue;
        }
    }

    function saveJson(key, value) {
        GM_setValue(key, JSON.stringify(value));
    }

    function getNavigationType() {
        const entries = performance.getEntriesByType('navigation');
        if (entries && entries.length) {
            return entries[0].type;
        }
        return 'navigate';
    }

    function findNearestIndexForUrl(map, url, baseIndex) {
        const indices = Object.keys(map)
            .map((key) => Number(key))
            .filter((key) => Number.isFinite(key) && map[key] === url);

        if (!indices.length) {
            return null;
        }

        if (baseIndex == null) {
            return Math.max(...indices);
        }

        let bestIndex = indices[0];
        let bestDistance = Math.abs(indices[0] - baseIndex);
        for (let i = 1; i < indices.length; i += 1) {
            const index = indices[i];
            const distance = Math.abs(index - baseIndex);
            if (distance < bestDistance) {
                bestIndex = index;
                bestDistance = distance;
            }
        }
        return bestIndex;
    }

    function updateHistoryTracking() {
        const map = loadJson(historyMapKey, {});
        const lastIndexRaw = GM_getValue(historyIndexKey, null);
        const lastIndex = Number.isFinite(Number(lastIndexRaw)) ? Number(lastIndexRaw) : null;
        const navigationType = getNavigationType();
        let index = null;

        if (navigationType === 'back_forward' || navigationType === 'reload') {
            index = findNearestIndexForUrl(map, window.location.href, lastIndex);
            if (index === null && lastIndex !== null) {
                index = lastIndex;
            }
        } else {
            index = (lastIndex || 0) + 1;
        }

        if (index === null) {
            index = 1;
        }

        map[index] = window.location.href;
        saveJson(historyMapKey, map);
        GM_setValue(historyIndexKey, index);
        return { index, map };
    }

    function rememberTranslateMapping(translateUrl, originalUrl) {
        const map = loadJson(translateMapKey, {});
        map[translateUrl] = originalUrl;
        saveJson(translateMapKey, map);
    }

    function getOriginalUrlForTranslate(translateUrl) {
        const map = loadJson(translateMapKey, {});
        return map[translateUrl] || buildOriginalUrl(translateUrl);
    }

    const historyState = updateHistoryTracking();

    function getAdjacentUrls() {
        if (!historyState || !historyState.index) {
            return { previousUrl: null, nextUrl: null };
        }
        return {
            previousUrl: historyState.map[historyState.index - 1] || null,
            nextUrl: historyState.map[historyState.index + 1] || null,
        };
    }

    function navigateToExpectedUrl(expectedUrl) {
        const { previousUrl, nextUrl } = getAdjacentUrls();
        if (previousUrl === expectedUrl) {
            window.history.back();
            return;
        }
        if (nextUrl === expectedUrl) {
            window.history.forward();
            return;
        }
        window.location.assign(expectedUrl);
    }

    function handleToggle() {
        if (isTranslatePage()) {
            const originalUrl = getOriginalUrlForTranslate(window.location.href);
            navigateToExpectedUrl(originalUrl);
            return;
        }

        const translatedUrl = buildTranslateUrl(window.location.href);
        rememberTranslateMapping(translatedUrl, window.location.href);
        navigateToExpectedUrl(translatedUrl);
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
        if (!event.altKey || !event.ctrlKey) {
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

    if (isTranslatePage()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', observeTranslateBannerFrame, { once: true });
        } else {
            observeTranslateBannerFrame();
        }
    }
})();
