// ==UserScript==
// @name         Fix Floating Elements
// @namespace    http://tampermonkey.net/
// @version      2025-11-10_1.0.0
// @description  Force floating UI elements to scroll with the page for distraction-free reading
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/FixFloating.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/FixFloating.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=antikythera.org
// @match        https://whatisintelligence.antikythera.org/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    if (window.self !== window.top) {
        return;
    }

    const domainRules = [
        {
            test: hostname => hostname === 'whatisintelligence.antikythera.org',
            ignoreSelectors: ['html', 'body', 'head', 'script', 'style', 'link', 'meta']
        }
    ];

    const fallbackRule = {
        test: () => false,
        ignoreSelectors: []
    };

    const currentRule = domainRules.find(rule => {
        try {
            return rule.test(window.location.hostname);
        } catch (error) {
            console.warn('[FixFloating] Failed to evaluate rule.test()', error);
            return false;
        }
    }) || fallbackRule;

    if (!currentRule.test(window.location.hostname)) {
        return;
    }

    const IGNORE_MATCHERS = currentRule.ignoreSelectors || [];
    const PROCESSED_FLAG = 'data-fix-floating-processed';

    const STYLE_OVERRIDES = [
        ['position', 'static'],
        ['top', 'auto'],
        ['bottom', 'auto'],
        ['left', 'auto'],
        ['right', 'auto'],
        ['inset', 'auto'],
        ['z-index', 'auto'],
        ['transform', 'none']
    ];

    function isHTMLElement(node) {
        return node instanceof HTMLElement;
    }

    function shouldIgnore(element) {
        return IGNORE_MATCHERS.some(selector => {
            try {
                return element.matches(selector);
            } catch (error) {
                console.warn('[FixFloating] Invalid selector in ignore list:', selector, error);
                return false;
            }
        });
    }

    function neutralizeFloating(element) {
        if (!isHTMLElement(element)) {
            return;
        }

        if (shouldIgnore(element)) {
            return;
        }

        const computedPosition = window.getComputedStyle(element).position;
        if (computedPosition !== 'fixed' && computedPosition !== 'sticky') {
            return;
        }

        element.setAttribute(PROCESSED_FLAG, 'true');

        STYLE_OVERRIDES.forEach(([property, value]) => {
            element.style.setProperty(property, value, 'important');
        });
    }

    function processNode(node) {
        if (!node) {
            return;
        }

        if (isHTMLElement(node)) {
            neutralizeFloating(node);
        }

        if (node.querySelectorAll) {
            node.querySelectorAll('*').forEach(neutralizeFloating);
        }
    }

    function handleMutations(mutationList) {
        mutationList.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(processNode);
            }
            if (mutation.type === 'attributes' && isHTMLElement(mutation.target)) {
                neutralizeFloating(mutation.target);
            }
        });
    }

    function init() {
        const rootNode = document.body || document.documentElement;
        processNode(rootNode);

        const observer = new MutationObserver(handleMutations);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        window.addEventListener('resize', () => {
            document.querySelectorAll(`[${PROCESSED_FLAG}]`).forEach(neutralizeFloating);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
