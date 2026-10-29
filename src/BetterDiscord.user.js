// ==UserScript==
// @name         Better Discord
// @namespace    http://tampermonkey.net/
// @version      2026-10-30_1.0.8
// @description  Hide extra Discord chat input buttons; fix the chat composer gap above the Android Edge keyboard.
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


    // Edge Android sometimes leaves an unused strip between Discord's composer
    // and the keyboard. Use the visible viewport, not a fixed keyboard height.
    function initAndroidEdgeKeyboardFix() {
        if (typeof navigator === 'undefined' || !/Android/i.test(navigator.userAgent) || !/EdgA?\//i.test(navigator.userAgent)) {
            return () => {};
        }

        const viewport = window.visualViewport;
        if (!viewport) {
            return () => {};
        }

        const KEYBOARD_SHRINK = 120;
        const GAP_TOLERANCE = 12;
        let normalViewportHeight = viewport.height;
        let adjustedForm = null;
        let appliedShift = 0;
        let originalTranslate = '';
        let originalPriority = '';
        let frameId = 0;

        function restoreComposerPosition() {
            if (!adjustedForm) {
                return;
            }
            if (originalTranslate) {
                adjustedForm.style.setProperty('translate', originalTranslate, originalPriority);
            } else {
                adjustedForm.style.removeProperty('translate');
            }
            adjustedForm = null;
            appliedShift = 0;
        }

        function focusedComposer() {
            const active = document.activeElement;
            if (!active || typeof active.closest !== 'function') {
                return null;
            }
            const composer = active.closest('[class*="channelTextArea"]');
            if (!composer) {
                return null;
            }
            // Discord uses contenteditable for the message editor.
            const isEditor = active.isContentEditable ||
                active.matches('textarea, input, [contenteditable], [role="textbox"]') ||
                !!active.closest('[contenteditable="true"]');
            return isEditor ? composer : null;
        }

        function adjustComposerPosition() {
            frameId = 0;
            const composer = focusedComposer();
            if (!composer) {
                restoreComposerPosition();
                normalViewportHeight = Math.max(normalViewportHeight, viewport.height);
                return;
            }

            const keyboardShrink = normalViewportHeight - viewport.height;
            if (keyboardShrink < KEYBOARD_SHRINK || viewport.scale > 1.1) {
                restoreComposerPosition();
                return;
            }

            const form = composer.closest('form');
            if (!form || !form.isConnected) {
                restoreComposerPosition();
                return;
            }
            if (form !== adjustedForm) {
                restoreComposerPosition();
                originalTranslate = form.style.getPropertyValue('translate');
                originalPriority = form.style.getPropertyPriority('translate');
                // Preserve positioning explicitly set by other features.
                if (originalTranslate && originalTranslate !== 'none') {
                    return;
                }
                adjustedForm = form;
            }

            const rect = form.getBoundingClientRect();
            const visibleBottom = viewport.offsetTop + viewport.height;
            if (!Number.isFinite(rect.bottom) || !Number.isFinite(visibleBottom)) {
                restoreComposerPosition();
                return;
            }

            // BoundingClientRect already includes our previous CSS translation.
            const unadjustedBottom = rect.bottom - appliedShift;
            const gap = visibleBottom - unadjustedBottom;
            if (gap < GAP_TOLERANCE) {
                restoreComposerPosition();
                return;
            }

            // Adjust only positive gaps; never push an input behind the keyboard.
            const maxShift = Math.min(320, viewport.height * 0.48);
            const nextShift = Math.min(gap, maxShift);
            if (Math.abs(nextShift - appliedShift) >= 1) {
                appliedShift = nextShift;
                form.style.setProperty('translate', '0 ' + nextShift.toFixed(1) + 'px', 'important');
            }
        }

        function scheduleAdjust() {
            if (!frameId) {
                frameId = window.requestAnimationFrame(adjustComposerPosition);
            }
        }

        document.addEventListener('focusin', () => {
            scheduleAdjust();
            // Edge reports intermediate viewport sizes during IME animation.
            window.setTimeout(scheduleAdjust, 120);
            window.setTimeout(scheduleAdjust, 350);
        });
        document.addEventListener('focusout', () => {
            scheduleAdjust();
            window.setTimeout(scheduleAdjust, 120);
        });
        viewport.addEventListener('resize', scheduleAdjust);
        viewport.addEventListener('scroll', scheduleAdjust);
        window.addEventListener('resize', scheduleAdjust);
        window.addEventListener('orientationchange', () => {
            restoreComposerPosition();
            normalViewportHeight = viewport.height;
            scheduleAdjust();
        });
        window.addEventListener('pagehide', restoreComposerPosition);
        return scheduleAdjust;
    }

    function init() {
        const scheduleKeyboardFix = initAndroidEdgeKeyboardFix();
        simplifyComposer();
        scheduleKeyboardFix();

        if (!document.body) {
            return;
        }

        const observer = new MutationObserver(() => {
            simplifyComposer();
            scheduleKeyboardFix();
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
