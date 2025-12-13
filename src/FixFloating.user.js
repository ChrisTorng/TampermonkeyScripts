// ==UserScript==
// @name         Fix Floating Elements
// @namespace    http://tampermonkey.net/
// @version      2025-12-13_1.0.2
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
            ignoreSelectors: ['html', 'body', 'head', 'script', 'style', 'link', 'meta'],
            treatAbsoluteAsFloating: true
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
    const treatAbsoluteAsFloating = currentRule.treatAbsoluteAsFloating === true;
    const PROCESSED_FLAG = 'data-fix-floating-processed';
    const observedTargets = new WeakSet();
    let observer = null;

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
        const isFloatingPosition = computedPosition === 'fixed' || computedPosition === 'sticky';
        const isAbsoluteFloating = treatAbsoluteAsFloating && computedPosition === 'absolute';

        if (!isFloatingPosition && !isAbsoluteFloating) {
            return;
        }

        element.setAttribute(PROCESSED_FLAG, 'true');

        STYLE_OVERRIDES.forEach(([property, value]) => {
            element.style.setProperty(property, value, 'important');
        });
    }

    function observeTarget(target) {
        if (!observer || !target || observedTargets.has(target)) {
            return;
        }

        observer.observe(target, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        observedTargets.add(target);
    }

    function processRoot(root) {
        if (!root) {
            return;
        }

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

        if (isHTMLElement(root)) {
            neutralizeFloating(root);
        }

        if (root instanceof ShadowRoot) {
            observeTarget(root);
        }

        let node = walker.nextNode();
        while (node) {
            const element = node;

            neutralizeFloating(element);

            if (element.shadowRoot) {
                processRoot(element.shadowRoot);
            }

            node = walker.nextNode();
        }
    }

    function handleMutations(mutationList) {
        mutationList.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(processRoot);
            }

            if (mutation.type === 'attributes' && isHTMLElement(mutation.target)) {
                neutralizeFloating(mutation.target);

                if (mutation.target.shadowRoot) {
                    processRoot(mutation.target.shadowRoot);
                }
            }
        });
    }

    function init() {
        observer = new MutationObserver(handleMutations);

        const rootNode = document.documentElement || document.body;

        observeTarget(rootNode);
        processRoot(rootNode);

        observeTarget(document.documentElement);

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
