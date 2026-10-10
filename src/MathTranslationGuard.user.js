// ==UserScript==
// @name         Math Translation Guard
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-10-10_1.0.0
// @description  Exclude rendered MathJax, KaTeX, and MathML from page translation without modifying math source text.
// @author       Chris Torng
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // Rendered output only. MathJax must remain free to discover and replace
    // TeX delimiters, previews, and its internal source <script> elements.
    const mathSelector = '.MathJax, .MathJax_Display, mjx-container, .katex, math';
    let registeredHub = null;

    function protect(element) {
        if (element.closest('.MathJax_Preview')) return;
        if (element.getAttribute('translate') !== 'no') {
            element.setAttribute('translate', 'no');
        }
        if (!element.classList.contains('notranslate')) {
            element.classList.add('notranslate');
        }
    }

    function scan(root) {
        if (!root) return;
        if (root.nodeType === 1) {
            if (root.matches(mathSelector)) protect(root);
            // MathJax may add children after creating its output container.
            const container = root.closest(mathSelector);
            if (container) protect(container);
        }
        if (root.querySelectorAll) {
            root.querySelectorAll(mathSelector).forEach(protect);
        }
    }

    function registerMathJax2() {
        const hub = window.MathJax && window.MathJax.Hub;
        if (!hub || !hub.Register || typeof hub.Register.MessageHook !== 'function' || registeredHub === hub) {
            return;
        }
        hub.Register.MessageHook('New Math', (message) => {
            // The signal contains the source element id, and the rendered frame
            // commonly has the same id with a '-Frame' suffix.
            const id = message && typeof message[1] === 'string' ? message[1] + '-Frame' : '';
            const frame = id ? document.getElementById(id) : null;
            if (frame) {
                scan(frame.parentElement || frame);
            } else {
                scan(document);
            }
        });
        registeredHub = hub;
    }

    const observer = new MutationObserver((records) => {
        for (const record of records) {
            if (record.type === 'attributes') {
                scan(record.target);
            } else {
                for (const node of record.addedNodes) scan(node);
            }
        }
        registerMathJax2();
    });

    // A class change can turn a preexisting element into a rendered math root.
    // Attribute writes above are idempotent, so the observer settles after one pass.
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
    });

    // MathJax 2 exposes a processing signal. MathJax 3/4 and KaTeX are handled
    // through rendered DOM discovery, avoiding invasive startup monkey-patches.
    document.addEventListener('load', (event) => {
        if (event.target && event.target.tagName === 'SCRIPT') registerMathJax2();
    }, true);
    document.addEventListener('DOMContentLoaded', () => {
        registerMathJax2();
        scan(document);
    }, { once: true });
    registerMathJax2();
    scan(document);
})();
