// ==UserScript==
// @name         Reddit Hide App Popup
// @namespace    http://tampermonkey.net/
// @version      2026-10-30_1.0.0
// @description  Hide Reddit mobile-app blocking prompts and restore scrolling without redirecting.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedditHideAppPopup.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/RedditHideAppPopup.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @match        https://www.reddit.com/*
// @match        https://reddit.com/*
// @match        https://new.reddit.com/*
// @match        https://sh.reddit.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    // Known Reddit app-only upsells. Avoid hiding unrelated dialogs.
    const popupSelectors = [
        '#app-upsell-blocking-bottom-sheet-direct',
        '#app-upsell-blocking-bottom-sheet-seo',
        '#desktop-dynamic-upsell-dialog',
        '#xpromo-bottom-sheet',
        '.XPromoPopupRpl',
        '.DualPartInterstitial',
        '.configured-xpromo'
    ];
    const popupSelector = popupSelectors.join(', ');
    const appPromptText = /get\s+(?:the\s+)?(?:reddit\s+)?app|continue\s+using\s+reddit|取得\s*(?:reddit\s*)?應用程式|獲取\s*(?:reddit\s*)?應用程式|下載\s*(?:reddit\s*)?應用程式|获取\s*(?:reddit\s*)?应用程序/i;
    const unlockedClass = 'tm-reddit-app-popup-unlocked';
    let unlocked = false;
    let scheduled = false;
    let installed = false;

    function unlockScrolling() {
        const root = document.documentElement;
        if (!root) return;

        if (!unlocked) {
            unlocked = true;
            root.classList.add(unlockedClass);
        }

        // Reddit may reapply these classes after a client-side navigation.
        for (const element of [root, document.body]) {
            if (!element) continue;
            element.classList.remove('rpl-scroll-lock', 'scroll-is-blocked');
        }
    }

    function scan() {
        if (!document.documentElement) return;

        let found = Boolean(document.querySelector(popupSelector));

        // Handle experiments that reuse a generic bottom-sheet component.
        for (const sheet of document.querySelectorAll('.rpl-bottom-sheet:not([data-tm-reddit-app-popup])')) {
            if (appPromptText.test((sheet.textContent || '').slice(0, 1600))) {
                sheet.setAttribute('data-tm-reddit-app-popup', '1');
                found = true;
            }
        }

        if (found || unlocked) unlockScrolling();
    }

    function scheduleScan() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            scan();
        });
    }

    function install() {
        if (installed || !document.documentElement) return false;
        installed = true;

        const style = document.createElement('style');
        style.id = 'tm-reddit-hide-app-popup';
        style.textContent = [
            popupSelector + ', .rpl-bottom-sheet[data-tm-reddit-app-popup="1"] {',
            '  display: none !important;',
            '  visibility: hidden !important;',
            '  pointer-events: none !important;',
            '}',
            'html.' + unlockedClass + ',',
            'html.' + unlockedClass + ' body {',
            '  overflow: auto !important;',
            '  touch-action: auto !important;',
            '  pointer-events: auto !important;',
            '}',
            'html.' + unlockedClass + ' body {',
            '  position: static !important;',
            '  top: auto !important;',
            '}'
        ].join('\n');
        (document.head || document.documentElement).appendChild(style);

        new MutationObserver(scheduleScan).observe(document, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        scan();
        return true;
    }

    // Once an app blocker has been found, prevent Reddit's page-level
    // scroll-cancellation handlers from receiving subsequent gestures.
    // Browser-native scrolling remains available.
    for (const eventType of ['touchmove', 'wheel']) {
        window.addEventListener(eventType, (event) => {
            if (unlocked) event.stopImmediatePropagation();
        }, { capture: true, passive: true });
    }

    if (!install()) {
        const startupObserver = new MutationObserver((observer) => {
            if (install()) observer.disconnect();
        });
        startupObserver.observe(document, { childList: true });
    }
})();
