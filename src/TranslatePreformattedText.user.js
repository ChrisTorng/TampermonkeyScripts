// ==UserScript==
// @name         Translate Preformatted Text
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-09-01_1.0.0
// @description  Add per-block and page-wide buttons that turn preformatted text into translatable content.
// @author       Chris Torng
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const wrapperAttribute = 'data-tm-translatable-pre-wrapper';
    const convertedAttribute = 'data-tm-translatable-pre-converted';

    const style = document.createElement('style');
    style.textContent = `
        [${wrapperAttribute}] {
            position: relative !important;
        }
        .tm-translate-pre-button {
            appearance: none !important;
            background: #1565c0 !important;
            border: 1px solid rgba(255, 255, 255, .7) !important;
            border-radius: 6px !important;
            box-shadow: 0 1px 4px rgba(0, 0, 0, .35) !important;
            color: #fff !important;
            cursor: pointer !important;
            font: 600 13px/1.2 system-ui, sans-serif !important;
            padding: 6px 9px !important;
            text-transform: none !important;
            z-index: 2147483646 !important;
        }
        .tm-translate-pre-one {
            position: absolute !important;
            right: 6px !important;
            top: 6px !important;
        }
        #tm-translate-all-pre {
            position: fixed !important;
            right: 12px !important;
            top: 12px !important;
            z-index: 2147483647 !important;
        }
        [${convertedAttribute}] {
            box-sizing: border-box;
            font-family: monospace;
            overflow: auto;
            white-space: pre-wrap;
        }
    `;
    (document.head || document.documentElement).appendChild(style);

    const allButton = document.createElement('button');
    allButton.id = 'tm-translate-all-pre';
    allButton.className = 'tm-translate-pre-button';
    allButton.type = 'button';
    allButton.textContent = 'Translate all PRE';
    allButton.title = 'Turn every preformatted block into translatable content';
    allButton.hidden = true;

    function copyAttributes(source, target) {
        Array.from(source.attributes || []).forEach((attribute) => {
            if (Array.isArray(attribute)) {
                target.setAttribute(attribute[0], attribute[1]);
            } else {
                target.setAttribute(attribute.name, attribute.value);
            }
        });
        target.className = source.className;
        target.id = source.id;
    }

    function updateAllButton() {
        allButton.hidden = document.querySelectorAll(`[${wrapperAttribute}]`).length === 0;
    }

    function convert(wrapper) {
        if (!wrapper || !wrapper.parentNode) {
            return;
        }

        const pre = wrapper.querySelector('pre');
        if (!pre) {
            return;
        }

        const replacement = document.createElement('div');
        copyAttributes(pre, replacement);
        replacement.setAttribute(convertedAttribute, 'true');
        replacement.textContent = pre.textContent;
        wrapper.parentNode.insertBefore(replacement, wrapper);
        wrapper.parentNode.removeChild(wrapper);
        updateAllButton();
    }

    function enhance(pre) {
        if (!pre || !pre.parentNode || pre.closest(`[${wrapperAttribute}]`)) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.setAttribute(wrapperAttribute, 'true');
        const parent = pre.parentNode;
        parent.insertBefore(wrapper, pre);
        parent.removeChild(pre);
        wrapper.appendChild(pre);

        const button = document.createElement('button');
        button.className = 'tm-translate-pre-button tm-translate-pre-one';
        button.type = 'button';
        button.textContent = 'Translate PRE';
        button.title = 'Turn this preformatted block into translatable content';
        button.addEventListener('click', () => convert(wrapper));
        wrapper.appendChild(button);
    }

    function scan(root = document) {
        if (root.nodeType === 1 && root.tagName === 'PRE') {
            enhance(root);
        }
        if (root.querySelectorAll) {
            root.querySelectorAll('pre').forEach(enhance);
        }
        updateAllButton();
    }

    allButton.addEventListener('click', () => {
        Array.from(document.querySelectorAll(`[${wrapperAttribute}]`)).forEach(convert);
    });
    document.body.appendChild(allButton);
    scan();

    new MutationObserver((mutations) => {
        mutations.forEach((mutation) => mutation.addedNodes.forEach(scan));
    }).observe(document.body, { childList: true, subtree: true });
})();
