// ==UserScript==
// @name         Coding Diff Mobile Optimizer
// @namespace    http://tampermonkey.net/
// @version      2025-10-07_1.0.0
// @description  Expand diff code columns on mobile portrait layouts to maximize reading space on ChatGPT Codex and GitHub.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/coding.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/coding.user.js
// @match        https://chatgpt.com/codex/*
// @match        https://github.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STYLE_ID = 'tm-git-diff-mobile-style';
    const ROOT_CLASS = 'tm-git-diff-mobile';
    const MOBILE_USER_AGENT_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const DIFF_SELECTORS = [
        '.js-diff-table',
        '.diff-view',
        '.diff-table',
        '.js-diff-progressive-container',
        '[data-testid="diff-viewer"]',
        '[data-hpc="diff-viewer"]'
    ];
    const WIDTH_THRESHOLD = 920;

    let styleElement = null;
    let rafToken = null;
    const orientationQuery = window.matchMedia ? window.matchMedia('(orientation: portrait)') : null;

    function isMobileDevice() {
        return MOBILE_USER_AGENT_REGEX.test(navigator.userAgent);
    }

    function isPortrait() {
        if (orientationQuery && typeof orientationQuery.matches === 'boolean') {
            return orientationQuery.matches;
        }

        return window.innerHeight >= window.innerWidth;
    }

    function hasNarrowViewport() {
        return window.innerWidth <= WIDTH_THRESHOLD;
    }

    function hasDiffContent() {
        return DIFF_SELECTORS.some((selector) => document.querySelector(selector));
    }

    function ensureStyleElement() {
        if (styleElement && styleElement.isConnected) {
            return styleElement;
        }

        styleElement = document.createElement('style');
        styleElement.id = STYLE_ID;
        styleElement.textContent = `
            .${ROOT_CLASS} body {
                margin-left: 0;
                margin-right: 0;
            }

            .${ROOT_CLASS} .application-main,
            .${ROOT_CLASS} .application-main > .container-xl,
            .${ROOT_CLASS} .container-xl,
            .${ROOT_CLASS} .container-lg,
            .${ROOT_CLASS} .container-md,
            .${ROOT_CLASS} main[role="main"],
            .${ROOT_CLASS} main[data-testid="diff-view"],
            .${ROOT_CLASS} main[data-hpc="diff-view"],
            .${ROOT_CLASS} #diff-view,
            .${ROOT_CLASS} .diff-view,
            .${ROOT_CLASS} .diff-container,
            .${ROOT_CLASS} .js-diff-progressive-container {
                max-width: none !important;
                width: 100% !important;
                padding-left: 8px !important;
                padding-right: 8px !important;
                box-sizing: border-box;
            }

            .${ROOT_CLASS} .Layout-main,
            .${ROOT_CLASS} .Layout-main .container-xl,
            .${ROOT_CLASS} .Layout-main .container-lg,
            .${ROOT_CLASS} .Layout-main .container-md {
                padding-left: 0 !important;
                padding-right: 0 !important;
            }

            .${ROOT_CLASS} .file,
            .${ROOT_CLASS} .file[data-file-type],
            .${ROOT_CLASS} .diff-table-container,
            .${ROOT_CLASS} .diff-view .diff-file,
            .${ROOT_CLASS} .diff-viewer-component .diff-file {
                margin-left: 0 !important;
                margin-right: 0 !important;
                width: 100% !important;
                border-radius: 8px !important;
                overflow: hidden;
            }

            .${ROOT_CLASS} .blob-wrapper,
            .${ROOT_CLASS} .file .data,
            .${ROOT_CLASS} .file .js-file-content,
            .${ROOT_CLASS} .diff-view .diff-table,
            .${ROOT_CLASS} .diff-table {
                width: 100% !important;
            }

            .${ROOT_CLASS} table.diff-table,
            .${ROOT_CLASS} .diff-table,
            .${ROOT_CLASS} .js-file-line-container,
            .${ROOT_CLASS} .diff-grid {
                table-layout: fixed !important;
            }

            .${ROOT_CLASS} td.blob-num,
            .${ROOT_CLASS} td.blob-num-addition,
            .${ROOT_CLASS} td.blob-num-deletion,
            .${ROOT_CLASS} td.blob-num-context,
            .${ROOT_CLASS} td.blob-num-hunk,
            .${ROOT_CLASS} .diff-line-number,
            .${ROOT_CLASS} [class*="line-number"] {
                width: 2.6rem !important;
                min-width: 2.6rem !important;
                padding-left: 2px !important;
                padding-right: 2px !important;
                box-sizing: border-box;
                text-align: right !important;
            }

            .${ROOT_CLASS} td.blob-code,
            .${ROOT_CLASS} .diff-line-content,
            .${ROOT_CLASS} [class*="line-content"],
            .${ROOT_CLASS} pre code,
            .${ROOT_CLASS} code[class*="diff"] {
                padding-left: 8px !important;
                padding-right: 8px !important;
                box-sizing: border-box;
            }

            .${ROOT_CLASS} .diff-table tr,
            .${ROOT_CLASS} table.diff-table tr {
                display: table-row;
            }

            .${ROOT_CLASS} .diff-view pre,
            .${ROOT_CLASS} .diff-view code {
                white-space: pre;
            }
        `;

        document.head.append(styleElement);
        return styleElement;
    }

    function updateState() {
        rafToken = null;

        const shouldEnable = isMobileDevice() && (isPortrait() || hasNarrowViewport()) && hasDiffContent();
        const root = document.documentElement;

        if (shouldEnable) {
            ensureStyleElement().disabled = false;
            root.classList.add(ROOT_CLASS);
        } else {
            if (styleElement) {
                styleElement.disabled = true;
            }
            root.classList.remove(ROOT_CLASS);
        }
    }

    function scheduleUpdate() {
        if (rafToken !== null) {
            return;
        }

        rafToken = window.requestAnimationFrame(updateState);
    }

    function observeDiffChanges() {
        const target = document.body || document.documentElement;
        if (!target) {
            return;
        }

        const observer = new MutationObserver(scheduleUpdate);
        observer.observe(target, { childList: true, subtree: true });
    }

    function init() {
        scheduleUpdate();
        window.addEventListener('resize', scheduleUpdate, { passive: true });

        if (orientationQuery) {
            const handler = scheduleUpdate;
            if (typeof orientationQuery.addEventListener === 'function') {
                orientationQuery.addEventListener('change', handler);
            } else if (typeof orientationQuery.addListener === 'function') {
                orientationQuery.addListener(handler);
            }
        }

        observeDiffChanges();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
