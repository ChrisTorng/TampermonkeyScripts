// ==UserScript==
// @name         Translate Preformatted Text
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-09-10_1.3.2
// @description  Preserve inline code and math during automatic translation, add toggles for preformatted and code-quote blocks, and keep mobile Wikipedia sections visible.
// @author       Chris Torng
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const wrapperAttribute = 'data-tm-translatable-pre-wrapper';
    const convertedAttribute = 'data-tm-translatable-pre-converted';
    const inlineCodeAttribute = 'data-tm-translatable-inline-code';
    const inlineCodeOriginalAttribute = 'data-tm-translatable-inline-code-original';
    // MathJax removes preview nodes by recognizing their unmodified class name.
    // Protect only rendered output so the original TeX preview is not left visible.
    const mathSelectors = ['.MathJax', '.MathJax_Display', 'mjx-container'];
    const originalBlocks = new WeakMap();
    const isWikipedia = /(^|\.)wikipedia\.org$/i.test(location.hostname);

    const style = document.createElement('style');
    style.textContent = `
        [${wrapperAttribute}] {
            position: relative !important;
        }
        .tm-translate-pre-button {
            appearance: none !important;
            align-items: center !important;
            background: rgba(0, 0, 0, .35) !important;
            border: 0 !important;
            border-radius: 4px !important;
            box-shadow: none !important;
            color: rgba(255, 255, 255, .75) !important;
            cursor: pointer !important;
            display: inline-flex !important;
            font: 600 12px/1 system-ui, sans-serif !important;
            height: 24px !important;
            justify-content: center !important;
            min-height: 0 !important;
            min-width: 24px !important;
            opacity: .5 !important;
            padding: 0 5px !important;
            text-transform: none !important;
            transition: opacity .15s ease !important;
            user-select: none !important;
            width: auto !important;
            z-index: 2147483646 !important;
        }
        .tm-translate-pre-button:hover,
        .tm-translate-pre-button:focus-visible {
            opacity: .9 !important;
        }
        .tm-translate-pre-button[aria-pressed="true"] {
            background-color: rgba(34, 139, 34, .85) !important;
            color: #fff !important;
        }
        .tm-translate-pre-one {
            position: absolute !important;
            right: 6px !important;
            top: 6px !important;
        }
        #tm-translate-all-pre {
            z-index: 2147483647 !important;
        }
        [${convertedAttribute}] {
            box-sizing: border-box;
            font-family: monospace;
            overflow: auto;
            white-space: pre-wrap;
        }
        [${inlineCodeAttribute}] {
            display: inline;
            font-family: monospace;
            white-space: break-spaces;
        }
    `;
    (document.head || document.documentElement).appendChild(style);

    // Keep this shared floating-control contract synchronized as documented in AGENTS.md.
    function applyFloatingControlStyle(button, slot) {
        const styles = {
            appearance: 'none',
            position: 'absolute',
            top: `${70 + (slot * 44)}px`,
            right: 'auto',
            bottom: 'auto',
            left: 'calc(100vw - 44px)',
            display: 'inline-flex',
            'align-items': 'center',
            'justify-content': 'center',
            'box-sizing': 'border-box',
            width: '44px',
            'min-width': '44px',
            'max-width': '44px',
            height: '34px',
            'min-height': '34px',
            'max-height': '34px',
            margin: '0',
            opacity: '0.5',
            padding: '0',
            border: '0',
            'border-radius': '6px',
            'font-family': 'system-ui, sans-serif',
            'font-size': '15px',
            'line-height': '1',
            'text-align': 'center',
            'text-transform': 'none',
            'white-space': 'nowrap',
            cursor: 'move',
            'user-select': 'none',
            'touch-action': 'none',
            'box-shadow': '0 2px 6px rgba(0, 0, 0, 0.25)',
            'z-index': '2147483647',
        };
        Object.entries(styles).forEach(([property, value]) => button.style.setProperty(property, value, 'important'));
        button.setAttribute('data-tm-floating-control', String(slot));
    }

    const allButton = document.createElement('button');
    allButton.id = 'tm-translate-all-pre';
    allButton.className = 'tm-translate-pre-button';
    allButton.type = 'button';
    allButton.textContent = '譯∞';
    allButton.setAttribute('aria-label', 'Translate all preformatted blocks');
    allButton.title = 'Turn every preformatted block into translatable content';
    allButton.hidden = true;
    applyFloatingControlStyle(allButton, 3);
    allButton.style.setProperty('background-color', 'rgba(0, 0, 0, .35)', 'important');
    allButton.style.setProperty('color', 'rgba(255, 255, 255, .75)', 'important');

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

    const inlineCodeStyleProperties = [
        'background-color', 'background-image', 'border', 'border-radius', 'box-shadow',
        'color', 'display', 'font-family', 'font-size', 'font-style', 'font-weight',
        'letter-spacing', 'line-height', 'margin', 'padding', 'text-decoration',
        'text-transform', 'vertical-align', 'white-space', 'word-break',
    ];

    function preserveComputedStyle(source, target) {
        if (typeof window.getComputedStyle !== 'function') {
            return;
        }
        const computedStyle = window.getComputedStyle(source);
        if (!computedStyle || typeof computedStyle.getPropertyValue !== 'function') {
            return;
        }
        inlineCodeStyleProperties.forEach((property) => {
            const value = computedStyle.getPropertyValue(property);
            if (value) {
                target.style.setProperty(property, value);
            }
        });
    }

    function getProtectedInlineCode(target) {
        if (!target) {
            return null;
        }
        if (target.nodeType === 1) {
            if (target.hasAttribute(inlineCodeAttribute)) {
                return target;
            }
            return typeof target.closest === 'function' ? target.closest(`[${inlineCodeAttribute}]`) : null;
        }
        const parent = target.parentElement || target.parentNode;
        if (!parent) {
            return null;
        }
        if (parent.hasAttribute && parent.hasAttribute(inlineCodeAttribute)) {
            return parent;
        }
        return typeof parent.closest === 'function' ? parent.closest(`[${inlineCodeAttribute}]`) : null;
    }

    function restoreInlineCode(target) {
        const inlineCode = getProtectedInlineCode(target);
        if (!inlineCode) {
            return false;
        }
        const originalText = inlineCode.getAttribute(inlineCodeOriginalAttribute);
        if (originalText === null || inlineCode.textContent === originalText) {
            return false;
        }
        inlineCode.textContent = originalText;
        return true;
    }

    function makeInlineCodeTranslatable(code) {
        if (!code || !code.parentNode || code.closest('pre') || code.closest(`[${wrapperAttribute}]`) || code.hasAttribute(inlineCodeAttribute)) {
            return;
        }

        const replacement = document.createElement('span');
        const originalText = code.textContent;
        copyAttributes(code, replacement);
        replacement.setAttribute(inlineCodeAttribute, 'true');
        replacement.setAttribute(inlineCodeOriginalAttribute, originalText);
        replacement.setAttribute('translate', 'no');
        preserveComputedStyle(code, replacement);

        if (code.firstChild) {
            while (code.firstChild) {
                replacement.appendChild(code.firstChild);
            }
        } else {
            replacement.textContent = originalText;
        }
        code.parentNode.insertBefore(replacement, code);
        code.parentNode.removeChild(code);
    }

    function protectMath(root) {
        const mathElements = [];
        if (root.nodeType === 1) {
            const containingMath = mathSelectors
                .map((selector) => root.closest(selector))
                .find(Boolean);
            if (containingMath) {
                mathElements.push(containingMath);
            }
        }
        if (root.querySelectorAll) {
            mathElements.push(...root.querySelectorAll(mathSelectors.join(', ')));
        }
        new Set(mathElements).forEach((element) => {
            element.classList.add('notranslate');
            element.setAttribute('translate', 'no');
        });
    }

    function setButtonState(button, isActive, scope) {
        button.setAttribute('aria-pressed', String(isActive));
        button.style.setProperty('background-color', isActive ? 'rgba(34, 139, 34, .85)' : 'rgba(0, 0, 0, .35)', 'important');
        button.style.setProperty('color', isActive ? '#fff' : 'rgba(255, 255, 255, .75)', 'important');
        button.title = isActive
            ? `Show original ${scope} preformatted content`
            : `Make ${scope} preformatted content translatable`;
    }

    function updateAllButton() {
        const wrappers = Array.from(document.querySelectorAll(`[${wrapperAttribute}]`));
        const hasBlocks = wrappers.length > 0;
        const allConverted = hasBlocks && wrappers.every((wrapper) => wrapper.querySelector(`[${convertedAttribute}]`));
        allButton.hidden = !hasBlocks;
        allButton.style.setProperty('display', hasBlocks ? 'inline-flex' : 'none', 'important');
        setButtonState(allButton, allConverted, 'all');
    }

    function getBlockText(node) {
        if (node.nodeType === 3) {
            return node.nodeValue || node.textContent || '';
        }
        if (node.nodeType === 1 && node.tagName === 'BR') {
            return '\n';
        }
        const children = Array.from(node.childNodes || node.children || []);
        if (children.length === 0) {
            return node.textContent || '';
        }
        return children.map((child) => getBlockText(child)).join('');
    }

    function setConverted(wrapper, shouldConvert) {
        if (!wrapper) {
            return;
        }
        const current = wrapper.querySelector(shouldConvert ? 'pre, blockquote' : `[${convertedAttribute}]`);
        if (!current) {
            return;
        }
        const replacement = shouldConvert ? document.createElement('div') : originalBlocks.get(wrapper);
        if (!replacement) {
            return;
        }
        if (shouldConvert) {
            originalBlocks.set(wrapper, current);
            copyAttributes(current, replacement);
            replacement.setAttribute(convertedAttribute, 'true');
            replacement.textContent = getBlockText(current);
        } else {
            replacement.removeAttribute(convertedAttribute);
        }
        wrapper.insertBefore(replacement, current);
        wrapper.removeChild(current);
        setButtonState(wrapper.querySelector('.tm-translate-pre-one'), shouldConvert, 'this');
        updateAllButton();
    }

    function enhance(block) {
        if (!block || !block.parentNode || block.closest(`[${wrapperAttribute}]`)) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.setAttribute(wrapperAttribute, 'true');
        const parent = block.parentNode;
        parent.insertBefore(wrapper, block);
        parent.removeChild(block);
        wrapper.appendChild(block);

        const button = document.createElement('button');
        button.className = 'tm-translate-pre-button tm-translate-pre-one';
        button.type = 'button';
        button.textContent = '譯';
        button.setAttribute('aria-label', 'Translate this preformatted block');
        setButtonState(button, false, 'this');
        button.addEventListener('click', () => {
            setConverted(wrapper, !wrapper.querySelector(`[${convertedAttribute}]`));
        });
        wrapper.appendChild(button);
    }

    function scan(root = document) {
        revealWikipediaSections(root);
        protectMath(root);
        const containingQuote = root.nodeType === 1 && root.closest ? root.closest('blockquote') : null;
        if (isCodeQuote(containingQuote)) {
            enhance(containingQuote);
        }
        if (root.nodeType === 1 && (root.tagName === 'PRE' || isCodeQuote(root))) {
            enhance(root);
        }
        if (root.querySelectorAll) {
            root.querySelectorAll('pre').forEach(enhance);
            root.querySelectorAll('blockquote').forEach((blockquote) => {
                if (isCodeQuote(blockquote)) {
                    enhance(blockquote);
                }
            });
        }
        if (root.nodeType === 1 && root.tagName === 'CODE') {
            makeInlineCodeTranslatable(root);
        }
        if (root.querySelectorAll) {
            root.querySelectorAll('code').forEach(makeInlineCodeTranslatable);
        }
        updateAllButton();
    }

    function isCodeQuote(element) {
        if (!element || element.tagName !== 'BLOCKQUOTE' || element.querySelector('pre')) {
            return false;
        }
        const codeText = Array.from(element.querySelectorAll('code'))
            .map((code) => code.textContent.trim())
            .join(' ');
        return codeText.length >= 80;
    }

    function revealWikipediaSections(root) {
        if (!isWikipedia) {
            return;
        }

        const sections = [];
        if (root.nodeType === 1 && root.classList.contains('mw-collapsible-content')) {
            sections.push(root);
        }
        if (root.querySelectorAll) {
            sections.push(...root.querySelectorAll('.mw-collapsible-content'));
        }
        sections.forEach((section) => {
            section.hidden = false;
            section.removeAttribute('hidden');
        });
    }

    const dragThreshold = 3;
    let isDragging = false;
    let hasMoved = false;
    let initialX = 0;
    let initialY = 0;
    let startClientX = 0;
    let startClientY = 0;

    function getPointer(event) {
        return event.type.startsWith('touch') ? event.touches[0] : event;
    }

    function dragStart(event) {
        if (event.target !== allButton) {
            return;
        }
        const pointer = getPointer(event);
        isDragging = true;
        hasMoved = false;
        startClientX = pointer.clientX;
        startClientY = pointer.clientY;
        initialX = pointer.clientX - allButton.offsetLeft;
        initialY = pointer.clientY - allButton.offsetTop;
    }

    function drag(event) {
        if (!isDragging) {
            return;
        }
        const pointer = getPointer(event);
        const deltaX = Math.abs(pointer.clientX - startClientX);
        const deltaY = Math.abs(pointer.clientY - startClientY);
        if (!hasMoved && deltaX < dragThreshold && deltaY < dragThreshold) {
            return;
        }

        hasMoved = true;
        event.preventDefault();
        const maxX = Math.max(document.documentElement.clientWidth, window.innerWidth) - allButton.offsetWidth;
        const maxY = Math.max(document.documentElement.clientHeight, window.innerHeight) - allButton.offsetHeight;
        const currentX = Math.min(Math.max(pointer.clientX - initialX, 0), maxX);
        const currentY = Math.min(Math.max(pointer.clientY - initialY, 0), maxY);
        allButton.style.setProperty('left', `${currentX}px`, 'important');
        allButton.style.setProperty('top', `${currentY}px`, 'important');
        allButton.style.setProperty('right', 'auto', 'important');
        allButton.style.setProperty('bottom', 'auto', 'important');
    }

    function dragEnd() {
        isDragging = false;
    }

    allButton.addEventListener('mousedown', dragStart);
    allButton.addEventListener('touchstart', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);

    allButton.addEventListener('click', (event) => {
        if (hasMoved) {
            hasMoved = false;
            return;
        }
        event.preventDefault();
        const wrappers = Array.from(document.querySelectorAll(`[${wrapperAttribute}]`));
        const shouldConvert = !wrappers.every((wrapper) => wrapper.querySelector(`[${convertedAttribute}]`));
        wrappers.forEach((wrapper) => setConverted(wrapper, shouldConvert));
    });
    function mountAllButton() {
        if (document.body && !allButton.parentNode) {
            document.body.appendChild(allButton);
        }
    }

    mountAllButton();
    if (!document.body) {
        document.addEventListener('DOMContentLoaded', mountAllButton, { once: true });
    }
    scan();

    new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (restoreInlineCode(mutation.target)) {
                return;
            }
            if (mutation.type === 'attributes') {
                revealWikipediaSections(mutation.target);
                return;
            }
            mutation.addedNodes.forEach((node) => {
                restoreInlineCode(node);
                scan(node);
            });
        });
    }).observe(document.documentElement, {
        attributes: isWikipedia,
        attributeFilter: isWikipedia ? ['hidden'] : undefined,
        characterData: true,
        childList: true,
        subtree: true,
    });
})();
