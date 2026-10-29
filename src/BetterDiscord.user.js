// ==UserScript==
// @name         Better Discord
// @namespace    http://tampermonkey.net/
// @version      2026-10-30_1.0.9
// @description  Hide extra Discord chat input buttons and repair Android Edge keyboard layout gaps.
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


    // Android Edge can leave Discord's app or chat panel shorter than the
    // visible viewport when the software keyboard opens. Repair the containing
    // layout first: translating the form alone can be clipped by that panel.
    function initAndroidEdgeKeyboardFix() {
        if (typeof navigator === 'undefined' ||
            !/Android/i.test(navigator.userAgent) ||
            !/EdgA?\//i.test(navigator.userAgent)) {
            return () => {};
        }

        const viewport = window.visualViewport;
        if (!viewport) {
            return () => {};
        }

        const MIN_GAP = 24;
        const MAX_GAP = 360;
        let adjustedForm = null;
        let formShift = 0;
        let originalTranslate = '';
        let originalTranslatePriority = '';
        let resizedPanel = null;
        let panelStyles = null;
        let frameId = 0;

        function restoreProperty(element, property, value, priority) {
            if (value) {
                element.style.setProperty(property, value, priority);
            } else {
                element.style.removeProperty(property);
            }
        }

        function restoreForm() {
            if (adjustedForm) {
                restoreProperty(adjustedForm, 'translate', originalTranslate, originalTranslatePriority);
            }
            adjustedForm = null;
            formShift = 0;
        }

        function restorePanel() {
            if (resizedPanel && panelStyles) {
                for (const property of ['height', 'min-height', 'max-height']) {
                    restoreProperty(resizedPanel, property,
                        panelStyles[property].value, panelStyles[property].priority);
                }
            }
            resizedPanel = null;
            panelStyles = null;
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
            const isEditor = active.isContentEditable ||
                active.matches('textarea, input, [contenteditable], [role="textbox"]') ||
                !!active.closest('[contenteditable="true"]');
            return isEditor ? composer : null;
        }

        function findShortLayoutPanel(form, visibleBottom) {
            let highestShortPanel = null;
            // Exclude the composer itself and other small controls. The target
            // is an actual full-height chat/app wrapper, never the input row.
            const minimumHeight = Math.min(300, viewport.height * 0.45);
            for (let element = form.parentElement;
                element && element !== document.body && element !== document.documentElement;
                element = element.parentElement) {
                const rect = element.getBoundingClientRect();
                if (!Number.isFinite(rect.bottom) ||
                    !Number.isFinite(rect.height) ||
                    rect.height < minimumHeight ||
                    visibleBottom - rect.bottom < MIN_GAP) {
                    continue;
                }
                highestShortPanel = element;
                const parent = element.parentElement;
                if (parent && parent !== document.body &&
                    parent.getBoundingClientRect().bottom - rect.bottom >= MIN_GAP) {
                    return element;
                }
            }
            return highestShortPanel;
        }

        function repairLayoutHeight(form, visibleBottom) {
            // Measure without our last correction so repeated resize/scroll
            // events cannot accumulate offsets or lock in an obsolete height.
            restorePanel();
            const panel = findShortLayoutPanel(form, visibleBottom);
            if (!panel) {
                return;
            }
            const rect = panel.getBoundingClientRect();
            const gap = visibleBottom - rect.bottom;
            if (gap < MIN_GAP || gap > Math.min(MAX_GAP, viewport.height * 0.6)) {
                return;
            }
            panelStyles = {};
            for (const property of ['height', 'min-height', 'max-height']) {
                panelStyles[property] = {
                    value: panel.style.getPropertyValue(property),
                    priority: panel.style.getPropertyPriority(property),
                };
            }
            resizedPanel = panel;
            const height = Math.ceil(rect.height + gap) + 'px';
            panel.style.setProperty('height', height, 'important');
            panel.style.setProperty('min-height', height, 'important');
            panel.style.setProperty('max-height', 'none', 'important');
        }

        function adjustComposerPosition() {
            frameId = 0;
            const composer = focusedComposer();
            const form = composer ? composer.closest('form') : null;
            if (!form || !form.isConnected || viewport.scale > 1.1) {
                restoreForm();
                restorePanel();
                return;
            }

            const visibleBottom = viewport.offsetTop + viewport.height;
            if (!Number.isFinite(visibleBottom)) {
                restoreForm();
                restorePanel();
                return;
            }

            // Remove the old form correction before measuring the layout.
            restoreForm();
            repairLayoutHeight(form, visibleBottom);

            const rect = form.getBoundingClientRect();
            const gap = visibleBottom - rect.bottom;
            // Do not shift forms that are already aligned or below the
            // keyboard. Never manufacture a fixed keyboard-height offset.
            if (!Number.isFinite(gap) || gap < MIN_GAP ||
                gap > Math.min(MAX_GAP, viewport.height * 0.6)) {
                return;
            }
            const initialTranslate = form.style.getPropertyValue('translate');
            // Do not override positioning installed by Discord or other scripts.
            if (initialTranslate && initialTranslate !== 'none') {
                return;
            }
            adjustedForm = form;
            originalTranslate = initialTranslate;
            originalTranslatePriority = form.style.getPropertyPriority('translate');
            formShift = gap;
            form.style.setProperty('translate', '0 ' + formShift.toFixed(1) + 'px', 'important');
        }

        function scheduleAdjust() {
            if (!frameId) {
                frameId = window.requestAnimationFrame(adjustComposerPosition);
            }
        }

        document.addEventListener('focusin', () => {
            scheduleAdjust();
            // Edge can report intermediate viewport sizes during IME animation.
            for (const delay of [100, 300, 600]) {
                window.setTimeout(scheduleAdjust, delay);
            }
        });
        document.addEventListener('focusout', () => {
            scheduleAdjust();
            window.setTimeout(scheduleAdjust, 150);
        });
        viewport.addEventListener('resize', scheduleAdjust);
        viewport.addEventListener('scroll', scheduleAdjust);
        window.addEventListener('resize', scheduleAdjust);
        window.addEventListener('orientationchange', () => {
            restoreForm();
            restorePanel();
            scheduleAdjust();
        });
        window.addEventListener('pagehide', () => {
            restoreForm();
            restorePanel();
        });
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
