// ==UserScript==
// @name         Better Discord
// @namespace    http://tampermonkey.net/
// @version      2026-03-18_1.0.7
// @description  Hide extra Discord chat input buttons so only the send button remains.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/BetterDiscord.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/BetterDiscord.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=discord.com
// @match        https://discord.com/channels/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function hideElement(element) {
        if (!element) {
            return;
        }

        element.style.setProperty('display', 'none', 'important');
        element.setAttribute('data-better-discord-hidden', 'true');
    }

    function restoreLayout(element) {
        if (!element) {
            return;
        }

        [
            'display',
            'margin',
            'padding',
            'gap',
            'width',
            'min-width',
            'max-width',
            'height',
            'min-height',
            'flex-basis',
            'flex-shrink',
            'visibility',
            'opacity',
            'overflow',
        ].forEach((property) => {
            element.style.removeProperty(property);
        });
    }

    function simplifyComposer() {
        const composer = document.querySelector('[class*="channelTextArea"]');
        if (!composer) {
            return;
        }

        const buttonsArea = composer.querySelector('[class*="buttons__"]');
        const emojiWrapper = buttonsArea ? buttonsArea.querySelector('.expression-picker-chat-input-button') : null;
        const appsWrapper = buttonsArea ? buttonsArea.querySelector('[class*="app-launcher-entrypoint"]') : null;
        const separator = composer.querySelector('[class*="separator_"]');
        const sendContainer = separator ? separator.nextElementSibling : null;
        const sendButtonContainer = sendContainer ? sendContainer.querySelector('[class*="buttonContainer_"]') : null;

        restoreLayout(buttonsArea);
        restoreLayout(sendContainer);
        restoreLayout(sendButtonContainer);
        hideElement(emojiWrapper);
        hideElement(appsWrapper);

        if (separator) {
            restoreLayout(separator);
            hideElement(separator);
        }
    }

    function init() {
        simplifyComposer();

        if (!document.body) {
            return;
        }

        const observer = new MutationObserver(() => {
            simplifyComposer();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
