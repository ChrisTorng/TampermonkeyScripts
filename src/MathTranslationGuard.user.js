// ==UserScript==
// @name         Math Translation Guard
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-11-14_1.1.0
// @description  Keep an untranslated original alongside translated math paragraphs on Alex Wang; preserve MathJax elsewhere.
// @author       Chris Torng
// @match        *://*/*
// @exclude      *://christorng.idv.tw/*
// @exclude      *://*.christorng.idv.tw/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // Alex Wang uses MathJax 4. Isolating each formula with translate=no
    // demonstrably moves formulas to the paragraph tail in native Android Edge.
    // The supported safe fallback is one translatable paragraph AND a complete
    // original sibling, protected as a whole translation unit. Neither sibling
    // has its MathJax formula children reparented or reordered by this script.
    if (location.hostname === 'alexwang.ai' || location.hostname.endsWith('.alexwang.ai')) {
        const originalAttr = 'data-tm-math-dual-original';
        const referenceAttr = 'data-tm-math-dual-reference';
        const refClass = 'tm-math-original-reference';
        const sourcePattern = /\$\$[\s\S]+?\$\$|\$[^\r\n$]{1,500}\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]/;
        const mathOutputSelector = 'mjx-container, .MathJax, .katex, math';
        const pendingTypeset = new WeakSet();

        function containsMath(paragraph) {
            if (!paragraph || paragraph.nodeType !== 1 || paragraph.tagName !== 'P') return false;
            if (paragraph.querySelector(mathOutputSelector)) return true;
            return sourcePattern.test(paragraph.textContent || '');
        }

        function cleanClonedIds(clone) {
            if (clone.hasAttribute('id')) clone.removeAttribute('id');
            clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
        }

        function scheduleTypeset(originalCopy) {
            if (pendingTypeset.has(originalCopy)) return;
            pendingTypeset.add(originalCopy);
            const tryTypeset = () => {
                if (!originalCopy.isConnected ||
                    originalCopy.querySelector(mathOutputSelector) ||
                    !sourcePattern.test(originalCopy.textContent || '')) return;
                const mathjax = window.MathJax;
                if (!mathjax || typeof mathjax.typesetPromise !== 'function') return;
                Promise.resolve(mathjax.typesetPromise([originalCopy])).catch((error) => {
                    console.warn('Math Translation Guard: cannot typeset untranslated copy', error);
                });
            };
            // MathJax normally typesets the whole document; only assist if the
            // duplicated source was inserted after the initial typesetting pass.
            const startup = window.MathJax?.startup?.promise;
            if (startup && typeof startup.then === 'function') {
                Promise.resolve(startup).then(tryTypeset).catch(() => {});
            } else {
                document.addEventListener('load', tryTypeset, { once: true });
                window.addEventListener('load', tryTypeset, { once: true });
            }
        }

        function cloneMathParagraph(paragraph) {
            if (!paragraph || !paragraph.isConnected || !paragraph.parentElement ||
                paragraph.hasAttribute(originalAttr) ||
                paragraph.closest('[' + referenceAttr + ']') ||
                paragraph.closest('script, style, noscript, textarea, pre, [contenteditable="true"]') ||
                !containsMath(paragraph)) return;

            // Mark first so mutations from insertion cannot recursively clone.
            paragraph.setAttribute(originalAttr, 'true');
            const wrapper = document.createElement('div');
            wrapper.setAttribute(referenceAttr, 'true');
            wrapper.setAttribute('translate', 'no');
            wrapper.className = refClass;
            wrapper.style.cssText = 'border-left:2px solid #788da0;padding:4px 0 4px 10px;margin:9px 0 16px;opacity:.9;';
            const title = document.createElement('div');
            title.setAttribute('translate', 'no');
            title.textContent = '原文參考（數學式保留）';
            title.style.cssText = 'font:12px/1.5 system-ui,sans-serif;color:inherit;opacity:.75;margin-bottom:3px;';
            const copy = paragraph.cloneNode(true);
            copy.removeAttribute(originalAttr);
            cleanClonedIds(copy);
            copy.setAttribute('translate', 'no');
            copy.classList.add('notranslate');
            // Keep the complete paragraph as a single untranslated unit.
            // Do NOT insert protected spans around individual math expressions.
            wrapper.appendChild(title);
            wrapper.appendChild(copy);
            paragraph.parentNode.insertBefore(wrapper, paragraph.nextSibling);
            scheduleTypeset(copy);
        }

        function scanParagraphs(root) {
            if (!root) return;
            if (root.nodeType === 1) {
                if (root.matches('p')) cloneMathParagraph(root);
                const parent = root.closest('p');
                if (parent) cloneMathParagraph(parent);
            }
            if (root.querySelectorAll) root.querySelectorAll('p').forEach(cloneMathParagraph);
        }

        function startDualCopies() {
            scanParagraphs(document.documentElement);
            const observer = new MutationObserver((records) => {
                for (const record of records) {
                    if (record.type === 'characterData') {
                        scanParagraphs(record.target.parentElement);
                    } else {
                        for (const node of record.addedNodes) scanParagraphs(node);
                    }
                }
            });
            observer.observe(document.documentElement, {
                subtree: true, childList: true, characterData: true
            });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startDualCopies, { once: true });
        } else {
            startDualCopies();
        }
        return;
    }

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
