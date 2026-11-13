// ==UserScript==
// @name         Math Translation Guard
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-11-13_1.0.0
// @description  Keep MathJax, KaTeX and MathML formulas intact during browser translation without reordering prose.
// @author       Chris Torng
// @match        *://*/*
// @exclude      *://christorng.idv.tw/*
// @exclude      *://*.christorng.idv.tw/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // Formula protection only. Inline position repair belongs to
    // InlineTranslationOrderGuard.user.js, never to this userscript.
    const outputSelectors = ['.MathJax', '.MathJax_Display', 'mjx-container', '.katex', 'math'];
    const outputSelector = outputSelectors.join(', ');
    const sourceAttribute = 'data-tm-math-protected';
    const mathHosts = new Set(['alexwang.ai', 'blog.plover.com']);
    const isPlover = location.hostname === 'blog.plover.com';
    let sourceMathEnabled = mathHosts.has(location.hostname);

    function hasMathLoader(root) {
        const isLoader = (element) => {
            if (!element || !element.getAttribute) return false;
            const link = element.getAttribute('src') || element.getAttribute('href') || '';
            return /mathjax|katex/i.test(link);
        };
        if (isLoader(root)) return true;
        if (!root || !root.querySelectorAll) return false;
        return Array.from(root.querySelectorAll('script[src], link[href]')).some(isLoader);
    }

    function markMath(element, kind) {
        if (!element || element.nodeType !== 1) return;
        if (element.getAttribute(sourceAttribute) !== kind) element.setAttribute(sourceAttribute, kind);
        if (element.getAttribute('translate') !== 'no') element.setAttribute('translate', 'no');
        if (!element.classList.contains('notranslate')) element.classList.add('notranslate');
    }

    function protectOutput(element) {
        if (!element || element.nodeType !== 1 || !outputSelectors.some((selector) => element.matches(selector))) return;
        if (element.closest('.MathJax_Preview')) return;
        // Only protect the outermost rendered formula. Nested MathML is not a new slot.
        if (element.parentElement && outputSelectors.some((selector) => element.parentElement.closest(selector))) return;
        markMath(element, 'output');
    }

    function protectSourceText(textNode) {
        if (!sourceMathEnabled || !textNode || textNode.nodeType !== 3) return;
        const parent = textNode.parentElement;
        if (!parent || !parent.isConnected ||
            parent.closest('script, style, noscript, textarea, pre, code, option, svg, math, mjx-container, .katex, .MathJax, .MathJax_Preview, [data-tm-math-protected], [contenteditable="true"]')) return;

        const input = textNode.nodeValue || '';
        if (!input || input.length > 20000 || (!input.includes('$') && !input.includes('\\') && !input.includes('!!'))) return;

        // Retain delimiters for the site's own MathJax configuration. Inserting
        // MathJax 2-specific <script type="math/tex"> broke formula placement in
        // the older experiment and is intentionally not repeated here.
        const tokens = /\$\$[\s\S]{1,4000}?\$\$|\$[^\r\n$]{1,500}?\$|\\\([\s\S]{1,500}?\\\)|\\\[[\s\S]{1,4000}?\\\]|!![\s\S]{1,1000}?!!/g;
        const matches = [];
        for (const match of input.matchAll(tokens)) {
            const raw = match[0];
            if (raw.startsWith('!!') && !isPlover) continue;
            const preceding = input.slice(0, match.index).match(/\\+$/);
            if (preceding && preceding[0].length % 2 === 1) continue;
            matches.push(match);
        }
        if (!matches.length) return;

        let offset = 0;
        for (const match of matches) {
            if (match.index > offset) {
                parent.insertBefore(document.createTextNode(input.slice(offset, match.index)), textNode);
            }
            const formula = document.createElement('span');
            markMath(formula, 'source');
            formula.textContent = match[0];
            parent.insertBefore(formula, textNode);
            offset = match.index + match[0].length;
        }
        if (offset < input.length) {
            parent.insertBefore(document.createTextNode(input.slice(offset)), textNode);
        }
        parent.removeChild(textNode);
    }

    function scan(root) {
        if (!root) return;
        if (!sourceMathEnabled && hasMathLoader(root)) sourceMathEnabled = true;
        if (root.nodeType === 1) protectOutput(root);
        if (root.querySelectorAll) root.querySelectorAll(outputSelector).forEach(protectOutput);
        if (!sourceMathEnabled) return;
        if (root.nodeType === 3) {
            protectSourceText(root);
        } else if (root.nodeType === 1 || root.nodeType === 9) {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            const nodes = [];
            let node;
            while ((node = walker.nextNode())) nodes.push(node);
            nodes.forEach(protectSourceText);
        }
    }

    function scanAfterMathLoader(root) {
        const hadSourceMath = sourceMathEnabled;
        scan(root);
        if (!hadSourceMath && sourceMathEnabled) scan(document.documentElement);
    }

    const observer = new MutationObserver((records) => {
        for (const record of records) {
            if (record.type === 'characterData') {
                scan(record.target);
                continue;
            }
            if (record.type === 'attributes') {
                protectOutput(record.target);
                continue;
            }
            for (const node of record.addedNodes) scanAfterMathLoader(node);
        }
    });
    observer.observe(document.documentElement, {
        childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ['class']
    });
    scanAfterMathLoader(document.documentElement);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => scanAfterMathLoader(document.documentElement), { once: true });
    }
})();
