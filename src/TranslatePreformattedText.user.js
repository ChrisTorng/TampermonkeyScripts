// ==UserScript==
// @name         Translate Preformatted Text
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-10-04_1.6.0
// @description  Translate code blocks with per-block controls and a shared-menu page action; improve inline code, Mastodon, and Wikipedia translation.
// @author       Chris Torng
// @match        *://*/*
// @exclude      *://christorng.idv.tw/*
// @exclude      *://*.christorng.idv.tw/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // BEGIN SHARED FLOATING MENU
    // Shared floating menu source. Run `node scripts/sync-floating-menu.js` after editing.
    const FLOATING_MENU_ID = 'tm-shared-floating-menu';
    const FLOATING_MENU_STORAGE = 'tm-floating-menu-v2:' + window.location.hostname.toLowerCase();
    const FLOATING_MENU_ORDER = ['archive', 'mobile', 'dark', 'translate'];
    const FLOATING_MENU_INSET = 16;

    function floatingMenuSettings() {
        try {
            return JSON.parse(window.localStorage.getItem(FLOATING_MENU_STORAGE)) || {};
        } catch (_) {
            return {};
        }
    }

    function floatingMenuSave(settings) {
        try {
            window.localStorage.setItem(FLOATING_MENU_STORAGE, JSON.stringify(settings));
        } catch (_) {
            // The menu still works when site storage is unavailable.
        }
    }

    function floatingMenuForbiddenHost() {
        const host = window.location.hostname.toLowerCase();
        return host === 'christorng.idv.tw' || host.endsWith('.christorng.idv.tw');
    }

    function floatingMenuFolderPath() {
        const path = window.location.pathname || '/';
        if (path.endsWith('/')) return path;
        const slash = path.lastIndexOf('/');
        return path.slice(0, slash + 1) || '/';
    }

    function floatingMenuPageKey() {
        return `${window.location.pathname}${window.location.search}`;
    }

    function floatingMenuDisabled() {
        const settings = floatingMenuSettings();
        return floatingMenuForbiddenHost()
            || settings.disabledDomain === true
            || (settings.disabledPaths || []).includes(floatingMenuFolderPath())
            || (settings.disabledPages || []).includes(floatingMenuPageKey());
    }

    function floatingMenuCollapse(root) {
        root.setAttribute('data-floating-expanded', 'false');
        floatingMenuRender(root);
    }

    function floatingMenuRender(root) {
        const toggle = root.querySelector('[data-floating-toggle]');
        const close = root.querySelector('[data-floating-close]');
        const dialog = root.querySelector('[data-floating-dialog]');
        const currentButtons = Array.from(root.querySelectorAll('[data-floating-tool]'));
        const buttons = [...currentButtons].sort((a, b) => FLOATING_MENU_ORDER.indexOf(a.getAttribute('data-floating-tool')) - FLOATING_MENU_ORDER.indexOf(b.getAttribute('data-floating-tool')));
        if (buttons.some((button, index) => button !== currentButtons[index])) {
            buttons.forEach((button) => {
                root.removeChild(button);
                root.appendChild(button);
            });
        }
        const available = buttons.some((button) => button.getAttribute('data-floating-available') === 'true');
        root.hidden = !available;
        const expanded = root.getAttribute('data-floating-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(expanded));
        close.hidden = !expanded || !dialog.hidden;
        root.setAttribute('data-floating-active', String(expanded || !dialog.hidden));
        buttons.forEach((button) => {
            button.hidden = !expanded || !dialog.hidden || button.getAttribute('data-floating-available') !== 'true';
        });
    }

    function floatingMenuRoot() {
        let root = document.getElementById(FLOATING_MENU_ID);
        if (root) return root;

        const style = document.createElement('style');
        style.id = FLOATING_MENU_ID + '-style';
        style.textContent = `
            #${FLOATING_MENU_ID} { --tm-control-size: 40px; --tm-control-height: 36px; position: fixed !important; top: 70px !important; right: ${FLOATING_MENU_INSET}px !important; left: auto !important; z-index: 2147483647 !important; width: var(--tm-control-size) !important; display: flex !important; flex-direction: column !important; align-items: center !important; gap: 5px !important; margin: 0 !important; padding: 0 !important; opacity: .42 !important; transition: opacity .16s ease !important; isolation: isolate !important; }
            #${FLOATING_MENU_ID}[data-floating-active="true"], #${FLOATING_MENU_ID}:hover, #${FLOATING_MENU_ID}:focus-within { opacity: 1 !important; }
            #${FLOATING_MENU_ID}[hidden], #${FLOATING_MENU_ID} button[hidden], #${FLOATING_MENU_ID} [data-floating-dialog][hidden] { display: none !important; }
            #${FLOATING_MENU_ID} button { appearance: none !important; display: block !important; box-sizing: border-box !important; width: var(--tm-control-size) !important; min-width: var(--tm-control-size) !important; max-width: var(--tm-control-size) !important; height: var(--tm-control-height) !important; min-height: var(--tm-control-height) !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 6px !important; box-shadow: 0 2px 6px rgba(0,0,0,.25) !important; background: rgba(0,0,0,.62) !important; color: #fff !important; font: 600 17px/var(--tm-control-height) system-ui,sans-serif !important; text-align: center !important; cursor: pointer !important; opacity: 1 !important; user-select: none !important; touch-action: none !important; }
            #${FLOATING_MENU_ID} button[aria-pressed="true"] { background: rgba(34,139,34,.92) !important; color: white !important; }
            #${FLOATING_MENU_ID} [data-floating-close] { position: absolute !important; top: calc(-1 * var(--tm-control-height) - 5px) !important; right: 0 !important; }
            #${FLOATING_MENU_ID} [data-floating-toggle] { cursor: move !important; }
            #${FLOATING_MENU_ID} [data-floating-dialog] { position: absolute !important; top: 0 !important; right: 0 !important; width: min(290px, calc(100vw - 24px)) !important; box-sizing: border-box !important; margin: 0 !important; padding: 14px !important; border: 1px solid #777 !important; border-radius: 9px !important; box-shadow: 0 5px 18px rgba(0,0,0,.4) !important; background: #fff !important; color: #111 !important; font: 15px/1.4 system-ui,sans-serif !important; }
            #${FLOATING_MENU_ID} [data-floating-dialog] p { margin: 0 0 10px !important; padding: 0 !important; }
            #${FLOATING_MENU_ID} [data-floating-dialog] button { width: 100% !important; max-width: none !important; margin-top: 7px !important; background: #444 !important; }
            @media (pointer: coarse) { #${FLOATING_MENU_ID} { --tm-control-size: 48px; --tm-control-height: 44px; } }
        `;
        (document.head || document.documentElement).appendChild(style);
        root = document.createElement('div');
        root.id = FLOATING_MENU_ID;
        root.hidden = true;
        root.setAttribute('data-floating-expanded', 'false');
        root.setAttribute('data-floating-active', 'false');

        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = '×';
        close.title = 'Hide floating tools';
        close.setAttribute('aria-label', close.title);
        close.setAttribute('data-floating-close', 'true');
        close.hidden = true;
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.textContent = '≡';
        toggle.title = 'Floating tools';
        toggle.setAttribute('aria-label', toggle.title);
        toggle.setAttribute('data-floating-toggle', 'true');
        const dialog = document.createElement('div');
        dialog.setAttribute('data-floating-dialog', 'true');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-label', 'Hide floating tools');
        dialog.hidden = true;
        const question = document.createElement('p');
        question.textContent = 'Where should floating tools be hidden?';
        dialog.appendChild(question);
        [
            ['page', 'This page'],
            ['path', 'This folder path'],
            ['domain', 'This entire domain'],
            ['cancel', 'Cancel'],
        ].forEach(([scope, label]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = label;
            button.setAttribute('data-floating-hide-scope', scope);
            dialog.appendChild(button);
        });
        root.appendChild(close);
        root.appendChild(toggle);
        root.appendChild(dialog);
        document.documentElement.appendChild(root);

        function viewportMetrics() {
            const viewport = window.visualViewport;
            return {
                left: viewport ? viewport.offsetLeft : 0,
                top: viewport ? viewport.offsetTop : 0,
                width: viewport ? viewport.width : window.innerWidth,
                height: viewport ? viewport.height : window.innerHeight,
                scale: viewport ? viewport.scale : 1,
            };
        }
        function controlWidth() {
            return root.offsetWidth || 40;
        }
        function keepInViewport() {
            const viewport = viewportMetrics();
            const width = controlWidth();
            const height = root.offsetHeight || 36;
            const currentLeft = root.style.left ? parseFloat(root.style.left) : viewport.left + viewport.width - width - FLOATING_MENU_INSET;
            const currentTop = root.style.top ? parseFloat(root.style.top) : viewport.top + 70;
            const x = Math.max(viewport.left + 4, Math.min(currentLeft, viewport.left + viewport.width - width - 4));
            const y = Math.max(viewport.top + 4, Math.min(currentTop, viewport.top + viewport.height - height - 4));
            root.style.setProperty('left', `${x}px`, 'important');
            root.style.setProperty('top', `${y}px`, 'important');
            root.style.setProperty('right', 'auto', 'important');
            const needsLargerControls = viewport.scale < 0.9 || window.devicePixelRatio < 0.9;
            root.style.setProperty('--tm-control-size', needsLargerControls ? '52px' : '40px', 'important');
            root.style.setProperty('--tm-control-height', needsLargerControls ? '48px' : '36px', 'important');
        }
        const settings = floatingMenuSettings();
        if (Number.isFinite(settings.x) && Number.isFinite(settings.y)) {
            root.style.setProperty('left', `${settings.x}px`, 'important');
            root.style.setProperty('top', `${settings.y}px`, 'important');
        }
        keepInViewport();

        let dragging = false;
        let moved = false;
        let startX = 0;
        let startY = 0;
        let originX = 0;
        let originY = 0;
        const pointer = (event) => event.touches ? event.touches[0] : event;
        const onMove = (event) => {
            if (!dragging) return;
            const point = pointer(event);
            if (!moved && Math.abs(point.clientX - startX) < 3 && Math.abs(point.clientY - startY) < 3) return;
            moved = true;
            event.preventDefault();
            const viewport = viewportMetrics();
            const x = Math.max(viewport.left + 4, Math.min(originX + point.clientX - startX, viewport.left + viewport.width - controlWidth() - 4));
            const y = Math.max(viewport.top + 4, Math.min(originY + point.clientY - startY, viewport.top + viewport.height - (root.offsetHeight || 36) - 4));
            root.style.setProperty('left', `${x}px`, 'important');
            root.style.setProperty('top', `${y}px`, 'important');
        };
        const onEnd = () => {
            if (!dragging) return;
            dragging = false;
            if (moved) {
                const next = floatingMenuSettings();
                next.x = parseFloat(root.style.left);
                next.y = parseFloat(root.style.top);
                floatingMenuSave(next);
            }
        };
        const onStart = (event) => {
            const point = pointer(event);
            dragging = true;
            moved = false;
            startX = point.clientX;
            startY = point.clientY;
            originX = parseFloat(root.style.left);
            originY = parseFloat(root.style.top);
        };
        toggle.addEventListener('mousedown', onStart);
        toggle.addEventListener('touchstart', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);
        toggle.addEventListener('click', (event) => {
            event.preventDefault();
            if (moved) { moved = false; return; }
            dialog.hidden = true;
            root.setAttribute('data-floating-expanded', String(root.getAttribute('data-floating-expanded') !== 'true'));
            floatingMenuRender(root);
        });
        close.addEventListener('click', (event) => {
            dialog.hidden = false;
            floatingMenuRender(root);
        });
        dialog.addEventListener('click', (event) => {
            const scope = event.target.getAttribute && event.target.getAttribute('data-floating-hide-scope');
            if (!scope) return;
            if (scope === 'cancel') {
                dialog.hidden = true;
                floatingMenuRender(root);
                return;
            }
            const next = floatingMenuSettings();
            if (scope === 'domain') next.disabledDomain = true;
            if (scope === 'path') next.disabledPaths = [...new Set([...(next.disabledPaths || []), floatingMenuFolderPath()])];
            if (scope === 'page') next.disabledPages = [...new Set([...(next.disabledPages || []), floatingMenuPageKey()])];
            floatingMenuSave(next);
            window.location.reload();
        });
        document.addEventListener('pointerdown', (event) => {
            if (root.getAttribute('data-floating-expanded') === 'true' && !root.contains(event.target)) floatingMenuCollapse(root);
        });
        window.addEventListener('resize', keepInViewport);
        window.addEventListener('scroll', keepInViewport);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', keepInViewport);
            window.visualViewport.addEventListener('scroll', keepInViewport);
        }
        return root;
    }

    function registerFloatingButton(key, button, available = true) {
        if (floatingMenuDisabled()) return;
        const root = floatingMenuRoot();
        button.setAttribute('data-floating-tool', key);
        button.setAttribute('data-floating-available', String(available));
        button.addEventListener('click', () => floatingMenuCollapse(root));
        root.appendChild(button);
        floatingMenuRender(root);
    }

    function setFloatingButtonAvailable(button, available) {
        if (!button.parentNode || button.parentNode.id !== FLOATING_MENU_ID) return;
        button.setAttribute('data-floating-available', String(available));
        floatingMenuRender(button.parentNode);
    }
    // END SHARED FLOATING MENU

    if (floatingMenuForbiddenHost()) return;

    const wrapperAttribute = 'data-tm-translatable-pre-wrapper';
    const convertedAttribute = 'data-tm-translatable-pre-converted';
    const inlineCodeAttribute = 'data-tm-translatable-inline-code';
    const inlineCodeOriginalAttribute = 'data-tm-translatable-inline-code-original';
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

    const allButton = document.createElement('button');
    allButton.id = 'tm-translate-all-pre';
    allButton.className = 'tm-translate-pre-button';
    allButton.type = 'button';
    allButton.textContent = '譯∞';
    allButton.setAttribute('aria-label', 'Translate all preformatted blocks');
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
        setFloatingButtonAvailable(allButton, hasBlocks);
        setButtonState(allButton, allConverted, 'all');
    }

    function getBlockText(node) {
        if (node.nodeType === 1 && node.classList.contains('react-code-lines')) {
            return Array.from(node.querySelectorAll('[data-testid="code-cell"]'))
                .map((line) => line.textContent)
                .join('\n');
        }
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
        const current = shouldConvert ? originalBlocks.get(wrapper) : wrapper.querySelector(`[${convertedAttribute}]`);
        if (!current) {
            return;
        }
        const replacement = shouldConvert ? document.createElement('div') : originalBlocks.get(wrapper);
        if (!replacement) {
            return;
        }
        if (shouldConvert) {
            copyAttributes(current, replacement);
            replacement.removeAttribute('translate');
            replacement.classList.remove('notranslate');
            replacement.classList.remove('react-code-lines');
            replacement.removeAttribute('data-type');
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
        block.setAttribute('translate', 'no');
        wrapper.appendChild(block);
        originalBlocks.set(wrapper, block);

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
        enableMastodonTranslation(root);
        revealWikipediaSections(root);
        if (root.nodeType === 1 && isSpecialBlock(root)) {
            enhance(root);
        }
        if (root.querySelectorAll) {
            root.querySelectorAll('.react-code-lines, [data-type="mermaid"]').forEach((block) => {
                if (isSpecialBlock(block)) {
                    enhance(block);
                }
            });
        }
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

    function enableMastodonTranslation(root) {
        const candidates = [];
        if (root.nodeType === 1 && root.id === 'mastodon' && root.classList.contains('app-holder')) {
            candidates.push(root);
        }
        if (root.querySelectorAll) {
            candidates.push(...root.querySelectorAll('#mastodon.app-holder'));
        }
        candidates.forEach((app) => {
            app.classList.remove('notranslate');
            app.setAttribute('translate', 'yes');
        });
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

    function isSpecialBlock(element) {
        if (!element) {
            return false;
        }
        if (element.classList.contains('react-code-lines')) {
            return Boolean(element.querySelector('[data-testid="code-cell"]'));
        }
        return element.getAttribute('data-type') === 'mermaid'
            && Array.from(element.querySelectorAll('pre'))
                .some((pre) => pre.getAttribute('aria-label') === 'Raw mermaid code');
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

    allButton.addEventListener('click', (event) => {
        event.preventDefault();
        const wrappers = Array.from(document.querySelectorAll(`[${wrapperAttribute}]`));
        const shouldConvert = !wrappers.every((wrapper) => wrapper.querySelector(`[${convertedAttribute}]`));
        wrappers.forEach((wrapper) => setConverted(wrapper, shouldConvert));
    });
    function mountAllButton() {
        if (!document.body || window !== window.top || floatingMenuDisabled()) return;
        registerFloatingButton('translate', allButton, document.querySelectorAll(`[${wrapperAttribute}]`).length > 0);
        scan();
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
