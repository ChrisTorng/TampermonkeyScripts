// ==UserScript==
// @name         Math Translation Guard
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-10-12_1.3.4
// @description  Protect rendered math with per-site floating-menu strategies and optional formula backups.
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
    const FLOATING_MENU_STORAGE = 'tm-floating-menu-v1:' + window.location.hostname.toLowerCase();
    const FLOATING_MENU_ORDER = ['archive', 'mobile', 'dark', 'translate', 'math'];

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
        return path.slice(0, path.lastIndexOf('/') + 1) || '/';
    }

    function floatingMenuPageKey() {
        return `${window.location.pathname}${window.location.search}`;
    }

    function floatingMenuDisabled() {
        const settings = floatingMenuSettings();
        return floatingMenuForbiddenHost()
            || settings.disabled === true
            || settings.disabledDomain === true
            || (settings.disabledPaths || []).includes(floatingMenuFolderPath())
            || (settings.disabledPages || []).includes(floatingMenuPageKey());
    }

    function floatingMenuCollapse(root) {
        root.setAttribute('data-floating-expanded', 'false');
        const dialog = root.querySelector('[data-floating-dialog]');
        if (dialog) dialog.hidden = true;
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
        buttons.forEach((button) => {
            button.hidden = !expanded || !dialog.hidden || button.getAttribute('data-floating-available') !== 'true';
        });
    }

    function floatingMenuRoot() {
        let root = document.getElementById(FLOATING_MENU_ID);
        if (root) {
            return root;
        }
        const style = document.createElement('style');
        style.id = FLOATING_MENU_ID + '-style';
        style.textContent = `
            #${FLOATING_MENU_ID} { position: absolute !important; top: 70px !important; right: 0 !important; left: auto !important; z-index: 2147483647 !important; width: 38px !important; display: flex !important; flex-direction: column !important; align-items: center !important; gap: 4px !important; margin: 0 !important; padding: 0 !important; }
            #${FLOATING_MENU_ID}[hidden], #${FLOATING_MENU_ID} button[hidden], #${FLOATING_MENU_ID} [data-floating-dialog][hidden] { display: none !important; }
            #${FLOATING_MENU_ID} button { appearance: none !important; display: block !important; box-sizing: border-box !important; width: 38px !important; min-width: 38px !important; max-width: 38px !important; height: 32px !important; min-height: 32px !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 5px !important; box-shadow: 0 2px 6px rgba(0,0,0,.25) !important; background: rgba(0,0,0,.55) !important; color: #f0f0f0 !important; font: 600 15px/32px system-ui,sans-serif !important; text-align: center !important; cursor: pointer !important; opacity: 1 !important; user-select: none !important; touch-action: none !important; }
            #${FLOATING_MENU_ID} button[aria-pressed="true"] { background: rgba(34,139,34,.85) !important; color: white !important; }
            #${FLOATING_MENU_ID} button, #${FLOATING_MENU_ID} button:hover, #${FLOATING_MENU_ID} button:focus, #${FLOATING_MENU_ID} button:active { text-decoration: none !important; }
            #${FLOATING_MENU_ID} button:hover { background: rgba(0,0,0,.75) !important; }
            #${FLOATING_MENU_ID} button[aria-pressed="true"]:hover { background: rgba(34,139,34,1) !important; }
            #${FLOATING_MENU_ID} [data-floating-close] { position: absolute !important; top: -36px !important; right: 0 !important; }
            #${FLOATING_MENU_ID} [data-floating-toggle] { cursor: move !important; }
            #${FLOATING_MENU_ID} [data-floating-dialog] { position: absolute !important; top: 0 !important; right: 0 !important; width: min(290px, calc(100vw - 24px)) !important; box-sizing: border-box !important; margin: 0 !important; padding: 14px !important; border: 1px solid #777 !important; border-radius: 9px !important; box-shadow: 0 5px 18px rgba(0,0,0,.4) !important; background: #fff !important; color: #111 !important; font: 15px/1.4 system-ui,sans-serif !important; }
            #${FLOATING_MENU_ID} [data-floating-dialog] p { margin: 0 0 10px !important; padding: 0 !important; }
            #${FLOATING_MENU_ID} [data-floating-dialog] button { width: 100% !important; max-width: none !important; margin-top: 7px !important; background: #444 !important; color: #fff !important; }
        `;
        (document.head || document.documentElement).appendChild(style);
        root = document.createElement('div');
        root.id = FLOATING_MENU_ID;
        root.hidden = true;
        root.setAttribute('data-floating-expanded', 'false');
        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = '×';
        close.title = 'Choose where to hide floating tools';
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
        // Use document coordinates so pinch zoom does not anchor the menu to the visual viewport.
        document.documentElement.appendChild(root);

        const settings = floatingMenuSettings();
        let anchorX = Number.isFinite(settings.x) ? settings.x : null;
        let anchorY = Number.isFinite(settings.y) ? Math.max(0, settings.y) : 70;
        const scrollX = () => window.scrollX || 0;
        const scrollY = () => Math.max(0, window.scrollY || 0);
        let documentY = anchorY;
        let previousScrollY = scrollY();
        // Pages without a mobile viewport declaration can start below scale 1.
        let normalScale = Math.min(1, window.visualViewport ? window.visualViewport.scale : 1);
        const zoomed = () => {
            if (!window.visualViewport) return false;
            normalScale = Math.min(normalScale, window.visualViewport.scale);
            return window.visualViewport.scale > normalScale * 1.01;
        };
        const place = (x, y) => {
            root.style.setProperty('position', 'absolute', 'important');
            root.style.setProperty('left', `${x}px`, 'important');
            root.style.setProperty('top', `${y}px`, 'important');
            root.style.setProperty('right', 'auto', 'important');
        };
        const position = () => {
            if (zoomed() || dragging) return;
            const currentScrollY = scrollY();
            // A temporary placement returns smoothly to the saved clearance on the way up.
            if (currentScrollY < previousScrollY && previousScrollY > 0) {
                documentY = anchorY + (documentY - anchorY) * currentScrollY / previousScrollY;
            }
            if (currentScrollY >= Math.max(documentY, anchorY)) documentY = anchorY;
            previousScrollY = currentScrollY;
            const x = anchorX === null ? window.innerWidth - 38 : anchorX;
            place(scrollX() + Math.max(0, Math.min(x, window.innerWidth - 38)), Math.max(documentY, currentScrollY));
        };

        let dragging = false;
        let moved = false;
        let startX = 0;
        let startY = 0;
        let originX = 0;
        let originY = 0;
        // Initialize even if the page loads with an already zoomed visual viewport.
        place(Math.max(0, anchorX === null ? window.innerWidth - 38 : anchorX), Math.max(anchorY, scrollY()));
        window.addEventListener('scroll', position, { passive: true });
        window.addEventListener('resize', position);
        if (window.visualViewport) window.visualViewport.addEventListener('resize', position);
        const pointer = (event) => event.touches ? event.touches[0] : event;
        const onMove = (event) => {
            if (!dragging) return;
            if (event.touches && event.touches.length !== 1) {
                dragging = false;
                moved = false;
                return;
            }
            const point = pointer(event);
            if (!moved && Math.abs(point.clientX - startX) < 3 && Math.abs(point.clientY - startY) < 3) return;
            moved = true;
            event.preventDefault();
            const x = Math.max(0, Math.min(originX + point.clientX - startX, window.innerWidth - 38));
            const y = Math.max(0, Math.min(originY + point.clientY - startY, window.innerHeight - 32));
            place(scrollX() + x, scrollY() + y);
        };
        const onEnd = () => {
            if (!dragging) return;
            dragging = false;
            if (moved) {
                const next = floatingMenuSettings();
                anchorX = parseFloat(root.style.left) - scrollX();
                documentY = parseFloat(root.style.top);
                previousScrollY = scrollY();
                // Only a drag at page top changes the persistent top clearance.
                if (previousScrollY === 0) anchorY = documentY;
                next.x = anchorX;
                next.y = anchorY;
                floatingMenuSave(next);
            }
        };
        const onStart = (event) => {
            if (event.touches && event.touches.length !== 1) return;
            const point = pointer(event);
            dragging = true;
            moved = false;
            startX = point.clientX;
            startY = point.clientY;
            originX = parseFloat(root.style.left) - scrollX();
            originY = parseFloat(root.style.top) - scrollY();
        };
        toggle.addEventListener('mousedown', onStart);
        toggle.addEventListener('touchstart', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);
        document.addEventListener('touchcancel', () => { dragging = false; moved = false; position(); });
        toggle.addEventListener('click', (event) => {
            event.preventDefault();
            if (moved) { moved = false; return; }
            dialog.hidden = true;
            root.setAttribute('data-floating-expanded', String(root.getAttribute('data-floating-expanded') !== 'true'));
            floatingMenuRender(root);
        });
        document.addEventListener('click', (event) => {
            if (event.composedPath && event.composedPath().includes(root)) return;
            for (let target = event.target; target; target = target.parentNode) {
                if (target === root) return;
            }
            if (root.getAttribute('data-floating-expanded') !== 'true') return;
            floatingMenuCollapse(root);
        }, true);
        close.addEventListener('click', () => {
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


    const MATH_MODE_KEY = 'tm-math-strategy-v1';
    const MATH_SCROLL_KEY = 'tm-math-scroll-v1';
    const MATH_MODES = [
        ['auto', 'Auto: recommended'],
        ['output', 'Output only: no source changes'],
        ['backup', 'Auto + formula index F1/F2'],
        ['off', 'Off: native browser behavior'],
    ];
    function readMathMode() {
        try {
            const stored = localStorage.getItem(MATH_MODE_KEY);
            return MATH_MODES.some(([value]) => value === stored) ? stored : 'auto';
        } catch (_) { return 'auto'; }
    }
    const mathMode = readMathMode();
    let hadExplicitMathChoice = false;
    try { hadExplicitMathChoice = localStorage.getItem(MATH_MODE_KEY) !== null; } catch (_) { /* Storage unavailable. */ }
    const mathFeatureAllowed = !floatingMenuDisabled();
    const sourceRewriteEnabled = mathFeatureAllowed && (mathMode === 'auto' || mathMode === 'backup');
    const renderedProtectionEnabled = mathFeatureAllowed && mathMode !== 'off';
    const formulas = [];
    const savedFormulaNodes = new WeakSet();
    let mathMenuButton = null;
    let mathPicker = null;

    function changeMathMode(next) {
        if (next === mathMode) { if (mathPicker) mathPicker.hidden = true; return; }
        // Never reload into the old strategy if the new preference cannot persist.
        let saved = false;
        try {
            localStorage.setItem(MATH_MODE_KEY, next);
            saved = localStorage.getItem(MATH_MODE_KEY) === next;
        } catch (_) { /* The origin may block site storage. */ }
        if (!saved) {
            if (mathPicker) mathPicker.setAttribute('data-storage-error', 'true');
            if (typeof window.alert === 'function')
                window.alert('Math strategy cannot be saved on this site. Enable site storage to switch.');
            return;
        }
        try {
            sessionStorage.setItem(MATH_SCROLL_KEY, JSON.stringify({
                href: location.href, x: window.scrollX || 0, y: window.scrollY || 0,
                at: Date.now()
            }));
        } catch (_) { /* The selected strategy still applies after reload. */ }
        window.location.reload();
    }

    function restoreMathScroll() {
        let saved;
        try {
            const value = sessionStorage.getItem(MATH_SCROLL_KEY);
            if (value) saved = JSON.parse(value);
            sessionStorage.removeItem(MATH_SCROLL_KEY);
        } catch (_) { return; }
        if (!saved || saved.href !== location.href || Date.now() - saved.at > 30000 ||
            !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return;
        const move = () => {
            if (typeof window.scrollTo === 'function') window.scrollTo(saved.x, saved.y);
        };
        move();
        document.addEventListener('DOMContentLoaded', move, { once: true });
        window.addEventListener('load', move, { once: true });
        [300, 1100, 2200].forEach((ms) => window.setTimeout(move, ms));
    }

    function createMathPicker() {
        if (mathPicker && mathPicker.isConnected) return mathPicker;
        const style = document.createElement('style');
        style.textContent =
            '#tm-math-picker{position:fixed!important;z-index:2147483647!important;top:12px!important;right:12px!important;width:min(340px,calc(100vw - 24px))!important;max-height:85vh!important;overflow:auto!important;padding:12px!important;background:#17273c!important;color:white!important;font:14px/1.5 system-ui,sans-serif!important;border:1px solid #6681a2!important;border-radius:9px!important;box-shadow:0 8px 20px #0009!important}' +
            '#tm-math-picker[hidden]{display:none!important}' +
            '#tm-math-picker button{display:block!important;width:100%!important;padding:10px!important;margin:6px 0!important;text-align:left!important;background:#30496d!important;color:white!important;border:1px solid #8ba6ca!important;border-radius:5px!important;font:inherit!important}' +
            '#tm-math-picker button[data-current="true"]{background:#286a4d!important}' +
            '#tm-math-picker [data-backup-list]{max-height:40vh;overflow:auto}' +
            '#tm-math-picker [data-backup-list]>div{overflow-x:auto;padding:7px;border-bottom:1px solid #6681a2}' +
            '[data-tm-math-ref]::before{content:attr(data-tm-math-ref);font:11px system-ui,sans-serif;color:#5aa0e0;vertical-align:super;margin-right:2px}';
        (document.head || document.documentElement).appendChild(style);
        mathPicker = document.createElement('div');
        mathPicker.id = 'tm-math-picker';
        mathPicker.hidden = true;
        mathPicker.setAttribute('translate', 'no');
        mathPicker.classList.add('notranslate');
        const title = document.createElement('strong');
        title.textContent = 'Math protection — ' + location.hostname;
        mathPicker.appendChild(title);
        for (const [key, name] of MATH_MODES) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = name;
            button.setAttribute('data-math-mode', key);
            button.setAttribute('data-current', String(mathMode === key));
            button.addEventListener('click', () => changeMathMode(key));
            mathPicker.appendChild(button);
        }
        if (mathMode === 'backup') {
            const show = document.createElement('button');
            show.type = 'button';
            const list = document.createElement('div');
            list.setAttribute('data-backup-list', 'true');
            show.textContent = 'View saved formulas (F1/F2/...)';
            show.addEventListener('click', () => {
                while (list.firstChild) list.removeChild(list.firstChild);
                for (const entry of formulas) {
                    const item = document.createElement('div');
                    const caption = document.createElement('b');
                    caption.textContent = entry.id + ' ';
                    item.appendChild(caption);
                    item.appendChild(entry.element.cloneNode(true));
                    list.appendChild(item);
                }
                if (!formulas.length) list.textContent = 'No rendered math captured yet.';
            });
            mathPicker.append(show, list);
        }
        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = 'Close';
        close.addEventListener('click', () => { mathPicker.hidden = true; });
        mathPicker.appendChild(close);
        document.documentElement.appendChild(mathPicker);
        return mathPicker;
    }

    function offerMathMenu() {
        if (mathMenuButton || floatingMenuDisabled()) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = '∑';
        button.title = 'Math protection: ' + mathMode;
        button.setAttribute('aria-label', button.title);
        button.setAttribute('aria-pressed', String(mathMode !== 'off'));
        button.addEventListener('click', () => {
            const dialog = createMathPicker();
            dialog.hidden = !dialog.hidden;
        });
        registerFloatingButton('math', button);
        mathMenuButton = button;
    }

    function saveFormula(element) {
        if (mathMode !== 'backup' || savedFormulaNodes.has(element) || formulas.length >= 200 ||
            typeof element.cloneNode !== 'function') return;
        // Display wrappers are structural; collect the actual rendered .MathJax child instead.
        if (element.matches('.MathJax_Display')) return;
        if (element.matches('math') && element.closest('.katex')) return;
        if (element.closest('#tm-math-picker')) return;
        const copy = element.cloneNode(true);
        copy.removeAttribute('id');
        copy.setAttribute('translate', 'no');
        copy.classList.add('notranslate');
        const id = 'F' + (formulas.length + 1);
        savedFormulaNodes.add(element);
        formulas.push({ id, element: copy });
        element.setAttribute('data-tm-math-ref', id);
    }


    // Keep the picker available when a previously configured site loses all
    // visible formulas after browser translation. Detect common library loads
    // even if the renderer has not yet inserted its formula nodes.
    function hasMathLibraryLoad(root) {
        if (!root) return false;
        const isMathLoad = (element) => {
            if (!element.getAttribute) return false;
            const path = element.getAttribute('src') || element.getAttribute('href') || '';
            return /mathjax|katex/i.test(path);
        };
        if (isMathLoad(root)) return true;
        if (!root.querySelectorAll) return false;
        return Array.from(root.querySelectorAll('script[src],link[href]')).some(isMathLoad);
    }

    // Rendered output only. MathJax must remain free to discover and replace
    // TeX delimiters, previews, and its internal source <script> elements.
    const mathSelectors = ['.MathJax', '.MathJax_Display', 'mjx-container', '.katex', 'math'];
    let registeredHub = null;
    const isPlover = location.hostname === 'blog.plover.com';
    const pendingTypeset = new Set();

    // The Android Edge comparison lab succeeded with an alternating sequence
    // of translatable text spans and inline containers holding inert math/tex
    // scripts. Do not insert custom MathJax_Preview elements: on Plover the
    // preview was initially in place, but equations moved after translation.
    // Only Plover uses the custom !!...!! delimiters.
    function preservePloverSource(textNode) {
        if (!sourceRewriteEnabled || !isPlover || !textNode || textNode.nodeType !== 3) return;
        const parent = textNode.parentElement;
        if (!parent || !parent.isConnected) return;
        const excluded = ['script', 'style', 'textarea', 'pre', 'code',
            '.MathJax', '.MathJax_Preview', 'mjx-container', '.katex', 'math'];
        if (excluded.some((selector) => parent.closest(selector))) return;

        const source = textNode.nodeValue || '';
        const matches = Array.from(source.matchAll(/!!([\s\S]+?)!!/g))
            .filter((match) => match[1].trim().length > 0);
        if (!matches.length) return;

        let offset = 0;
        for (const match of matches) {
            // Make the text its own element, as in the successful static G
            // fixture, so browser translation can handle text independently.
            // Neither this text nor its parent is excluded from translation.
            if (match.index > offset) {
                const prose = document.createElement('span');
                prose.textContent = source.slice(offset, match.index);
                parent.insertBefore(prose, textNode);
            }

            // MathJax 2 recognizes this script directly. Its container is an
            // inline sibling of the preceding/following translatable spans.
            const mathSlot = document.createElement('span');
            mathSlot.className = 'math-slot';
            const mathSource = document.createElement('script');
            mathSource.type = 'math/tex';
            mathSource.textContent = match[1];
            mathSlot.appendChild(mathSource);
            parent.insertBefore(mathSlot, textNode);
            offset = match.index + match[0].length;
        }
        if (offset < source.length) {
            const prose = document.createElement('span');
            prose.textContent = source.slice(offset);
            parent.insertBefore(prose, textNode);
        }
        parent.removeChild(textNode);
        pendingTypeset.add(parent);
        offerMathMenu();
    }

    function scanPloverSources(root) {
        if (!sourceRewriteEnabled || !isPlover || !root) return;
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
        offerMathMenu();
        if (!renderedProtectionEnabled || element.closest('.MathJax_Preview')) return;
        saveFormula(element);
        if (element.getAttribute('translate') !== 'no') {
            element.setAttribute('translate', 'no');
        }
        if (!element.classList.contains('notranslate')) {
            element.classList.add('notranslate');
        }
    }

    function scan(root) {
        if (!root) return;
        if (!mathMenuButton && hasMathLibraryLoad(root)) offerMathMenu();
        if (root.nodeType === 1 && !root.closest('#tm-math-picker')) {
            if (mathSelectors.some((selector) => root.matches(selector))) protect(root);
            // Cover each enclosing formula root, including nested MathJax display wrappers.
            for (const selector of mathSelectors) {
                const container = root.closest(selector);
                if (container) protect(container);
            }
        }
        if (root.querySelectorAll && !root.closest?.('#tm-math-picker')) {
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
    restoreMathScroll();
    if (hadExplicitMathChoice || isPlover) offerMathMenu();
    registerMathJax2();
    scanPloverSources(document);
    scan(document);
    flushTypeset();
})();
