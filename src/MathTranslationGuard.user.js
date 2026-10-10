// ==UserScript==
// @name         Math Translation Guard
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-10-11_1.1.0
// @description  Protect rendered math and preserve Plover TeX sources before browser translation without altering surrounding prose.
// @author       Chris Torng
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // Rendered output only. MathJax must remain free to discover and replace
    // TeX delimiters, previews, and its internal source <script> elements.
    const mathSelectors = ['.MathJax', '.MathJax_Display', 'mjx-container', '.katex', 'math'];
    let registeredHub = null;
    const isPlover = location.hostname === 'blog.plover.com';
    const pendingTypeset = new Set();

    // Plover configures MathJax 2 with !! delimiters. Convert complete
    // expressions into MathJax's native inert script form before browser
    // translation can modify the TeX or insert spaces into its delimiters.
    // Never guess math syntax on unrelated websites.
    function preservePloverSource(textNode) {
        if (!isPlover || !textNode || textNode.nodeType !== 3) return;
        const parent = textNode.parentElement;
        if (!parent || !parent.isConnected) return;
        const excluded = ['script', 'style', 'textarea', 'pre', 'code',
            '.MathJax', '.MathJax_Preview', 'mjx-container', '.katex', 'math'];
        if (excluded.some((selector) => parent.closest(selector))) return;
        const source = textNode.nodeValue || '';
        const matches = Array.from(source.matchAll(/!!([\s\S]+?)!!/g));
        if (!matches.length) return;

        let offset = 0;
        let converted = false;
        for (const match of matches) {
            if (!match[1].trim()) continue;
            if (match.index > offset) {
                parent.insertBefore(document.createTextNode(source.slice(offset, match.index)), textNode);
            }

            // This is the normal MathJax 2 representation. Leave the preview
            // class name unchanged so MathJax can recognize and remove it.
            const preview = document.createElement('span');
            preview.className = 'MathJax_Preview';
            preview.setAttribute('translate', 'no');
            preview.textContent = match[1];
            const mathSource = document.createElement('script');
            mathSource.type = 'math/tex';
            mathSource.textContent = match[1];
            parent.insertBefore(preview, textNode);
            parent.insertBefore(mathSource, textNode);
            offset = match.index + match[0].length;
            converted = true;
        }
        if (!converted) return;
        if (offset < source.length) {
            parent.insertBefore(document.createTextNode(source.slice(offset)), textNode);
        }
        parent.removeChild(textNode);
        pendingTypeset.add(parent);
    }

    function scanPloverSources(root) {
        if (!isPlover || !root) return;
        if (root.nodeType === 3) {
            preservePloverSource(root);
            return;
        }
        if (!root.querySelectorAll) return;
        // Snapshot candidates before making changes to the tree.
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const candidates = [];
        let node;
        while ((node = walker.nextNode())) candidates.push(node);
        candidates.forEach(preservePloverSource);
    }

    function flushTypeset() {
        const hub = window.MathJax && window.MathJax.Hub;
        if (!hub || typeof hub.Queue !== 'function') return;
        for (const parent of pendingTypeset) {
            if (parent.isConnected) hub.Queue(['Typeset', hub, parent]);
        }
        pendingTypeset.clear();
    }


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
            if (mathSelectors.some((selector) => root.matches(selector))) protect(root);
            // Cover each enclosing formula root, including nested MathJax display wrappers.
            for (const selector of mathSelectors) {
                const container = root.closest(selector);
                if (container) protect(container);
            }
        }
        if (root.querySelectorAll) {
            root.querySelectorAll(mathSelectors.join(', ')).forEach(protect);
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
            } else if (record.type === 'characterData') {
                scanPloverSources(record.target);
            } else {
                for (const node of record.addedNodes) {
                    scanPloverSources(node);
                    scan(node);
                }
            }
        }
        registerMathJax2();
        flushTypeset();
    });

    // A class change can turn a preexisting element into a rendered math root.
    // Attribute writes above are idempotent, so the observer settles after one pass.
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
        characterData: isPlover,
    });

    // MathJax 2 exposes a processing signal. MathJax 3/4 and KaTeX are handled
    // through rendered DOM discovery, avoiding invasive startup monkey-patches.
    document.addEventListener('load', (event) => {
        if (event.target && event.target.tagName === 'SCRIPT') {
            registerMathJax2();
            flushTypeset();
        }
    }, true);
    document.addEventListener('DOMContentLoaded', () => {
        registerMathJax2();
        scanPloverSources(document);
        scan(document);
        flushTypeset();
    }, { once: true });
    registerMathJax2();
    scanPloverSources(document);
    scan(document);
    flushTypeset();
})();
