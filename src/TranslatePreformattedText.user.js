// ==UserScript==
// @name         Translate Preformatted Text
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-09-04_1.1.0
// @description  Add per-block and draggable page-wide toggles between original preformatted text and translatable content.
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

    function setConverted(wrapper, shouldConvert) {
        if (!wrapper) {
            return;
        }
        const current = wrapper.querySelector(shouldConvert ? 'pre' : `[${convertedAttribute}]`);
        if (!current) {
            return;
        }
        const replacement = document.createElement(shouldConvert ? 'div' : 'pre');
        copyAttributes(current, replacement);
        if (shouldConvert) {
            replacement.setAttribute(convertedAttribute, 'true');
        } else {
            replacement.removeAttribute(convertedAttribute);
        }
        replacement.textContent = current.textContent;
        wrapper.insertBefore(replacement, current);
        wrapper.removeChild(current);
        setButtonState(wrapper.querySelector('.tm-translate-pre-one'), shouldConvert, 'this');
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
        button.textContent = '譯';
        button.setAttribute('aria-label', 'Translate this preformatted block');
        setButtonState(button, false, 'this');
        button.addEventListener('click', () => {
            setConverted(wrapper, !wrapper.querySelector(`[${convertedAttribute}]`));
        });
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
    document.body.appendChild(allButton);
    scan();

    new MutationObserver((mutations) => {
        mutations.forEach((mutation) => mutation.addedNodes.forEach(scan));
    }).observe(document.body, { childList: true, subtree: true });
})();
