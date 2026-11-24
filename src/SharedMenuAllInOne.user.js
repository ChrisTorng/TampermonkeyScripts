// ==UserScript==
// @name         Shared Floating Menu — All in One
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts/all-in-one
// @version      2026-11-24_1.0.5
// @description  Bundle five shared floating-menu scripts in one install, with immediate main-version notices.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/main/src/SharedMenuAllInOne.user.js
// @updateURL    https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/main/src/SharedMenuAllInOne.meta.js
// @match        *://*/*
// @run-at       document-start
// @sandbox      raw
// @grant        GM_info
// @grant        GM_openInTab
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// ==/UserScript==


(function () {
    'use strict';
    // Runtime dispatch preserves the exact original userscript scope.
    function matchesPattern(pattern, url) {
        const parts = pattern.split('*');
        if (parts.length === 1) return pattern === url;
        if (!url.startsWith(parts[0])) return false;
        let offset = parts[0].length;
        for (let i = 1; i < parts.length - 1; i++) {
            const index = url.indexOf(parts[i], offset);
            if (index < 0) return false;
            offset = index + parts[i].length;
        }
        return url.slice(offset).endsWith(parts[parts.length - 1]);
    }
    function applies(matches, excludes) {
        const url = location.href;
        return matches.some(pattern => matchesPattern(pattern, url))
            && !excludes.some(pattern => matchesPattern(pattern, url));
    }
    const __tmOriginalGMInfo = typeof GM_info === "undefined" ? null : GM_info;
    // BEGIN BUNDLED AllGoInternetArchive
    if (applies(["*://*/*"], ["*://christorng.idv.tw/*","*://*.christorng.idv.tw/*","*://hackernews.betacat.io/*","*://*.hackernews.betacat.io/*","*://theneurondaily.com/*","*://*.theneurondaily.com/*","*://tam.gov.taipei/*","*://*.tam.gov.taipei/*","*://wiwi.*/*","*://*.wiwi.*/*","*://*.kagi.com/*","*://kagi.com/*","*://chatgpt.com/*","*://*.chatgpt.com/*","*://christorng.github.io/*","*://github.com/*","*://*.github.com/*","*://discord.com/*","*://*.discord.com/*","*://ebird.org/*","*://*.ebird.org/*","*://newsminimalist.com/*","*://*.newsminimalist.com/*","*://*ycombinator.com/*","*://huggingface.co/*","*://*.huggingface.co/*","*://youtube.com/*","*://*.youtube.com/*","*://x.com/*","*://*.x.com/*","*://nitter.net/*","*://*.nitter.net/*","*://bing.com/*","*://*.bing.com/*","*://wikipedia.org/*","*://*.wikipedia.org/*","*://reddit.com/*","*://*.reddit.com/*","*://arxiv.org/*","*://*.arxiv.org/*","*://cht.com.tw/*","*://*.cht.com.tw/*","*://*.vercel.app/*","*://vercel.app/*","*://openai.com/*","*://*.openai.com/*","*://anthropic.com/*","*://*.anthropic.com/*","*://claude.ai/*","*://*.claude.ai/*","*://google.com/*","*://*.google.com/*","*://facebook.com/*","*://*.facebook.com/*","*://*.cwa.gov.tw/*","*://cwa.gov.tw/*","*://chrisrtxubuntu:*/*","*://microsoft.com/*","*://*.microsoft.com/*","*://instagram.com/*","*://*.instagram.com/*"])) {
        try {
        const GM_info = __tmOriginalGMInfo ? Object.assign({}, __tmOriginalGMInfo, { script: Object.assign({}, __tmOriginalGMInfo.script, { matches: ["*://*/*"], excludes: ["*://christorng.idv.tw/*","*://*.christorng.idv.tw/*","*://hackernews.betacat.io/*","*://*.hackernews.betacat.io/*","*://theneurondaily.com/*","*://*.theneurondaily.com/*","*://tam.gov.taipei/*","*://*.tam.gov.taipei/*","*://wiwi.*/*","*://*.wiwi.*/*","*://*.kagi.com/*","*://kagi.com/*","*://chatgpt.com/*","*://*.chatgpt.com/*","*://christorng.github.io/*","*://github.com/*","*://*.github.com/*","*://discord.com/*","*://*.discord.com/*","*://ebird.org/*","*://*.ebird.org/*","*://newsminimalist.com/*","*://*.newsminimalist.com/*","*://*ycombinator.com/*","*://huggingface.co/*","*://*.huggingface.co/*","*://youtube.com/*","*://*.youtube.com/*","*://x.com/*","*://*.x.com/*","*://nitter.net/*","*://*.nitter.net/*","*://bing.com/*","*://*.bing.com/*","*://wikipedia.org/*","*://*.wikipedia.org/*","*://reddit.com/*","*://*.reddit.com/*","*://arxiv.org/*","*://*.arxiv.org/*","*://cht.com.tw/*","*://*.cht.com.tw/*","*://*.vercel.app/*","*://vercel.app/*","*://openai.com/*","*://*.openai.com/*","*://anthropic.com/*","*://*.anthropic.com/*","*://claude.ai/*","*://*.claude.ai/*","*://google.com/*","*://*.google.com/*","*://facebook.com/*","*://*.facebook.com/*","*://*.cwa.gov.tw/*","*://cwa.gov.tw/*","*://chrisrtxubuntu:*/*","*://microsoft.com/*","*://*.microsoft.com/*","*://instagram.com/*","*://*.instagram.com/*"] }) }) : undefined;


(function() {
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

    // visualViewport.scale includes Edge's automatic shrink-to-fit, not only a pinch.
    // Inverse-scaling this menu alone preserves its normal 38 x 32 CSS-pixel
    // apparent size without changing the page viewport, text, or layout.
    function floatingMenuViewportScale() {
        const scale = window.visualViewport && window.visualViewport.scale;
        return Number.isFinite(scale) && scale > 0 ? scale : 1;
    }

    function floatingMenuPositionDialog(root) {
        const dialog = root.querySelector('[data-floating-dialog]');
        if (!dialog || dialog.hidden) return;
        const viewport = window.visualViewport;
        const viewportLeft = viewport ? viewport.offsetLeft : 0;
        const viewportWidth = viewport ? viewport.width : window.innerWidth;
        const inverseScale = 1 / floatingMenuViewportScale();
        // Account for the parent's transform when keeping the settings panel
        // within the visible viewport. Its own readable size remains <= 290px.
        const width = Math.max(1, Math.min(290, viewportWidth / inverseScale - 24));
        const renderedWidth = width * inverseScale;
        const margin = 12 * inverseScale;
        const rect = root.getBoundingClientRect();
        const left = Math.max(viewportLeft + margin,
            Math.min(rect.right - renderedWidth,
                viewportLeft + viewportWidth - renderedWidth - margin));
        dialog.style.setProperty('width', `${width}px`, 'important');
        dialog.style.setProperty('left', `${(left - rect.left) / inverseScale}px`, 'important');
        dialog.style.setProperty('right', 'auto', 'important');
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
        floatingMenuPositionDialog(root);
    }


    // Do not rely on font glyphs or pseudo-elements for critical controls:
    // archive snapshots and browser translation can override their styles.
    // An SVG path with an explicit white stroke remains legible on the dark menu.
    function floatingMenuEnsureIcons(root) {
        const white = '#f0f0f0';
        const namespace = 'http://www.w3.org/2000/svg';
        const glyphs = [
            ['data-floating-toggle', 'menu', 'M4 6H20 M4 12H20 M4 18H20'],
            ['data-floating-close', 'close', 'M5 5L19 19 M19 5L5 19']
        ];
        root.setAttribute('data-floating-glyphs', 'svg-v1');
        for (const [attribute, name, lines] of glyphs) {
            const button = root.querySelector('[' + attribute + ']');
            if (!button) continue;
            if (button.querySelector('[data-floating-svg-icon]')) continue;
            button.textContent = '';
            const svg = document.createElementNS(namespace, 'svg');
            svg.setAttribute('data-floating-svg-icon', name);
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('focusable', 'false');
            svg.style.setProperty('display', 'block', 'important');
            svg.style.setProperty('width', '22px', 'important');
            svg.style.setProperty('height', '22px', 'important');
            svg.style.setProperty('flex', '0 0 22px', 'important');
            svg.style.setProperty('pointer-events', 'none', 'important');
            const path = document.createElementNS(namespace, 'path');
            path.setAttribute('d', lines);
            path.setAttribute('stroke', white);
            path.setAttribute('stroke-width', '2.6');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('fill', 'none');
            path.style.setProperty('stroke', white, 'important');
            path.style.setProperty('stroke-width', '2.6', 'important');
            path.style.setProperty('fill', 'none', 'important');
            svg.appendChild(path);
            button.appendChild(svg);
        }
        // A newer script can attach to a menu created by an older installed script.
        // Repair that style in-place; old script observers may reattach the same node.
        const sheet = document.getElementById(FLOATING_MENU_ID + '-style');
        const marker = '/* tm-floating-svg-glyphs-v1 */';
        if (sheet && !sheet.textContent.includes(marker)) {
            sheet.textContent += '\n' + marker + '\n' + [
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-toggle]::before,',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-toggle]::after,',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-close]::before,',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-close]::after {',
                '  content: none !important; display: none !important;',
                '}',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-toggle],',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-close] {',
                '  display: flex !important; align-items: center !important;',
                '  justify-content: center !important; color: #f0f0f0 !important;',
                '}'
            ].join('\n');
        }
    }

    function floatingMenuRoot() {
        let root = document.getElementById(FLOATING_MENU_ID);
        if (root) {
            floatingMenuEnsureIcons(root);
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
            #${FLOATING_MENU_ID} [data-floating-toggle] { cursor: move !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 0 !important; line-height: 0 !important; }
            #${FLOATING_MENU_ID} [data-floating-toggle]::before { content: '' !important; display: block !important; width: 20px !important; height: 2px !important; background: #f0f0f0 !important; box-shadow: 0 -6px 0 #f0f0f0, 0 6px 0 #f0f0f0 !important; }
            #${FLOATING_MENU_ID} [data-floating-close] { font-size: 0 !important; line-height: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; }
            #${FLOATING_MENU_ID} [data-floating-close]::before, #${FLOATING_MENU_ID} [data-floating-close]::after { content: '' !important; position: absolute !important; width: 20px !important; height: 2px !important; background: #f0f0f0 !important; }
            #${FLOATING_MENU_ID} [data-floating-close]::before { transform: rotate(45deg) !important; }
            #${FLOATING_MENU_ID} [data-floating-close]::after { transform: rotate(-45deg) !important; }
            #${FLOATING_MENU_ID} { -webkit-text-size-adjust: none !important; text-size-adjust: none !important; }
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
            ['reset', 'Reset floating button position'],
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
        floatingMenuEnsureIcons(root);
        // Use document coordinates so pinch zoom does not anchor the menu to the visual viewport.
        document.documentElement.appendChild(root);

        const settings = floatingMenuSettings();
        let anchorX = Number.isFinite(settings.x) ? settings.x : null;
        let anchorY = Number.isFinite(settings.y) ? Math.max(0, settings.y) : 70;
        // Fixed positioning prevents the menu from changing document scrollWidth.
        // The visual viewport can differ from the layout viewport on legacy mobile pages.
        const menuWidth = 38;
        // This legacy desktop-width document places CSS-fixed controls outside
        // the visual scrolling viewport on Android Edge. Use a bounded document
        // position for it; other sites retain their existing fixed behavior.
        const documentDock = /(^|\.)openssh\.org$/i.test(location.hostname)
            && location.pathname === '/releasenotes.html';
        const layoutWidth = () => Math.max(menuWidth, Math.min(
            window.innerWidth || menuWidth,
            document.documentElement.clientWidth || window.innerWidth || menuWidth));
        const visualBounds = () => {
            const viewport = window.visualViewport;
            return {
                left: viewport ? viewport.offsetLeft : 0,
                top: viewport ? viewport.offsetTop : 0,
                width: Math.max(menuWidth, viewport ? viewport.width : layoutWidth()),
            };
        };
        const clampX = (x) => {
            const viewport = visualBounds();
            // A transformed menu grows left from its right edge; keep the
            // enlarged hit target visible when a saved position is near x=0.
            const visibleWidth = Math.min(viewport.width,
                menuWidth / floatingMenuViewportScale());
            return Math.max(viewport.left + visibleWidth - menuWidth,
                Math.min(x, viewport.left + viewport.width - menuWidth));
        };
        const scrollX = () => Math.max(0, window.scrollX || 0);
        // Older pages and mobile browser engines can scroll through body/html
        // while window.scrollY remains zero; read all root-scroller representations.
        const scrollY = () => {
            const viewport = window.visualViewport;
            const viewportPageScroll = viewport && Number.isFinite(viewport.pageTop)
                ? viewport.pageTop - (viewport.offsetTop || 0) : 0;
            return Math.max(0, window.scrollY || 0,
                document.scrollingElement ? document.scrollingElement.scrollTop || 0 : 0,
                document.documentElement.scrollTop || 0,
                document.body ? document.body.scrollTop || 0 : 0,
                viewportPageScroll);
        };
        // Capture an overflow ceiling before moving the menu. Never let the
        // absolutely-positioned handle enlarge the document and then chase it.
        const unzoomedDocumentWidth = Math.max(
            layoutWidth(), document.documentElement.scrollWidth || 0);
        const pageTop = () => {
            const viewport = window.visualViewport;
            return Math.max(scrollY(), viewport && Number.isFinite(viewport.pageTop)
                ? viewport.pageTop : 0);
        };
        const pageLeft = () => {
            const viewport = window.visualViewport;
            return Math.max(scrollX(), viewport && Number.isFinite(viewport.pageLeft)
                ? viewport.pageLeft : 0);
        };
        const dockX = () => {
            const viewport = visualBounds();
            const relativeX = anchorX === null ? viewport.width - menuWidth : anchorX;
            return Math.max(0, Math.min(
                pageLeft() + Math.max(0, Math.min(relativeX, viewport.width - menuWidth)),
                unzoomedDocumentWidth - menuWidth));
        };
        let documentY = anchorY;
        let previousScrollY = scrollY();
        // A scale change alone is NOT a pinch gesture. Legacy desktop-width pages
        // (e.g. OpenSSH on Android) can auto-refit after load/translation or when
        // the browser toolbar moves, which previously froze the vertical menu.
        let normalScale = window.visualViewport ? window.visualViewport.scale : 1;
        let pinchGestureArmed = false;
        const zoomed = () => {
            if (!window.visualViewport) return false;
            const current = window.visualViewport.scale;
            if (!pinchAnchored && !pinchGestureArmed) normalScale = current;
            return (pinchAnchored || pinchGestureArmed) && current > normalScale * 1.01;
        };
        document.addEventListener('touchstart', (event) => {
            if (!pinchAnchored && event.touches && event.touches.length >= 2) {
                normalScale = window.visualViewport ? window.visualViewport.scale : 1;
                pinchGestureArmed = true;
            }
        }, { capture: true, passive: true });
        document.addEventListener('touchend', (event) => {
            if (!pinchAnchored && (!event.touches || event.touches.length < 2)) {
                pinchGestureArmed = false;
            }
        }, { capture: true, passive: true });
        document.addEventListener('touchcancel', () => {
            if (!pinchAnchored) pinchGestureArmed = false;
        }, { capture: true, passive: true });
        const scaleControlOnly = () => {
            const inverseScale = 1 / floatingMenuViewportScale();
            if (Math.abs(inverseScale - 1) < 0.01) {
                root.style.removeProperty('transform');
                root.style.removeProperty('transform-origin');
            } else {
                root.style.setProperty('transform', `scale(${inverseScale})`, 'important');
                root.style.setProperty('transform-origin', 'top right', 'important');
            }
        };
        const place = (x, y, fixed) => {
            root.style.setProperty('position', fixed ? 'fixed' : 'absolute', 'important');
            root.style.setProperty('left', `${x}px`, 'important');
            root.style.setProperty('top', `${y}px`, 'important');
            root.style.setProperty('right', 'auto', 'important');
            scaleControlOnly();
            floatingMenuPositionDialog(root);
        };
        let pinchAnchored = false;
        const position = () => {
            if (dragging) return;
            if (zoomed()) {
                if (!pinchAnchored) {
                    // Freeze the document position when pinch-zoom starts. Switching
                    // from fixed to absolute stops following the visual viewport.
                    if (!documentDock) {
                        const documentWidth = Math.max(unzoomedDocumentWidth, layoutWidth(), document.documentElement.scrollWidth || 0);
                        const x = Math.max(0, Math.min(scrollX() + parseFloat(root.style.left), documentWidth - menuWidth));
                        place(x, scrollY() + parseFloat(root.style.top), false);
                    }
                    pinchAnchored = true;
                }
                // Preserve existing document anchoring during a pinch; resize
                // only the menu and its child controls, never the webpage.
                scaleControlOnly();
                floatingMenuPositionDialog(root);
                return;
            }
            if (pinchAnchored) {
                pinchAnchored = false;
                pinchGestureArmed = false;
                previousScrollY = scrollY();
            }
            const currentScrollY = scrollY();
            // A temporary placement returns smoothly to the saved clearance on the way up.
            if (currentScrollY < previousScrollY && previousScrollY > 0) {
                documentY = anchorY + (documentY - anchorY) * currentScrollY / previousScrollY;
            }
            if (currentScrollY >= Math.max(documentY, anchorY)) documentY = anchorY;
            previousScrollY = currentScrollY;
            const viewport = visualBounds();
            const x = anchorX === null ? viewport.width - menuWidth : anchorX;
            // CSS position:fixed uses the layout viewport's top. Adding
            // visualViewport.offsetTop here double-counts mobile viewport
            // panning on desktop-width pages, leaving the handle far below
            // the top until translation changes the page's reflow.
            if (documentDock) {
                place(dockX(), Math.max(documentY, pageTop()), false);
            } else {
                place(clampX(viewport.left + x),
                    Math.max(documentY, currentScrollY) - currentScrollY, true);
            }
        };

        let dragging = false;
        let moved = false;
        let startX = 0;
        let startY = 0;
        let originX = 0;
        let originY = 0;
        // Start inside the visual viewport without contributing to page overflow.
        const viewport = visualBounds();
        if (documentDock) {
            place(dockX(), Math.max(anchorY, pageTop()), false);
        } else {
            place(clampX(viewport.left + (anchorX === null ? viewport.width - menuWidth : anchorX)),
                Math.max(anchorY - scrollY(), 0), true);
        }
        window.addEventListener('scroll', position, { passive: true });
        // Capture scroll on body/html in browsers that don't forward it to window.
        document.addEventListener('scroll', position, { capture: true, passive: true });
        window.addEventListener('resize', position);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', position);
            window.visualViewport.addEventListener('scroll', position);
        }
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
            const x = clampX(originX + point.clientX - startX);
            const y = Math.max(0,
                Math.min(originY + point.clientY - startY,
                    (window.visualViewport ? window.visualViewport.height : window.innerHeight) - 32));
            if (documentDock) {
                const documentX = Math.max(0, Math.min(pageLeft() + x - visualBounds().left,
                    unzoomedDocumentWidth - menuWidth));
                place(documentX, pageTop() + y, false);
            } else {
                place(x, y, true);
            }
        };
        const onEnd = () => {
            if (!dragging) return;
            dragging = false;
            if (moved) {
                const next = floatingMenuSettings();
                anchorX = parseFloat(root.style.left) - (documentDock ? pageLeft() : visualBounds().left);
                documentY = parseFloat(root.style.top) + (documentDock ? 0 : scrollY());
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
            if (zoomed() || pinchGestureArmed) return;
            const point = pointer(event);
            dragging = true;
            moved = false;
            startX = point.clientX;
            startY = point.clientY;
            originX = parseFloat(root.style.left) - (documentDock ? pageLeft() - visualBounds().left : 0);
            originY = parseFloat(root.style.top) - (documentDock ? pageTop() : 0);
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
            if (scope === 'reset') {
                const next = floatingMenuSettings();
                delete next.x;
                delete next.y;
                floatingMenuSave(next);
                anchorX = null;
                anchorY = 70;
                documentY = anchorY;
                previousScrollY = scrollY();
                // Reset just the floating position. Reloading would restart
                // browser translation and can disturb the article's layout.
                floatingMenuCollapse(root);
                position();
                return;
            }
            const next = floatingMenuSettings();
            if (scope === 'domain') next.disabledDomain = true;
            if (scope === 'path') next.disabledPaths = [...new Set([...(next.disabledPaths || []), floatingMenuFolderPath()])];
            if (scope === 'page') next.disabledPages = [...new Set([...(next.disabledPages || []), floatingMenuPageKey()])];
            floatingMenuSave(next);
            window.location.reload();
        });
        // Translation and client-side navigation can remove an injected menu
        // after early userscripts register their buttons. Keep those actions alive.
        let observedHtml = document.documentElement;
        const menuObserver = new MutationObserver((records) => {
            const html = document.documentElement;
            if (!html) return;
            if (html !== observedHtml) {
                observedHtml = html;
                menuObserver.observe(html, { childList: true });
            }
            if (!style.isConnected) (document.head || html).appendChild(style);
            if (!root.isConnected) {
                const replacement = document.getElementById(FLOATING_MENU_ID);
                if (replacement && replacement !== root) {
                    Array.from(replacement.querySelectorAll('[data-floating-tool]')).forEach((button) => {
                        const key = button.getAttribute('data-floating-tool');
                        if (!root.querySelector(`[data-floating-tool="${key}"]`)) root.appendChild(button);
                    });
                    replacement.remove();
                }
                html.appendChild(root);
                floatingMenuRender(root);
            }
            let changed = false;
            for (const record of records) {
                if (record.target !== root) continue;
                for (const button of record.removedNodes) {
                    if (button.nodeType !== 1 || !button.hasAttribute('data-floating-tool')
                        || button.isConnected) continue;
                    const key = button.getAttribute('data-floating-tool');
                    if (root.querySelector(`[data-floating-tool="${key}"]`)) continue;
                    root.appendChild(button);
                    changed = true;
                }
            }
            if (changed) floatingMenuRender(root);
        });
        // Observe only structural changes, not all content mutations.
        menuObserver.observe(document, { childList: true });
        menuObserver.observe(observedHtml, { childList: true });
        menuObserver.observe(root, { childList: true });
        return root;
    }

    function registerFloatingButton(key, button, available = true) {
        if (floatingMenuDisabled()) return;
        const root = floatingMenuRoot();
        button.setAttribute('data-floating-tool', key);
        button.setAttribute('data-floating-available', String(available));
        button.addEventListener('click', () => floatingMenuCollapse(
            button.parentNode && button.parentNode.id === FLOATING_MENU_ID ? button.parentNode : root));
        root.appendChild(button);
        floatingMenuRender(root);
    }

    function setFloatingButtonAvailable(button, available) {
        if (!button.parentNode || button.parentNode.id !== FLOATING_MENU_ID) return;
        button.setAttribute('data-floating-available', String(available));
        floatingMenuRender(button.parentNode);
    }
    // END SHARED FLOATING MENU

    // Ensure execution only in the top-level window
    if (window !== window.top) {
        return;
    }
    if (floatingMenuForbiddenHost()) return;

    const hostname = window.location.hostname.toLowerCase();
    const archiveTodayHosts = new Set([
        'archive.is',
        'archive.ph',
        'www.404media.co',
        'www.bloomberg.com',
        'www.economist.com',
        'www.ft.com',
        'www.nature.com',
        'www.newscientist.com',
        'www.newyorker.com',
        'www.nytimes.com',
        'www.theatlantic.com',
        'www.wired.com',
        'www.wsj.com',
    ]);
    const isArchiveTodayHost = archiveTodayHosts.has(hostname);
    const excludedHosts = new Set(['web.archive.org', 'archive.is', 'archive.ph']);

    if (excludedHosts.has(hostname)) {
        return;
    }

    const archiveTodayIconUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAABTVBMVEX///8AAADz8/Pr6+vj4+Pw8PD29vaB//94eHheXl5vb2++vr6lpaUvLy9HR0d6///Y2NhlZWWfn58RERGIiIh+fn5YWFgjIyNMTExRUVGWlpbHx8ewsLAcHBySfI4wKy8iRSwtSDlgS1TVztGgkKAFDQVKuFx9/6QZQCN4+a8xck1WvY1n7b0cSjk4Jip0aXQmbyV//4qF/5ssYzVawXiF/8gTLx6B/+Ne2bljzmJw5310/6Fs66skUjyN//Yra1wQOhA5gTkgSSASLBNMl1tp4YZn3o9p1aUPJBkva1Nj08Bh4M46Kzps9mx8/3xTtWM4fkhAk2RKn3tBkHIZQj1y/95d39tvV1lCmkKK/51Gn1KB/9MKMREaPzaVgZBd2HsmOztSpnR0/8BMODho375AkYI4jo4QJyFStKpWtJEpcnIYCg4jVFACGhhImJUNUiOiAAAB30lEQVQ4jW2T+1+aUBjGX0Q5igReV97KrQhwUaOGp8202sxLhVlJuzDdshmtWf//j6MUGpfnBz7nvOd7nsP7wAGwlCACBY6i4RDpVQSSznoqHexge1CxDNDgVSqcTcyr8Xg0Grz/lQ3QVNbnwFAsLMzHi6GlXNgjMr9QyNpAJMMGncDEk2Hbbsl3AkDR6qE0H9uRLK+UCeL1m9V5NeIQM2CNXxdEqfJ2Q96cVUPO0vNz652yvfNeUKsq3k1TNvDisMV/UD7uCDVpr97A+4QPWD1QDj99bh61Wu1OVz4+2fQCp5rWU8Szfr9/fnHZwGiQcAPkQU/T1g+3BUkaj+tYx1df3MDa157Wa54ptZog6dWGjrlFN7CsKcq370fWftVodJGlgRvI/xBFsVMVxXK5LPPD4WCQdgOjn4IgNVtjVTUwqj85/HIDBSuB2vX10ysaWEaY4248bfKS1UB33G7v/j6eoAZ3m/IAo3Njr0JUJpPbiWnecVzaF3Wp3t34c2ElgIbocWrGfQDwho47WOfu7zh0T/s/FsBfK2IZnUzR1UMGggAYlfan5sOjeUNBMABAFpliwal6AIqh2ViSpmNsLp/wAVSMTTKUPS9kc2zx+Z90APKFtiH473YHXv/8DPgHzf5GQr2yBUMAAAAASUVORK5CYII=';
    const archiveTodayIconSymbol = Symbol('archiveTodayIconElement');

    function createArchiveTodayIconWrapper() {
        const wrapper = document.createElement('span');
        wrapper.className = 'agi-archive-today-icon';
        wrapper.style.display = 'inline-block';
        wrapper.style.verticalAlign = 'middle';
        wrapper.style.lineHeight = '1';
        wrapper.style.margin = '0 4px';
        
        const icon = document.createElement('img');
        icon.src = archiveTodayIconUrl;
        icon.alt = 'Archive Today';
        icon.style.width = '16px';
        icon.style.height = '16px';
        icon.style.borderRadius = '2px';
        icon.style.display = 'block';
        icon.style.margin = '0';

        wrapper.appendChild(icon);
        return wrapper;
    }

    function removeArchiveTodayIcon(link) {
        const existing = link[archiveTodayIconSymbol];
        if (existing) {
            if (typeof existing.remove === 'function') {
                existing.remove();
            } else if (existing.parentNode) {
                existing.parentNode.removeChild(existing);
            }
            delete link[archiveTodayIconSymbol];
        }
    }

    function addArchiveTodayIcon(link) {
        if (link[archiveTodayIconSymbol]) {
            return;
        }

        const wrapper = createArchiveTodayIconWrapper();
        link.insertBefore(wrapper, link.firstChild);
        link[archiveTodayIconSymbol] = wrapper;
    }

    function updateArchiveTodayIcon(link) {
        if (!(link instanceof HTMLAnchorElement)) {
            return;
        }

        const href = link.getAttribute('href');
        if (!href) {
            removeArchiveTodayIcon(link);
            return;
        }

        let url;
        try {
            url = new URL(href, document.baseURI);
        } catch (error) {
            removeArchiveTodayIcon(link);
            return;
        }

        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            removeArchiveTodayIcon(link);
            return;
        }

        const linkHost = url.hostname.toLowerCase();
        if (archiveTodayHosts.has(linkHost)) {
            addArchiveTodayIcon(link);
        } else {
            removeArchiveTodayIcon(link);
        }
    }

    function updateArchiveTodayIconsInRoot(root) {
        if (!root || typeof root.querySelectorAll !== 'function') {
            return;
        }

        const links = root.querySelectorAll('a[href]');
        for (let i = 0; i < links.length; i += 1) {
            updateArchiveTodayIcon(links[i]);
        }
    }

    function processAddedNode(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        const element = node;
        const tagName = element.tagName ? element.tagName.toUpperCase() : '';
        if (tagName === 'A' && element.hasAttribute('href')) {
            updateArchiveTodayIcon(element);
        }

        updateArchiveTodayIconsInRoot(element);
    }

    function initializeArchiveTodayLinkIcons() {
        if (!document.body) {
            return;
        }

        updateArchiveTodayIconsInRoot(document);

        const observer = new MutationObserver((mutationsList) => {
            for (let i = 0; i < mutationsList.length; i += 1) {
                const mutation = mutationsList[i];
                if (mutation.type === 'childList') {
                    const addedNodes = mutation.addedNodes;
                    for (let j = 0; j < addedNodes.length; j += 1) {
                        processAddedNode(addedNodes[j]);
                    }
                } else if (mutation.type === 'attributes' &&
                           mutation.attributeName === 'href' &&
                           mutation.target &&
                           mutation.target.tagName &&
                           mutation.target.tagName.toUpperCase() === 'A') {
                    updateArchiveTodayIcon(mutation.target);
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href'],
        });
    }

    function onDocumentReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
        } else {
            callback();
        }
    }

    onDocumentReady(initializeArchiveTodayLinkIcons);

    if (floatingMenuDisabled()) return;

    function createFloatingGoButton() {
        if (!document.body) {
            return;
        }

        const goButton = document.createElement('button');
        goButton.type = 'button';
        goButton.textContent = '→';
        goButton.addEventListener('click', () => {
            const targetUrl = window.location.href;
            if (isArchiveTodayHost) {
                window.location.href = `https://archive.is/submit/?url=${targetUrl}`;
            } else {
                window.location.href = `https://web.archive.org/${targetUrl}`;
            }
        });
        registerFloatingButton('archive', goButton);
    }

    onDocumentReady(createFloatingGoButton);
})();

        } catch (error) { console.error("SharedMenuAllInOne: AllGoInternetArchive failed", error); }
    }
    // END BUNDLED AllGoInternetArchive
    // BEGIN BUNDLED InternetArchive
    if (applies(["https://web.archive.org/*","https://fortune.com/*","https://nautil.us/*","https://www.australiangeographic.com.au/*","https://www.bbc.com/*","https://www.cnbc.com/*","https://www.lrb.co.uk/*","https://www.scientificamerican.com/*","https://www.rawstory.com/*","https://www.scmp.com/*","https://www.smh.com.au/*","https://www.thetimes.com/*","https://www.theverge.com/*","https://www.washingtonpost.com/*"], ["*://christorng.idv.tw/*","*://*.christorng.idv.tw/*"])) {
        try {
        const GM_info = __tmOriginalGMInfo ? Object.assign({}, __tmOriginalGMInfo, { script: Object.assign({}, __tmOriginalGMInfo.script, { matches: ["https://web.archive.org/*","https://fortune.com/*","https://nautil.us/*","https://www.australiangeographic.com.au/*","https://www.bbc.com/*","https://www.cnbc.com/*","https://www.lrb.co.uk/*","https://www.scientificamerican.com/*","https://www.rawstory.com/*","https://www.scmp.com/*","https://www.smh.com.au/*","https://www.thetimes.com/*","https://www.theverge.com/*","https://www.washingtonpost.com/*"], excludes: ["*://christorng.idv.tw/*","*://*.christorng.idv.tw/*"] }) }) : undefined;


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

    // visualViewport.scale includes Edge's automatic shrink-to-fit, not only a pinch.
    // Inverse-scaling this menu alone preserves its normal 38 x 32 CSS-pixel
    // apparent size without changing the page viewport, text, or layout.
    function floatingMenuViewportScale() {
        const scale = window.visualViewport && window.visualViewport.scale;
        return Number.isFinite(scale) && scale > 0 ? scale : 1;
    }

    function floatingMenuPositionDialog(root) {
        const dialog = root.querySelector('[data-floating-dialog]');
        if (!dialog || dialog.hidden) return;
        const viewport = window.visualViewport;
        const viewportLeft = viewport ? viewport.offsetLeft : 0;
        const viewportWidth = viewport ? viewport.width : window.innerWidth;
        const inverseScale = 1 / floatingMenuViewportScale();
        // Account for the parent's transform when keeping the settings panel
        // within the visible viewport. Its own readable size remains <= 290px.
        const width = Math.max(1, Math.min(290, viewportWidth / inverseScale - 24));
        const renderedWidth = width * inverseScale;
        const margin = 12 * inverseScale;
        const rect = root.getBoundingClientRect();
        const left = Math.max(viewportLeft + margin,
            Math.min(rect.right - renderedWidth,
                viewportLeft + viewportWidth - renderedWidth - margin));
        dialog.style.setProperty('width', `${width}px`, 'important');
        dialog.style.setProperty('left', `${(left - rect.left) / inverseScale}px`, 'important');
        dialog.style.setProperty('right', 'auto', 'important');
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
        floatingMenuPositionDialog(root);
    }


    // Do not rely on font glyphs or pseudo-elements for critical controls:
    // archive snapshots and browser translation can override their styles.
    // An SVG path with an explicit white stroke remains legible on the dark menu.
    function floatingMenuEnsureIcons(root) {
        const white = '#f0f0f0';
        const namespace = 'http://www.w3.org/2000/svg';
        const glyphs = [
            ['data-floating-toggle', 'menu', 'M4 6H20 M4 12H20 M4 18H20'],
            ['data-floating-close', 'close', 'M5 5L19 19 M19 5L5 19']
        ];
        root.setAttribute('data-floating-glyphs', 'svg-v1');
        for (const [attribute, name, lines] of glyphs) {
            const button = root.querySelector('[' + attribute + ']');
            if (!button) continue;
            if (button.querySelector('[data-floating-svg-icon]')) continue;
            button.textContent = '';
            const svg = document.createElementNS(namespace, 'svg');
            svg.setAttribute('data-floating-svg-icon', name);
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('focusable', 'false');
            svg.style.setProperty('display', 'block', 'important');
            svg.style.setProperty('width', '22px', 'important');
            svg.style.setProperty('height', '22px', 'important');
            svg.style.setProperty('flex', '0 0 22px', 'important');
            svg.style.setProperty('pointer-events', 'none', 'important');
            const path = document.createElementNS(namespace, 'path');
            path.setAttribute('d', lines);
            path.setAttribute('stroke', white);
            path.setAttribute('stroke-width', '2.6');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('fill', 'none');
            path.style.setProperty('stroke', white, 'important');
            path.style.setProperty('stroke-width', '2.6', 'important');
            path.style.setProperty('fill', 'none', 'important');
            svg.appendChild(path);
            button.appendChild(svg);
        }
        // A newer script can attach to a menu created by an older installed script.
        // Repair that style in-place; old script observers may reattach the same node.
        const sheet = document.getElementById(FLOATING_MENU_ID + '-style');
        const marker = '/* tm-floating-svg-glyphs-v1 */';
        if (sheet && !sheet.textContent.includes(marker)) {
            sheet.textContent += '\n' + marker + '\n' + [
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-toggle]::before,',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-toggle]::after,',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-close]::before,',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-close]::after {',
                '  content: none !important; display: none !important;',
                '}',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-toggle],',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-close] {',
                '  display: flex !important; align-items: center !important;',
                '  justify-content: center !important; color: #f0f0f0 !important;',
                '}'
            ].join('\n');
        }
    }

    function floatingMenuRoot() {
        let root = document.getElementById(FLOATING_MENU_ID);
        if (root) {
            floatingMenuEnsureIcons(root);
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
            #${FLOATING_MENU_ID} [data-floating-toggle] { cursor: move !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 0 !important; line-height: 0 !important; }
            #${FLOATING_MENU_ID} [data-floating-toggle]::before { content: '' !important; display: block !important; width: 20px !important; height: 2px !important; background: #f0f0f0 !important; box-shadow: 0 -6px 0 #f0f0f0, 0 6px 0 #f0f0f0 !important; }
            #${FLOATING_MENU_ID} [data-floating-close] { font-size: 0 !important; line-height: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; }
            #${FLOATING_MENU_ID} [data-floating-close]::before, #${FLOATING_MENU_ID} [data-floating-close]::after { content: '' !important; position: absolute !important; width: 20px !important; height: 2px !important; background: #f0f0f0 !important; }
            #${FLOATING_MENU_ID} [data-floating-close]::before { transform: rotate(45deg) !important; }
            #${FLOATING_MENU_ID} [data-floating-close]::after { transform: rotate(-45deg) !important; }
            #${FLOATING_MENU_ID} { -webkit-text-size-adjust: none !important; text-size-adjust: none !important; }
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
            ['reset', 'Reset floating button position'],
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
        floatingMenuEnsureIcons(root);
        // Use document coordinates so pinch zoom does not anchor the menu to the visual viewport.
        document.documentElement.appendChild(root);

        const settings = floatingMenuSettings();
        let anchorX = Number.isFinite(settings.x) ? settings.x : null;
        let anchorY = Number.isFinite(settings.y) ? Math.max(0, settings.y) : 70;
        // Fixed positioning prevents the menu from changing document scrollWidth.
        // The visual viewport can differ from the layout viewport on legacy mobile pages.
        const menuWidth = 38;
        // This legacy desktop-width document places CSS-fixed controls outside
        // the visual scrolling viewport on Android Edge. Use a bounded document
        // position for it; other sites retain their existing fixed behavior.
        const documentDock = /(^|\.)openssh\.org$/i.test(location.hostname)
            && location.pathname === '/releasenotes.html';
        const layoutWidth = () => Math.max(menuWidth, Math.min(
            window.innerWidth || menuWidth,
            document.documentElement.clientWidth || window.innerWidth || menuWidth));
        const visualBounds = () => {
            const viewport = window.visualViewport;
            return {
                left: viewport ? viewport.offsetLeft : 0,
                top: viewport ? viewport.offsetTop : 0,
                width: Math.max(menuWidth, viewport ? viewport.width : layoutWidth()),
            };
        };
        const clampX = (x) => {
            const viewport = visualBounds();
            // A transformed menu grows left from its right edge; keep the
            // enlarged hit target visible when a saved position is near x=0.
            const visibleWidth = Math.min(viewport.width,
                menuWidth / floatingMenuViewportScale());
            return Math.max(viewport.left + visibleWidth - menuWidth,
                Math.min(x, viewport.left + viewport.width - menuWidth));
        };
        const scrollX = () => Math.max(0, window.scrollX || 0);
        // Older pages and mobile browser engines can scroll through body/html
        // while window.scrollY remains zero; read all root-scroller representations.
        const scrollY = () => {
            const viewport = window.visualViewport;
            const viewportPageScroll = viewport && Number.isFinite(viewport.pageTop)
                ? viewport.pageTop - (viewport.offsetTop || 0) : 0;
            return Math.max(0, window.scrollY || 0,
                document.scrollingElement ? document.scrollingElement.scrollTop || 0 : 0,
                document.documentElement.scrollTop || 0,
                document.body ? document.body.scrollTop || 0 : 0,
                viewportPageScroll);
        };
        // Capture an overflow ceiling before moving the menu. Never let the
        // absolutely-positioned handle enlarge the document and then chase it.
        const unzoomedDocumentWidth = Math.max(
            layoutWidth(), document.documentElement.scrollWidth || 0);
        const pageTop = () => {
            const viewport = window.visualViewport;
            return Math.max(scrollY(), viewport && Number.isFinite(viewport.pageTop)
                ? viewport.pageTop : 0);
        };
        const pageLeft = () => {
            const viewport = window.visualViewport;
            return Math.max(scrollX(), viewport && Number.isFinite(viewport.pageLeft)
                ? viewport.pageLeft : 0);
        };
        const dockX = () => {
            const viewport = visualBounds();
            const relativeX = anchorX === null ? viewport.width - menuWidth : anchorX;
            return Math.max(0, Math.min(
                pageLeft() + Math.max(0, Math.min(relativeX, viewport.width - menuWidth)),
                unzoomedDocumentWidth - menuWidth));
        };
        let documentY = anchorY;
        let previousScrollY = scrollY();
        // A scale change alone is NOT a pinch gesture. Legacy desktop-width pages
        // (e.g. OpenSSH on Android) can auto-refit after load/translation or when
        // the browser toolbar moves, which previously froze the vertical menu.
        let normalScale = window.visualViewport ? window.visualViewport.scale : 1;
        let pinchGestureArmed = false;
        const zoomed = () => {
            if (!window.visualViewport) return false;
            const current = window.visualViewport.scale;
            if (!pinchAnchored && !pinchGestureArmed) normalScale = current;
            return (pinchAnchored || pinchGestureArmed) && current > normalScale * 1.01;
        };
        document.addEventListener('touchstart', (event) => {
            if (!pinchAnchored && event.touches && event.touches.length >= 2) {
                normalScale = window.visualViewport ? window.visualViewport.scale : 1;
                pinchGestureArmed = true;
            }
        }, { capture: true, passive: true });
        document.addEventListener('touchend', (event) => {
            if (!pinchAnchored && (!event.touches || event.touches.length < 2)) {
                pinchGestureArmed = false;
            }
        }, { capture: true, passive: true });
        document.addEventListener('touchcancel', () => {
            if (!pinchAnchored) pinchGestureArmed = false;
        }, { capture: true, passive: true });
        const scaleControlOnly = () => {
            const inverseScale = 1 / floatingMenuViewportScale();
            if (Math.abs(inverseScale - 1) < 0.01) {
                root.style.removeProperty('transform');
                root.style.removeProperty('transform-origin');
            } else {
                root.style.setProperty('transform', `scale(${inverseScale})`, 'important');
                root.style.setProperty('transform-origin', 'top right', 'important');
            }
        };
        const place = (x, y, fixed) => {
            root.style.setProperty('position', fixed ? 'fixed' : 'absolute', 'important');
            root.style.setProperty('left', `${x}px`, 'important');
            root.style.setProperty('top', `${y}px`, 'important');
            root.style.setProperty('right', 'auto', 'important');
            scaleControlOnly();
            floatingMenuPositionDialog(root);
        };
        let pinchAnchored = false;
        const position = () => {
            if (dragging) return;
            if (zoomed()) {
                if (!pinchAnchored) {
                    // Freeze the document position when pinch-zoom starts. Switching
                    // from fixed to absolute stops following the visual viewport.
                    if (!documentDock) {
                        const documentWidth = Math.max(unzoomedDocumentWidth, layoutWidth(), document.documentElement.scrollWidth || 0);
                        const x = Math.max(0, Math.min(scrollX() + parseFloat(root.style.left), documentWidth - menuWidth));
                        place(x, scrollY() + parseFloat(root.style.top), false);
                    }
                    pinchAnchored = true;
                }
                // Preserve existing document anchoring during a pinch; resize
                // only the menu and its child controls, never the webpage.
                scaleControlOnly();
                floatingMenuPositionDialog(root);
                return;
            }
            if (pinchAnchored) {
                pinchAnchored = false;
                pinchGestureArmed = false;
                previousScrollY = scrollY();
            }
            const currentScrollY = scrollY();
            // A temporary placement returns smoothly to the saved clearance on the way up.
            if (currentScrollY < previousScrollY && previousScrollY > 0) {
                documentY = anchorY + (documentY - anchorY) * currentScrollY / previousScrollY;
            }
            if (currentScrollY >= Math.max(documentY, anchorY)) documentY = anchorY;
            previousScrollY = currentScrollY;
            const viewport = visualBounds();
            const x = anchorX === null ? viewport.width - menuWidth : anchorX;
            // CSS position:fixed uses the layout viewport's top. Adding
            // visualViewport.offsetTop here double-counts mobile viewport
            // panning on desktop-width pages, leaving the handle far below
            // the top until translation changes the page's reflow.
            if (documentDock) {
                place(dockX(), Math.max(documentY, pageTop()), false);
            } else {
                place(clampX(viewport.left + x),
                    Math.max(documentY, currentScrollY) - currentScrollY, true);
            }
        };

        let dragging = false;
        let moved = false;
        let startX = 0;
        let startY = 0;
        let originX = 0;
        let originY = 0;
        // Start inside the visual viewport without contributing to page overflow.
        const viewport = visualBounds();
        if (documentDock) {
            place(dockX(), Math.max(anchorY, pageTop()), false);
        } else {
            place(clampX(viewport.left + (anchorX === null ? viewport.width - menuWidth : anchorX)),
                Math.max(anchorY - scrollY(), 0), true);
        }
        window.addEventListener('scroll', position, { passive: true });
        // Capture scroll on body/html in browsers that don't forward it to window.
        document.addEventListener('scroll', position, { capture: true, passive: true });
        window.addEventListener('resize', position);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', position);
            window.visualViewport.addEventListener('scroll', position);
        }
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
            const x = clampX(originX + point.clientX - startX);
            const y = Math.max(0,
                Math.min(originY + point.clientY - startY,
                    (window.visualViewport ? window.visualViewport.height : window.innerHeight) - 32));
            if (documentDock) {
                const documentX = Math.max(0, Math.min(pageLeft() + x - visualBounds().left,
                    unzoomedDocumentWidth - menuWidth));
                place(documentX, pageTop() + y, false);
            } else {
                place(x, y, true);
            }
        };
        const onEnd = () => {
            if (!dragging) return;
            dragging = false;
            if (moved) {
                const next = floatingMenuSettings();
                anchorX = parseFloat(root.style.left) - (documentDock ? pageLeft() : visualBounds().left);
                documentY = parseFloat(root.style.top) + (documentDock ? 0 : scrollY());
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
            if (zoomed() || pinchGestureArmed) return;
            const point = pointer(event);
            dragging = true;
            moved = false;
            startX = point.clientX;
            startY = point.clientY;
            originX = parseFloat(root.style.left) - (documentDock ? pageLeft() - visualBounds().left : 0);
            originY = parseFloat(root.style.top) - (documentDock ? pageTop() : 0);
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
            if (scope === 'reset') {
                const next = floatingMenuSettings();
                delete next.x;
                delete next.y;
                floatingMenuSave(next);
                anchorX = null;
                anchorY = 70;
                documentY = anchorY;
                previousScrollY = scrollY();
                // Reset just the floating position. Reloading would restart
                // browser translation and can disturb the article's layout.
                floatingMenuCollapse(root);
                position();
                return;
            }
            const next = floatingMenuSettings();
            if (scope === 'domain') next.disabledDomain = true;
            if (scope === 'path') next.disabledPaths = [...new Set([...(next.disabledPaths || []), floatingMenuFolderPath()])];
            if (scope === 'page') next.disabledPages = [...new Set([...(next.disabledPages || []), floatingMenuPageKey()])];
            floatingMenuSave(next);
            window.location.reload();
        });
        // Translation and client-side navigation can remove an injected menu
        // after early userscripts register their buttons. Keep those actions alive.
        let observedHtml = document.documentElement;
        const menuObserver = new MutationObserver((records) => {
            const html = document.documentElement;
            if (!html) return;
            if (html !== observedHtml) {
                observedHtml = html;
                menuObserver.observe(html, { childList: true });
            }
            if (!style.isConnected) (document.head || html).appendChild(style);
            if (!root.isConnected) {
                const replacement = document.getElementById(FLOATING_MENU_ID);
                if (replacement && replacement !== root) {
                    Array.from(replacement.querySelectorAll('[data-floating-tool]')).forEach((button) => {
                        const key = button.getAttribute('data-floating-tool');
                        if (!root.querySelector(`[data-floating-tool="${key}"]`)) root.appendChild(button);
                    });
                    replacement.remove();
                }
                html.appendChild(root);
                floatingMenuRender(root);
            }
            let changed = false;
            for (const record of records) {
                if (record.target !== root) continue;
                for (const button of record.removedNodes) {
                    if (button.nodeType !== 1 || !button.hasAttribute('data-floating-tool')
                        || button.isConnected) continue;
                    const key = button.getAttribute('data-floating-tool');
                    if (root.querySelector(`[data-floating-tool="${key}"]`)) continue;
                    root.appendChild(button);
                    changed = true;
                }
            }
            if (changed) floatingMenuRender(root);
        });
        // Observe only structural changes, not all content mutations.
        menuObserver.observe(document, { childList: true });
        menuObserver.observe(observedHtml, { childList: true });
        menuObserver.observe(root, { childList: true });
        return root;
    }

    function registerFloatingButton(key, button, available = true) {
        if (floatingMenuDisabled()) return;
        const root = floatingMenuRoot();
        button.setAttribute('data-floating-tool', key);
        button.setAttribute('data-floating-available', String(available));
        button.addEventListener('click', () => floatingMenuCollapse(
            button.parentNode && button.parentNode.id === FLOATING_MENU_ID ? button.parentNode : root));
        root.appendChild(button);
        floatingMenuRender(root);
    }

    function setFloatingButtonAvailable(button, available) {
        if (!button.parentNode || button.parentNode.id !== FLOATING_MENU_ID) return;
        button.setAttribute('data-floating-available', String(available));
        floatingMenuRender(button.parentNode);
    }
    // END SHARED FLOATING MENU

    if (window.location.hostname === 'web.archive.org') {
        const currentUrl = window.location.href;
        const match = currentUrl.match(/\/web\/\d+\*?\/(.*)/);
        if (match && !floatingMenuDisabled()) {
            const mountGoButton = () => {
                if (!document.body) return;
                const goButton = document.createElement('button');
                goButton.type = 'button';
                goButton.textContent = '→';
                goButton.addEventListener('click', () => {
                    window.location.href = `https://archive.is/submit/?url=${match[1]}`;
                });
                registerFloatingButton('archive', goButton);
            };
            if (document.body) {
                mountGoButton();
            } else {
                document.addEventListener('DOMContentLoaded', mountGoButton, { once: true });
            }
        }

        // 等待 DOM 完全載入後再執行
        window.addEventListener('load', function () {
            try {
                let timer;

                function handleWmIppBase() {
                    const wmIppBase = document.getElementById('wm-ipp-base');
                    if (wmIppBase) {
                        wmIppBase.style = 'display: none !important';
                        console.log('已成功隱藏標題列元素');
                        return true;
                    }
                    console.log('尚未找到標題列元素，繼續等待...');
                    return false;
                }

                // 設定 MutationObserver 監控 DOM 變化
                const observer = new MutationObserver((mutations, obs) => {
                    if (handleWmIppBase()) {
                        console.log('成功：停止監控 DOM 變化');
                        obs.disconnect(); // 成功後停止觀察
                        clearTimeout(timer);
                    }
                });

                observer.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });

                // 設定 10 秒後停止觀察
                timer = setTimeout(() => {
                    observer.disconnect();
                    console.log('觀察超時：停止監控 DOM 變化');
                }, 10000);

            } catch (error) {
                console.error('執行腳本時發生錯誤:', error);
            }
        });
        return;
    }

    // 其他網站的重定向邏輯
    const archiveUrl = `https://web.archive.org/${window.location.href}`;

    console.log(`重定向至 web.archive.org: ${archiveUrl}`);

    // 重定向到 Internet Archive 頁面
    window.location.replace(archiveUrl);
})();

        } catch (error) { console.error("SharedMenuAllInOne: InternetArchive failed", error); }
    }
    // END BUNDLED InternetArchive
    // BEGIN BUNDLED ForceMobileView
    if (applies(["https://news.ycombinator.com/item?*","https://archive.is/*","https://paulbourke.net/*","https://www.paulbourke.net/*","*://*/*"], ["*://christorng.idv.tw/*","*://*.christorng.idv.tw/*","*://hackernews.betacat.io/*","*://*.hackernews.betacat.io/*","*://theneurondaily.com/*","*://*.theneurondaily.com/*","*://tam.gov.taipei/*","*://*.tam.gov.taipei/*","*://wiwi.*/*","*://*.wiwi.*/*","*://*.kagi.com/*","*://kagi.com/*","*://chatgpt.com/*","*://*.chatgpt.com/*","*://christorng.github.io/*","*://github.com/*","*://*.github.com/*","*://discord.com/*","*://*.discord.com/*","*://ebird.org/*","*://*.ebird.org/*","*://newsminimalist.com/*","*://*.newsminimalist.com/*","*://huggingface.co/*","*://*.huggingface.co/*","*://youtube.com/*","*://*.youtube.com/*","*://x.com/*","*://*.x.com/*","*://nitter.net/*","*://*.nitter.net/*","*://bing.com/*","*://*.bing.com/*","*://wikipedia.org/*","*://*.wikipedia.org/*","*://reddit.com/*","*://*.reddit.com/*","*://arxiv.org/*","*://*.arxiv.org/*","*://cht.com.tw/*","*://*.cht.com.tw/*","*://openai.com/*","*://*.openai.com/*","*://anthropic.com/*","*://*.anthropic.com/*","*://claude.ai/*","*://*.claude.ai/*","*://google.com/*","*://*.google.com/*","*://facebook.com/*","*://*.facebook.com/*","*://*.cwa.gov.tw/*","*://cwa.gov.tw/*","*://chrisrtxubuntu:*/*","*://microsoft.com/*","*://*.microsoft.com/*","*://instagram.com/*","*://*.instagram.com/*"])) {
        try {
        const GM_info = __tmOriginalGMInfo ? Object.assign({}, __tmOriginalGMInfo, { script: Object.assign({}, __tmOriginalGMInfo.script, { matches: ["https://news.ycombinator.com/item?*","https://archive.is/*","https://paulbourke.net/*","https://www.paulbourke.net/*","*://*/*"], excludes: ["*://christorng.idv.tw/*","*://*.christorng.idv.tw/*","*://hackernews.betacat.io/*","*://*.hackernews.betacat.io/*","*://theneurondaily.com/*","*://*.theneurondaily.com/*","*://tam.gov.taipei/*","*://*.tam.gov.taipei/*","*://wiwi.*/*","*://*.wiwi.*/*","*://*.kagi.com/*","*://kagi.com/*","*://chatgpt.com/*","*://*.chatgpt.com/*","*://christorng.github.io/*","*://github.com/*","*://*.github.com/*","*://discord.com/*","*://*.discord.com/*","*://ebird.org/*","*://*.ebird.org/*","*://newsminimalist.com/*","*://*.newsminimalist.com/*","*://huggingface.co/*","*://*.huggingface.co/*","*://youtube.com/*","*://*.youtube.com/*","*://x.com/*","*://*.x.com/*","*://nitter.net/*","*://*.nitter.net/*","*://bing.com/*","*://*.bing.com/*","*://wikipedia.org/*","*://*.wikipedia.org/*","*://reddit.com/*","*://*.reddit.com/*","*://arxiv.org/*","*://*.arxiv.org/*","*://cht.com.tw/*","*://*.cht.com.tw/*","*://openai.com/*","*://*.openai.com/*","*://anthropic.com/*","*://*.anthropic.com/*","*://claude.ai/*","*://*.claude.ai/*","*://google.com/*","*://*.google.com/*","*://facebook.com/*","*://*.facebook.com/*","*://*.cwa.gov.tw/*","*://cwa.gov.tw/*","*://chrisrtxubuntu:*/*","*://microsoft.com/*","*://*.microsoft.com/*","*://instagram.com/*","*://*.instagram.com/*"] }) }) : undefined;


(function () {
    'use strict';

    // The Vercel preview is excluded from mobile-layout changes. The one
    // repository-owned updater page is allowed only to open userscript tabs.
    // This reimplements the previous metadata Vercel exclusion at runtime.
    if (location.hostname === 'vercel.app' || location.hostname.endsWith('.vercel.app')) {
        const isUpdater = location.hostname.startsWith('tampermonkey-scripts-')
            && location.pathname === '/tests/SharedFloatingMenuUpdates/index.html';
        if (isUpdater && typeof GM_openInTab === 'function') {
            const files = new Set([
                'TranslatePreformattedText.user.js',
                'AllGoInternetArchive.user.js',
                'InternetArchive.user.js',
                'ForceMobileView.user.js',
                'ForceDarkMode.user.js'
            ]);
            document.addEventListener('click', (event) => {
                if (!event.target || !event.target.closest
                    || !event.target.closest('#open-all')) return;
                const links = Array.from(document.querySelectorAll('#links a[href]'));
                const urls = links.map((link) => {
                    try { return new URL(link.href); }
                    catch (_) { return null; }
                });
                const names = urls.map((url) => url && url.pathname.split('/').pop());
                // No arbitrary open-URL bridge: exact repository, ref, and five files.
                const valid = urls.length === files.size
                    && names.every((name) => files.has(name))
                    && new Set(names).size === files.size
                    && urls.every((url) => url && url.origin === 'https://github.com'
                        && url.pathname.startsWith('/ChrisTorng/TampermonkeyScripts/raw/refs/heads/')
                        && url.pathname.endsWith('/src/' + url.pathname.split('/').pop())
                        && !url.search && !url.hash);
                if (!valid) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                for (const url of urls) GM_openInTab(url.href, { active: false, insert: true });
                const status = document.getElementById('status');
                if (status) status.textContent =
                    'Requested five Tampermonkey update tabs. Confirm Update separately in each tab.';
            }, true);
        }
        return;
    }

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

    // visualViewport.scale includes Edge's automatic shrink-to-fit, not only a pinch.
    // Inverse-scaling this menu alone preserves its normal 38 x 32 CSS-pixel
    // apparent size without changing the page viewport, text, or layout.
    function floatingMenuViewportScale() {
        const scale = window.visualViewport && window.visualViewport.scale;
        return Number.isFinite(scale) && scale > 0 ? scale : 1;
    }

    function floatingMenuPositionDialog(root) {
        const dialog = root.querySelector('[data-floating-dialog]');
        if (!dialog || dialog.hidden) return;
        const viewport = window.visualViewport;
        const viewportLeft = viewport ? viewport.offsetLeft : 0;
        const viewportWidth = viewport ? viewport.width : window.innerWidth;
        const inverseScale = 1 / floatingMenuViewportScale();
        // Account for the parent's transform when keeping the settings panel
        // within the visible viewport. Its own readable size remains <= 290px.
        const width = Math.max(1, Math.min(290, viewportWidth / inverseScale - 24));
        const renderedWidth = width * inverseScale;
        const margin = 12 * inverseScale;
        const rect = root.getBoundingClientRect();
        const left = Math.max(viewportLeft + margin,
            Math.min(rect.right - renderedWidth,
                viewportLeft + viewportWidth - renderedWidth - margin));
        dialog.style.setProperty('width', `${width}px`, 'important');
        dialog.style.setProperty('left', `${(left - rect.left) / inverseScale}px`, 'important');
        dialog.style.setProperty('right', 'auto', 'important');
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
        floatingMenuPositionDialog(root);
    }


    // Do not rely on font glyphs or pseudo-elements for critical controls:
    // archive snapshots and browser translation can override their styles.
    // An SVG path with an explicit white stroke remains legible on the dark menu.
    function floatingMenuEnsureIcons(root) {
        const white = '#f0f0f0';
        const namespace = 'http://www.w3.org/2000/svg';
        const glyphs = [
            ['data-floating-toggle', 'menu', 'M4 6H20 M4 12H20 M4 18H20'],
            ['data-floating-close', 'close', 'M5 5L19 19 M19 5L5 19']
        ];
        root.setAttribute('data-floating-glyphs', 'svg-v1');
        for (const [attribute, name, lines] of glyphs) {
            const button = root.querySelector('[' + attribute + ']');
            if (!button) continue;
            if (button.querySelector('[data-floating-svg-icon]')) continue;
            button.textContent = '';
            const svg = document.createElementNS(namespace, 'svg');
            svg.setAttribute('data-floating-svg-icon', name);
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('focusable', 'false');
            svg.style.setProperty('display', 'block', 'important');
            svg.style.setProperty('width', '22px', 'important');
            svg.style.setProperty('height', '22px', 'important');
            svg.style.setProperty('flex', '0 0 22px', 'important');
            svg.style.setProperty('pointer-events', 'none', 'important');
            const path = document.createElementNS(namespace, 'path');
            path.setAttribute('d', lines);
            path.setAttribute('stroke', white);
            path.setAttribute('stroke-width', '2.6');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('fill', 'none');
            path.style.setProperty('stroke', white, 'important');
            path.style.setProperty('stroke-width', '2.6', 'important');
            path.style.setProperty('fill', 'none', 'important');
            svg.appendChild(path);
            button.appendChild(svg);
        }
        // A newer script can attach to a menu created by an older installed script.
        // Repair that style in-place; old script observers may reattach the same node.
        const sheet = document.getElementById(FLOATING_MENU_ID + '-style');
        const marker = '/* tm-floating-svg-glyphs-v1 */';
        if (sheet && !sheet.textContent.includes(marker)) {
            sheet.textContent += '\n' + marker + '\n' + [
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-toggle]::before,',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-toggle]::after,',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-close]::before,',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-close]::after {',
                '  content: none !important; display: none !important;',
                '}',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-toggle],',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-close] {',
                '  display: flex !important; align-items: center !important;',
                '  justify-content: center !important; color: #f0f0f0 !important;',
                '}'
            ].join('\n');
        }
    }

    function floatingMenuRoot() {
        let root = document.getElementById(FLOATING_MENU_ID);
        if (root) {
            floatingMenuEnsureIcons(root);
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
            #${FLOATING_MENU_ID} [data-floating-toggle] { cursor: move !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 0 !important; line-height: 0 !important; }
            #${FLOATING_MENU_ID} [data-floating-toggle]::before { content: '' !important; display: block !important; width: 20px !important; height: 2px !important; background: #f0f0f0 !important; box-shadow: 0 -6px 0 #f0f0f0, 0 6px 0 #f0f0f0 !important; }
            #${FLOATING_MENU_ID} [data-floating-close] { font-size: 0 !important; line-height: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; }
            #${FLOATING_MENU_ID} [data-floating-close]::before, #${FLOATING_MENU_ID} [data-floating-close]::after { content: '' !important; position: absolute !important; width: 20px !important; height: 2px !important; background: #f0f0f0 !important; }
            #${FLOATING_MENU_ID} [data-floating-close]::before { transform: rotate(45deg) !important; }
            #${FLOATING_MENU_ID} [data-floating-close]::after { transform: rotate(-45deg) !important; }
            #${FLOATING_MENU_ID} { -webkit-text-size-adjust: none !important; text-size-adjust: none !important; }
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
            ['reset', 'Reset floating button position'],
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
        floatingMenuEnsureIcons(root);
        // Use document coordinates so pinch zoom does not anchor the menu to the visual viewport.
        document.documentElement.appendChild(root);

        const settings = floatingMenuSettings();
        let anchorX = Number.isFinite(settings.x) ? settings.x : null;
        let anchorY = Number.isFinite(settings.y) ? Math.max(0, settings.y) : 70;
        // Fixed positioning prevents the menu from changing document scrollWidth.
        // The visual viewport can differ from the layout viewport on legacy mobile pages.
        const menuWidth = 38;
        // This legacy desktop-width document places CSS-fixed controls outside
        // the visual scrolling viewport on Android Edge. Use a bounded document
        // position for it; other sites retain their existing fixed behavior.
        const documentDock = /(^|\.)openssh\.org$/i.test(location.hostname)
            && location.pathname === '/releasenotes.html';
        const layoutWidth = () => Math.max(menuWidth, Math.min(
            window.innerWidth || menuWidth,
            document.documentElement.clientWidth || window.innerWidth || menuWidth));
        const visualBounds = () => {
            const viewport = window.visualViewport;
            return {
                left: viewport ? viewport.offsetLeft : 0,
                top: viewport ? viewport.offsetTop : 0,
                width: Math.max(menuWidth, viewport ? viewport.width : layoutWidth()),
            };
        };
        const clampX = (x) => {
            const viewport = visualBounds();
            // A transformed menu grows left from its right edge; keep the
            // enlarged hit target visible when a saved position is near x=0.
            const visibleWidth = Math.min(viewport.width,
                menuWidth / floatingMenuViewportScale());
            return Math.max(viewport.left + visibleWidth - menuWidth,
                Math.min(x, viewport.left + viewport.width - menuWidth));
        };
        const scrollX = () => Math.max(0, window.scrollX || 0);
        // Older pages and mobile browser engines can scroll through body/html
        // while window.scrollY remains zero; read all root-scroller representations.
        const scrollY = () => {
            const viewport = window.visualViewport;
            const viewportPageScroll = viewport && Number.isFinite(viewport.pageTop)
                ? viewport.pageTop - (viewport.offsetTop || 0) : 0;
            return Math.max(0, window.scrollY || 0,
                document.scrollingElement ? document.scrollingElement.scrollTop || 0 : 0,
                document.documentElement.scrollTop || 0,
                document.body ? document.body.scrollTop || 0 : 0,
                viewportPageScroll);
        };
        // Capture an overflow ceiling before moving the menu. Never let the
        // absolutely-positioned handle enlarge the document and then chase it.
        const unzoomedDocumentWidth = Math.max(
            layoutWidth(), document.documentElement.scrollWidth || 0);
        const pageTop = () => {
            const viewport = window.visualViewport;
            return Math.max(scrollY(), viewport && Number.isFinite(viewport.pageTop)
                ? viewport.pageTop : 0);
        };
        const pageLeft = () => {
            const viewport = window.visualViewport;
            return Math.max(scrollX(), viewport && Number.isFinite(viewport.pageLeft)
                ? viewport.pageLeft : 0);
        };
        const dockX = () => {
            const viewport = visualBounds();
            const relativeX = anchorX === null ? viewport.width - menuWidth : anchorX;
            return Math.max(0, Math.min(
                pageLeft() + Math.max(0, Math.min(relativeX, viewport.width - menuWidth)),
                unzoomedDocumentWidth - menuWidth));
        };
        let documentY = anchorY;
        let previousScrollY = scrollY();
        // A scale change alone is NOT a pinch gesture. Legacy desktop-width pages
        // (e.g. OpenSSH on Android) can auto-refit after load/translation or when
        // the browser toolbar moves, which previously froze the vertical menu.
        let normalScale = window.visualViewport ? window.visualViewport.scale : 1;
        let pinchGestureArmed = false;
        const zoomed = () => {
            if (!window.visualViewport) return false;
            const current = window.visualViewport.scale;
            if (!pinchAnchored && !pinchGestureArmed) normalScale = current;
            return (pinchAnchored || pinchGestureArmed) && current > normalScale * 1.01;
        };
        document.addEventListener('touchstart', (event) => {
            if (!pinchAnchored && event.touches && event.touches.length >= 2) {
                normalScale = window.visualViewport ? window.visualViewport.scale : 1;
                pinchGestureArmed = true;
            }
        }, { capture: true, passive: true });
        document.addEventListener('touchend', (event) => {
            if (!pinchAnchored && (!event.touches || event.touches.length < 2)) {
                pinchGestureArmed = false;
            }
        }, { capture: true, passive: true });
        document.addEventListener('touchcancel', () => {
            if (!pinchAnchored) pinchGestureArmed = false;
        }, { capture: true, passive: true });
        const scaleControlOnly = () => {
            const inverseScale = 1 / floatingMenuViewportScale();
            if (Math.abs(inverseScale - 1) < 0.01) {
                root.style.removeProperty('transform');
                root.style.removeProperty('transform-origin');
            } else {
                root.style.setProperty('transform', `scale(${inverseScale})`, 'important');
                root.style.setProperty('transform-origin', 'top right', 'important');
            }
        };
        const place = (x, y, fixed) => {
            root.style.setProperty('position', fixed ? 'fixed' : 'absolute', 'important');
            root.style.setProperty('left', `${x}px`, 'important');
            root.style.setProperty('top', `${y}px`, 'important');
            root.style.setProperty('right', 'auto', 'important');
            scaleControlOnly();
            floatingMenuPositionDialog(root);
        };
        let pinchAnchored = false;
        const position = () => {
            if (dragging) return;
            if (zoomed()) {
                if (!pinchAnchored) {
                    // Freeze the document position when pinch-zoom starts. Switching
                    // from fixed to absolute stops following the visual viewport.
                    if (!documentDock) {
                        const documentWidth = Math.max(unzoomedDocumentWidth, layoutWidth(), document.documentElement.scrollWidth || 0);
                        const x = Math.max(0, Math.min(scrollX() + parseFloat(root.style.left), documentWidth - menuWidth));
                        place(x, scrollY() + parseFloat(root.style.top), false);
                    }
                    pinchAnchored = true;
                }
                // Preserve existing document anchoring during a pinch; resize
                // only the menu and its child controls, never the webpage.
                scaleControlOnly();
                floatingMenuPositionDialog(root);
                return;
            }
            if (pinchAnchored) {
                pinchAnchored = false;
                pinchGestureArmed = false;
                previousScrollY = scrollY();
            }
            const currentScrollY = scrollY();
            // A temporary placement returns smoothly to the saved clearance on the way up.
            if (currentScrollY < previousScrollY && previousScrollY > 0) {
                documentY = anchorY + (documentY - anchorY) * currentScrollY / previousScrollY;
            }
            if (currentScrollY >= Math.max(documentY, anchorY)) documentY = anchorY;
            previousScrollY = currentScrollY;
            const viewport = visualBounds();
            const x = anchorX === null ? viewport.width - menuWidth : anchorX;
            // CSS position:fixed uses the layout viewport's top. Adding
            // visualViewport.offsetTop here double-counts mobile viewport
            // panning on desktop-width pages, leaving the handle far below
            // the top until translation changes the page's reflow.
            if (documentDock) {
                place(dockX(), Math.max(documentY, pageTop()), false);
            } else {
                place(clampX(viewport.left + x),
                    Math.max(documentY, currentScrollY) - currentScrollY, true);
            }
        };

        let dragging = false;
        let moved = false;
        let startX = 0;
        let startY = 0;
        let originX = 0;
        let originY = 0;
        // Start inside the visual viewport without contributing to page overflow.
        const viewport = visualBounds();
        if (documentDock) {
            place(dockX(), Math.max(anchorY, pageTop()), false);
        } else {
            place(clampX(viewport.left + (anchorX === null ? viewport.width - menuWidth : anchorX)),
                Math.max(anchorY - scrollY(), 0), true);
        }
        window.addEventListener('scroll', position, { passive: true });
        // Capture scroll on body/html in browsers that don't forward it to window.
        document.addEventListener('scroll', position, { capture: true, passive: true });
        window.addEventListener('resize', position);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', position);
            window.visualViewport.addEventListener('scroll', position);
        }
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
            const x = clampX(originX + point.clientX - startX);
            const y = Math.max(0,
                Math.min(originY + point.clientY - startY,
                    (window.visualViewport ? window.visualViewport.height : window.innerHeight) - 32));
            if (documentDock) {
                const documentX = Math.max(0, Math.min(pageLeft() + x - visualBounds().left,
                    unzoomedDocumentWidth - menuWidth));
                place(documentX, pageTop() + y, false);
            } else {
                place(x, y, true);
            }
        };
        const onEnd = () => {
            if (!dragging) return;
            dragging = false;
            if (moved) {
                const next = floatingMenuSettings();
                anchorX = parseFloat(root.style.left) - (documentDock ? pageLeft() : visualBounds().left);
                documentY = parseFloat(root.style.top) + (documentDock ? 0 : scrollY());
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
            if (zoomed() || pinchGestureArmed) return;
            const point = pointer(event);
            dragging = true;
            moved = false;
            startX = point.clientX;
            startY = point.clientY;
            originX = parseFloat(root.style.left) - (documentDock ? pageLeft() - visualBounds().left : 0);
            originY = parseFloat(root.style.top) - (documentDock ? pageTop() : 0);
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
            if (scope === 'reset') {
                const next = floatingMenuSettings();
                delete next.x;
                delete next.y;
                floatingMenuSave(next);
                anchorX = null;
                anchorY = 70;
                documentY = anchorY;
                previousScrollY = scrollY();
                // Reset just the floating position. Reloading would restart
                // browser translation and can disturb the article's layout.
                floatingMenuCollapse(root);
                position();
                return;
            }
            const next = floatingMenuSettings();
            if (scope === 'domain') next.disabledDomain = true;
            if (scope === 'path') next.disabledPaths = [...new Set([...(next.disabledPaths || []), floatingMenuFolderPath()])];
            if (scope === 'page') next.disabledPages = [...new Set([...(next.disabledPages || []), floatingMenuPageKey()])];
            floatingMenuSave(next);
            window.location.reload();
        });
        // Translation and client-side navigation can remove an injected menu
        // after early userscripts register their buttons. Keep those actions alive.
        let observedHtml = document.documentElement;
        const menuObserver = new MutationObserver((records) => {
            const html = document.documentElement;
            if (!html) return;
            if (html !== observedHtml) {
                observedHtml = html;
                menuObserver.observe(html, { childList: true });
            }
            if (!style.isConnected) (document.head || html).appendChild(style);
            if (!root.isConnected) {
                const replacement = document.getElementById(FLOATING_MENU_ID);
                if (replacement && replacement !== root) {
                    Array.from(replacement.querySelectorAll('[data-floating-tool]')).forEach((button) => {
                        const key = button.getAttribute('data-floating-tool');
                        if (!root.querySelector(`[data-floating-tool="${key}"]`)) root.appendChild(button);
                    });
                    replacement.remove();
                }
                html.appendChild(root);
                floatingMenuRender(root);
            }
            let changed = false;
            for (const record of records) {
                if (record.target !== root) continue;
                for (const button of record.removedNodes) {
                    if (button.nodeType !== 1 || !button.hasAttribute('data-floating-tool')
                        || button.isConnected) continue;
                    const key = button.getAttribute('data-floating-tool');
                    if (root.querySelector(`[data-floating-tool="${key}"]`)) continue;
                    root.appendChild(button);
                    changed = true;
                }
            }
            if (changed) floatingMenuRender(root);
        });
        // Observe only structural changes, not all content mutations.
        menuObserver.observe(document, { childList: true });
        menuObserver.observe(observedHtml, { childList: true });
        menuObserver.observe(root, { childList: true });
        return root;
    }

    function registerFloatingButton(key, button, available = true) {
        if (floatingMenuDisabled()) return;
        const root = floatingMenuRoot();
        button.setAttribute('data-floating-tool', key);
        button.setAttribute('data-floating-available', String(available));
        button.addEventListener('click', () => floatingMenuCollapse(
            button.parentNode && button.parentNode.id === FLOATING_MENU_ID ? button.parentNode : root));
        root.appendChild(button);
        floatingMenuRender(root);
    }

    function setFloatingButtonAvailable(button, available) {
        if (!button.parentNode || button.parentNode.id !== FLOATING_MENU_ID) return;
        button.setAttribute('data-floating-available', String(available));
        floatingMenuRender(button.parentNode);
    }
    // END SHARED FLOATING MENU

    if (window !== window.top || floatingMenuDisabled()) return;

    const STYLE_ID = 'tm-force-width-style';
    const DEFAULT_MIN_FONT_SIZE_PX = 12;
    const PORTRAIT_MAX_CHARS = 20;
    const LANDSCAPE_MAX_CHARS = 40;
    const MIN_LINE_HEIGHT_RATIO = 1.4;
    const MIN_FONT_FLAG_ATTR = 'data-tm-force-width-min-font';
    const MIN_FONT_VALUE_ATTR = 'data-tm-force-width-font-value';
    const MIN_FONT_PRIORITY_ATTR = 'data-tm-force-width-font-priority';
    const MIN_LINE_HEIGHT_VALUE_ATTR = 'data-tm-force-width-line-height-value';
    const MIN_LINE_HEIGHT_PRIORITY_ATTR = 'data-tm-force-width-line-height-priority';
    const MIN_LINE_HEIGHT_ONLY_FLAG_ATTR = 'data-tm-force-width-min-line-height-only';
    const MIN_LINE_HEIGHT_ONLY_VALUE_ATTR = 'data-tm-force-width-min-line-height-only-value';
    const MIN_LINE_HEIGHT_ONLY_PRIORITY_ATTR = 'data-tm-force-width-min-line-height-only-priority';
    const SPACING_FLAG_ATTR = 'data-tm-force-width-spacing-trimmed';
    const SPACING_MARGIN_LEFT_ATTR = 'data-tm-force-width-margin-left';
    const SPACING_MARGIN_LEFT_PRIORITY_ATTR = 'data-tm-force-width-margin-left-priority';
    const SPACING_MARGIN_RIGHT_ATTR = 'data-tm-force-width-margin-right';
    const SPACING_MARGIN_RIGHT_PRIORITY_ATTR = 'data-tm-force-width-margin-right-priority';
    const SPACING_PADDING_LEFT_ATTR = 'data-tm-force-width-padding-left';
    const SPACING_PADDING_LEFT_PRIORITY_ATTR = 'data-tm-force-width-padding-left-priority';
    const SPACING_PADDING_RIGHT_ATTR = 'data-tm-force-width-padding-right';
    const SPACING_PADDING_RIGHT_PRIORITY_ATTR = 'data-tm-force-width-padding-right-priority';
    const SPACING_TARGET_SELECTOR = 'main, article, section, div, aside, header, footer, nav, ul, ol, li, p, blockquote, pre, figure, table';
    const MAX_SIDE_SPACING_PX = 2;
    let isEnabled = false;
    let styleObserver;
    let isObserving = false;
    let currentMinFontSizePx = null;
    let resizeTimer;
    let autoMode = false;
    let autoRestoreError = false;
    let autoTimer = null;
    const AUTO_STYLE_ID = 'tm-force-mobile-auto-style';
    const AUTO_STORAGE = 'tm-force-mobile-auto-v2:' + location.hostname.toLowerCase();
    const AUTO_FAILURE = 'tm-force-mobile-failed:' + location.pathname + location.search;

    const AUTO_FAILURE_V2 = 'tm-force-mobile-failed-v2:' + location.pathname + location.search;
    const isDataExplorer = location.hostname.toLowerCase() === 'data.stackexchange.com';
    // Archive snapshots contain an independent toolbar and captured-site document.
    // Auto-enlarge only their #CONTENT, keeping the archive toolbar unchanged.
    const isArchiveSnapshot = /^archive\.(?:is|ph|today|md|li)$/i.test(location.hostname);
    // Raw .txt documents commonly arrive without a viewport and shrink every
    // 38px floating control to roughly 14 visible pixels on Android.
    const isPlainTextUrl = /\.txt$/i.test(location.pathname);
    const SIMPLE_PRE_STORAGE = 'tm-force-mobile-simple-pre:' + location.pathname + location.search;
    function simplePreReloadRequested() {
        try { return sessionStorage.getItem(SIMPLE_PRE_STORAGE) === 'yes'; }
        catch (_) { return false; }
    }
    let earlyReflow = false;

    // Hacker News listing/profile pages should keep their own compact layout.
    // The explicit auto-enable rule is reserved for numeric story comment IDs.
    function isHackerNewsNonDiscussion() {
        return location.hostname.toLowerCase() === 'news.ycombinator.com'
            && (location.pathname !== '/item'
                || !/^\d+$/.test(new URLSearchParams(location.search).get('id') || ''));
    }

    function isAndroidBrowser() {
        return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');
    }

    function canStartEarlyReflow() {
        if (!isAndroidBrowser()) return false;
        try {
            if (localStorage.getItem(AUTO_STORAGE) === 'off'
                || sessionStorage.getItem(AUTO_FAILURE_V2) === 'failed') return false;
            return isDataExplorer || isPlainTextUrl || simplePreReloadRequested();
        } catch (_) {
            return isDataExplorer || isPlainTextUrl;
        }
    }

    function installEarlyReflow() {
        if (!document.head) return false;
        if ((isPlainTextUrl || simplePreReloadRequested()) && !isDataExplorer) {
            // Set the viewport before the browser's first text-inflation pass.
            // Do not rewrite the PRE or body: the translation userscript owns
            // only temporary, reversible text-node substitution.
            const authored = document.querySelector('meta[name="viewport"]');
            if (authored && !authored.hasAttribute('data-tm-force-mobile-auto')) return false;
            if (!authored) {
                const meta = document.createElement('meta');
                meta.setAttribute('name', 'viewport');
                meta.setAttribute('content', 'width=device-width, initial-scale=1');
                meta.setAttribute('data-tm-force-mobile-auto', 'true');
                document.head.appendChild(meta);
            }
            if (!document.getElementById(AUTO_STYLE_ID)) {
                const style = document.createElement('style');
                style.id = AUTO_STYLE_ID;
                style.textContent = `
                    html, body { -webkit-text-size-adjust: 100% !important;
                        text-size-adjust: 100% !important; }
                    body > pre,
                    body > [data-tm-translatable-pre-wrapper] > pre,
                    body > [data-tm-translatable-pre-wrapper] > [data-tm-translatable-pre-converted] {
                        max-width: 100% !important;
                        white-space: pre-wrap !important; overflow-wrap: anywhere !important;
                        font-size: 15px !important; line-height: 1.45 !important; }
                `;
                document.head.appendChild(style);
            }
            earlyReflow = true;
            autoMode = true;
            isEnabled = true;
            return true;
        }
        // If Data Explorer adopts a genuine mobile layout later, leave that authored viewport alone.
        const authored = document.querySelector('meta[name="viewport"]');
        if (authored && !authored.hasAttribute('data-tm-force-mobile-auto')) return true;
        if (!authored) {
            const meta = document.createElement('meta');
            meta.setAttribute('name', 'viewport');
            meta.setAttribute('content', 'width=device-width, initial-scale=1');
            meta.setAttribute('data-tm-force-mobile-auto', 'true');
            document.head.appendChild(meta);
        }
        const style = document.createElement('style');
        style.id = AUTO_STYLE_ID;
        style.textContent = "\nhtml, body { max-width: 100% !important; min-width: 0 !important;\n  -webkit-text-size-adjust: 100% !important; text-size-adjust: 100% !important; }\nbody { font-size: 15px !important; line-height: 1.45 !important; }\nbody p, body li, body blockquote, body article, body section,\nbody h1, body h2, body h3, body h4, body h5, body h6 {\n  line-height: 1.45 !important; height: auto !important; max-height: none !important;\n  overflow-wrap: break-word !important; }\nbody img, body video { max-width: 100% !important; height: auto !important; }\nbody .page, body #topbar .page, body .footerwrap,\nbody #mainbar, body #mainbar-full, body #sidebar,\nbody #query, body #queryText, body #queryText #queryInfo,\nbody #query #aboutSite, body #queryText #aboutSite,\nbody #query-results, body #query-results .subheader .group, body #execution-stats,\nbody #resultsetStats, body #footer-menu, body #metadata .info, body #graph {\n  box-sizing: border-box !important; width: 100% !important;\n  min-width: 0 !important; max-width: 100% !important;\n  margin-left: 0 !important; margin-right: 0 !important; }\nbody .page { padding-left: 6px !important; padding-right: 6px !important; }\nbody #mainbar, body #mainbar-full, body #sidebar,\nbody #queryText #queryInfo, body #query #aboutSite, body #queryText #aboutSite {\n  float: none !important; clear: both !important; }\nbody #header, body #queryText, body #queryText .title,\nbody #query-results .subheader {\n  display: flow-root !important; height: auto !important; min-height: 0 !important; }\nbody #header #logo { max-width: 100% !important; }\nbody #header #menu, body #header .menu,\nbody #header .navigation-links, body #topbar .topbar-links {\n  max-width: 100% !important; height: auto !important; line-height: 1.45 !important;\n  white-space: normal !important; }\nbody #queryText .title h2, body #queryText .title p {\n  float: none !important; clear: both !important; max-width: 100% !important;\n  height: auto !important; line-height: 1.45 !important;\n  white-space: normal !important; overflow-wrap: anywhere !important; }\nbody #query-results .panel, body #query-results .slick-viewport,\nbody .CodeMirror, body .CodeMirror-wrapping, body #sql {\n  box-sizing: border-box !important; max-width: 100% !important; }\nbody pre, body .CodeMirror-scroll, body .slick-viewport {\n  max-width: 100% !important; overflow-x: auto !important; }\nbody .CodeMirror { font-size: 14px !important; line-height: 1.4 !important; }\nbody #graph { overflow-x: auto !important; }\nbody #topbar .page, body #topbar .topbar-links,\nbody #topbar .search-form, body #header #search { max-width: 100% !important; }\nbody #header #search, body #topbar .search-form { float: none !important; clear: both !important; }\nbody #topbar input[type=\"text\"], body #topbar input {\n  box-sizing: border-box !important; max-width: 100% !important; }\nbody #footer, body .footerwrap { overflow-wrap: anywhere !important; }\n/* Header CSS has an independent 710px-wide, floated navigation bar. */\nbody #header #logo {\n  float: none !important; clear: both !important;\n  width: min(230px, 100%) !important; max-width: 100% !important;\n  margin-top: 4px !important; margin-bottom: 4px !important;\n}\nbody nav.primary {\n  box-sizing: border-box !important; float: none !important; clear: both !important;\n  display: block !important; width: 100% !important; min-width: 0 !important;\n  max-width: 100% !important; padding: 0 !important; margin: 0 !important;\n}\nbody nav.primary .nav {\n  float: none !important; width: 100% !important; max-width: 100% !important;\n  font-size: 100% !important;\n}\nbody nav.primary .nav ul {\n  display: flex !important; flex-wrap: wrap !important; gap: 4px !important;\n  margin: 0 !important; padding: 0 !important; width: 100% !important;\n  line-height: normal !important;\n}\nbody nav.primary .nav li {\n  float: none !important; display: inline-block !important;\n  margin: 0 !important; line-height: 1.45 !important;\n  width: auto !important; max-width: 100% !important;\n}\nbody nav.primary .nav a {\n  display: block !important; height: auto !important; min-height: 0 !important;\n  font-size: 15px !important; line-height: 1.45 !important;\n  padding: 5px 8px !important; white-space: normal !important;\n}\nbody .subheader, body .subheader h2 {\n  height: auto !important; min-height: 0 !important; line-height: 1.45 !important;\n}\nbody .subheader h2, body #tabs, body .miniTabs { float: none !important; clear: both !important; }\nbody #tabs a, body .miniTabs a {\n  display: inline-block !important; float: none !important;\n  width: auto !important; height: auto !important; min-height: 0 !important;\n  line-height: 1.4 !important; margin: 3px !important; padding: 4px 6px !important;\n}\n/* Keep very long result table cells inside their own scrolling region. */\nbody #query-results .panel { max-width: 100% !important; overflow-x: auto !important; }\n\nbody #topbar .page { display: flow-root !important; }\n";
        document.head.appendChild(style);
        earlyReflow = true;
        autoMode = true;
        isEnabled = true;
        return true;
    }

    // Set the viewport before the first browser layout to avoid a second text-inflation pass.
    if (canStartEarlyReflow() && !installEarlyReflow()) {
        const earlyObserver = new MutationObserver(() => {
            if (installEarlyReflow()) earlyObserver.disconnect();
        });
        earlyObserver.observe(document, { childList: true, subtree: true });
    }



    // The automatic path deliberately avoids the legacy body * layout overrides.
    // A reversible viewport adjustment is only attempted for a scaled-down desktop layout.
    function mobileAutoEligible() {
        if (isArchiveSnapshot || isHackerNewsNonDiscussion()) return false;
        if (!shouldEnforceMinFontSize() || !document.body || document.hidden) return false;
        const agent = typeof navigator === 'undefined' ? '' : navigator.userAgent || '';
        return /Android/i.test(agent) || (!agent && window.innerWidth <= 1100);
    }

    function autoDisabledByUser() {
        try {
            return window.localStorage.getItem(AUTO_STORAGE) === 'off'
                || sessionStorage.getItem(AUTO_FAILURE) === 'failed';
        } catch (_) {
            return false;
        }
    }

    function setAutomaticPreference(disabled) {
        try {
            if (disabled) window.localStorage.setItem(AUTO_STORAGE, 'off');
            else window.localStorage.removeItem(AUTO_STORAGE);
        } catch (_) { /* Ignore unavailable site storage. */ }
    }

    function scaledPageMetrics() {
        const vv = window.visualViewport;
        const scale = vv && Number.isFinite(vv.scale) ? vv.scale : 1;
        const layoutWidth = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
        const physicalWidth = (window.screen && window.screen.width)
            || (vv && vv.width && vv.scale ? vv.width * vv.scale : 0)
            || layoutWidth;
        return { scale, layoutWidth, physicalWidth,
            legacy: scale < 0.85 && layoutWidth > physicalWidth * 1.4 };
    }

    function ownReadableText(element) {
        if (element.childNodes) {
            return Array.from(element.childNodes).filter((child) => child.nodeType === 3)
                .map((child) => child.textContent || '').join('').trim();
        }
        return (element.textContent || '').trim();
    }

    function isReadingElement(element) {
        if (!element || !element.tagName) return false;
        for (let parent = element; parent && parent !== document.body; parent = parent.parentElement) {
            const tag = parent.tagName;
            if (['NAV', 'FOOTER', 'BUTTON', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'CANVAS', 'IFRAME', 'INPUT', 'TEXTAREA'].includes(tag)) return false;
            if (parent.id === FLOATING_MENU_ID || parent.id === AUTO_STYLE_ID ||
                (parent.classList && (parent.classList.contains('CodeMirror') || parent.classList.contains('monaco-editor')))) return false;
        }
        const css = window.getComputedStyle(element);
        if (css.display === 'none' || css.visibility === 'hidden') return false;
        if (typeof element.getClientRects === 'function' && element.getClientRects().length === 0) return false;
        return true;
    }

    function sampleReadingText(scale) {
        const candidates = document.body.querySelectorAll('p, li, td, th, blockquote, pre, span, div, a, label, h1, h2, h3');
        let all = 0, tiny = 0, count = 0;
        for (const element of candidates) {
            if (count >= 260 || all >= 10000) break;
            if (!isReadingElement(element)) continue;
            const content = ownReadableText(element).replace(/\s+/g, ' ');
            if (content.length < 8) continue;
            const size = Number.parseFloat(window.getComputedStyle(element).fontSize);
            if (!Number.isFinite(size) || size <= 0) continue;
            const weight = Math.min(content.length, 300);
            all += weight;
            if (size * scale < 13.5) tiny += weight;
            count += 1;
        }
        return { all, tiny, count, ratio: all ? tiny / all : 0 };
    }

    function detectUnreadableMobilePage() {
        const geometry = scaledPageMetrics();
        const text = sampleReadingText(geometry.scale);
        // Desktop pages shrunk by the browser need less text to establish confidence.
        const legacy = geometry.legacy && text.all >= 60 && text.count >= 2 && text.ratio >= 0.55;
        // Normal mobile pages require sustained, text-heavy evidence; never trigger on a tiny caption.
        const tinyText = !geometry.legacy && geometry.scale >= 0.95
            && text.all >= 180 && text.count >= 3 && text.ratio >= 0.8;
        return { needed: legacy || tinyText, legacy, geometry, text };
    }

    function setAutomaticButtonState() {
        const button = document.querySelector('[data-floating-tool="mobile"]');
        if (!button) return;
        button.setAttribute('aria-pressed', String(isEnabled));
        button.title = isEnabled ? 'Force Mobile View is ON (click to disable)' : 'Force Mobile View is OFF (click to enable)';
    }

    function clearAutoFontOverrides() {
        clearMinimumFontSize();
    }

    function applyAutoTextSize(root) {
        if (!root) return;
        const elements = root.querySelectorAll('p, li, td, th, blockquote, span, div, a, label');
        const targets = [];
        for (const element of elements) {
            if (targets.length >= 300 || !isReadingElement(element) || ownReadableText(element).length < 8) continue;
            targets.push(element);
        }
        for (const element of targets) {
            if (element.hasAttribute(MIN_FONT_FLAG_ATTR)) continue;
            const current = Number.parseFloat(window.getComputedStyle(element).fontSize);
            if (!Number.isFinite(current) || current >= 15) continue;
            const lineHeight = window.getComputedStyle(element).lineHeight;
            element.setAttribute(MIN_FONT_FLAG_ATTR, 'true');
            element.setAttribute(MIN_FONT_VALUE_ATTR, element.style.getPropertyValue('font-size'));
            element.setAttribute(MIN_FONT_PRIORITY_ATTR, element.style.getPropertyPriority('font-size'));
            element.setAttribute(MIN_LINE_HEIGHT_VALUE_ATTR, element.style.getPropertyValue('line-height'));
            element.setAttribute(MIN_LINE_HEIGHT_PRIORITY_ATTR, element.style.getPropertyPriority('line-height'));
            element.style.setProperty('font-size', '15px', 'important');
            element.style.setProperty('line-height', '1.45', 'important');
        }
    }

    function applyAutomaticReadability(detection) {
        // Do not inject a viewport after rendering: browser font boosting can become enormous.
        // Unknown desktop-only layouts are intentionally left unchanged in this safe pilot.
        if (detection.legacy) return;
        autoMode = true;
        isEnabled = true;
        const style = document.createElement('style');
        style.id = AUTO_STYLE_ID;
        style.textContent = [
            'body p, body li, body blockquote, body article, body section,',
            'body h1, body h2, body h3, body h4, body h5, body h6 {',
            'line-height: 1.45 !important; height: auto !important; max-height: none !important;',
            'overflow-wrap: break-word !important; }',
        ].join(String.fromCharCode(10));
        (document.head || document.documentElement).appendChild(style);
        applyAutoTextSize(document.body);
        setAutomaticButtonState();
        setTimeout(() => validateAutomaticReadability(detection), 700);
    }

    function undoAutomaticReadability(userDisabled = false) {
        if (earlyReflow) {
            // A navigation is required to restore the pre-viewport desktop layout.
            if (userDisabled) setAutomaticPreference(true);
            autoMode = false;
            isEnabled = false;
            window.location.reload();
            return;
        }
        autoMode = false;
        isEnabled = false;
        const style = document.getElementById(AUTO_STYLE_ID);
        if (style) style.remove();
        clearAutoFontOverrides();
        if (userDisabled) setAutomaticPreference(true);
        setAutomaticButtonState();
    }

    function validateAutomaticReadability(before = { legacy: false, text: { ratio: 0 } }) {
        if (!autoMode) return;
        // CodeMirror caches text and line geometry; refresh only when its API is available.
        for (const element of document.querySelectorAll('.CodeMirror')) {
            if (element.CodeMirror && typeof element.CodeMirror.refresh === 'function') {
                try { element.CodeMirror.refresh(); } catch (_) { /* Keep the rest of the page usable. */ }
            }
        }
        const after = scaledPageMetrics();
        const measuredText = sampleReadingText(after.scale);
        const viewport = Math.max(1, window.innerWidth || after.layoutWidth);
        const horizontalOverflow = document.documentElement.scrollWidth || 0;
        const overflowing = horizontalOverflow > viewport + Math.max(24, viewport * 0.05);
        const failedViewport = before.legacy && after.legacy &&
            measuredText.all >= 60 && measuredText.ratio > 0.55;
        const unreadableStill = !before.legacy && measuredText.all >= 180
            && measuredText.ratio > 0.8 && measuredText.ratio > before.text.ratio - 0.1;
        if (overflowing || failedViewport || unreadableStill) {
            if (earlyReflow) {
                try { sessionStorage.setItem(AUTO_FAILURE_V2, 'failed'); } catch (_) { /* Session only. */ }
                window.location.reload();
                return;
            }
            undoAutomaticReadability();
            try { sessionStorage.setItem(AUTO_FAILURE, 'failed'); } catch (_) { /* Session only. */ }
            autoRestoreError = true;
        }
    }

    // A hidden desktop viewport can shrink a 38px menu handle to ~14 CSS
    // display pixels. Do not retroactively replace the viewport on a live
    // document: request one early-render reload only for single-PRE prose.
    function requestSimpleProseReflow() {
        if (!isAndroidBrowser() || isPlainTextUrl || simplePreReloadRequested()
            || isEnabled || autoDisabledByUser() || !document.body
            || isHackerNewsNonDiscussion()) return false;
        const toggle = document.querySelector('#tm-shared-floating-menu [data-floating-toggle]');
        if (!toggle || typeof toggle.getBoundingClientRect !== 'function') return false;
        const rect = toggle.getBoundingClientRect();
        const scale = window.visualViewport?.scale || 1;
        if (!(rect.width > 0 && rect.width <= 70 && rect.width * scale < 28)) return false;
        const topChildren = Array.from(document.body.children || []);
        const directPre = topChildren.find((element) => element.tagName === 'PRE');
        const wrappedPre = topChildren.find((element) =>
            element.hasAttribute?.('data-tm-translatable-pre-wrapper'))?.querySelector('pre');
        const pre = directPre || wrappedPre;
        if (!pre) return false;
        const contentRoot = pre.closest('[data-tm-translatable-pre-wrapper]') || pre;
        const topLevel = Array.from(document.body.children || [])
            .filter((element) => element.tagName !== 'SCRIPT' && element.tagName !== 'STYLE'
                && element.id !== FLOATING_MENU_ID
                && !element.id?.startsWith('tm-'));
        if (topLevel.length !== 1 || topLevel[0] !== contentRoot) return false;
        const prose = pre.textContent || '';
        const words = prose.match(/[A-Za-z][A-Za-z'-]{2,}/g) || [];
        if (words.length < 60) return false;
        const common = words.filter((word) =>
            /^(the|and|that|this|with|from|have|was|were|are|for|but|not|when|which|what|there|they|you|your|we|our|can|would|will|about|into|than|their|been|more|one|like|just|then|because|after|before|these|those|its|has|had|all|some|who|why|how|of|to|in|on|as|is|it|at)$/i.test(word)).length;
        if (common / words.length < 0.12) return false;
        try { sessionStorage.setItem(SIMPLE_PRE_STORAGE, 'yes'); }
        catch (_) { return false; }
        window.location.reload();
        return true;
    }

    function scheduleAutomaticDetection() {
        if (requestSimpleProseReflow()) return;
        if (isEnabled || autoMode || !mobileAutoEligible() || autoDisabledByUser() || autoRestoreError) return;
        if (autoTimer) clearTimeout(autoTimer);
        autoTimer = setTimeout(() => {
            autoTimer = null;
            if (isEnabled || autoDisabledByUser() || !mobileAutoEligible()) return;
            const detection = detectUnreadableMobilePage();
            if (detection.needed) applyAutomaticReadability(detection);
        }, 250);
    }


    function buildStyleContent() {
        if (isArchiveSnapshot) {
            // Static Archive.today snapshots preserve desktop inline coordinates.
            // Their parent/header must NOT receive generic width, table or font rewrites.
            return `
                #CONTENT { overflow-wrap: break-word !important; }
                #CONTENT p, #CONTENT li, #CONTENT blockquote,
                #CONTENT article, #CONTENT section, #CONTENT h1, #CONTENT h2,
                #CONTENT h3, #CONTENT h4, #CONTENT h5, #CONTENT h6 {
                    line-height: 1.45 !important; max-height: none !important;
                }
                #CONTENT img, #CONTENT video { max-width: 100% !important; height: auto !important; }
            `;
        }
        return `:root, body {\n` +
            `    width: auto !important;\n` +
            `    max-width: 100vw !important;\n` +
            `    overflow-x: auto !important;\n` +
            `}\n` +
        `body {\n` +
            `    margin-left: auto !important;\n` +
            `    margin-right: auto !important;\n` +
            `    padding-left: 0 !important;\n` +
            `    padding-right: 0 !important;\n` +
            `}\n` +
            `body, body * {\n` +
            `    box-sizing: border-box !important;\n` +
            `}\n` +
            `@media (max-width: 768px), (pointer: coarse) {\n` +
            `    :root, body {\n` +
            `        font-size: 16px !important;\n` +
            `        -webkit-text-size-adjust: 100% !important;\n` +
            `        text-size-adjust: 100% !important;\n` +
            `    }\n` +
            `    body > * {\n` +
            `        margin-left: 0 !important;\n` +
            `        margin-right: 0 !important;\n` +
            `        padding-left: min(0.6vw, 2px) !important;\n` +
            `        padding-right: min(0.6vw, 2px) !important;\n` +
            `    }\n` +
            `}\n` +
            `body *:not(#tm-shared-floating-menu):not(#tm-shared-floating-menu *):not(.tm-fullscreen-game-view-button) {\n` +
            `    max-width: 100% !important;\n` +
            `    min-width: 0 !important;\n` +
            `    word-break: break-word !important;\n` +
            `    overflow-wrap: anywhere !important;\n` +
            `}\n` +
            `img, video, canvas, svg, iframe {\n` +
            `    max-width: 100% !important;\n` +
            `    height: auto !important;\n` +
            `}\n` +
            `table {\n` +
            `    width: 100% !important;\n` +
            `    max-width: 100vw !important;\n` +
            `    table-layout: auto !important;\n` +
            `    border-collapse: collapse !important;\n` +
            `    border-spacing: 0 !important;\n` +
            `}\n` +
            `td, th {\n` +
            `    word-break: break-word !important;\n` +
            `    overflow-wrap: anywhere !important;\n` +
            `}\n` +
            `pre, code, kbd, samp {\n` +
            `    white-space: pre-wrap !important;\n` +
            `}\n` +
            `textarea, input, select {\n` +
            `    max-width: 100% !important;\n` +
            `    width: 100% !important;\n` +
            `    box-sizing: border-box !important;\n` +
            `}\n` +
            `@media (max-width: 768px), (pointer: coarse) {\n` +
            `  p, li, article, blockquote, h1, h2, h3, h4, h5, h6 {\n` +
            `    line-height: 1.45 !important; height: auto !important; max-height: none !important;\n` +
            `  }\n` +
            `}`;
    }

    function insertStyle() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.type = 'text/css';
        style.textContent = buildStyleContent();

        const target = document.head || document.documentElement;
        target.appendChild(style);
    }

    function removeStyle() {
        const style = document.getElementById(STYLE_ID);
        if (style && style.parentNode) {
            style.parentNode.removeChild(style);
        }
    }

    function ensureObserver() {
        if (!styleObserver) {
            styleObserver = new MutationObserver((mutations) => {
                if (isEnabled && !document.getElementById(STYLE_ID)) {
                    insertStyle();
                }
                if (isEnabled && shouldEnforceMinFontSize()) {
                    const minFontSizePx = getActiveMinFontSizePx();
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                applyMinimumFontSize(node, minFontSizePx);
                                applyHorizontalSpacingNormalization(node);
                            }
                        });
                    });
                }
            });
        }
        if (!isObserving) {
            styleObserver.observe(document.documentElement, { childList: true, subtree: true });
            isObserving = true;
        }
    }

    function stopObserver() {
        if (styleObserver && isObserving) {
            styleObserver.disconnect();
            isObserving = false;
        }
    }

    function enableForceWidth() {
        if (isEnabled) {
            return;
        }
        isEnabled = true;
        insertStyle();
        ensureObserver();
        applyMinimumFontSizeIfNeeded();
        applyHorizontalSpacingNormalization(document.body || document.documentElement);
    }

    function disableForceWidth() {
        if (autoMode) {
            undoAutomaticReadability(true);
            return;
        }
        if (!isEnabled) {
            return;
        }
        isEnabled = false;
        removeStyle();
        stopObserver();
        clearMinimumFontSize();
        clearHorizontalSpacingNormalization();
        currentMinFontSizePx = null;
    }

    function toggleForceWidth() {
        if (isEnabled) {
            disableForceWidth();
         } else if ((isDataExplorer || isPlainTextUrl || simplePreReloadRequested()) && isAndroidBrowser()) {
            // Restore the early mobile viewport instead of running the destructive legacy CSS.
            setAutomaticPreference(false);
            try { sessionStorage.removeItem(AUTO_FAILURE_V2); } catch (_) { /* Optional. */ }
            window.location.reload();
        } else {
            setAutomaticPreference(false);
            enableForceWidth();
        }
    }

    function onDocumentReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
        } else {
            callback();
        }
    }

    function shouldEnforceMinFontSize() {
        return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    }

    function isArchiveReadingElement(element) {
        if (!isArchiveSnapshot) return true;
        const content = document.getElementById('CONTENT');
        for (let node = element; content && node; node = node.parentElement) {
            if (node === content) return true;
        }
        return false;
    }

    function getMaxCharsPerLine() {
        const isPortrait = window.matchMedia('(orientation: portrait)').matches || window.innerHeight >= window.innerWidth;
        return isPortrait ? PORTRAIT_MAX_CHARS : LANDSCAPE_MAX_CHARS;
    }

    function getContentWidthPx() {
        const widths = [];
        if (window.visualViewport && Number.isFinite(window.visualViewport.width)) {
            widths.push(window.visualViewport.width);
        }
        if (document.documentElement && Number.isFinite(document.documentElement.clientWidth)) {
            widths.push(document.documentElement.clientWidth);
        }
        if (document.body && Number.isFinite(document.body.clientWidth)) {
            widths.push(document.body.clientWidth);
        }
        if (Number.isFinite(window.innerWidth)) {
            widths.push(window.innerWidth);
        }
        return Math.max(0, ...widths);
    }

    function calculateMinimumFontSizePx() {
        if (isArchiveSnapshot) {
            // Use visual scale rather than the 1028px archive wrapper width.
            // Clamp at 40 CSS px to avoid enormous fonts if Edge changes auto-fit.
            const scale = window.visualViewport?.scale;
            const factor = Number.isFinite(scale) && scale > 0 ? scale : 1;
            return Math.min(40, Math.max(15, Math.round(16 / factor)));
        }
        const contentWidth = getContentWidthPx();
        if (!Number.isFinite(contentWidth) || contentWidth <= 0) {
            return DEFAULT_MIN_FONT_SIZE_PX;
        }
        const maxChars = getMaxCharsPerLine();
        return Math.max(1, Math.floor(contentWidth / maxChars));
    }

    function getActiveMinFontSizePx() {
        if (currentMinFontSizePx === null) {
            currentMinFontSizePx = calculateMinimumFontSizePx();
        }
        return currentMinFontSizePx;
    }

    function refreshMinimumFontSize() {
        if (!shouldEnforceMinFontSize()) {
            if (currentMinFontSizePx !== null) {
                clearMinimumFontSize();
                currentMinFontSizePx = null;
            }
            clearHorizontalSpacingNormalization();
            return;
        }
        const nextMinFontSizePx = calculateMinimumFontSizePx();
        if (currentMinFontSizePx === nextMinFontSizePx) {
            return;
        }
        if (currentMinFontSizePx !== null) {
            clearMinimumFontSize();
        }
        currentMinFontSizePx = nextMinFontSizePx;
        if (!document.body) {
            onDocumentReady(() => {
                applyMinimumFontSize(document.body, currentMinFontSizePx);
                applyHorizontalSpacingNormalization(document.body);
            });
            return;
        }
        applyMinimumFontSize(document.body, currentMinFontSizePx);
        applyHorizontalSpacingNormalization(document.body);
    }

    function getSidePixels(value) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function getElementsForSpacingNormalization(root) {
        const targets = [];
        if (!root || root.nodeType !== Node.ELEMENT_NODE) {
            return targets;
        }
        if (root.matches && root.matches(SPACING_TARGET_SELECTOR) && isArchiveReadingElement(root)) {
            targets.push(root);
        }
        targets.push(...Array.from(root.querySelectorAll(SPACING_TARGET_SELECTOR)).filter(isArchiveReadingElement));
        return targets;
    }

    function applyHorizontalSpacingNormalization(root) {
        if (!root || !shouldEnforceMinFontSize()) {
            return;
        }
        const elements = getElementsForSpacingNormalization(root);
        elements.forEach((element) => {
            if (element.hasAttribute(SPACING_FLAG_ATTR)) {
                return;
            }
            const computedStyle = window.getComputedStyle(element);
            const marginLeft = getSidePixels(computedStyle.marginLeft);
            const marginRight = getSidePixels(computedStyle.marginRight);
            const paddingLeft = getSidePixels(computedStyle.paddingLeft);
            const paddingRight = getSidePixels(computedStyle.paddingRight);
            const hasExcessiveSpacing = marginLeft > MAX_SIDE_SPACING_PX ||
                marginRight > MAX_SIDE_SPACING_PX ||
                paddingLeft > MAX_SIDE_SPACING_PX ||
                paddingRight > MAX_SIDE_SPACING_PX;
            if (!hasExcessiveSpacing) {
                return;
            }

            element.setAttribute(SPACING_FLAG_ATTR, 'true');
            element.setAttribute(SPACING_MARGIN_LEFT_ATTR, element.style.getPropertyValue('margin-left'));
            element.setAttribute(SPACING_MARGIN_LEFT_PRIORITY_ATTR, element.style.getPropertyPriority('margin-left'));
            element.setAttribute(SPACING_MARGIN_RIGHT_ATTR, element.style.getPropertyValue('margin-right'));
            element.setAttribute(SPACING_MARGIN_RIGHT_PRIORITY_ATTR, element.style.getPropertyPriority('margin-right'));
            element.setAttribute(SPACING_PADDING_LEFT_ATTR, element.style.getPropertyValue('padding-left'));
            element.setAttribute(SPACING_PADDING_LEFT_PRIORITY_ATTR, element.style.getPropertyPriority('padding-left'));
            element.setAttribute(SPACING_PADDING_RIGHT_ATTR, element.style.getPropertyValue('padding-right'));
            element.setAttribute(SPACING_PADDING_RIGHT_PRIORITY_ATTR, element.style.getPropertyPriority('padding-right'));

            element.style.setProperty('margin-left', '0px', 'important');
            element.style.setProperty('margin-right', '0px', 'important');
            element.style.setProperty('padding-left', `${MAX_SIDE_SPACING_PX}px`, 'important');
            element.style.setProperty('padding-right', `${MAX_SIDE_SPACING_PX}px`, 'important');
        });
    }

    function scheduleMinimumFontRefresh() {
        if (!isEnabled) {
            return;
        }
        if (resizeTimer) {
            clearTimeout(resizeTimer);
        }
        resizeTimer = setTimeout(() => {
            resizeTimer = null;
            refreshMinimumFontSize();
        }, 150);
    }

    function getUserScriptMatches() {
        if (typeof GM_info !== 'undefined' && GM_info && GM_info.script && Array.isArray(GM_info.script.matches)) {
            return GM_info.script.matches;
        }
        return [];
    }

    function isCatchAllMatch(matchPattern) {
        return matchPattern === '*://*/*';
    }

    function matchPatternToRegExp(matchPattern) {
        const escapedPattern = matchPattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        const regexPattern = escapedPattern.replace(/\*/g, '.*');
        return new RegExp(`^${regexPattern}$`);
    }

    function shouldAutoEnableForUrl() {
        if (isHackerNewsNonDiscussion()) return false;
        if (isArchiveSnapshot) {
            // Enable only capture URLs, not archive submission/search/navigation pages.
            const segment = location.pathname.split('/').filter(Boolean)[0] || '';
            const reserved = ['search', 'submit', 'faq', 'help', 'blog', 'login',
                'settings', 'download', 'robots', 'sitemap', 'favicon'];
            return ((/^[A-Za-z0-9]{4,10}$/.test(segment)
                && !reserved.includes(segment.toLowerCase()))
                || /^\d{4}\.\d{2}\.\d{2}-/.test(segment));
        }
        const matches = getUserScriptMatches().filter((matchPattern) => !isCatchAllMatch(matchPattern));
        if (matches.length === 0) {
            return false;
        }
        const currentUrl = window.location.href;
        return matches.some((matchPattern) => matchPatternToRegExp(matchPattern).test(currentUrl));
    }

    function applyMinimumFontSizeIfNeeded() {
        refreshMinimumFontSize();
    }

    function applyMinimumFontSize(root, minFontSizePx) {
        if (!root || !Number.isFinite(minFontSizePx)) {
            return;
        }
        const enforcedAncestors = new Set();
        const elements = [];
        if (root.nodeType === Node.ELEMENT_NODE) {
            elements.push(root);
        }
        elements.push(...root.querySelectorAll('*'));
        elements.forEach((element) => {
            if (!isArchiveReadingElement(element)) return;
            if (element.hasAttribute(MIN_FONT_FLAG_ATTR)) {
                return;
            }
            const computedSize = Number.parseFloat(window.getComputedStyle(element).fontSize);
            if (!Number.isFinite(computedSize) || computedSize >= minFontSizePx) {
                return;
            }
            const inlineValue = element.style.getPropertyValue('font-size');
            const inlinePriority = element.style.getPropertyPriority('font-size');
            const lineHeightValue = element.style.getPropertyValue('line-height');
            const lineHeightPriority = element.style.getPropertyPriority('line-height');
            element.setAttribute(MIN_FONT_FLAG_ATTR, 'true');
            element.setAttribute(MIN_FONT_VALUE_ATTR, inlineValue);
            element.setAttribute(MIN_FONT_PRIORITY_ATTR, inlinePriority);
            element.setAttribute(MIN_LINE_HEIGHT_VALUE_ATTR, lineHeightValue);
            element.setAttribute(MIN_LINE_HEIGHT_PRIORITY_ATTR, lineHeightPriority);
            element.style.setProperty('font-size', `${minFontSizePx}px`, 'important');
            const minimumLineHeightPx = minFontSizePx * MIN_LINE_HEIGHT_RATIO;
            element.style.setProperty('line-height', `${minimumLineHeightPx}px`, 'important');
            let parent = element.parentElement;
            while (parent && parent !== document.documentElement) {
                if (!enforcedAncestors.has(parent)) {
                    enforceReadableLineHeight(parent);
                    enforcedAncestors.add(parent);
                }
                parent = parent.parentElement;
            }
        });
    }

    function enforceReadableLineHeight(element) {
        if (!element || element.hasAttribute(MIN_FONT_FLAG_ATTR) || element.hasAttribute(MIN_LINE_HEIGHT_ONLY_FLAG_ATTR)) {
            return;
        }
        const computedStyle = window.getComputedStyle(element);
        const computedFontSize = Number.parseFloat(computedStyle.fontSize);
        const computedLineHeight = Number.parseFloat(computedStyle.lineHeight);
        if (!Number.isFinite(computedFontSize) || !Number.isFinite(computedLineHeight)) {
            return;
        }
        const minimumLineHeightPx = computedFontSize * MIN_LINE_HEIGHT_RATIO;
        if (computedLineHeight >= minimumLineHeightPx) {
            return;
        }
        const lineHeightValue = element.style.getPropertyValue('line-height');
        const lineHeightPriority = element.style.getPropertyPriority('line-height');
        element.setAttribute(MIN_LINE_HEIGHT_ONLY_FLAG_ATTR, 'true');
        element.setAttribute(MIN_LINE_HEIGHT_ONLY_VALUE_ATTR, lineHeightValue);
        element.setAttribute(MIN_LINE_HEIGHT_ONLY_PRIORITY_ATTR, lineHeightPriority);
        element.style.setProperty('line-height', `${minimumLineHeightPx}px`, 'important');
    }

    function clearMinimumFontSize() {
        const elements = document.querySelectorAll(`[${MIN_FONT_FLAG_ATTR}="true"]`);
        elements.forEach((element) => {
            const inlineValue = element.getAttribute(MIN_FONT_VALUE_ATTR) || '';
            const inlinePriority = element.getAttribute(MIN_FONT_PRIORITY_ATTR) || '';
            const lineHeightValue = element.getAttribute(MIN_LINE_HEIGHT_VALUE_ATTR) || '';
            const lineHeightPriority = element.getAttribute(MIN_LINE_HEIGHT_PRIORITY_ATTR) || '';
            if (inlineValue) {
                element.style.setProperty('font-size', inlineValue, inlinePriority);
            } else {
                element.style.removeProperty('font-size');
            }
            if (lineHeightValue) {
                element.style.setProperty('line-height', lineHeightValue, lineHeightPriority);
            } else {
                element.style.removeProperty('line-height');
            }
            element.removeAttribute(MIN_FONT_FLAG_ATTR);
            element.removeAttribute(MIN_FONT_VALUE_ATTR);
            element.removeAttribute(MIN_FONT_PRIORITY_ATTR);
            element.removeAttribute(MIN_LINE_HEIGHT_VALUE_ATTR);
            element.removeAttribute(MIN_LINE_HEIGHT_PRIORITY_ATTR);
        });
        const lineHeightOnlyElements = document.querySelectorAll(`[${MIN_LINE_HEIGHT_ONLY_FLAG_ATTR}="true"]`);
        lineHeightOnlyElements.forEach((element) => {
            const lineHeightValue = element.getAttribute(MIN_LINE_HEIGHT_ONLY_VALUE_ATTR) || '';
            const lineHeightPriority = element.getAttribute(MIN_LINE_HEIGHT_ONLY_PRIORITY_ATTR) || '';
            if (lineHeightValue) {
                element.style.setProperty('line-height', lineHeightValue, lineHeightPriority);
            } else {
                element.style.removeProperty('line-height');
            }
            element.removeAttribute(MIN_LINE_HEIGHT_ONLY_FLAG_ATTR);
            element.removeAttribute(MIN_LINE_HEIGHT_ONLY_VALUE_ATTR);
            element.removeAttribute(MIN_LINE_HEIGHT_ONLY_PRIORITY_ATTR);
        });
    }

    function restoreInlineProperty(element, propertyName, valueAttr, priorityAttr) {
        const inlineValue = element.getAttribute(valueAttr) || '';
        const inlinePriority = element.getAttribute(priorityAttr) || '';
        if (inlineValue) {
            element.style.setProperty(propertyName, inlineValue, inlinePriority);
        } else {
            element.style.removeProperty(propertyName);
        }
        element.removeAttribute(valueAttr);
        element.removeAttribute(priorityAttr);
    }

    function clearHorizontalSpacingNormalization() {
        const elements = document.querySelectorAll(`[${SPACING_FLAG_ATTR}="true"]`);
        elements.forEach((element) => {
            restoreInlineProperty(element, 'margin-left', SPACING_MARGIN_LEFT_ATTR, SPACING_MARGIN_LEFT_PRIORITY_ATTR);
            restoreInlineProperty(element, 'margin-right', SPACING_MARGIN_RIGHT_ATTR, SPACING_MARGIN_RIGHT_PRIORITY_ATTR);
            restoreInlineProperty(element, 'padding-left', SPACING_PADDING_LEFT_ATTR, SPACING_PADDING_LEFT_PRIORITY_ATTR);
            restoreInlineProperty(element, 'padding-right', SPACING_PADDING_RIGHT_ATTR, SPACING_PADDING_RIGHT_PRIORITY_ATTR);
            element.removeAttribute(SPACING_FLAG_ATTR);
        });
    }

    function createFloatingToggleButton() {
        if (!document.body) return;
        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.textContent = '↔';
        function updateButtonAppearance() {
            toggleButton.setAttribute('aria-pressed', String(isEnabled));
            toggleButton.title = isEnabled ? 'Force Mobile View is ON (click to disable)' : 'Force Mobile View is OFF (click to enable)';
        }
        toggleButton.addEventListener('click', (event) => {
            event.preventDefault();
            toggleForceWidth();
            updateButtonAppearance();
        });
        updateButtonAppearance();
        registerFloatingButton('mobile', toggleButton);
        if (autoMode) setAutomaticButtonState();
    }

    if (!autoMode && shouldAutoEnableForUrl()) {
        enableForceWidth();
    } else if (!autoMode) {
        onDocumentReady(scheduleAutomaticDetection);
        window.addEventListener('load', scheduleAutomaticDetection, { once: true });
    } else {
        onDocumentReady(() => {
            setAutomaticButtonState();
            setTimeout(validateAutomaticReadability, 1600);
        });
    }

    window.addEventListener('resize', scheduleMinimumFontRefresh);
    window.addEventListener('orientationchange', scheduleMinimumFontRefresh);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', scheduleMinimumFontRefresh);
    }

    onDocumentReady(createFloatingToggleButton);
})();

        } catch (error) { console.error("SharedMenuAllInOne: ForceMobileView failed", error); }
    }
    // END BUNDLED ForceMobileView
    // BEGIN BUNDLED ForceDarkMode
    if (applies(["https://www.lesswrong.com/*","*://*/*"], ["*://christorng.idv.tw/*","*://*.christorng.idv.tw/*","*://hackernews.betacat.io/*","*://*.hackernews.betacat.io/*","*://theneurondaily.com/*","*://*.theneurondaily.com/*","*://tam.gov.taipei/*","*://*.tam.gov.taipei/*","*://wiwi.*/*","*://*.wiwi.*/*","*://*.kagi.com/*","*://kagi.com/*","*://chatgpt.com/*","*://*.chatgpt.com/*","*://christorng.github.io/*","*://github.com/*","*://*.github.com/*","*://discord.com/*","*://*.discord.com/*","*://ebird.org/*","*://*.ebird.org/*","*://newsminimalist.com/*","*://*.newsminimalist.com/*","*://*ycombinator.com/*","*://huggingface.co/*","*://*.huggingface.co/*","*://youtube.com/*","*://*.youtube.com/*","*://x.com/*","*://*.x.com/*","*://nitter.net/*","*://*.nitter.net/*","*://bing.com/*","*://*.bing.com/*","*://wikipedia.org/*","*://*.wikipedia.org/*","*://reddit.com/*","*://*.reddit.com/*","*://arxiv.org/*","*://*.arxiv.org/*","*://cht.com.tw/*","*://*.cht.com.tw/*","*://*.vercel.app/*","*://vercel.app/*","*://openai.com/*","*://*.openai.com/*","*://anthropic.com/*","*://*.anthropic.com/*","*://claude.ai/*","*://*.claude.ai/*","*://google.com/*","*://*.google.com/*","*://facebook.com/*","*://*.facebook.com/*","*://*.cwa.gov.tw/*","*://cwa.gov.tw/*","*://chrisrtxubuntu:*/*","*://microsoft.com/*","*://*.microsoft.com/*","*://instagram.com/*","*://*.instagram.com/*"])) {
        try {
        const GM_info = __tmOriginalGMInfo ? Object.assign({}, __tmOriginalGMInfo, { script: Object.assign({}, __tmOriginalGMInfo.script, { matches: ["https://www.lesswrong.com/*","*://*/*"], excludes: ["*://christorng.idv.tw/*","*://*.christorng.idv.tw/*","*://hackernews.betacat.io/*","*://*.hackernews.betacat.io/*","*://theneurondaily.com/*","*://*.theneurondaily.com/*","*://tam.gov.taipei/*","*://*.tam.gov.taipei/*","*://wiwi.*/*","*://*.wiwi.*/*","*://*.kagi.com/*","*://kagi.com/*","*://chatgpt.com/*","*://*.chatgpt.com/*","*://christorng.github.io/*","*://github.com/*","*://*.github.com/*","*://discord.com/*","*://*.discord.com/*","*://ebird.org/*","*://*.ebird.org/*","*://newsminimalist.com/*","*://*.newsminimalist.com/*","*://*ycombinator.com/*","*://huggingface.co/*","*://*.huggingface.co/*","*://youtube.com/*","*://*.youtube.com/*","*://x.com/*","*://*.x.com/*","*://nitter.net/*","*://*.nitter.net/*","*://bing.com/*","*://*.bing.com/*","*://wikipedia.org/*","*://*.wikipedia.org/*","*://reddit.com/*","*://*.reddit.com/*","*://arxiv.org/*","*://*.arxiv.org/*","*://cht.com.tw/*","*://*.cht.com.tw/*","*://*.vercel.app/*","*://vercel.app/*","*://openai.com/*","*://*.openai.com/*","*://anthropic.com/*","*://*.anthropic.com/*","*://claude.ai/*","*://*.claude.ai/*","*://google.com/*","*://*.google.com/*","*://facebook.com/*","*://*.facebook.com/*","*://*.cwa.gov.tw/*","*://cwa.gov.tw/*","*://chrisrtxubuntu:*/*","*://microsoft.com/*","*://*.microsoft.com/*","*://instagram.com/*","*://*.instagram.com/*"] }) }) : undefined;


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

    // visualViewport.scale includes Edge's automatic shrink-to-fit, not only a pinch.
    // Inverse-scaling this menu alone preserves its normal 38 x 32 CSS-pixel
    // apparent size without changing the page viewport, text, or layout.
    function floatingMenuViewportScale() {
        const scale = window.visualViewport && window.visualViewport.scale;
        return Number.isFinite(scale) && scale > 0 ? scale : 1;
    }

    function floatingMenuPositionDialog(root) {
        const dialog = root.querySelector('[data-floating-dialog]');
        if (!dialog || dialog.hidden) return;
        const viewport = window.visualViewport;
        const viewportLeft = viewport ? viewport.offsetLeft : 0;
        const viewportWidth = viewport ? viewport.width : window.innerWidth;
        const inverseScale = 1 / floatingMenuViewportScale();
        // Account for the parent's transform when keeping the settings panel
        // within the visible viewport. Its own readable size remains <= 290px.
        const width = Math.max(1, Math.min(290, viewportWidth / inverseScale - 24));
        const renderedWidth = width * inverseScale;
        const margin = 12 * inverseScale;
        const rect = root.getBoundingClientRect();
        const left = Math.max(viewportLeft + margin,
            Math.min(rect.right - renderedWidth,
                viewportLeft + viewportWidth - renderedWidth - margin));
        dialog.style.setProperty('width', `${width}px`, 'important');
        dialog.style.setProperty('left', `${(left - rect.left) / inverseScale}px`, 'important');
        dialog.style.setProperty('right', 'auto', 'important');
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
        floatingMenuPositionDialog(root);
    }


    // Do not rely on font glyphs or pseudo-elements for critical controls:
    // archive snapshots and browser translation can override their styles.
    // An SVG path with an explicit white stroke remains legible on the dark menu.
    function floatingMenuEnsureIcons(root) {
        const white = '#f0f0f0';
        const namespace = 'http://www.w3.org/2000/svg';
        const glyphs = [
            ['data-floating-toggle', 'menu', 'M4 6H20 M4 12H20 M4 18H20'],
            ['data-floating-close', 'close', 'M5 5L19 19 M19 5L5 19']
        ];
        root.setAttribute('data-floating-glyphs', 'svg-v1');
        for (const [attribute, name, lines] of glyphs) {
            const button = root.querySelector('[' + attribute + ']');
            if (!button) continue;
            if (button.querySelector('[data-floating-svg-icon]')) continue;
            button.textContent = '';
            const svg = document.createElementNS(namespace, 'svg');
            svg.setAttribute('data-floating-svg-icon', name);
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('focusable', 'false');
            svg.style.setProperty('display', 'block', 'important');
            svg.style.setProperty('width', '22px', 'important');
            svg.style.setProperty('height', '22px', 'important');
            svg.style.setProperty('flex', '0 0 22px', 'important');
            svg.style.setProperty('pointer-events', 'none', 'important');
            const path = document.createElementNS(namespace, 'path');
            path.setAttribute('d', lines);
            path.setAttribute('stroke', white);
            path.setAttribute('stroke-width', '2.6');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('fill', 'none');
            path.style.setProperty('stroke', white, 'important');
            path.style.setProperty('stroke-width', '2.6', 'important');
            path.style.setProperty('fill', 'none', 'important');
            svg.appendChild(path);
            button.appendChild(svg);
        }
        // A newer script can attach to a menu created by an older installed script.
        // Repair that style in-place; old script observers may reattach the same node.
        const sheet = document.getElementById(FLOATING_MENU_ID + '-style');
        const marker = '/* tm-floating-svg-glyphs-v1 */';
        if (sheet && !sheet.textContent.includes(marker)) {
            sheet.textContent += '\n' + marker + '\n' + [
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-toggle]::before,',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-toggle]::after,',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-close]::before,',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-close]::after {',
                '  content: none !important; display: none !important;',
                '}',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-toggle],',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-close] {',
                '  display: flex !important; align-items: center !important;',
                '  justify-content: center !important; color: #f0f0f0 !important;',
                '}'
            ].join('\n');
        }
    }

    function floatingMenuRoot() {
        let root = document.getElementById(FLOATING_MENU_ID);
        if (root) {
            floatingMenuEnsureIcons(root);
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
            #${FLOATING_MENU_ID} [data-floating-toggle] { cursor: move !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 0 !important; line-height: 0 !important; }
            #${FLOATING_MENU_ID} [data-floating-toggle]::before { content: '' !important; display: block !important; width: 20px !important; height: 2px !important; background: #f0f0f0 !important; box-shadow: 0 -6px 0 #f0f0f0, 0 6px 0 #f0f0f0 !important; }
            #${FLOATING_MENU_ID} [data-floating-close] { font-size: 0 !important; line-height: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; }
            #${FLOATING_MENU_ID} [data-floating-close]::before, #${FLOATING_MENU_ID} [data-floating-close]::after { content: '' !important; position: absolute !important; width: 20px !important; height: 2px !important; background: #f0f0f0 !important; }
            #${FLOATING_MENU_ID} [data-floating-close]::before { transform: rotate(45deg) !important; }
            #${FLOATING_MENU_ID} [data-floating-close]::after { transform: rotate(-45deg) !important; }
            #${FLOATING_MENU_ID} { -webkit-text-size-adjust: none !important; text-size-adjust: none !important; }
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
            ['reset', 'Reset floating button position'],
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
        floatingMenuEnsureIcons(root);
        // Use document coordinates so pinch zoom does not anchor the menu to the visual viewport.
        document.documentElement.appendChild(root);

        const settings = floatingMenuSettings();
        let anchorX = Number.isFinite(settings.x) ? settings.x : null;
        let anchorY = Number.isFinite(settings.y) ? Math.max(0, settings.y) : 70;
        // Fixed positioning prevents the menu from changing document scrollWidth.
        // The visual viewport can differ from the layout viewport on legacy mobile pages.
        const menuWidth = 38;
        // This legacy desktop-width document places CSS-fixed controls outside
        // the visual scrolling viewport on Android Edge. Use a bounded document
        // position for it; other sites retain their existing fixed behavior.
        const documentDock = /(^|\.)openssh\.org$/i.test(location.hostname)
            && location.pathname === '/releasenotes.html';
        const layoutWidth = () => Math.max(menuWidth, Math.min(
            window.innerWidth || menuWidth,
            document.documentElement.clientWidth || window.innerWidth || menuWidth));
        const visualBounds = () => {
            const viewport = window.visualViewport;
            return {
                left: viewport ? viewport.offsetLeft : 0,
                top: viewport ? viewport.offsetTop : 0,
                width: Math.max(menuWidth, viewport ? viewport.width : layoutWidth()),
            };
        };
        const clampX = (x) => {
            const viewport = visualBounds();
            // A transformed menu grows left from its right edge; keep the
            // enlarged hit target visible when a saved position is near x=0.
            const visibleWidth = Math.min(viewport.width,
                menuWidth / floatingMenuViewportScale());
            return Math.max(viewport.left + visibleWidth - menuWidth,
                Math.min(x, viewport.left + viewport.width - menuWidth));
        };
        const scrollX = () => Math.max(0, window.scrollX || 0);
        // Older pages and mobile browser engines can scroll through body/html
        // while window.scrollY remains zero; read all root-scroller representations.
        const scrollY = () => {
            const viewport = window.visualViewport;
            const viewportPageScroll = viewport && Number.isFinite(viewport.pageTop)
                ? viewport.pageTop - (viewport.offsetTop || 0) : 0;
            return Math.max(0, window.scrollY || 0,
                document.scrollingElement ? document.scrollingElement.scrollTop || 0 : 0,
                document.documentElement.scrollTop || 0,
                document.body ? document.body.scrollTop || 0 : 0,
                viewportPageScroll);
        };
        // Capture an overflow ceiling before moving the menu. Never let the
        // absolutely-positioned handle enlarge the document and then chase it.
        const unzoomedDocumentWidth = Math.max(
            layoutWidth(), document.documentElement.scrollWidth || 0);
        const pageTop = () => {
            const viewport = window.visualViewport;
            return Math.max(scrollY(), viewport && Number.isFinite(viewport.pageTop)
                ? viewport.pageTop : 0);
        };
        const pageLeft = () => {
            const viewport = window.visualViewport;
            return Math.max(scrollX(), viewport && Number.isFinite(viewport.pageLeft)
                ? viewport.pageLeft : 0);
        };
        const dockX = () => {
            const viewport = visualBounds();
            const relativeX = anchorX === null ? viewport.width - menuWidth : anchorX;
            return Math.max(0, Math.min(
                pageLeft() + Math.max(0, Math.min(relativeX, viewport.width - menuWidth)),
                unzoomedDocumentWidth - menuWidth));
        };
        let documentY = anchorY;
        let previousScrollY = scrollY();
        // A scale change alone is NOT a pinch gesture. Legacy desktop-width pages
        // (e.g. OpenSSH on Android) can auto-refit after load/translation or when
        // the browser toolbar moves, which previously froze the vertical menu.
        let normalScale = window.visualViewport ? window.visualViewport.scale : 1;
        let pinchGestureArmed = false;
        const zoomed = () => {
            if (!window.visualViewport) return false;
            const current = window.visualViewport.scale;
            if (!pinchAnchored && !pinchGestureArmed) normalScale = current;
            return (pinchAnchored || pinchGestureArmed) && current > normalScale * 1.01;
        };
        document.addEventListener('touchstart', (event) => {
            if (!pinchAnchored && event.touches && event.touches.length >= 2) {
                normalScale = window.visualViewport ? window.visualViewport.scale : 1;
                pinchGestureArmed = true;
            }
        }, { capture: true, passive: true });
        document.addEventListener('touchend', (event) => {
            if (!pinchAnchored && (!event.touches || event.touches.length < 2)) {
                pinchGestureArmed = false;
            }
        }, { capture: true, passive: true });
        document.addEventListener('touchcancel', () => {
            if (!pinchAnchored) pinchGestureArmed = false;
        }, { capture: true, passive: true });
        const scaleControlOnly = () => {
            const inverseScale = 1 / floatingMenuViewportScale();
            if (Math.abs(inverseScale - 1) < 0.01) {
                root.style.removeProperty('transform');
                root.style.removeProperty('transform-origin');
            } else {
                root.style.setProperty('transform', `scale(${inverseScale})`, 'important');
                root.style.setProperty('transform-origin', 'top right', 'important');
            }
        };
        const place = (x, y, fixed) => {
            root.style.setProperty('position', fixed ? 'fixed' : 'absolute', 'important');
            root.style.setProperty('left', `${x}px`, 'important');
            root.style.setProperty('top', `${y}px`, 'important');
            root.style.setProperty('right', 'auto', 'important');
            scaleControlOnly();
            floatingMenuPositionDialog(root);
        };
        let pinchAnchored = false;
        const position = () => {
            if (dragging) return;
            if (zoomed()) {
                if (!pinchAnchored) {
                    // Freeze the document position when pinch-zoom starts. Switching
                    // from fixed to absolute stops following the visual viewport.
                    if (!documentDock) {
                        const documentWidth = Math.max(unzoomedDocumentWidth, layoutWidth(), document.documentElement.scrollWidth || 0);
                        const x = Math.max(0, Math.min(scrollX() + parseFloat(root.style.left), documentWidth - menuWidth));
                        place(x, scrollY() + parseFloat(root.style.top), false);
                    }
                    pinchAnchored = true;
                }
                // Preserve existing document anchoring during a pinch; resize
                // only the menu and its child controls, never the webpage.
                scaleControlOnly();
                floatingMenuPositionDialog(root);
                return;
            }
            if (pinchAnchored) {
                pinchAnchored = false;
                pinchGestureArmed = false;
                previousScrollY = scrollY();
            }
            const currentScrollY = scrollY();
            // A temporary placement returns smoothly to the saved clearance on the way up.
            if (currentScrollY < previousScrollY && previousScrollY > 0) {
                documentY = anchorY + (documentY - anchorY) * currentScrollY / previousScrollY;
            }
            if (currentScrollY >= Math.max(documentY, anchorY)) documentY = anchorY;
            previousScrollY = currentScrollY;
            const viewport = visualBounds();
            const x = anchorX === null ? viewport.width - menuWidth : anchorX;
            // CSS position:fixed uses the layout viewport's top. Adding
            // visualViewport.offsetTop here double-counts mobile viewport
            // panning on desktop-width pages, leaving the handle far below
            // the top until translation changes the page's reflow.
            if (documentDock) {
                place(dockX(), Math.max(documentY, pageTop()), false);
            } else {
                place(clampX(viewport.left + x),
                    Math.max(documentY, currentScrollY) - currentScrollY, true);
            }
        };

        let dragging = false;
        let moved = false;
        let startX = 0;
        let startY = 0;
        let originX = 0;
        let originY = 0;
        // Start inside the visual viewport without contributing to page overflow.
        const viewport = visualBounds();
        if (documentDock) {
            place(dockX(), Math.max(anchorY, pageTop()), false);
        } else {
            place(clampX(viewport.left + (anchorX === null ? viewport.width - menuWidth : anchorX)),
                Math.max(anchorY - scrollY(), 0), true);
        }
        window.addEventListener('scroll', position, { passive: true });
        // Capture scroll on body/html in browsers that don't forward it to window.
        document.addEventListener('scroll', position, { capture: true, passive: true });
        window.addEventListener('resize', position);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', position);
            window.visualViewport.addEventListener('scroll', position);
        }
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
            const x = clampX(originX + point.clientX - startX);
            const y = Math.max(0,
                Math.min(originY + point.clientY - startY,
                    (window.visualViewport ? window.visualViewport.height : window.innerHeight) - 32));
            if (documentDock) {
                const documentX = Math.max(0, Math.min(pageLeft() + x - visualBounds().left,
                    unzoomedDocumentWidth - menuWidth));
                place(documentX, pageTop() + y, false);
            } else {
                place(x, y, true);
            }
        };
        const onEnd = () => {
            if (!dragging) return;
            dragging = false;
            if (moved) {
                const next = floatingMenuSettings();
                anchorX = parseFloat(root.style.left) - (documentDock ? pageLeft() : visualBounds().left);
                documentY = parseFloat(root.style.top) + (documentDock ? 0 : scrollY());
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
            if (zoomed() || pinchGestureArmed) return;
            const point = pointer(event);
            dragging = true;
            moved = false;
            startX = point.clientX;
            startY = point.clientY;
            originX = parseFloat(root.style.left) - (documentDock ? pageLeft() - visualBounds().left : 0);
            originY = parseFloat(root.style.top) - (documentDock ? pageTop() : 0);
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
            if (scope === 'reset') {
                const next = floatingMenuSettings();
                delete next.x;
                delete next.y;
                floatingMenuSave(next);
                anchorX = null;
                anchorY = 70;
                documentY = anchorY;
                previousScrollY = scrollY();
                // Reset just the floating position. Reloading would restart
                // browser translation and can disturb the article's layout.
                floatingMenuCollapse(root);
                position();
                return;
            }
            const next = floatingMenuSettings();
            if (scope === 'domain') next.disabledDomain = true;
            if (scope === 'path') next.disabledPaths = [...new Set([...(next.disabledPaths || []), floatingMenuFolderPath()])];
            if (scope === 'page') next.disabledPages = [...new Set([...(next.disabledPages || []), floatingMenuPageKey()])];
            floatingMenuSave(next);
            window.location.reload();
        });
        // Translation and client-side navigation can remove an injected menu
        // after early userscripts register their buttons. Keep those actions alive.
        let observedHtml = document.documentElement;
        const menuObserver = new MutationObserver((records) => {
            const html = document.documentElement;
            if (!html) return;
            if (html !== observedHtml) {
                observedHtml = html;
                menuObserver.observe(html, { childList: true });
            }
            if (!style.isConnected) (document.head || html).appendChild(style);
            if (!root.isConnected) {
                const replacement = document.getElementById(FLOATING_MENU_ID);
                if (replacement && replacement !== root) {
                    Array.from(replacement.querySelectorAll('[data-floating-tool]')).forEach((button) => {
                        const key = button.getAttribute('data-floating-tool');
                        if (!root.querySelector(`[data-floating-tool="${key}"]`)) root.appendChild(button);
                    });
                    replacement.remove();
                }
                html.appendChild(root);
                floatingMenuRender(root);
            }
            let changed = false;
            for (const record of records) {
                if (record.target !== root) continue;
                for (const button of record.removedNodes) {
                    if (button.nodeType !== 1 || !button.hasAttribute('data-floating-tool')
                        || button.isConnected) continue;
                    const key = button.getAttribute('data-floating-tool');
                    if (root.querySelector(`[data-floating-tool="${key}"]`)) continue;
                    root.appendChild(button);
                    changed = true;
                }
            }
            if (changed) floatingMenuRender(root);
        });
        // Observe only structural changes, not all content mutations.
        menuObserver.observe(document, { childList: true });
        menuObserver.observe(observedHtml, { childList: true });
        menuObserver.observe(root, { childList: true });
        return root;
    }

    function registerFloatingButton(key, button, available = true) {
        if (floatingMenuDisabled()) return;
        const root = floatingMenuRoot();
        button.setAttribute('data-floating-tool', key);
        button.setAttribute('data-floating-available', String(available));
        button.addEventListener('click', () => floatingMenuCollapse(
            button.parentNode && button.parentNode.id === FLOATING_MENU_ID ? button.parentNode : root));
        root.appendChild(button);
        floatingMenuRender(root);
    }

    function setFloatingButtonAvailable(button, available) {
        if (!button.parentNode || button.parentNode.id !== FLOATING_MENU_ID) return;
        button.setAttribute('data-floating-available', String(available));
        floatingMenuRender(button.parentNode);
    }
    // END SHARED FLOATING MENU

    if (window !== window.top || floatingMenuDisabled()) return;

    const STYLE_ID = 'tm-force-dark-mode-style';
    let isEnabled = false;
    let styleObserver;
    let isObserving = false;

    function buildStyleContent() {
        return `:root {\n` +
            `    color-scheme: dark !important;\n` +
            `}\n` +
            `html, body {\n` +
            `    background-color: #121212 !important;\n` +
            `    color: #e6e6e6 !important;\n` +
            `}\n` +
            `body, body * {\n` +
            `    color: #e6e6e6 !important;\n` +
            `    background-color: transparent !important;\n` +
            `    border-color: #3a3a3a !important;\n` +
            `}\n` +
            `a {\n` +
            `    color: #8ab4f8 !important;\n` +
            `}\n` +
            `a:visited {\n` +
            `    color: #c58af9 !important;\n` +
            `}\n` +
            `button, input, select, textarea {\n` +
            `    background-color: #1e1e1e !important;\n` +
            `    color: #e6e6e6 !important;\n` +
            `    border-color: #4a4a4a !important;\n` +
            `}\n` +
            `pre, code, kbd, samp {\n` +
            `    background-color: #1a1a1a !important;\n` +
            `    color: #f1f1f1 !important;\n` +
            `}\n` +
            `table {\n` +
            `    background-color: #161616 !important;\n` +
            `}\n` +
            `th, td {\n` +
            `    background-color: #1a1a1a !important;\n` +
            `}\n` +
            `hr {\n` +
            `    border-color: #333333 !important;\n` +
            `}\n` +
            `::selection {\n` +
            `    background-color: #2b4f81 !important;\n` +
            `    color: #ffffff !important;\n` +
            `}`;
    }

    function insertStyle() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.type = 'text/css';
        style.textContent = buildStyleContent();

        const target = document.head || document.documentElement;
        target.appendChild(style);
    }

    function removeStyle() {
        const style = document.getElementById(STYLE_ID);
        if (style && style.parentNode) {
            style.parentNode.removeChild(style);
        }
    }

    function ensureObserver() {
        if (!styleObserver) {
            styleObserver = new MutationObserver(() => {
                if (isEnabled && !document.getElementById(STYLE_ID)) {
                    insertStyle();
                }
            });
        }
        if (!isObserving) {
            styleObserver.observe(document.documentElement, { childList: true, subtree: true });
            isObserving = true;
        }
    }

    function stopObserver() {
        if (styleObserver && isObserving) {
            styleObserver.disconnect();
            isObserving = false;
        }
    }

    function enableForceDarkMode() {
        if (isEnabled) {
            return;
        }
        isEnabled = true;
        insertStyle();
        ensureObserver();
    }

    function disableForceDarkMode() {
        if (!isEnabled) {
            return;
        }
        isEnabled = false;
        removeStyle();
        stopObserver();
    }

    function toggleForceDarkMode() {
        if (isEnabled) {
            disableForceDarkMode();
        } else {
            enableForceDarkMode();
        }
    }

    function getUserScriptMatches() {
        if (typeof GM_info !== 'undefined' && GM_info && GM_info.script && Array.isArray(GM_info.script.matches)) {
            return GM_info.script.matches;
        }
        return [];
    }

    function isCatchAllMatch(matchPattern) {
        return matchPattern === '*://*/*';
    }

    function matchPatternToRegExp(matchPattern) {
        const escapedPattern = matchPattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        const regexPattern = escapedPattern.replace(/\*/g, '.*');
        return new RegExp(`^${regexPattern}$`);
    }

    function shouldAutoEnableForUrl() {
        const matches = getUserScriptMatches().filter((matchPattern) => !isCatchAllMatch(matchPattern));
        if (matches.length === 0) {
            return false;
        }
        const currentUrl = window.location.href;
        return matches.some((matchPattern) => matchPatternToRegExp(matchPattern).test(currentUrl));
    }

    function onDocumentReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
        } else {
            callback();
        }
    }

    function createFloatingToggleButton() {
        if (!document.body) return;
        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.textContent = '☽';
        function updateButtonAppearance() {
            toggleButton.setAttribute('aria-pressed', String(isEnabled));
            toggleButton.title = isEnabled ? 'Force Dark Mode is ON (click to disable)' : 'Force Dark Mode is OFF (click to enable)';
        }
        toggleButton.addEventListener('click', (event) => {
            event.preventDefault();
            toggleForceDarkMode();
            updateButtonAppearance();
        });
        updateButtonAppearance();
        registerFloatingButton('dark', toggleButton);
    }

    onDocumentReady(createFloatingToggleButton);

    if (shouldAutoEnableForUrl()) {
        enableForceDarkMode();
    }
})();

        } catch (error) { console.error("SharedMenuAllInOne: ForceDarkMode failed", error); }
    }
    // END BUNDLED ForceDarkMode
    // BEGIN BUNDLED TranslatePreformattedText
    if (applies(["*://*/*"], ["*://*.christorng.idv.tw/*"])) {
        try {
        const GM_info = __tmOriginalGMInfo ? Object.assign({}, __tmOriginalGMInfo, { script: Object.assign({}, __tmOriginalGMInfo.script, { matches: ["*://*/*"], excludes: ["*://*.christorng.idv.tw/*"] }) }) : undefined;


(function () {
    'use strict';


    // BEGIN EMBEDDED READER BRIDGE
    // Runs in both top-level pages and their accessible iframes. A frame must
    // actively report readable content before any control is displayed.
    // Never reuse the iframe URL as the standalone reading URL.
    const readerBridgeChannel = 'tm-embedded-reader-v1';
    const readerBridgeUrl = 'https://christorng.idv.tw/TampermonkeyScripts/IframeViewer.html';
    const readerBridgeKey = 'tm-embedded-reader:';
    const readerHandoffLifetime = 10 * 60 * 1000; // GM storage is only a short handoff.
    const isReaderDocument = location.origin === 'https://christorng.idv.tw'
        && location.pathname === '/TampermonkeyScripts/IframeViewer.html';
    const isOwnerSite = /(^|\.)christorng\.idv\.tw$/i.test(location.hostname);
    const readerForbiddenTags = new Set([
        'SCRIPT', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT',
        'BUTTON', 'SELECT', 'TEXTAREA', 'META', 'BASE', 'LINK', 'STYLE',
        'TEMPLATE', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO'
    ]);
    const readerStyleProperties = [
        'display', 'font-family', 'font-size', 'font-weight', 'font-style',
        'line-height', 'letter-spacing', 'color', 'background-color',
        'text-align', 'text-decoration', 'white-space', 'word-break',
        'list-style-type', 'list-style-position', 'margin', 'padding',
        'border', 'border-radius', 'vertical-align'
    ];

    function readerCleanAttributes(element, baseUrl, allowStyle = false) {
        for (const attr of Array.from(element.attributes || [])) {
            const name = attr.name.toLowerCase();
            if (!['href', 'src', 'alt', 'title', 'colspan', 'rowspan'].includes(name)
                && !(allowStyle && name === 'style')) {
                element.removeAttribute(attr.name);
                continue;
            }
            if (name !== 'href' && name !== 'src') continue;
            try {
                const value = new URL(attr.value, baseUrl);
                const isImageData = name === 'src'
                    && /^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(attr.value)
                    && attr.value.length < 120000;
                if (!['https:', 'http:'].includes(value.protocol) && !isImageData) {
                    element.removeAttribute(attr.name);
                } else {
                    element.setAttribute(attr.name, isImageData ? attr.value : value.href);
                }
            } catch (_) {
                element.removeAttribute(attr.name);
            }
        }
        if (element.tagName === 'A') element.setAttribute('rel', 'noopener noreferrer');
    }

    function readerText() {
        return (document.body && (document.body.innerText || document.body.textContent) || '').trim();
    }

    function readerCapture() {
        const text = readerText();
        if (text.length < 100 || !document.body) throw new Error('No readable article content');
        if (document.body.querySelector('input[type="password"]')) throw new Error('Login form excluded');
        const sourceNodes = [document.body, ...document.body.querySelectorAll('*')];
        if (sourceNodes.length > 3000) throw new Error('Article exceeds element limit');
        const copy = document.body.cloneNode(true);
        const copyNodes = [copy, ...copy.querySelectorAll('*')];
        for (let index = 0; index < sourceNodes.length; index++) {
            const source = sourceNodes[index];
            const target = copyNodes[index];
            if (!target) continue;
            if (readerForbiddenTags.has(source.tagName)) {
                target.remove();
                continue;
            }
            const computed = getComputedStyle(source);
            if (computed.display === 'none' || computed.visibility === 'hidden') {
                target.remove();
                continue;
            }
            readerCleanAttributes(target, location.href);
            const declarations = [];
            for (const property of readerStyleProperties) {
                const value = computed.getPropertyValue(property);
                if (value && value.length <= 160 && !/url\s*\(/i.test(value)) {
                    declarations.push(property + ':' + value);
                }
            }
            if (declarations.length) target.setAttribute('style', declarations.join(';'));
        }
        const wrapper = document.createElement('div');
        wrapper.setAttribute('lang', document.documentElement.lang || 'en');
        if (copy.hasAttribute('style')) wrapper.setAttribute('style', copy.getAttribute('style'));
        wrapper.innerHTML = copy.innerHTML;
        const html = wrapper.outerHTML;
        if (html.length > 1800000) throw new Error('Article exceeds capture limit');
        return { html, title: document.title.slice(0, 160) };
    }

    function startReaderInFrame() {
        if (window === window.parent) return;
        function announce() {
            if (!document.body || document.body.querySelector('input[type="password"]')) return;
            const text = readerText();
            if (text.length >= 100) {
                window.parent.postMessage({
                    channel: readerBridgeChannel, type: 'ready', textLength: text.length
                }, '*');
            }
        }
        window.addEventListener('message', (event) => {
            if (event.source !== window.parent) return;
            const data = event.data;
            if (!data || data.channel !== readerBridgeChannel) return;
            if (data.type === 'probe') announce();
            if (data.type !== 'capture' || !/^[a-z0-9-]{8,80}$/i.test(data.id || '')) return;
            try {
                const result = readerCapture();
                window.parent.postMessage({
                    channel: readerBridgeChannel, type: 'captured', id: data.id,
                    html: result.html, title: result.title
                }, '*');
            } catch (error) {
                window.parent.postMessage({
                    channel: readerBridgeChannel, type: 'failed', id: data.id,
                    message: String(error && error.message || error)
                }, '*');
            }
        });
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', announce, { once: true });
        } else announce();
        window.addEventListener('load', announce);
        [500, 1500, 4000].forEach((delay) => setTimeout(announce, delay));
    }

    function startReaderInParent() {
        if (window !== window.top) return;
        const known = new WeakMap();
        let sequence = 0;
        function eligible(frame) {
            if (!frame || !frame.isConnected || !frame.contentWindow) return false;
            const raw = frame.getAttribute('src');
            if (!raw) return false;
            try {
                const address = new URL(raw, document.baseURI || location.href);
                if (!['http:', 'https:'].includes(address.protocol)) return false;
                if (/^(?:www\.)?(?:youtube\.com|youtube-nocookie\.com|vimeo\.com|google\.com|recaptcha\.net|doubleclick\.net)$/.test(address.hostname)) return false;
            } catch (_) { return false; }
            const bounds = frame.getBoundingClientRect();
            return bounds.width >= 180 && bounds.height >= 85;
        }
        function sourceFrame(source) {
            return Array.from(document.querySelectorAll('iframe[src]'))
                .find((frame) => frame.contentWindow === source && eligible(frame));
        }
        function probe() {
            for (const frame of document.querySelectorAll('iframe[src]')) {
                if (eligible(frame)) frame.contentWindow.postMessage({
                    channel: readerBridgeChannel, type: 'probe'
                }, '*');
            }
        }
        function addButton(frame) {
            if (known.has(frame) || !document.body) return known.get(frame);
            const bounds = frame.getBoundingClientRect();
            const button = document.createElement('button');
            const width = 44;
            button.type = 'button';
            button.className = 'tm-iframe-translate-open';
            button.textContent = '譯↗';
            button.title = '擷取 iframe 內容，另開獨立檢視頁';
            // Document coordinates, not fixed/sticky; scrolling never follows the button.
            const left = Math.max(0, Math.round((window.scrollX || 0)
                + Math.min(bounds.right, document.documentElement.clientWidth) - width - 6));
            const top = Math.max(0, Math.round((window.scrollY || 0) + bounds.top + 6));
            button.style.cssText = 'position:absolute !important;left:' + left
                + 'px !important;top:' + top + 'px !important;right:auto !important;'
                + 'bottom:auto !important;width:44px !important;'
                + 'height:32px !important;padding:0 3px !important;'
                + 'background:rgba(0,0,0,.35) !important;color:rgba(255,255,255,.75) !important;'
                + 'opacity:.5 !important;border:0 !important;box-shadow:none !important;'
                + 'border-radius:4px !important;font:600 15px/22px system-ui,sans-serif !important;'
                + 'z-index:2147483646 !important;cursor:pointer !important;touch-action:none !important;';
            button.addEventListener('pointerenter', () => { button.style.opacity = '.9'; });
            button.addEventListener('pointerleave', () => { button.style.opacity = '.5'; });
            let drag = null;
            let ignoreClick = false;
            let currentLeft = left, currentTop = top;
            button.addEventListener('pointerdown', (event) => {
                if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
                drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
                    left: currentLeft, top: currentTop, moved: false };
                ignoreClick = false;
                button.setPointerCapture?.(event.pointerId);
                event.stopPropagation?.();
            });
            button.addEventListener('pointermove', (event) => {
                if (!drag || event.pointerId !== drag.id) return;
                const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
                if (!drag.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
                drag.moved = true;
                event.preventDefault?.();
                const pageWidth = document.documentElement.scrollWidth
                    || document.documentElement.clientWidth || window.innerWidth;
                const pageHeight = document.documentElement.scrollHeight
                    || document.documentElement.clientHeight || window.innerHeight;
                const maxX = Math.max(0, pageWidth - width);
                const maxY = Math.max(0, pageHeight - 32);
                currentLeft = Math.min(maxX, Math.max(0, drag.left + dx));
                currentTop = Math.min(maxY, Math.max(0, drag.top + dy));
                button.style.setProperty('left', currentLeft + 'px', 'important');
                button.style.setProperty('top', currentTop + 'px', 'important');
            });
            const finish = (event) => {
                if (!drag || event.pointerId !== drag.id) return;
                ignoreClick = drag.moved;
                drag = null;
                if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId);
            };
            button.addEventListener('pointerup', finish);
            button.addEventListener('pointercancel', finish);
            button.addEventListener('click', (event) => {
                if (ignoreClick) {
                    ignoreClick = false;
                    event.preventDefault?.();
                    event.stopImmediatePropagation?.();
                }
            }, true);
            button.addEventListener('click', () => {
                const info = known.get(frame);
                if (!info || info.pending) return;
                const id = Date.now().toString(36) + '-' + (++sequence).toString(36)
                    + '-' + Math.random().toString(36).slice(2, 9);
                info.pending = id;
                button.disabled = true;
                button.textContent = '擷取中';
                frame.contentWindow.postMessage({
                    channel: readerBridgeChannel, type: 'capture', id
                }, '*');
                setTimeout(() => {
                    if (info.pending !== id) return;
                    info.pending = null;
                    button.disabled = false;
                    button.textContent = '重試↗';
                }, 12000);
            });
            document.body.appendChild(button);
            const info = { button, pending: null };
            known.set(frame, info);
            return info;
        }
        window.addEventListener('message', async (event) => {
            const frame = sourceFrame(event.source);
            if (!frame) return;
            const data = event.data;
            if (!data || data.channel !== readerBridgeChannel) return;
            if (data.type === 'ready' && Number(data.textLength) >= 100) {
                addButton(frame);
                return;
            }
            const info = known.get(frame);
            if (!info || !info.pending || info.pending !== data.id) return;
            if (data.type === 'failed') {
                info.pending = null;
                info.button.disabled = false;
                info.button.textContent = '重試↗';
                return;
            }
            if (data.type !== 'captured' || typeof data.html !== 'string'
                || data.html.length > 1800000) return;
            const id = info.pending;
            info.pending = null;
            try {
                await Promise.resolve(GM_setValue(readerBridgeKey + id, {
                    html: data.html, createdAt: Date.now()
                }));
                // Every opener receives a distinct ID; source metadata stays in
                // the URL even if the HTML session cache is later unavailable.
                const query = new URLSearchParams({
                    id,
                    title: document.title || String(data.title || ''),
                    url: location.href
                });
                GM_openInTab(readerBridgeUrl + '?' + query.toString(), { active: true });
                void readerPruneHandoffs();
                info.button.textContent = '譯↗';
            } catch (_) {
                info.button.textContent = '重試↗';
            }
            info.button.disabled = false;
        });
        function whenReady() {
            probe();
            let times = 0;
            const timer = setInterval(() => {
                probe();
                if (++times >= 12) clearInterval(timer);
            }, 1000);
            new MutationObserver((mutations) => {
                if (mutations.some((mutation) => Array.from(mutation.addedNodes || [])
                    .some((node) => node.nodeType === 1
                        && (node.tagName === 'IFRAME' || node.querySelector?.('iframe'))))) {
                    probe();
                }
            }).observe(document.documentElement, { childList: true, subtree: true });
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', whenReady, { once: true });
        } else whenReady();
    }

    // The persistent GM slot is only a temporary cross-origin handoff. Once
    // a reader tab imports the HTML, it keeps its own copy in sessionStorage.
    // That copy survives refresh and expires when the tab is closed.
    async function readerPruneHandoffs() {
        try {
            const keys = (await Promise.resolve(GM_listValues()))
                .filter((key) => key.startsWith(readerBridgeKey));
            const valid = [];
            for (const key of keys) {
                const entry = await Promise.resolve(GM_getValue(key, null));
                if (!entry || typeof entry.html !== 'string'
                    || !Number.isFinite(entry.createdAt)
                    || Date.now() - entry.createdAt > readerHandoffLifetime) {
                    await Promise.resolve(GM_deleteValue(key));
                } else valid.push({ key, createdAt: entry.createdAt });
            }
            valid.sort((a, b) => b.createdAt - a.createdAt);
            for (const stale of valid.slice(6)) await Promise.resolve(GM_deleteValue(stale.key));
        } catch (_) { /* Optional cleanup must not block the reader. */ }
    }

    function readerOriginalUrl(value) {
        if (!value) return null;
        try {
            const url = new URL(value);
            if (!['http:', 'https:'].includes(url.protocol)
                || url.href === location.href
                || url.href.startsWith(readerBridgeUrl + '?')) return null;
            return url.href;
        } catch (_) { return null; }
    }

    function startStandaloneReader() {
        const query = new URL(location.href).searchParams;
        const id = query.get('id');
        if (!/^[a-z0-9-]{8,80}$/i.test(id || '')) return;
        const originalUrl = readerOriginalUrl(query.get('url'));
        const originalTitle = query.get('title') || originalUrl || '原始網頁';
        // @run-at document-start: these elements are not necessarily parsed
        // yet, so render the permanent source link only after the body exists.
        function renderSourceHeader() {
            const link = document.getElementById('iframe-viewer-source-link');
            const sourceAddress = document.getElementById('iframe-viewer-source-url');
            if (link) {
                link.textContent = originalTitle;
                if (originalUrl) link.href = originalUrl;
                else link.removeAttribute('href');
            }
            if (sourceAddress) sourceAddress.textContent = originalUrl || '';
            document.title = originalTitle;
            document.documentElement.lang = 'en';
        }

        const sessionKey = 'tm-iframe-viewer:' + id;
        const handoffKey = readerBridgeKey + id;
        let attempts = 0, completed = false, loading = false;
        async function load() {
            if (completed || loading) return;
            const target = document.getElementById('iframe-viewer-content');
            if (!target) return;
            renderSourceHeader();
            loading = true;
            try {
                let record = null;
                try {
                    const cached = sessionStorage.getItem(sessionKey);
                    if (cached) record = JSON.parse(cached);
                } catch (_) { /* Cache may be disabled. */ }
                let transferred = false;
                if (!record || typeof record.html !== 'string') {
                    record = await Promise.resolve(GM_getValue(handoffKey, null));
                    transferred = true;
                }
                if (record && typeof record.html === 'string'
                    && (!transferred || Date.now() - record.createdAt <= readerHandoffLifetime)) {
                    const template = document.createElement('template');
                    template.innerHTML = record.html;
                    for (const item of Array.from(template.content.querySelectorAll('*'))) {
                        if (readerForbiddenTags.has(item.tagName)) {
                            item.remove();
                            continue;
                        }
                        readerCleanAttributes(item, readerBridgeUrl, true);
                        if (item.hasAttribute('style')) {
                            for (const property of Array.from(item.style)) {
                                if (!readerStyleProperties.includes(property)
                                    || /url\s*\(/i.test(item.style.getPropertyValue(property))) {
                                    item.style.removeProperty(property);
                                }
                            }
                        }
                    }
                    target.replaceChildren(template.content);
                    if (transferred) {
                        let saved = false;
                        try {
                            sessionStorage.setItem(sessionKey, JSON.stringify(record));
                            saved = true;
                        } catch (_) { /* Retain GM copy if session cache is not available. */ }
                        if (saved) await Promise.resolve(GM_deleteValue(handoffKey));
                    }
                    completed = true;
                    clearInterval(interval);
                    return;
                }
                if (++attempts >= 32) {
                    completed = true;
                    clearInterval(interval);
                    if (originalUrl) location.replace(originalUrl);
                    else target.textContent = '找不到暫存內容，且沒有有效的原始網址。';
                }
            } finally {
                loading = false;
            }
        }
        const interval = setInterval(() => { void load(); }, 250);
        void load();
        void readerPruneHandoffs();
    }

    if (isReaderDocument) { startStandaloneReader(); return; }
    // The main site was excluded by @exclude before introducing the reader.
    if (isOwnerSite) return;
    if (window === window.top) startReaderInParent();
    else startReaderInFrame();
    // END EMBEDDED READER BRIDGE

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

    // visualViewport.scale includes Edge's automatic shrink-to-fit, not only a pinch.
    // Inverse-scaling this menu alone preserves its normal 38 x 32 CSS-pixel
    // apparent size without changing the page viewport, text, or layout.
    function floatingMenuViewportScale() {
        const scale = window.visualViewport && window.visualViewport.scale;
        return Number.isFinite(scale) && scale > 0 ? scale : 1;
    }

    function floatingMenuPositionDialog(root) {
        const dialog = root.querySelector('[data-floating-dialog]');
        if (!dialog || dialog.hidden) return;
        const viewport = window.visualViewport;
        const viewportLeft = viewport ? viewport.offsetLeft : 0;
        const viewportWidth = viewport ? viewport.width : window.innerWidth;
        const inverseScale = 1 / floatingMenuViewportScale();
        // Account for the parent's transform when keeping the settings panel
        // within the visible viewport. Its own readable size remains <= 290px.
        const width = Math.max(1, Math.min(290, viewportWidth / inverseScale - 24));
        const renderedWidth = width * inverseScale;
        const margin = 12 * inverseScale;
        const rect = root.getBoundingClientRect();
        const left = Math.max(viewportLeft + margin,
            Math.min(rect.right - renderedWidth,
                viewportLeft + viewportWidth - renderedWidth - margin));
        dialog.style.setProperty('width', `${width}px`, 'important');
        dialog.style.setProperty('left', `${(left - rect.left) / inverseScale}px`, 'important');
        dialog.style.setProperty('right', 'auto', 'important');
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
        floatingMenuPositionDialog(root);
    }


    // Do not rely on font glyphs or pseudo-elements for critical controls:
    // archive snapshots and browser translation can override their styles.
    // An SVG path with an explicit white stroke remains legible on the dark menu.
    function floatingMenuEnsureIcons(root) {
        const white = '#f0f0f0';
        const namespace = 'http://www.w3.org/2000/svg';
        const glyphs = [
            ['data-floating-toggle', 'menu', 'M4 6H20 M4 12H20 M4 18H20'],
            ['data-floating-close', 'close', 'M5 5L19 19 M19 5L5 19']
        ];
        root.setAttribute('data-floating-glyphs', 'svg-v1');
        for (const [attribute, name, lines] of glyphs) {
            const button = root.querySelector('[' + attribute + ']');
            if (!button) continue;
            if (button.querySelector('[data-floating-svg-icon]')) continue;
            button.textContent = '';
            const svg = document.createElementNS(namespace, 'svg');
            svg.setAttribute('data-floating-svg-icon', name);
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('focusable', 'false');
            svg.style.setProperty('display', 'block', 'important');
            svg.style.setProperty('width', '22px', 'important');
            svg.style.setProperty('height', '22px', 'important');
            svg.style.setProperty('flex', '0 0 22px', 'important');
            svg.style.setProperty('pointer-events', 'none', 'important');
            const path = document.createElementNS(namespace, 'path');
            path.setAttribute('d', lines);
            path.setAttribute('stroke', white);
            path.setAttribute('stroke-width', '2.6');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('fill', 'none');
            path.style.setProperty('stroke', white, 'important');
            path.style.setProperty('stroke-width', '2.6', 'important');
            path.style.setProperty('fill', 'none', 'important');
            svg.appendChild(path);
            button.appendChild(svg);
        }
        // A newer script can attach to a menu created by an older installed script.
        // Repair that style in-place; old script observers may reattach the same node.
        const sheet = document.getElementById(FLOATING_MENU_ID + '-style');
        const marker = '/* tm-floating-svg-glyphs-v1 */';
        if (sheet && !sheet.textContent.includes(marker)) {
            sheet.textContent += '\n' + marker + '\n' + [
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-toggle]::before,',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-toggle]::after,',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-close]::before,',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-close]::after {',
                '  content: none !important; display: none !important;',
                '}',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-toggle],',
                '#' + FLOATING_MENU_ID + '[data-floating-glyphs="svg-v1"] [data-floating-close] {',
                '  display: flex !important; align-items: center !important;',
                '  justify-content: center !important; color: #f0f0f0 !important;',
                '}'
            ].join('\n');
        }
    }

    function floatingMenuRoot() {
        let root = document.getElementById(FLOATING_MENU_ID);
        if (root) {
            floatingMenuEnsureIcons(root);
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
            #${FLOATING_MENU_ID} [data-floating-toggle] { cursor: move !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 0 !important; line-height: 0 !important; }
            #${FLOATING_MENU_ID} [data-floating-toggle]::before { content: '' !important; display: block !important; width: 20px !important; height: 2px !important; background: #f0f0f0 !important; box-shadow: 0 -6px 0 #f0f0f0, 0 6px 0 #f0f0f0 !important; }
            #${FLOATING_MENU_ID} [data-floating-close] { font-size: 0 !important; line-height: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; }
            #${FLOATING_MENU_ID} [data-floating-close]::before, #${FLOATING_MENU_ID} [data-floating-close]::after { content: '' !important; position: absolute !important; width: 20px !important; height: 2px !important; background: #f0f0f0 !important; }
            #${FLOATING_MENU_ID} [data-floating-close]::before { transform: rotate(45deg) !important; }
            #${FLOATING_MENU_ID} [data-floating-close]::after { transform: rotate(-45deg) !important; }
            #${FLOATING_MENU_ID} { -webkit-text-size-adjust: none !important; text-size-adjust: none !important; }
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
            ['reset', 'Reset floating button position'],
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
        floatingMenuEnsureIcons(root);
        // Use document coordinates so pinch zoom does not anchor the menu to the visual viewport.
        document.documentElement.appendChild(root);

        const settings = floatingMenuSettings();
        let anchorX = Number.isFinite(settings.x) ? settings.x : null;
        let anchorY = Number.isFinite(settings.y) ? Math.max(0, settings.y) : 70;
        // Fixed positioning prevents the menu from changing document scrollWidth.
        // The visual viewport can differ from the layout viewport on legacy mobile pages.
        const menuWidth = 38;
        // This legacy desktop-width document places CSS-fixed controls outside
        // the visual scrolling viewport on Android Edge. Use a bounded document
        // position for it; other sites retain their existing fixed behavior.
        const documentDock = /(^|\.)openssh\.org$/i.test(location.hostname)
            && location.pathname === '/releasenotes.html';
        const layoutWidth = () => Math.max(menuWidth, Math.min(
            window.innerWidth || menuWidth,
            document.documentElement.clientWidth || window.innerWidth || menuWidth));
        const visualBounds = () => {
            const viewport = window.visualViewport;
            return {
                left: viewport ? viewport.offsetLeft : 0,
                top: viewport ? viewport.offsetTop : 0,
                width: Math.max(menuWidth, viewport ? viewport.width : layoutWidth()),
            };
        };
        const clampX = (x) => {
            const viewport = visualBounds();
            // A transformed menu grows left from its right edge; keep the
            // enlarged hit target visible when a saved position is near x=0.
            const visibleWidth = Math.min(viewport.width,
                menuWidth / floatingMenuViewportScale());
            return Math.max(viewport.left + visibleWidth - menuWidth,
                Math.min(x, viewport.left + viewport.width - menuWidth));
        };
        const scrollX = () => Math.max(0, window.scrollX || 0);
        // Older pages and mobile browser engines can scroll through body/html
        // while window.scrollY remains zero; read all root-scroller representations.
        const scrollY = () => {
            const viewport = window.visualViewport;
            const viewportPageScroll = viewport && Number.isFinite(viewport.pageTop)
                ? viewport.pageTop - (viewport.offsetTop || 0) : 0;
            return Math.max(0, window.scrollY || 0,
                document.scrollingElement ? document.scrollingElement.scrollTop || 0 : 0,
                document.documentElement.scrollTop || 0,
                document.body ? document.body.scrollTop || 0 : 0,
                viewportPageScroll);
        };
        // Capture an overflow ceiling before moving the menu. Never let the
        // absolutely-positioned handle enlarge the document and then chase it.
        const unzoomedDocumentWidth = Math.max(
            layoutWidth(), document.documentElement.scrollWidth || 0);
        const pageTop = () => {
            const viewport = window.visualViewport;
            return Math.max(scrollY(), viewport && Number.isFinite(viewport.pageTop)
                ? viewport.pageTop : 0);
        };
        const pageLeft = () => {
            const viewport = window.visualViewport;
            return Math.max(scrollX(), viewport && Number.isFinite(viewport.pageLeft)
                ? viewport.pageLeft : 0);
        };
        const dockX = () => {
            const viewport = visualBounds();
            const relativeX = anchorX === null ? viewport.width - menuWidth : anchorX;
            return Math.max(0, Math.min(
                pageLeft() + Math.max(0, Math.min(relativeX, viewport.width - menuWidth)),
                unzoomedDocumentWidth - menuWidth));
        };
        let documentY = anchorY;
        let previousScrollY = scrollY();
        // A scale change alone is NOT a pinch gesture. Legacy desktop-width pages
        // (e.g. OpenSSH on Android) can auto-refit after load/translation or when
        // the browser toolbar moves, which previously froze the vertical menu.
        let normalScale = window.visualViewport ? window.visualViewport.scale : 1;
        let pinchGestureArmed = false;
        const zoomed = () => {
            if (!window.visualViewport) return false;
            const current = window.visualViewport.scale;
            if (!pinchAnchored && !pinchGestureArmed) normalScale = current;
            return (pinchAnchored || pinchGestureArmed) && current > normalScale * 1.01;
        };
        document.addEventListener('touchstart', (event) => {
            if (!pinchAnchored && event.touches && event.touches.length >= 2) {
                normalScale = window.visualViewport ? window.visualViewport.scale : 1;
                pinchGestureArmed = true;
            }
        }, { capture: true, passive: true });
        document.addEventListener('touchend', (event) => {
            if (!pinchAnchored && (!event.touches || event.touches.length < 2)) {
                pinchGestureArmed = false;
            }
        }, { capture: true, passive: true });
        document.addEventListener('touchcancel', () => {
            if (!pinchAnchored) pinchGestureArmed = false;
        }, { capture: true, passive: true });
        const scaleControlOnly = () => {
            const inverseScale = 1 / floatingMenuViewportScale();
            if (Math.abs(inverseScale - 1) < 0.01) {
                root.style.removeProperty('transform');
                root.style.removeProperty('transform-origin');
            } else {
                root.style.setProperty('transform', `scale(${inverseScale})`, 'important');
                root.style.setProperty('transform-origin', 'top right', 'important');
            }
        };
        const place = (x, y, fixed) => {
            root.style.setProperty('position', fixed ? 'fixed' : 'absolute', 'important');
            root.style.setProperty('left', `${x}px`, 'important');
            root.style.setProperty('top', `${y}px`, 'important');
            root.style.setProperty('right', 'auto', 'important');
            scaleControlOnly();
            floatingMenuPositionDialog(root);
        };
        let pinchAnchored = false;
        const position = () => {
            if (dragging) return;
            if (zoomed()) {
                if (!pinchAnchored) {
                    // Freeze the document position when pinch-zoom starts. Switching
                    // from fixed to absolute stops following the visual viewport.
                    if (!documentDock) {
                        const documentWidth = Math.max(unzoomedDocumentWidth, layoutWidth(), document.documentElement.scrollWidth || 0);
                        const x = Math.max(0, Math.min(scrollX() + parseFloat(root.style.left), documentWidth - menuWidth));
                        place(x, scrollY() + parseFloat(root.style.top), false);
                    }
                    pinchAnchored = true;
                }
                // Preserve existing document anchoring during a pinch; resize
                // only the menu and its child controls, never the webpage.
                scaleControlOnly();
                floatingMenuPositionDialog(root);
                return;
            }
            if (pinchAnchored) {
                pinchAnchored = false;
                pinchGestureArmed = false;
                previousScrollY = scrollY();
            }
            const currentScrollY = scrollY();
            // A temporary placement returns smoothly to the saved clearance on the way up.
            if (currentScrollY < previousScrollY && previousScrollY > 0) {
                documentY = anchorY + (documentY - anchorY) * currentScrollY / previousScrollY;
            }
            if (currentScrollY >= Math.max(documentY, anchorY)) documentY = anchorY;
            previousScrollY = currentScrollY;
            const viewport = visualBounds();
            const x = anchorX === null ? viewport.width - menuWidth : anchorX;
            // CSS position:fixed uses the layout viewport's top. Adding
            // visualViewport.offsetTop here double-counts mobile viewport
            // panning on desktop-width pages, leaving the handle far below
            // the top until translation changes the page's reflow.
            if (documentDock) {
                place(dockX(), Math.max(documentY, pageTop()), false);
            } else {
                place(clampX(viewport.left + x),
                    Math.max(documentY, currentScrollY) - currentScrollY, true);
            }
        };

        let dragging = false;
        let moved = false;
        let startX = 0;
        let startY = 0;
        let originX = 0;
        let originY = 0;
        // Start inside the visual viewport without contributing to page overflow.
        const viewport = visualBounds();
        if (documentDock) {
            place(dockX(), Math.max(anchorY, pageTop()), false);
        } else {
            place(clampX(viewport.left + (anchorX === null ? viewport.width - menuWidth : anchorX)),
                Math.max(anchorY - scrollY(), 0), true);
        }
        window.addEventListener('scroll', position, { passive: true });
        // Capture scroll on body/html in browsers that don't forward it to window.
        document.addEventListener('scroll', position, { capture: true, passive: true });
        window.addEventListener('resize', position);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', position);
            window.visualViewport.addEventListener('scroll', position);
        }
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
            const x = clampX(originX + point.clientX - startX);
            const y = Math.max(0,
                Math.min(originY + point.clientY - startY,
                    (window.visualViewport ? window.visualViewport.height : window.innerHeight) - 32));
            if (documentDock) {
                const documentX = Math.max(0, Math.min(pageLeft() + x - visualBounds().left,
                    unzoomedDocumentWidth - menuWidth));
                place(documentX, pageTop() + y, false);
            } else {
                place(x, y, true);
            }
        };
        const onEnd = () => {
            if (!dragging) return;
            dragging = false;
            if (moved) {
                const next = floatingMenuSettings();
                anchorX = parseFloat(root.style.left) - (documentDock ? pageLeft() : visualBounds().left);
                documentY = parseFloat(root.style.top) + (documentDock ? 0 : scrollY());
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
            if (zoomed() || pinchGestureArmed) return;
            const point = pointer(event);
            dragging = true;
            moved = false;
            startX = point.clientX;
            startY = point.clientY;
            originX = parseFloat(root.style.left) - (documentDock ? pageLeft() - visualBounds().left : 0);
            originY = parseFloat(root.style.top) - (documentDock ? pageTop() : 0);
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
            if (scope === 'reset') {
                const next = floatingMenuSettings();
                delete next.x;
                delete next.y;
                floatingMenuSave(next);
                anchorX = null;
                anchorY = 70;
                documentY = anchorY;
                previousScrollY = scrollY();
                // Reset just the floating position. Reloading would restart
                // browser translation and can disturb the article's layout.
                floatingMenuCollapse(root);
                position();
                return;
            }
            const next = floatingMenuSettings();
            if (scope === 'domain') next.disabledDomain = true;
            if (scope === 'path') next.disabledPaths = [...new Set([...(next.disabledPaths || []), floatingMenuFolderPath()])];
            if (scope === 'page') next.disabledPages = [...new Set([...(next.disabledPages || []), floatingMenuPageKey()])];
            floatingMenuSave(next);
            window.location.reload();
        });
        // Translation and client-side navigation can remove an injected menu
        // after early userscripts register their buttons. Keep those actions alive.
        let observedHtml = document.documentElement;
        const menuObserver = new MutationObserver((records) => {
            const html = document.documentElement;
            if (!html) return;
            if (html !== observedHtml) {
                observedHtml = html;
                menuObserver.observe(html, { childList: true });
            }
            if (!style.isConnected) (document.head || html).appendChild(style);
            if (!root.isConnected) {
                const replacement = document.getElementById(FLOATING_MENU_ID);
                if (replacement && replacement !== root) {
                    Array.from(replacement.querySelectorAll('[data-floating-tool]')).forEach((button) => {
                        const key = button.getAttribute('data-floating-tool');
                        if (!root.querySelector(`[data-floating-tool="${key}"]`)) root.appendChild(button);
                    });
                    replacement.remove();
                }
                html.appendChild(root);
                floatingMenuRender(root);
            }
            let changed = false;
            for (const record of records) {
                if (record.target !== root) continue;
                for (const button of record.removedNodes) {
                    if (button.nodeType !== 1 || !button.hasAttribute('data-floating-tool')
                        || button.isConnected) continue;
                    const key = button.getAttribute('data-floating-tool');
                    if (root.querySelector(`[data-floating-tool="${key}"]`)) continue;
                    root.appendChild(button);
                    changed = true;
                }
            }
            if (changed) floatingMenuRender(root);
        });
        // Observe only structural changes, not all content mutations.
        menuObserver.observe(document, { childList: true });
        menuObserver.observe(observedHtml, { childList: true });
        menuObserver.observe(root, { childList: true });
        return root;
    }

    function registerFloatingButton(key, button, available = true) {
        if (floatingMenuDisabled()) return;
        const root = floatingMenuRoot();
        button.setAttribute('data-floating-tool', key);
        button.setAttribute('data-floating-available', String(available));
        button.addEventListener('click', () => floatingMenuCollapse(
            button.parentNode && button.parentNode.id === FLOATING_MENU_ID ? button.parentNode : root));
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
            // Prefer placing the independent button beside the menu, never on top of it.
            candidates.sort((a, b) => (Number(a.x === x) - Number(b.x === x)) ||
                (Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y)));
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
    const originalTranslateAttributes = new WeakMap();
    const autoTranslateStorageKey = 'tm-pre-auto-off:' + location.pathname + location.search;
    let autoTranslateTimer = null;
    let autoTranslationDecided = false;
    let manualTranslationChoice = false;
    let autoTranslationReady = document.readyState !== 'loading';
    const isWikipedia = /(^|\.)wikipedia\.org$/i.test(location.hostname);
    const isOpenSSHReleaseNotes = /(^|\.)openssh\.org$/i.test(location.hostname)
        && location.pathname === '/releasenotes.html';
    let astroNavigationEnabled = false;

    // Shared opt-out handling for code replacements, Mastodon and article roots.
    // Explicit "yes" is needed inside apps that may inherit an ancestor's "no".
    function makeContentTranslatable(element, overrideAncestor = false) {
        if (overrideAncestor) element.setAttribute('translate', 'yes');
        else element.removeAttribute('translate');
        element.classList.remove('notranslate');
    }

    // A translated-looking document language may hide a genuinely English
    // article from native browser translation. Use strong evidence from the
    // readable article, not the domain, navigation language or URL.
    // Remember the corrected article so a browser's later translation to
    // Chinese is not mistaken for a new language mismatch.
    let lastArticleLanguageRepair = null;
    function restoreReadableArticleLanguage() {
        if (window !== window.top) return;
        const html = document.documentElement;
        const declaredLanguage = (html?.getAttribute('lang') || '').trim();
        // An absent language marker lets the browser perform its own detection.
        // Keep English variants as-is; avoid changes to normal English pages.
        if (!declaredLanguage || /^en(?:-|$)/i.test(declaredLanguage)) return;

        const pageKey = location.pathname + location.search;
        // Mastodon localizes its application shell independently of the
        // primary post. The device capture shows a headingless English
        // detailed status under a zh-TW document after asynchronous hydration.
        const mastodon = document.getElementById('mastodon');
        if (mastodon?.classList.contains('app-holder')) {
            const detail = mastodon.querySelector('.detailed-status');
            const post = detail?.querySelector('.status__content__text');
            if (post && /^en(?:-|$)/i.test(post.getAttribute('lang') || '')
                && !(lastArticleLanguageRepair?.article === detail
                    && lastArticleLanguageRepair.pageKey === pageKey)) {
                const prose = (post.textContent || '').trim();
                const latin = (prose.match(/[A-Za-z]/g) || []).length;
                const han = (prose.match(/[\u3400-\u9fff]/g) || []).length;
                const common = (prose.match(/\b(?:the|and|of|to|in|is|for|that|with|on|are|by|from|this|they|their|will|can|also|not)\b/gi) || []).length;
                if (latin >= 60 && han * 20 < latin && common >= 4) {
                    lastArticleLanguageRepair = { article: detail, pageKey };
                    html.setAttribute('lang', 'en');
                    return;
                }
            }
        }
        for (const article of document.querySelectorAll('article, main')) {
            if (lastArticleLanguageRepair?.article === article
                && lastArticleLanguageRepair.pageKey === pageKey) continue;
            if (article.querySelector('input[type="password"], [contenteditable="true"]')) continue;
            const heading = article.querySelector('h1, h2');
            const title = (heading?.textContent || '').trim();
            if ((title.match(/[A-Za-z]/g) || []).length < 8
                || /[\u3400-\u9fff]/.test(title)) continue;

            let longParagraphs = 0;
            let latin = 0, han = 0, commonEnglishWords = 0, distinctiveEnglishWords = 0;
            for (const paragraph of article.querySelectorAll('p')) {
                const prose = (paragraph.textContent || '').trim();
                if (prose.length < 70) continue;
                longParagraphs++;
                const excerpt = prose.slice(0, 1800);
                latin += (excerpt.match(/[A-Za-z]/g) || []).length;
                han += (excerpt.match(/[\u3400-\u9fff]/g) || []).length;
                commonEnglishWords += (excerpt.match(/\b(?:the|and|of|to|in|is|for|that|with|on|as|are|by|from|this|which|have|will|can|their|you|our)\b/gi) || []).length;
                // These function words help separate English prose from a
                // German or other European-language article with Latin text.
                distinctiveEnglishWords += (excerpt.match(/\b(?:the|and|of|that|which|with|from|their|this|these|they|would|could)\b/gi) || []).length;
                if (longParagraphs >= 8) break;
            }
            if (longParagraphs < 4 || latin < 700 || han * 20 >= latin
                || commonEnglishWords < 35 || distinctiveEnglishWords < 14) continue;

            lastArticleLanguageRepair = { article, pageKey };
            // This changes only the language hint; Edge remains responsible
            // for deciding if/when to offer or start native translation.
            html.setAttribute('lang', 'en');
            return;
        }
    }

    // Document-level translation opt-outs suppress native browser prompts,
    // even if the article itself is readable. A Google "notranslate" meta tag
    // can have the same effect as an inherited root translate=no. Leave both
    // untouched on short applications until a substantial article is present.
    function allowTranslationForReadableArticle() {
        if (window !== window.top) return;
        const html = document.documentElement;
        if (!html) return;
        const rootBlocked = (html.getAttribute('translate') || '').toLowerCase() === 'no'
            || html.classList.contains('notranslate');
        const blockingMetas = Array.from(document.querySelectorAll('meta[name]'))
            .filter(meta => /^google$/i.test(meta.getAttribute('name') || '')
                && /(^|[\s,;])notranslate(?=$|[\s,;])/i.test(meta.getAttribute('content') || ''));
        if (!rootBlocked && !blockingMetas.length) return;

        const candidates = document.querySelectorAll('article, main');
        for (const candidate of candidates) {
            if (candidate.querySelector('input[type="password"], [contenteditable="true"]')) continue;
            const heading = candidate.querySelector('h1, h2');
            if (!heading || (heading.textContent || '').trim().length < 8) continue;

            let paragraphCount = 0;
            let substantialLength = 0;
            for (const paragraph of candidate.querySelectorAll('p')) {
                const length = (paragraph.textContent || '').trim().length;
                if (length < 70) continue;
                paragraphCount += 1;
                substantialLength += length;
                if (paragraphCount >= 2 && substantialLength >= 300) break;
            }
            if (paragraphCount < 2 || substantialLength < 300) continue;

            // Preserve the real article DOM, inherited child opt-outs, and
            // unrelated meta directives. The browser still decides whether
            // and when to start translation.
            if (rootBlocked) makeContentTranslatable(html);
            for (const meta of blockingMetas) {
                const remaining = (meta.getAttribute('content') || '')
                    .split(/[\s,;]+/).filter(token => token && token.toLowerCase() !== 'notranslate');
                if (remaining.length) meta.setAttribute('content', remaining.join(', '));
                else meta.remove();
            }
            break;
        }
    }

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
        [data-tm-pre-indent] {
            all: unset !important;
        }
        /* GitHub renders line numbers in a separate sibling column. An actual
           wrapper would break its flex layout; display: contents preserves it. */
        [${wrapperAttribute}][data-tm-github-line-wrapper] {
            display: contents !important;
        }
        [${convertedAttribute}][data-tm-github-code-lines],
        [${convertedAttribute}][data-tm-github-code-lines] .react-code-line-contents,
        [${convertedAttribute}][data-tm-github-code-lines] [data-testid="code-cell"] {
            white-space: pre !important;
            overflow-wrap: normal !important;
            word-break: normal !important;
            hyphens: none !important;
        }
        [${convertedAttribute}][data-tm-github-code-lines] [data-testid="code-cell"] {
            display: block !important;
            text-wrap: nowrap !important;
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
        if (typeof source.className === 'string' && source.className && !target.className) {
            target.className = source.className;
        }
        if (source.id && !target.id) target.id = source.id;
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

    // Tags skipped by the browser translator need neutral elements. Copy the
    // styles that would otherwise be lost to tag and ancestor selectors.
    const formattedStyleProperties = [
        'display', 'font-family', 'font-size', 'font-style', 'font-weight',
        'font-stretch', 'font-kerning', 'font-feature-settings', 'font-variation-settings',
        'font-variant', 'font-size-adjust', 'font-optical-sizing',
        'line-height', 'letter-spacing', 'word-spacing', 'tab-size', 'text-indent', 'text-align',
        'text-transform', 'text-decoration', 'vertical-align', 'direction', 'writing-mode',
        'white-space', 'word-break', 'word-wrap', 'overflow-wrap',
        'overflow-x', 'overflow-y', 'color', 'background', 'border-radius', 'box-shadow',
        'box-decoration-break', '-webkit-box-decoration-break', 'outline', 'outline-offset',
        'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'border-top', 'border-right', 'border-bottom', 'border-left',
        'box-sizing', 'min-width', 'max-width', 'min-height', 'max-height'
    ];

    function preserveFormattedStyle(source, target, css = window.getComputedStyle?.(source)) {
        if (!css) return;
        for (const name of formattedStyleProperties) {
            const camel = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
            const value = css.getPropertyValue?.(name) || css[camel];
            if (typeof value === 'string' && value) target.style.setProperty(name, value);
        }
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

    const skippedCopyTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
    const skippedTranslationTags = new Set(['PRE', 'CODE', 'KBD', 'SAMP', 'TT']);
    function copyTranslatableBlock(source, replacedAncestor = false, ignoreTranslateAttribute = false) {
        const changeTag = skippedTranslationTags.has(source.tagName);
        const tag = changeTag ? (source.tagName === 'PRE' ? 'div' : 'span') : source.tagName.toLowerCase();
        const copy = document.createElement(tag);
        copyAttributes(source, copy);
        copy.removeAttribute('translate');
        copy.classList.remove('notranslate');
        const preserveStyle = changeTag || replacedAncestor || (!ignoreTranslateAttribute && source.hasAttribute('translate'))
            || source.classList.contains('notranslate');
        const css = window.getComputedStyle?.(source);
        if (preserveStyle) preserveFormattedStyle(source, copy, css);

        const children = Array.from(source.childNodes || source.children || []);
        if (!children.length) copy.textContent = source.textContent || '';
        // Keep each authored line independent when the translator replaces text nodes.
        const preserveBreaks = ['pre', 'pre-wrap', 'pre-line', 'break-spaces'].includes(css?.whiteSpace)
            || ['preserve', 'preserve-breaks', 'break-spaces'].includes(css?.whiteSpaceCollapse);
        const preserveIndent = preserveBreaks && css.whiteSpace !== 'pre-line'
            && css.whiteSpaceCollapse !== 'preserve-breaks';
        let atLineStart = true;
        for (const child of children) {
            if (child.nodeType === 3) {
                const lines = preserveBreaks ? child.nodeValue.split(/\r\n?|\n/) : [child.nodeValue];
                lines.forEach((line, index) => {
                    if (index) {
                        copy.appendChild(document.createElement('br'));
                        atLineStart = true;
                    }
                    const indent = preserveIndent && atLineStart ? line.match(/^[ \t]+/)?.[0] : '';
                    if (indent) {
                        const padding = document.createElement('span');
                        padding.setAttribute('data-tm-pre-indent', '');
                        padding.setAttribute('translate', 'no');
                        padding.textContent = indent;
                        copy.appendChild(padding);
                        line = line.slice(indent.length);
                    }
                    if (line) {
                        copy.appendChild(document.createTextNode(line));
                        atLineStart = false;
                    }
                });
            } else if (child.nodeType === 1 && !skippedCopyTags.has(child.tagName)) {
                copy.appendChild(copyTranslatableBlock(child, preserveStyle));
                atLineStart = child.tagName === 'BR';
            }
        }
        return copy;
    }

    function isGithubMarkdownSource() {
        if (location.hostname !== 'github.com') return false;
        try {
            return /^\/[^/]+\/[^/]+\/blob\/.+\.(?:md|markdown|mdown)$/i.test(
                decodeURIComponent(location.pathname));
        } catch (_) {
            return false;
        }
    }

    // The line-number gutter and the text column are siblings in GitHub's
    // source viewer. Preserve every row, its anchors, and its syntax markup.
    function copyGithubRowNode(source, translateText) {
        if (source.nodeType === 3) {
            return document.createTextNode(source.nodeValue || source.textContent || '');
        }
        if (source.nodeType !== 1) return null;
        const clone = document.createElement(source.tagName.toLowerCase());
        copyAttributes(source, clone);
        if (translateText) {
            clone.removeAttribute('translate');
            clone.classList.remove('notranslate');
        }
        const isCell = source.getAttribute('data-testid') === 'code-cell';
        if (isCell) {
            clone.setAttribute('translate', translateText ? 'yes' : 'no');
            clone.style.setProperty('white-space', 'pre', 'important');
            clone.style.setProperty('overflow-wrap', 'normal', 'important');
            clone.style.setProperty('word-break', 'normal', 'important');
        }
        const children = Array.from(source.childNodes || source.children || []);
        for (const child of children) {
            const copied = copyGithubRowNode(child, translateText);
            if (copied) clone.appendChild(copied);
        }
        if (!children.length) {
            clone.textContent = source.textContent || (isCell ? ' ' : '');
        }
        return clone;
    }

    function copyGithubCodeLines(source, target) {
        target.setAttribute('data-tm-github-code-lines', 'true');
        // Keep the same CSS class so GitHub's code column retains its flex
        // width, tab size, font, and alignment with the numbered gutter.
        target.classList.add('react-code-lines');
        let fenced = false;
        for (const row of Array.from(source.children || [])) {
            const originalCell = row.querySelector('[data-testid="code-cell"]');
            if (!originalCell) continue;
            const text = originalCell.textContent || '';
            const fenceMarker = /^\s*(?:```|~~~)/.test(text);
            const translateText = !fenced && !fenceMarker && !githubLineIsCode(text);
            if (fenceMarker) fenced = !fenced;
            const copy = copyGithubRowNode(row, translateText);
            if (!copy?.querySelector('[data-testid="code-cell"]')) continue;
            const height = row.getBoundingClientRect?.().height || 0;
            if (height >= 10 && height <= 75) {
                copy.style.setProperty('height', `${height}px`, 'important');
                copy.style.setProperty('min-height', `${height}px`, 'important');
                copy.style.setProperty('max-height', `${height}px`, 'important');
            }
            target.appendChild(copy);
        }
    }

    function githubLineIsCode(text) {
        const trimmed = text.trim();
        return !trimmed
            || /^(?:```|~~~|\$ |>>> |#include\b|(?:import|export|const|let|var|function|class|def|SELECT|INSERT|UPDATE)\b)/i.test(trimmed)
            || /^(?:\{|\}|\[\s*\{|\]|<\/?[A-Za-z])/i.test(trimmed)
            || /https?:\/\//i.test(trimmed)
            || /^\s{2,}(?:[\w.-]+[:=]|[{}\[\]])/.test(text);
    }

    // Markdown mixes prose with badges, trees, fences and snippets. Judge its
    // prose excluding fenced code and URLs; never use this for .js/.cs files.
    function githubMarkdownProse(text) {
        if (!isGithubMarkdownSource() || !text) return false;
        const lines = text.split(/\r?\n/);
        if (lines.length < 12) return false;
        let fenced = false, proseChars = 0, otherChars = 0, proseLines = 0;
        for (const line of lines.slice(0, 1200)) {
            const trimmed = line.trim();
            if (/^(?:```|~~~)/.test(trimmed)) {
                fenced = !fenced;
                continue;
            }
            if (fenced || githubLineIsCode(line) || /^\s{4,}\S/.test(line)) {
                otherChars += trimmed.length;
                continue;
            }
            const cleaned = trimmed
                .replace(/!?\[([^\]]*)\]\((?:https?:\/\/|\.{0,2}\/)[^)]+\)/g, '$1')
                .replace(/https?:\/\/\S+/g, '')
                .replace(/`[^`]*`/g, '');
            const words = cleaned.match(/[A-Za-z][A-Za-z'-]{2,}/g) || [];
            const common = words.filter((word) =>
                /^(the|and|that|this|with|from|have|was|were|are|for|but|not|when|which|what|there|they|you|your|we|our|can|would|will|about|into|than|their|been|more|one|like|just|then|because|after|before|these|those|its|has|had|all|some|who|why|how|of|to|in|on|as|is|it|at)$/i.test(word)).length;
            if (words.length >= 6 && common >= 2) {
                proseChars += cleaned.length;
                proseLines++;
            } else {
                otherChars += cleaned.length;
            }
        }
        return proseLines >= 5 && proseChars >= 500
            && proseChars / Math.max(1, proseChars + otherChars) >= 0.24;
    }

    function setConverted(wrapper, shouldConvert) {
        if (!wrapper) {
            return;
        }
        const current = shouldConvert ? originalBlocks.get(wrapper) : wrapper.querySelector(`[${convertedAttribute}]`);
        if (!current) {
            return;
        }
        const githubLines = shouldConvert && current.classList.contains('react-code-lines')
            && current.querySelector('[data-testid="code-cell"]');
        const replacement = shouldConvert
            ? (githubLines ? document.createElement('div')
                : copyTranslatableBlock(current, false, originalTranslateAttributes.get(wrapper) === null))
            : originalBlocks.get(wrapper);
        if (!replacement) {
            return;
        }
        if (shouldConvert) {
            if (githubLines) {
                copyAttributes(current, replacement);
                replacement.classList.remove('notranslate');
                preserveFormattedStyle(current, replacement);
                copyGithubCodeLines(current, replacement);
            }
            replacement.setAttribute(convertedAttribute, 'true');
            makeContentTranslatable(replacement, true);
        } else {
            replacement.removeAttribute(convertedAttribute);
            const saved = originalTranslateAttributes.get(wrapper);
            if (saved === null) replacement.removeAttribute('translate');
            else if (saved !== undefined) replacement.setAttribute('translate', saved);
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
        // GitHub draws the diagram in a separate frame. Its hidden PRE is not
        // the visible content and must not replace the drawing.
        if (block.tagName === 'PRE' && block.getAttribute('aria-label') === 'Raw mermaid code'
            && block.closest('[data-type="mermaid"]')) return;

        const wrapper = document.createElement('div');
        wrapper.setAttribute(wrapperAttribute, 'true');
        const githubSource = block.classList?.contains('react-code-lines')
            && Boolean(block.querySelector('[data-testid="code-cell"]'));
        if (githubSource) wrapper.setAttribute('data-tm-github-line-wrapper', 'true');
        const parent = block.parentNode;
        parent.insertBefore(wrapper, block);
        parent.removeChild(block);
        originalTranslateAttributes.set(wrapper, block.hasAttribute('translate') ? block.getAttribute('translate') : null);
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
        // display:contents makes the code column behave as a direct flex child.
        // The overlay instead uses the enclosing code viewer's coordinates.
        const controlContainer = githubSource ? parent : wrapper;
        if (githubSource && parent.style) {
            const css = window.getComputedStyle(parent);
            if (!css || css.position === 'static') {
                parent.style.setProperty('position', 'relative', 'important');
            }
        }
        makeTransientControlDraggable(button, controlContainer, { bottom: true });
        button.addEventListener('click', () => {
            const enabling = !wrapper.querySelector(`[${convertedAttribute}]`);
            rememberManualTranslationChoice(enabling);
            setConverted(wrapper, enabling);
        });
    }

    // OpenSSH uses long, sometimes non-PRE release-note blocks. Convert only
    // the release body siblings, never the headings or navigation.
    function enhanceOpenSSHReleaseNotes() {
        if (!isOpenSSHReleaseNotes) return;
        for (const heading of document.querySelectorAll('h3')) {
            if (!/^OpenSSH\s+\d/i.test(heading.textContent.trim())) continue;
            let element = heading.nextElementSibling;
            while (element && !/^H[1-6]$/.test(element.tagName)) {
                const next = element.nextElementSibling;
                const tag = element.tagName;
                if (['P', 'DIV', 'BLOCKQUOTE', 'TT', 'SAMP'].includes(tag)
                    && !element.closest(`[${wrapperAttribute}]`)
                    && !element.querySelector('pre')
                    && element.textContent.trim().length >= 100) {
                    enhance(element);
                }
                element = next;
            }
        }
    }

    function rememberManualTranslationChoice(enabled) {
        manualTranslationChoice = true;
        try {
            if (enabled) sessionStorage.removeItem(autoTranslateStorageKey);
            else sessionStorage.setItem(autoTranslateStorageKey, 'off');
        } catch (_) { /* The current document still respects the manual choice. */ }
    }

    function naturalProse(text) {
        if (!text || text.length < 240) return false;
        const words = text.match(/[A-Za-z][A-Za-z'-]{2,}/g) || [];
        if (words.length < 45) return false;
        const commonWords = words.filter((word) =>
            /^(the|and|that|this|with|from|have|was|were|are|for|but|not|when|which|what|there|they|you|your|we|our|can|would|will|about|into|than|their|been|more|one|like|just|then|because|after|before|these|those|its|it's|has|had|all|some|who|why|how|of|to|in|on|as|is|it|at)$/i.test(word)).length;
        if (commonWords < Math.max(9, words.length * 0.12)) return false;
        const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 160);
        const codeLines = lines.filter((line) =>
            /^(?:import |export |const |let |var |function |class |def |#include|using |public |private |SELECT |INSERT |UPDATE |<\/?[\w!]|\{|\}|\[|\]|\/\/|\*\/|\+[-+]{3,})/i.test(line)
            || /[{};]/.test(line) && /[=<>]|\b(?:return|throw|await|function)\b/.test(line)).length;
        return !lines.length || codeLines / lines.length < 0.32;
    }

    function automaticTranslationDisabled() {
        try { return sessionStorage.getItem(autoTranslateStorageKey) === 'off'; }
        catch (_) { return false; }
    }

    function tryAutomaticTranslation() {
        if (autoTranslationDecided || manualTranslationChoice || automaticTranslationDisabled() || !document.body) return;
        const wrappers = Array.from(document.querySelectorAll(`[${wrapperAttribute}]`));
        const candidates = wrappers.filter((wrapper) =>
            !wrapper.querySelector(`[${convertedAttribute}]`)
            && (naturalProse(getBlockText(originalBlocks.get(wrapper)))
                || githubMarkdownProse(getBlockText(originalBlocks.get(wrapper)))));
        // Only leaf, text-oriented opt-out elements may be replaced. Do not
        // disturb a translated application's container or a code editor.
        const protectedLeaves = Array.from(document.querySelectorAll('[translate="no"], .notranslate'))
            .filter((element) => ['DIV', 'P', 'SPAN', 'BLOCKQUOTE', 'SECTION', 'ARTICLE'].includes(element.tagName)
                && !element.closest(`[${wrapperAttribute}]`)
                && !element.querySelector('pre, code, textarea, input, button, iframe, script')
                && !Array.from(element.children || []).some((child) =>
                    !inlineTags.has(child.tagName) && child.tagName !== 'BR')
                && !element.closest('[contenteditable="true"]')
                && naturalProse(getBlockText(element)));
        if (!candidates.length && !protectedLeaves.length) return;
        const bodyText = document.body.innerText || getBlockText(document.body) || '';
        const pageSize = bodyText.replace(/\s/g, '').length;
        const untranslatedSize = candidates.reduce((sum, wrapper) =>
            sum + getBlockText(originalBlocks.get(wrapper)).replace(/\s/g, '').length, 0)
            + protectedLeaves.reduce((sum, element) =>
                sum + getBlockText(element).replace(/\s/g, '').length, 0);
        if (pageSize < 240 || untranslatedSize <= pageSize / 2) return;
        autoTranslationDecided = true;
        protectedLeaves.forEach(enhance);
        const eligible = Array.from(document.querySelectorAll(`[${wrapperAttribute}]`))
            .filter((wrapper) => naturalProse(getBlockText(originalBlocks.get(wrapper)))
                || githubMarkdownProse(getBlockText(originalBlocks.get(wrapper))));
        eligible.forEach((wrapper) => setConverted(wrapper, true));
    }

    function scheduleAutomaticTranslation() {
        if (!autoTranslationReady || autoTranslateTimer !== null || autoTranslationDecided
            || manualTranslationChoice || automaticTranslationDisabled()) return;
        if (!document.querySelector(`[${wrapperAttribute}]`)
            && !document.querySelector('[translate="no"], .notranslate')) return;
        autoTranslateTimer = setTimeout(() => {
            autoTranslateTimer = null;
            tryAutomaticTranslation();
        }, 180);
    }

    function scan(root = document, globalChecks = true) {
        // Hydration can append thousands of unrelated gallery items in one
        // mutation delivery. Rechecking every existing article for EACH item
        // scales quadratically and stalls mobile browser main threads.
        if (globalChecks) {
            restoreReadableArticleLanguage();
            allowTranslationForReadableArticle();
        }
        if (root === document) enhanceOpenSSHReleaseNotes();
        enableAstroFullPageNavigation(root);
        enableMastodonTranslation(root);
        revealWikipediaSections(root);
        if (root.nodeType === 1 && isSpecialBlock(root)) {
            enhance(root);
        }
        if (root.querySelectorAll) {
            root.querySelectorAll('.react-code-lines').forEach((block) => {
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
        if (globalChecks) {
            updateAllButton();
            scheduleAutomaticTranslation();
        }
    }

    function enableAstroFullPageNavigation(root) {
        if (!astroNavigationEnabled) {
            if (!document.querySelector('meta[name="astro-view-transitions-enabled"][content="true"]')) return;
            astroNavigationEnabled = true;
            // The router marker can arrive after links when running at document-start.
            root = document;
        }

        const links = [];
        if (root.nodeType === 1 && root.tagName === 'A' && root.hasAttribute('href')) {
            links.push(root);
        }
        if (root.querySelectorAll) links.push(...root.querySelectorAll('a[href]'));
        links.forEach((link) => {
            let url;
            try {
                url = new URL(link.getAttribute('href'), document.baseURI || location.href);
            } catch {
                return;
            }
            if (url.origin !== location.origin) return;
            if (url.pathname === location.pathname && url.search === location.search) return;
            // Astro's supported opt-out gives browser translation a new document to process.
            link.setAttribute('data-astro-reload', 'true');
        });
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
            makeContentTranslatable(app, true);
        });
    }

    function isCodeQuote(element) {
        if (!element || element.tagName !== 'BLOCKQUOTE' || element.querySelector('pre')) {
            return false;
        }
        const codeText = Array.from(element.querySelectorAll('code'))
            .map((code) => code.textContent.trim())
            .join(' ');
        if (codeText.length < 80) return false;
        // Preserve the original nested-quote conversion when an inner
        // quotation itself contains predominantly code. The outer wrapper
        // keeps the relative quotation layout intact during replacement.
        const nestedQuotes = Array.from(element.querySelectorAll('blockquote'));
        if (nestedQuotes.some(quote => isCodeQuote(quote))) return true;
        // A prose quotation can mention many small snippets whose total
        // length exceeds 80 characters. Do not suppress translation for
        // the whole quotation unless code truly dominates its content.
        const readableText = getBlockText(element).trim();
        return codeText.length / Math.max(1, readableText.length) >= 0.65;
    }

    function isSpecialBlock(element) {
        return element?.classList.contains('react-code-lines')
            && Boolean(element.querySelector('[data-testid="code-cell"]'));
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
        rememberManualTranslationChoice(shouldConvert);
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
    document.addEventListener('DOMContentLoaded', () => {
        autoTranslationReady = true;
        scheduleAutomaticTranslation();
    }, { once: true });
    window.addEventListener('load', scheduleAutomaticTranslation, { once: true });

    new MutationObserver((mutations) => {
        let addedContent = false;
        mutations.forEach((mutation) => {
            if (restoreInlineCode(mutation.target)) return;
            if (mutation.type === 'attributes') {
                revealWikipediaSections(mutation.target);
                if ((mutation.target === document.documentElement && mutation.attributeName === 'translate')
                    || (mutation.target?.tagName === 'META'
                        && ['content', 'name'].includes(mutation.attributeName))) {
                    allowTranslationForReadableArticle();
                }
                return;
            }
            mutation.addedNodes.forEach((node) => {
                restoreInlineCode(node);
                if (node.nodeType !== Node.ELEMENT_NODE) return;
                // Per-subtree code/quote controls remain synchronous, but
                // costly document-wide article and floating-menu checks only
                // run ONCE after all nodes in this mutation batch.
                scan(node, false);
                addedContent = true;
            });
        });
        if (addedContent) {
            restoreReadableArticleLanguage();
            allowTranslationForReadableArticle();
            updateAllButton();
            scheduleAutomaticTranslation();
        }
    }).observe(document.documentElement, {
        attributes: true,
        attributeFilter: isWikipedia ? ['hidden', 'translate', 'content', 'name'] : ['translate', 'content', 'name'],
        characterData: true,
        childList: true,
        subtree: true,
    });
})();

        } catch (error) { console.error("SharedMenuAllInOne: TranslatePreformattedText failed", error); }
    }
    // END BUNDLED TranslatePreformattedText
    // A single small official-main metadata check on each top-level page load.
    // Never reload the document, and never fetch unmerged PR branches.
    if (window === window.top && typeof GM_xmlhttpRequest === 'function') {
        const installedVersion = "2026-11-24_1.0.5";
        const installUrl = "https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/main/src/SharedMenuAllInOne.user.js";
        const metaUrl = "https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/main/src/SharedMenuAllInOne.meta.js";
        function isNewer(next, installed) {
            const a = next.split(/[._-]/).map(Number);
            const b = installed.split(/[._-]/).map(Number);
            if (a.some(Number.isNaN) || b.some(Number.isNaN)) return false;
            for (let i = 0; i < Math.max(a.length, b.length); i++) {
                if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
            }
            return false;
        }
        function showUpdate(next) {
            function attach() {
                const root = document.getElementById('tm-shared-floating-menu');
                if (!root) return false;
                if (root.querySelector('#tm-shared-menu-bundle-update')) return true;
                const toggle = root.querySelector('[data-floating-toggle]');
                if (toggle) {
                    toggle.style.setProperty('outline', '2px solid #f3ca49', 'important');
                    toggle.title = '整合腳本有新版：' + next;
                }
                const button = document.createElement('button');
                button.id = 'tm-shared-menu-bundle-update';
                button.type = 'button';
                button.textContent = '↥';
                button.title = '立即更新整合腳本：' + next;
                button.setAttribute('aria-label', '立即更新整合腳本 ' + next);
                button.setAttribute('data-floating-tool', 'bundle-update');
                button.setAttribute('data-floating-available', 'true');
                button.hidden = root.getAttribute('data-floating-expanded') !== 'true';
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const url = installUrl + '?update=' + encodeURIComponent(next);
                    if (typeof GM_openInTab === 'function') {
                        GM_openInTab(url, { active: true, insert: true });
                    } else {
                        window.open(url, '_blank', 'noopener');
                    }
                }, true);
                root.appendChild(button);
                return true;
            }
            if (!attach()) {
                document.addEventListener('DOMContentLoaded', attach, { once: true });
                setTimeout(attach, 2500);
            }
        }
        function showInstalledStatus() {
            function attach() {
                const root = document.getElementById('tm-shared-floating-menu');
                if (!root || !document.body) return false;
                const status = document.createElement('span');
                status.textContent = '已安裝 ' + installedVersion;
                status.setAttribute('role', 'status');
                status.style.cssText = 'position:absolute;right:42px;top:0;white-space:nowrap;' +
                    'font:12px system-ui,sans-serif;padding:4px 7px;border-radius:5px;' +
                    'background:#333;color:#fff;pointer-events:none;';
                root.appendChild(status);
                setTimeout(() => status.remove(), 3500);
                return true;
            }
            if (!attach()) {
                document.addEventListener('DOMContentLoaded', attach, { once: true });
                setTimeout(attach, 2500);
            }
        }
        try {
            Promise.resolve(GM_getValue('tm-bundle-last-installed-version', '')).then((previous) => {
                if (previous === installedVersion) return;
                GM_setValue('tm-bundle-last-installed-version', installedVersion);
                showInstalledStatus();
            }).catch(() => {});
        } catch (_) { /* No persisted status when storage is unavailable. */ }
        try {
            GM_xmlhttpRequest({
                method: 'GET',
                url: metaUrl + '?check=' + Date.now(),
                timeout: 8000,
                onload: (response) => {
                    if (response.status !== 200) return;
                    const match = String(response.responseText || '').match(/^\/\/ @version\s+(\S+)/m);
                    if (match && isNewer(match[1], installedVersion)) showUpdate(match[1]);
                }
            });
        } catch (_) { /* A failed check must not affect the article. */ }
    }

})();
