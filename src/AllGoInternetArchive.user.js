// ==UserScript==
// @name         All Go InternetArchive Redirect
// @namespace    http://tampermonkey.net/
// @version      2026-11-07_1.3.10
// @description  Add a quick Internet Archive action in the shared floating menu and mark Archive Today links.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AllGoInternetArchive.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AllGoInternetArchive.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=web.archive.org
// @match        *://*/*
// @exclude      *://christorng.idv.tw/*
// @exclude      *://*.christorng.idv.tw/*
// @exclude      *://hackernews.betacat.io/*
// @exclude      *://*.hackernews.betacat.io/*
// @exclude      *://theneurondaily.com/*
// @exclude      *://*.theneurondaily.com/*
// @exclude      *://tam.gov.taipei/*
// @exclude      *://*.tam.gov.taipei/*
// @exclude      *://wiwi.*/*
// @exclude      *://*.wiwi.*/*
// @exclude      *://*.kagi.com/*
// @exclude      *://kagi.com/*
// @exclude      *://chatgpt.com/*
// @exclude      *://*.chatgpt.com/*
// @exclude      *://christorng.github.io/*
// @exclude      *://github.com/*
// @exclude      *://*.github.com/*
// @exclude      *://discord.com/*
// @exclude      *://*.discord.com/*
// @exclude      *://ebird.org/*
// @exclude      *://*.ebird.org/*
// @exclude      *://newsminimalist.com/*
// @exclude      *://*.newsminimalist.com/*
// @exclude      *://*ycombinator.com/*
// @exclude      *://huggingface.co/*
// @exclude      *://*.huggingface.co/*
// @exclude      *://youtube.com/*
// @exclude      *://*.youtube.com/*
// @exclude      *://x.com/*
// @exclude      *://*.x.com/*
// @exclude      *://nitter.net/*
// @exclude      *://*.nitter.net/*
// @exclude      *://bing.com/*
// @exclude      *://*.bing.com/*
// @exclude      *://wikipedia.org/*
// @exclude      *://*.wikipedia.org/*
// @exclude      *://reddit.com/*
// @exclude      *://*.reddit.com/*
// @exclude      *://arxiv.org/*
// @exclude      *://*.arxiv.org/*
// @exclude      *://cht.com.tw/*
// @exclude      *://*.cht.com.tw/*
// @exclude      *://*.vercel.app/*
// @exclude      *://vercel.app/*
// @exclude      *://openai.com/*
// @exclude      *://*.openai.com/*
// @exclude      *://anthropic.com/*
// @exclude      *://*.anthropic.com/*
// @exclude      *://claude.ai/*
// @exclude      *://*.claude.ai/*
// @exclude      *://google.com/*
// @exclude      *://*.google.com/*
// @exclude      *://facebook.com/*
// @exclude      *://*.facebook.com/*
// @exclude      *://*.cwa.gov.tw/*
// @exclude      *://cwa.gov.tw/*
// @exclude      *://chrisrtxubuntu:*/*
// @exclude      *://microsoft.com/*
// @exclude      *://*.microsoft.com/*
// @exclude      *://instagram.com/*
// @exclude      *://*.instagram.com/*
// @grant        none
// ==/UserScript==

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
            return Math.max(viewport.left, Math.min(x, viewport.left + viewport.width - menuWidth));
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
        const place = (x, y, fixed) => {
            root.style.setProperty('position', fixed ? 'fixed' : 'absolute', 'important');
            root.style.setProperty('left', `${x}px`, 'important');
            root.style.setProperty('top', `${y}px`, 'important');
            root.style.setProperty('right', 'auto', 'important');
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
                // Keep the handle's physical size unchanged at higher zoom levels.
                root.style.setProperty('transform', `scale(${normalScale / window.visualViewport.scale})`, 'important');
                root.style.setProperty('transform-origin', 'top right', 'important');
                return;
            }
            if (pinchAnchored) {
                pinchAnchored = false;
                pinchGestureArmed = false;
                root.style.removeProperty('transform');
                root.style.removeProperty('transform-origin');
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
                window.location.reload();
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
