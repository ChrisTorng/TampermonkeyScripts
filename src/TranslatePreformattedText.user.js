// ==UserScript==
// @name         Translate Preformatted Text
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-10-28_1.5.6
// @description  Translate code blocks with draggable per-block controls and a shared-menu action; improve inline code, Mastodon, and Wikipedia translation.
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
    const FLOATING_MENU_ORDER = ['archive', 'mobile', 'dark', 'translate'];

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

    if (floatingMenuForbiddenHost()) return;

    // BEGIN SHARED TRANSIENT CONTROL
    // Shared source for draggable in-content controls. Run scripts/sync-transient-controls.js after editing.
    const transientControlLayouts = new Set();
    let transientControlFrame = null;
    function refreshTransientControls() {
        if (transientControlFrame !== null) return;
        transientControlFrame = window.requestAnimationFrame(() => {
            transientControlFrame = null;
            transientControlLayouts.forEach((layout) => layout());
        });
    }
    window.addEventListener('scroll', refreshTransientControls, { capture: true, passive: true });
    window.addEventListener('resize', refreshTransientControls);
    document.addEventListener('fullscreenchange', refreshTransientControls);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('scroll', refreshTransientControls);
        window.visualViewport.addEventListener('resize', refreshTransientControls);
    }

    function makeTransientControlDraggable(button, container, { bottom = false, size = 24, height = size, inset = 6,
        stationaryOnPinchZoom = false, avoidFloatingMenu = false } = {}) {
        let placement = null;
        let drag = null;
        let suppressClick = false;
        let observer;
        let positioned = false;
        let normalScale = Math.min(1, window.visualViewport?.scale || 1);
        const isPinchZoomed = () => {
            if (!window.visualViewport) return false;
            normalScale = Math.min(normalScale, window.visualViewport.scale);
            return window.visualViewport.scale > normalScale * 1.01;
        };
        const geometry = () => {
            const rect = container.getBoundingClientRect();
            const viewport = stationaryOnPinchZoom ? null : window.visualViewport;
            let left = viewport ? viewport.offsetLeft : 0;
            let top = viewport ? viewport.offsetTop : 0;
            let right = left + (viewport ? viewport.width : window.innerWidth);
            let lower = top + (viewport ? viewport.height : window.innerHeight);
            // A block may be wider than an ancestor's scrollport even when it fits the screen.
            // Intersect every clipping ancestor, excluding borders and scrollbar gutters.
            for (let ancestor = container; ancestor && ancestor !== document.documentElement; ancestor = ancestor.parentElement) {
                const css = window.getComputedStyle(ancestor);
                const clips = (axis) => /^(auto|scroll|hidden|clip|overlay)$/.test(
                    css[`overflow${axis}`] || css.getPropertyValue?.(`overflow-${axis.toLowerCase()}`) || css.overflow || '');
                if (!clips('X') && !clips('Y')) {
                    if (ancestor === document.fullscreenElement) break;
                    continue;
                }
                const bounds = ancestor.getBoundingClientRect();
                const innerLeft = bounds.left + (ancestor.clientLeft || 0);
                const innerTop = bounds.top + (ancestor.clientTop || 0);
                if (clips('X')) {
                    left = Math.max(left, innerLeft);
                    right = Math.min(right, innerLeft + ancestor.clientWidth);
                }
                if (clips('Y')) {
                    top = Math.max(top, innerTop);
                    lower = Math.min(lower, innerTop + ancestor.clientHeight);
                }
                // Native fullscreen content escapes clipping by ancestors outside the top layer.
                if (ancestor === document.fullscreenElement) break;
            }
            // Absolute child coordinates start at the container's inner border edge.
            const originX = rect.left + (container.clientLeft || 0) - (container.scrollLeft || 0);
            const originY = rect.top + (container.clientTop || 0) - (container.scrollTop || 0);
            const minX = Math.max(rect.left, left) - originX;
            const minY = Math.max(rect.top, top) - originY;
            const maxX = Math.min(rect.right, right) - originX - size;
            const maxY = Math.min(rect.bottom, lower) - originY - height;
            return { originX, originY, minX, minY, maxX, maxY };
        };
        const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
        const place = (x, y) => {
            button.style.setProperty('left', `${x}px`, 'important');
            button.style.setProperty('top', `${y}px`, 'important');
            button.style.setProperty('right', 'auto', 'important');
            button.style.setProperty('bottom', 'auto', 'important');
        };
        const avoidMenuOverlap = (x, y, area) => {
            if (!avoidFloatingMenu) return { x, y };
            const menu = document.getElementById('tm-shared-floating-menu');
            if (!menu || menu.hidden) return { x, y };
            const elements = [menu, menu.querySelector('[data-floating-close]'),
                menu.querySelector('[data-floating-dialog]')];
            const obstacles = elements.filter((element) => element && !element.hidden)
                .map((element) => element.getBoundingClientRect())
                .filter((rect) => rect.width > 0 && rect.height > 0);
            const gap = 4;
            const overlaps = (px, py) => obstacles.some((rect) =>
                area.originX + px < rect.right + gap && area.originX + px + size > rect.left - gap &&
                area.originY + py < rect.bottom + gap && area.originY + py + height > rect.top - gap);
            if (!overlaps(x, y)) return { x, y };
            const candidates = obstacles.flatMap((rect) => [
                { x: rect.left - area.originX - size - gap, y },
                { x: rect.right - area.originX + gap, y },
                { x, y: rect.top - area.originY - height - gap },
                { x, y: rect.bottom - area.originY + gap },
            ]);
            candidates.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
            return candidates.find((candidate) =>
                candidate.x >= area.minX && candidate.x <= area.maxX &&
                candidate.y >= area.minY && candidate.y <= area.maxY &&
                !overlaps(candidate.x, candidate.y)) || { x, y };
        };
        const layout = () => {
            if (!button.isConnected) {
                transientControlLayouts.delete(layout);
                if (observer) observer.disconnect();
                return;
            }
            // Pinch zoom must neither reposition the button nor enlarge its screen footprint.
            const zoomed = stationaryOnPinchZoom && isPinchZoomed();
            if (zoomed) {
                button.style.setProperty('transform', `scale(${normalScale / window.visualViewport.scale})`, 'important');
                button.style.setProperty('transform-origin', 'top left', 'important');
                if (positioned) return;
            } else if (stationaryOnPinchZoom) {
                button.style.removeProperty('transform');
            }
            const area = geometry();
            const hidden = area.maxX < area.minX || area.maxY < area.minY;
            if (button.hidden !== hidden) button.hidden = hidden;
            if (hidden || drag) return;
            const x = clamp(placement ? placement.x : area.maxX - inset, area.minX, area.maxX);
            const y = clamp(placement ? placement.y : bottom ? area.maxY - inset : area.minY + inset, area.minY, area.maxY);
            const clear = avoidMenuOverlap(x, y, area);
            place(clear.x, clear.y);
            positioned = true;
        };
        button.style.setProperty('touch-action', 'none', 'important');
        button.style.setProperty('text-decoration', 'none', 'important');
        button.addEventListener('pointerdown', (event) => {
            if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
            suppressClick = false;
            drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
                left: parseFloat(button.style.left), top: parseFloat(button.style.top), moved: false };
            button.setPointerCapture?.(event.pointerId);
            event.stopPropagation?.();
        });
        button.addEventListener('pointermove', (event) => {
            if (!drag || event.pointerId !== drag.id) return;
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            if (!drag.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
            drag.moved = true;
            event.preventDefault();
            event.stopPropagation?.();
            const area = geometry();
            placement = { x: clamp(drag.left + dx, area.minX, area.maxX), y: clamp(drag.top + dy, area.minY, area.maxY) };
            place(placement.x, placement.y);
        });
        const finish = (event) => {
            if (!drag || event.pointerId !== drag.id) return;
            suppressClick = drag.moved;
            drag = null;
            if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId);
            layout();
        };
        button.addEventListener('pointerup', finish);
        button.addEventListener('pointercancel', finish);
        button.addEventListener('lostpointercapture', finish);
        // Register before the action handler so a drag never activates translation or fullscreen.
        button.addEventListener('click', (event) => {
            if (!suppressClick) return;
            suppressClick = false;
            event.preventDefault();
            event.stopImmediatePropagation();
        }, true);
        transientControlLayouts.add(layout);
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(refreshTransientControls);
            observer.observe(container);
        }
        layout();
        return layout;
    }
    // END SHARED TRANSIENT CONTROL

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
            bottom: 6px !important;
            top: auto !important;
            box-sizing: border-box !important;
            width: 24px !important;
            padding: 0 !important;
            touch-action: none !important;
            text-decoration: none !important;
        }
        .tm-translate-pre-one[hidden] {
            display: none !important;
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
        if (button !== allButton) {
            button.style.setProperty('background-color', isActive ? 'rgba(34, 139, 34, .85)' : 'rgba(0, 0, 0, .35)', 'important');
            button.style.setProperty('color', isActive ? '#fff' : 'rgba(255, 255, 255, .75)', 'important');
        }
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
        refreshTransientControls();
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
        wrapper.appendChild(button);
        makeTransientControlDraggable(button, wrapper, { bottom: true });
        button.addEventListener('click', () => {
            setConverted(wrapper, !wrapper.querySelector(`[${convertedAttribute}]`));
        });
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
