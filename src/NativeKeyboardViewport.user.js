// ==UserScript==
// @name         Native Keyboard Viewport
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-11-26_1.0.0
// @description  Use Chromium's native content-resizing keyboard layout on Android Edge; enabled for Discord and Clipboard Viewer, opt-in per other site.
// @match        *://*/*
// @run-at       document-start
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/main/src/NativeKeyboardViewport.user.js
// @downloadURL  https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/main/src/NativeKeyboardViewport.user.js
// ==/UserScript==

(function () {
    'use strict';
    if (window !== window.top || !/Android/i.test(navigator.userAgent) ||
        !/EdgA?\//i.test(navigator.userAgent)) return;

    const key = 'native-keyboard-viewport:' + location.origin;
    const defaultEnabled =
        (location.hostname === 'discord.com' && location.pathname.startsWith('/channels/')) ||
        (location.hostname === 'christorng.idv.tw' && /^\/InfoProcess\/Clipboard(?:\/|$)/i.test(location.pathname));
    const enabled = GM_getValue(key, defaultEnabled) === true;
    GM_registerMenuCommand(enabled ? '軟鍵盤原生縮放：停用此網站' : '軟鍵盤原生縮放：啟用此網站', () => {
        GM_setValue(key, !enabled);
        location.reload();
    });
    if (!enabled) return;

    function withResizeContent(content) {
        // Preserve width, zoom, safe-area and all unrelated directives verbatim.
        const pattern = /(^|[,;])\s*interactive-widget\s*=\s*[^,;]*/gi;
        let seen = false;
        const next = content.replace(pattern, (all, separator) => {
            if (seen) return '';
            seen = true;
            return separator + ' interactive-widget=resizes-content';
        });
        if (seen) return next.trim();
        return next.trim() + (next.trim() ? ', ' : '') + 'interactive-widget=resizes-content';
    }

    function apply() {
        const head = document.head;
        if (!head) return;
        const metas = Array.from(head.querySelectorAll('meta[name="viewport" i]'));
        // Do not invent a viewport or change default page scaling.
        if (!metas.length) return;
        for (const meta of metas) {
            const old = meta.getAttribute('content') || '';
            const next = withResizeContent(old);
            if (old !== next) meta.setAttribute('content', next);
        }
    }
    // Catch the parser's actual viewport tag and early hydration replacements.
    // Only head changes are watched; no body scan or focus-driven layout changes.
    let headObserver;
    let startupObserver;
    function attach() {
        if (!document.head) return false;
        if (headObserver) return true;
        headObserver = new MutationObserver(apply);
        headObserver.observe(document.head, {
            childList: true, subtree: true, attributes: true,
            attributeFilter: ['name', 'content']
        });
        apply();
        startupObserver?.disconnect();
        return true;
    }
    if (!attach()) {
        startupObserver = new MutationObserver(attach);
        startupObserver.observe(document, { childList: true, subtree: true });
    }
    function finish() {
        apply();
        headObserver?.disconnect();
        startupObserver?.disconnect();
    }
    // Bounded startup observation; never force ongoing changes to application layout.
    if (document.readyState === 'complete') setTimeout(finish, 2000);
    else window.addEventListener('load', () => setTimeout(finish, 2000), { once: true });
    setTimeout(finish, 15000);
})();
