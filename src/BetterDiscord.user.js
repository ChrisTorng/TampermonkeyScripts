// ==UserScript==
// @name         Better Discord
// @namespace    http://tampermonkey.net/
// @version      2026-10-30_1.0.10
// @description  Simplify Discord input buttons; repair Android Edge keyboard gaps and provide opt-in layout diagnostics.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/BetterDiscord.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/BetterDiscord.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=discord.com
// @match        https://discord.com/channels/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Diagnostics are opt-in and never alter Windows Edge's keyboard handling.
    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
    const diagnosticsRequested = isAndroid && /[?&]bddebug=1(?:&|#|$)/.test(document.URL);
    // Collect unmodified layout geometry first; the panel can re-enable the fix.
    let keyboardFixEnabled = !diagnosticsRequested;

    function hideElement(element) {
        if (!element) {
            return;
        }

        element.style.setProperty('display', 'none', 'important');
        element.setAttribute('data-better-discord-hidden', 'true');
    }

    function restoreLayout(element) {
        if (!element) {
            return;
        }

        [
            'display',
            'margin',
            'padding',
            'gap',
            'width',
            'min-width',
            'max-width',
            'height',
            'min-height',
            'flex-basis',
            'flex-shrink',
            'visibility',
            'opacity',
            'overflow',
        ].forEach((property) => {
            element.style.removeProperty(property);
        });
    }

    function simplifyComposer() {
        const composer = document.querySelector('[class*="channelTextArea"]');
        if (!composer) {
            return;
        }

        const buttonsArea = composer.querySelector('[class*="buttons__"]');
        const emojiWrapper = buttonsArea ? buttonsArea.querySelector('.expression-picker-chat-input-button') : null;
        const appsWrapper = buttonsArea ? buttonsArea.querySelector('[class*="app-launcher-entrypoint"]') : null;
        const separator = composer.querySelector('[class*="separator_"]');
        const sendContainer = separator ? separator.nextElementSibling : null;
        const sendButtonContainer = sendContainer ? sendContainer.querySelector('[class*="buttonContainer_"]') : null;

        restoreLayout(buttonsArea);
        restoreLayout(sendContainer);
        restoreLayout(sendButtonContainer);
        hideElement(emojiWrapper);
        hideElement(appsWrapper);

        if (separator) {
            restoreLayout(separator);
            hideElement(separator);
        }
    }


    // Android Edge can leave Discord's app or chat panel shorter than the
    // visible viewport when the software keyboard opens. Repair the containing
    // layout first: translating the form alone can be clipped by that panel.
    function initAndroidEdgeKeyboardFix() {
        if (typeof navigator === 'undefined' ||
            !/Android/i.test(navigator.userAgent) ||
            !/EdgA?\//i.test(navigator.userAgent)) {
            return () => {};
        }

        const viewport = window.visualViewport;
        if (!viewport) {
            return () => {};
        }

        const MIN_GAP = 24;
        const MAX_GAP = 360;
        let adjustedForm = null;
        let formShift = 0;
        let originalTranslate = '';
        let originalTranslatePriority = '';
        let resizedPanel = null;
        let panelStyles = null;
        let frameId = 0;

        function restoreProperty(element, property, value, priority) {
            if (value) {
                element.style.setProperty(property, value, priority);
            } else {
                element.style.removeProperty(property);
            }
        }

        function restoreForm() {
            if (adjustedForm) {
                restoreProperty(adjustedForm, 'translate', originalTranslate, originalTranslatePriority);
            }
            adjustedForm = null;
            formShift = 0;
        }

        function restorePanel() {
            if (resizedPanel && panelStyles) {
                for (const property of ['height', 'min-height', 'max-height']) {
                    restoreProperty(resizedPanel, property,
                        panelStyles[property].value, panelStyles[property].priority);
                }
            }
            resizedPanel = null;
            panelStyles = null;
        }

        function focusedComposer() {
            const active = document.activeElement;
            if (!active || typeof active.closest !== 'function') {
                return null;
            }
            const composer = active.closest('[class*="channelTextArea"]');
            if (!composer) {
                return null;
            }
            const isEditor = active.isContentEditable ||
                active.matches('textarea, input, [contenteditable], [role="textbox"]') ||
                !!active.closest('[contenteditable="true"]');
            return isEditor ? composer : null;
        }

        function findShortLayoutPanel(form, visibleBottom) {
            let highestShortPanel = null;
            // Exclude the composer itself and other small controls. The target
            // is an actual full-height chat/app wrapper, never the input row.
            const minimumHeight = Math.min(300, viewport.height * 0.45);
            for (let element = form.parentElement;
                element && element !== document.body && element !== document.documentElement;
                element = element.parentElement) {
                const rect = element.getBoundingClientRect();
                if (!Number.isFinite(rect.bottom) ||
                    !Number.isFinite(rect.height) ||
                    rect.height < minimumHeight ||
                    visibleBottom - rect.bottom < MIN_GAP) {
                    continue;
                }
                highestShortPanel = element;
                const parent = element.parentElement;
                if (parent && parent !== document.body &&
                    parent.getBoundingClientRect().bottom - rect.bottom >= MIN_GAP) {
                    return element;
                }
            }
            return highestShortPanel;
        }

        function repairLayoutHeight(form, visibleBottom) {
            // Measure without our last correction so repeated resize/scroll
            // events cannot accumulate offsets or lock in an obsolete height.
            restorePanel();
            const panel = findShortLayoutPanel(form, visibleBottom);
            if (!panel) {
                return;
            }
            const rect = panel.getBoundingClientRect();
            const gap = visibleBottom - rect.bottom;
            if (gap < MIN_GAP || gap > Math.min(MAX_GAP, viewport.height * 0.6)) {
                return;
            }
            panelStyles = {};
            for (const property of ['height', 'min-height', 'max-height']) {
                panelStyles[property] = {
                    value: panel.style.getPropertyValue(property),
                    priority: panel.style.getPropertyPriority(property),
                };
            }
            resizedPanel = panel;
            const height = Math.ceil(rect.height + gap) + 'px';
            panel.style.setProperty('height', height, 'important');
            panel.style.setProperty('min-height', height, 'important');
            panel.style.setProperty('max-height', 'none', 'important');
        }

        function adjustComposerPosition() {
            frameId = 0;
            if (!keyboardFixEnabled) {
                restoreForm();
                restorePanel();
                return;
            }
            const composer = focusedComposer();
            const form = composer ? composer.closest('form') : null;
            if (!form || !form.isConnected || viewport.scale > 1.1) {
                restoreForm();
                restorePanel();
                return;
            }

            const visibleBottom = viewport.offsetTop + viewport.height;
            if (!Number.isFinite(visibleBottom)) {
                restoreForm();
                restorePanel();
                return;
            }

            // Remove the old form correction before measuring the layout.
            restoreForm();
            repairLayoutHeight(form, visibleBottom);

            const rect = form.getBoundingClientRect();
            const gap = visibleBottom - rect.bottom;
            // Do not shift forms that are already aligned or below the
            // keyboard. Never manufacture a fixed keyboard-height offset.
            if (!Number.isFinite(gap) || gap < MIN_GAP ||
                gap > Math.min(MAX_GAP, viewport.height * 0.6)) {
                return;
            }
            const initialTranslate = form.style.getPropertyValue('translate');
            // Do not override positioning installed by Discord or other scripts.
            if (initialTranslate && initialTranslate !== 'none') {
                return;
            }
            adjustedForm = form;
            originalTranslate = initialTranslate;
            originalTranslatePriority = form.style.getPropertyPriority('translate');
            formShift = gap;
            form.style.setProperty('translate', '0 ' + formShift.toFixed(1) + 'px', 'important');
        }

        function scheduleAdjust() {
            if (!frameId) {
                frameId = window.requestAnimationFrame(adjustComposerPosition);
            }
        }

        document.addEventListener('focusin', () => {
            scheduleAdjust();
            // Edge can report intermediate viewport sizes during IME animation.
            for (const delay of [100, 300, 600]) {
                window.setTimeout(scheduleAdjust, delay);
            }
        });
        document.addEventListener('focusout', () => {
            scheduleAdjust();
            window.setTimeout(scheduleAdjust, 150);
        });
        viewport.addEventListener('resize', scheduleAdjust);
        viewport.addEventListener('scroll', scheduleAdjust);
        window.addEventListener('resize', scheduleAdjust);
        window.addEventListener('orientationchange', () => {
            restoreForm();
            restorePanel();
            scheduleAdjust();
        });
        window.addEventListener('pagehide', () => {
            restoreForm();
            restorePanel();
        });
        return scheduleAdjust;
    }

    function initAndroidLayoutDiagnostics(scheduleKeyboardFix) {
        if (!diagnosticsRequested || !document.body) {
            return () => {};
        }

        const viewport = window.visualViewport;
        const samples = [];
        const layers = [];
        let frameId = 0;
        let pendingReason = 'init';
        let visible = true;

        function round(value) {
            return Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
        }

        function box(element) {
            if (!element || !element.getBoundingClientRect) {
                return null;
            }
            const rect = element.getBoundingClientRect();
            return {
                top: round(rect.top), left: round(rect.left),
                right: round(rect.right), bottom: round(rect.bottom),
                width: round(rect.width), height: round(rect.height),
            };
        }

        function elementName(element) {
            const tag = element.tagName ? element.tagName.toLowerCase() : 'unknown';
            const classes = typeof element.className === 'string'
                ? element.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
            return tag + (element.id === 'app-mount' ? '#app-mount' : '') +
                (classes ? '.' + classes : '');
        }

        function inspect(element, visibleBottom) {
            const rect = box(element);
            const computed = typeof window.getComputedStyle === 'function'
                ? window.getComputedStyle(element) : null;
            const css = {};
            for (const name of [
                'display', 'position', 'overflow', 'overflowY', 'height',
                'minHeight', 'maxHeight', 'paddingBottom', 'marginBottom',
                'bottom', 'transform', 'translate',
            ]) {
                css[name] = computed ? computed[name] || '' : '';
            }
            return {
                element: elementName(element),
                rect,
                gapToViewportBottom: rect ? round(visibleBottom - rect.bottom) : null,
                css,
            };
        }

        function inspectNow(reason) {
            const composer = document.querySelector('[class*="channelTextArea"]');
            const form = composer ? composer.closest('form') : null;
            const active = document.activeElement;
            const vvBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
            const chain = [];
            for (let element = composer || form, depth = 0; element && depth < 18;
                element = element.parentElement, depth++) {
                chain.push(inspect(element, vvBottom));
            }
            for (const element of [document.body, document.documentElement]) {
                if (element && !(composer && composer.contains(element))) {
                    if (!chain.some((item) => item.element === elementName(element))) {
                        chain.push(inspect(element, vvBottom));
                    }
                }
            }
            const snapshot = {
                event: reason,
                timestamp: new Date().toISOString(),
                fixEnabled: keyboardFixEnabled,
                userAgent: navigator.userAgent,
                focusedEditor: !!(active && composer && composer.contains(active)),
                editor: active && active.tagName ? active.tagName.toLowerCase() : 'none',
                window: {
                    innerHeight: round(window.innerHeight),
                    outerHeight: round(window.outerHeight),
                    innerWidth: round(window.innerWidth),
                    scrollY: round(window.scrollY),
                    devicePixelRatio: round(window.devicePixelRatio),
                },
                document: {
                    clientHeight: round(document.documentElement.clientHeight),
                    bodyClientHeight: round(document.body.clientHeight),
                    scrollingHeight: round(document.scrollingElement && document.scrollingElement.scrollHeight),
                },
                screen: {
                    height: round(window.screen && window.screen.height),
                    width: round(window.screen && window.screen.width),
                },
                visualViewport: viewport ? {
                    height: round(viewport.height), width: round(viewport.width),
                    offsetTop: round(viewport.offsetTop),
                    pageTop: round(viewport.pageTop),
                    scale: round(viewport.scale),
                    bottom: round(vvBottom),
                } : null,
                form: form ? inspect(form, vvBottom) : null,
                ancestors: chain,
            };
            return { snapshot, composer, form };
        }

        const panel = document.createElement('section');
        panel.setAttribute('data-bd-debug', 'true');
        panel.setAttribute('aria-label', 'Better Discord layout diagnostics');
        panel.style.cssText = [
            'position:fixed!important', 'top:52px!important', 'left:6px!important',
            'z-index:2147483647!important', 'box-sizing:border-box!important',
            'width:min(390px,calc(100vw - 12px))!important',
            'max-height:45vh!important', 'overflow:auto!important',
            'background:#101827!important', 'color:#f8fafc!important',
            'border:2px solid #fbbf24!important', 'border-radius:8px!important',
            'box-shadow:0 2px 16px #000!important', 'padding:7px!important',
            'font:12px/1.35 monospace!important', 'text-align:left!important',
        ].join(';');

        const header = document.createElement('div');
        header.textContent = 'Discord layout debug 1.0.10 (Android only)';
        header.style.cssText = 'font-weight:700!important;margin-bottom:6px!important';
        panel.appendChild(header);
        const controls = document.createElement('div');
        controls.style.cssText = 'display:flex!important;gap:4px!important;flex-wrap:wrap!important;margin-bottom:5px!important';
        panel.appendChild(controls);
        const output = document.createElement('pre');
        output.style.cssText = [
            'display:block!important', 'white-space:pre-wrap!important', 'overflow-wrap:anywhere!important',
            'color:#e2e8f0!important', 'font:11px/1.3 monospace!important',
            'margin:0!important', 'padding:0!important', 'background:transparent!important',
        ].join(';');
        panel.appendChild(output);
        document.body.appendChild(panel);

        function button(title, action) {
            const item = document.createElement('button');
            item.textContent = title;
            item.type = 'button';
            item.style.cssText = [
                'display:inline-block!important', 'background:#334155!important',
                'color:#fff!important', 'border:1px solid #94a3b8!important',
                'border-radius:4px!important', 'font:12px monospace!important',
                'padding:5px 7px!important', 'min-height:30px!important',
            ].join(';');
            item.addEventListener('click', action);
            controls.appendChild(item);
            return item;
        }

        const fixButton = button('Fix: OFF', () => {
            keyboardFixEnabled = !keyboardFixEnabled;
            fixButton.textContent = keyboardFixEnabled ? 'Fix: ON' : 'Fix: OFF';
            scheduleKeyboardFix();
            schedule('toggle-fix');
            window.setTimeout(() => schedule('toggle-settled'), 180);
        });

        function exportReport() {
            return JSON.stringify({
                tool: 'Better Discord Android layout diagnostics 1.0.10',
                note: 'Geometry and styles only; no messages, URL, cookies or tokens are collected.',
                samples,
            }, null, 2);
        }

        button('Capture', () => sample('manual-capture'));
        const copyButton = button('Copy log', () => {
            const text = exportReport();
            function fallback() {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.cssText = 'position:fixed;top:5px;left:5px;z-index:2147483647';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                const copied = typeof document.execCommand === 'function' && document.execCommand('copy');
                textarea.remove();
                copyButton.textContent = copied ? 'Copied' : 'Use Save JSON';
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    copyButton.textContent = 'Copied';
                }).catch(fallback);
            } else {
                fallback();
            }
        });
        button('Save JSON', () => {
            const blob = new Blob([exportReport()], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'better-discord-layout-debug.json';
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 2000);
        });
        button('Close', () => {
            visible = false;
            for (const layer of layers) {
                layer.remove();
            }
            panel.remove();
            // Restore normal behavior for the remainder of this page visit.
            keyboardFixEnabled = true;
            scheduleKeyboardFix();
        });

        function layer() {
            const element = document.createElement('div');
            element.setAttribute('data-bd-debug', 'true');
            element.style.cssText = [
                'position:fixed!important', 'pointer-events:none!important',
                'z-index:2147483646!important', 'box-sizing:border-box!important',
            ].join(';');
            document.body.appendChild(element);
            layers.push(element);
            return element;
        }

        const outlines = [
            { label: 'COMPOSER', color: '#fb923c', element: null, node: layer() },
            { label: 'FORM', color: '#38bdf8', element: null, node: layer() },
            { label: 'CHAT', color: '#d946ef', element: null, node: layer() },
            { label: 'APP', color: '#4ade80', element: null, node: layer() },
        ];
        const viewportLine = layer();
        const gapLayer = layer();

        function positionLayers(composer, form, snapshot) {
            const app = document.getElementById('app-mount');
            let chat = null;
            for (let node = form && form.parentElement; node && node !== app; node = node.parentElement) {
                if (node.className && typeof node.className === 'string' &&
                    /(?:chat|content|container|page)/i.test(node.className) &&
                    box(node) && box(node).height > 150) {
                    chat = node;
                }
            }
            const items = [composer, form, chat, app];
            outlines.forEach((entry, index) => {
                const rect = box(items[index]);
                entry.node.style.display = rect && rect.height > 0 ? 'block' : 'none';
                if (!rect || rect.height <= 0) {
                    return;
                }
                entry.node.style.left = rect.left + 'px';
                entry.node.style.top = rect.top + 'px';
                entry.node.style.width = rect.width + 'px';
                entry.node.style.height = rect.height + 'px';
                entry.node.style.outline = '2px solid ' + entry.color;
            });
            const bottom = snapshot.visualViewport ? snapshot.visualViewport.bottom : snapshot.window.innerHeight;
            viewportLine.style.left = '0px';
            viewportLine.style.top = bottom + 'px';
            viewportLine.style.width = '100vw';
            viewportLine.style.borderTop = '3px dashed #facc15';
            const composerBottom = box(form) && box(form).bottom;
            const gap = bottom - composerBottom;
            gapLayer.style.display = Number.isFinite(gap) && gap > 8 ? 'block' : 'none';
            if (Number.isFinite(gap) && gap > 8) {
                gapLayer.style.left = '0px';
                gapLayer.style.top = composerBottom + 'px';
                gapLayer.style.width = '100vw';
                gapLayer.style.height = gap + 'px';
                gapLayer.style.background = 'rgba(239,68,68,.13)';
            }
        }

        function sample(reason) {
            if (!visible) {
                return;
            }
            const result = inspectNow(reason);
            samples.push(result.snapshot);
            if (samples.length > 16) {
                samples.shift();
            }
            const s = result.snapshot;
            const currentBottom = s.visualViewport ? s.visualViewport.bottom : s.window.innerHeight;
            const gap = s.form && s.form.rect ? round(currentBottom - s.form.rect.bottom) : null;
            const lines = [
                'Fix ' + (keyboardFixEnabled ? 'ON' : 'OFF') +
                    ' | focused ' + s.focusedEditor + ' | gap ' + gap + 'px',
                'innerH ' + s.window.innerHeight + ' | clientH ' + s.document.clientHeight,
                'vvH ' + (s.visualViewport && s.visualViewport.height) +
                    ' | vvTop ' + (s.visualViewport && s.visualViewport.offsetTop) +
                    ' | vvBottom ' + currentBottom,
                'colors: orange composer, cyan form, purple chat, green app',
                'yellow dashed line = visual viewport bottom',
                '--- ancestor bottoms (gap to viewport) ---',
                ...s.ancestors.slice(0, 10).map((item) =>
                    item.element.slice(0, 31) + ': ' +
                    (item.rect && item.rect.bottom) + ' (gap ' + item.gapToViewportBottom + ')'),
                'samples stored: ' + samples.length + ' | last: ' + reason,
            ];
            output.textContent = lines.join('\n');
            panel.style.top = Math.max(5, (s.visualViewport ? s.visualViewport.offsetTop : 0) + 8) + 'px';
            panel.style.maxHeight = Math.max(110, Math.min(315,
                (s.visualViewport ? s.visualViewport.height : window.innerHeight) * 0.52)) + 'px';
            positionLayers(result.composer, result.form, s);
        }

        function schedule(reason) {
            if (!visible) {
                return;
            }
            pendingReason = reason;
            if (!frameId) {
                frameId = window.requestAnimationFrame(() => {
                    frameId = 0;
                    sample(pendingReason);
                });
            }
        }

        document.addEventListener('focusin', () => {
            schedule('focusin');
            for (const delay of [120, 350, 800]) {
                window.setTimeout(() => schedule('focus+' + delay + 'ms'), delay);
            }
        });
        document.addEventListener('focusout', () => {
            schedule('focusout');
            window.setTimeout(() => schedule('blur+180ms'), 180);
        });
        if (viewport) {
            viewport.addEventListener('resize', () => schedule('visualViewport.resize'));
            viewport.addEventListener('scroll', () => schedule('visualViewport.scroll'));
        }
        window.addEventListener('resize', () => schedule('window.resize'));
        window.addEventListener('orientationchange', () => schedule('orientationchange'));
        sample('initial');
        return () => schedule('composer-mutation');
    }

    function init() {
        const scheduleKeyboardFix = initAndroidEdgeKeyboardFix();
        const scheduleDiagnostics = initAndroidLayoutDiagnostics(scheduleKeyboardFix);
        simplifyComposer();
        scheduleKeyboardFix();
        scheduleDiagnostics();

        if (!document.body) {
            return;
        }

        const observer = new MutationObserver((records) => {
            // Our own diagnostic text/outline updates must not feed back into
            // the Discord layout mutation observer.
            if (records.length && records.every((record) => {
                const target = record.target && (record.target.nodeType === 1
                    ? record.target : record.target.parentElement);
                return target && target.closest &&
                    target.closest('[data-bd-debug]');
            })) {
                return;
            }
            simplifyComposer();
            scheduleKeyboardFix();
            scheduleDiagnostics();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
