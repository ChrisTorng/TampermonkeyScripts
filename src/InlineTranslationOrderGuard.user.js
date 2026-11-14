// ==UserScript==
// @name         Inline Translation Order Guard
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-11-14_1.0.2
// @description  Keep translated inline code and math slots beside their original DOM anchors.
// @author       Chris Torng
// @match        *://*/*
// @exclude      *://christorng.idv.tw/*
// @exclude      *://*.christorng.idv.tw/*
// @exclude      https://alexwang.ai/*
// @exclude      https://*.alexwang.ai/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // Placement only: conversion and formula protection are owned by other scripts.
    const itemSelectors = ['[data-tm-translatable-inline-code]', '[data-tm-math-protected]'];
    const itemSelector = itemSelectors.join(', ');
    const anchorAttribute = 'data-tm-translation-order-anchor';
    const tracked = new WeakMap();
    const entries = new Set();

    function nextSiblingOf(anchor) {
        const parent = anchor.parentNode;
        if (!parent) return null;
        const children = parent.childNodes || parent.children || [];
        const index = Array.prototype.indexOf.call(children, anchor);
        return index < 0 ? null : children[index + 1] || null;
    }

    function track(element) {
        if (!element || element.nodeType !== 1 || !element.parentNode ||
            !itemSelectors.some((selector) => element.matches(selector)) || tracked.has(element)) return;
        // A MathJax output may be nested inside a previously anchored source
        // container. Never introduce competing anchors for one formula.
        if (element.parentElement && element.parentElement.closest('[data-tm-math-protected]')) return;
        if (element.closest('pre')) return;

        const anchor = document.createElement('span');
        anchor.setAttribute(anchorAttribute, 'true');
        anchor.setAttribute('translate', 'no');
        anchor.setAttribute('aria-hidden', 'true');
        anchor.style.setProperty('font-size', '0', 'important');
        anchor.style.setProperty('line-height', '0', 'important');
        anchor.textContent = '\u2060';
        element.parentNode.insertBefore(anchor, element);
        tracked.set(element, anchor);
        entries.add({ anchor, element });
    }

    function scan(root) {
        if (!root) return;
        if (root.nodeType === 1 && itemSelectors.some((selector) => root.matches(selector))) track(root);
        if (root.querySelectorAll) root.querySelectorAll(itemSelector).forEach(track);
    }

    function repair() {
        for (const entry of entries) {
            const { anchor, element } = entry;
            if (!anchor.isConnected || !element.isConnected) {
                if (anchor.isConnected && !element.isConnected) anchor.remove();
                entries.delete(entry);
                continue;
            }
            // Restore sibling position when Edge moves an inline element to a
            // paragraph tail. Do not move across parents: MathJax may legitimately
            // replace/reparent its output, and an anchor can be removed by Edge.
            if (anchor.parentNode === element.parentNode && nextSiblingOf(anchor) !== element) {
                const parent = anchor.parentNode;
                parent.removeChild(element);
                parent.insertBefore(element, nextSiblingOf(anchor));
            }
        }
    }

    const observer = new MutationObserver((records) => {
        for (const record of records) {
            if (record.type === 'attributes') {
                scan(record.target);
                continue;
            }
            for (const node of record.addedNodes) scan(node);
        }
        repair();
    });

    observer.observe(document.documentElement, {
        childList: true, subtree: true, attributes: true,
        attributeFilter: ['data-tm-math-protected', 'data-tm-translatable-inline-code']
    });
    scan(document.documentElement);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => scan(document.documentElement), { once: true });
    }
})();
