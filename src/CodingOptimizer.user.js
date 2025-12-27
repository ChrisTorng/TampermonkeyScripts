// ==UserScript==
// @name         Coding Diff Optimizer
// @namespace    http://tampermonkey.net/
// @version      2025-12-27_1.0.7
// @description  Stretch Git diffs edge-to-edge and slim line numbers on ChatGPT Codex tasks and GitHub.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/CodingOptimizer.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/CodingOptimizer.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.tampermonkey.net
// @match        https://chatgpt.com/codex/*
// @match        https://github.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STYLE_ID = 'tm-git-diff-optimizer-style';
    const ROOT_CLASS = 'tm-git-diff-optimizer';
    const DIFF_SELECTORS = [
        // GitHub selectors
        '.js-diff-table',
        '.diff-view',
        '.diff-table',
        '.diff-line-row',
        '.js-diff-progressive-container',
        '[data-testid="diff-viewer"]',
        '[data-hpc="diff-viewer"]',
        '[class*="DiffLines"]',
        // ChatGPT Codex selectors
        '.diff-tailwindcss-wrapper',
        '.unified-diff-view',
        '.diff-style-root',
        '.diff-view-wrapper'
    ];

    let styleElement = null;
    let rafToken = null;

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
            .${ROOT_CLASS},
            .${ROOT_CLASS} body {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                max-width: none !important;
            }

            .${ROOT_CLASS} body {
                padding-left: max(0px, env(safe-area-inset-left, 0px));
                padding-right: max(0px, env(safe-area-inset-right, 0px));
            }

            .${ROOT_CLASS} .application-main,
            .${ROOT_CLASS} .application-main > .container-xl,
            .${ROOT_CLASS} .container-xl,
            .${ROOT_CLASS} .container-lg,
            .${ROOT_CLASS} .container-md,
            .${ROOT_CLASS} .container,
            .${ROOT_CLASS} .Layout,
            .${ROOT_CLASS} .Layout-main,
            .${ROOT_CLASS} .Layout-main .container-xl,
            .${ROOT_CLASS} main[role="main"],
            .${ROOT_CLASS} main[data-testid="diff-view"],
            .${ROOT_CLASS} main[data-hpc="diff-view"],
            .${ROOT_CLASS} #diff-view,
            .${ROOT_CLASS} .diff-view,
            .${ROOT_CLASS} .diff-viewer-component,
            .${ROOT_CLASS} .diff-viewer,
            .${ROOT_CLASS} .diff-container,
            .${ROOT_CLASS} .js-diff-progressive-container,
            .${ROOT_CLASS} .react-diff-viewer {
                max-width: none !important;
                width: 100% !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
                padding-left: max(4px, env(safe-area-inset-left, 0px)) !important;
                padding-right: max(4px, env(safe-area-inset-right, 0px)) !important;
                box-sizing: border-box !important;
            }

            .${ROOT_CLASS} .file,
            .${ROOT_CLASS} .file[data-file-type],
            .${ROOT_CLASS} .diff-table-container,
            .${ROOT_CLASS} .file .js-file-content,
            .${ROOT_CLASS} .diff-view .diff-file,
            .${ROOT_CLASS} .diff-viewer-component .diff-file,
            .${ROOT_CLASS} [data-testid="diff-viewer"] .diff-file,
            .${ROOT_CLASS} [data-testid="diff-viewer"] [data-testid="diff-container"],
            .${ROOT_CLASS} .diff-grid,
            .${ROOT_CLASS} .diff-file,
            .${ROOT_CLASS} .diff-content {
                margin-left: 0 !important;
                margin-right: 0 !important;
                width: 100% !important;
                border-radius: 0 !important;
                box-shadow: none !important;
            }

            .${ROOT_CLASS} .blob-wrapper,
            .${ROOT_CLASS} .file .data,
            .${ROOT_CLASS} .file .js-file-content,
            .${ROOT_CLASS} .diff-view .diff-table,
            .${ROOT_CLASS} .diff-table,
            .${ROOT_CLASS} .diff-grid,
            .${ROOT_CLASS} [data-testid="diff-viewer"] table {
                width: 100% !important;
                table-layout: auto !important;
            }

            .${ROOT_CLASS} table.diff-table,
            .${ROOT_CLASS} .diff-table,
            .${ROOT_CLASS} .js-file-line-container,
            .${ROOT_CLASS} [data-testid="diff-viewer"] table,
            .${ROOT_CLASS} table[class*="DiffLines"],
            .${ROOT_CLASS} table.tab-size {
                table-layout: auto !important;
            }

            .${ROOT_CLASS} td.blob-num,
            .${ROOT_CLASS} td.blob-num-addition,
            .${ROOT_CLASS} td.blob-num-deletion,
            .${ROOT_CLASS} td.blob-num-context,
            .${ROOT_CLASS} td.blob-num-hunk,
            .${ROOT_CLASS} .diff-line-number,
            .${ROOT_CLASS} [class*="line-number"],
            .${ROOT_CLASS} [data-testid="diff-line-number"],
            .${ROOT_CLASS} [data-testid="diff-gutter"] {
                width: 1% !important;
                min-width: 0 !important;
                padding-left: 2px !important;
                padding-right: 2px !important;
                box-sizing: border-box !important;
                text-align: right !important;
                white-space: nowrap !important;
            }

            .${ROOT_CLASS} td.blob-code,
            .${ROOT_CLASS} .diff-line-content,
            .${ROOT_CLASS} [class*="line-content"],
            .${ROOT_CLASS} [data-testid="diff-line"] pre,
            .${ROOT_CLASS} pre code,
            .${ROOT_CLASS} [data-testid="diff-line-content"] {
                padding-left: 8px !important;
                padding-right: 8px !important;
                box-sizing: border-box !important;
            }

            .${ROOT_CLASS} .diff-table tr,
            .${ROOT_CLASS} table.diff-table tr {
                display: table-row;
            }

            .${ROOT_CLASS} .file-header,
            .${ROOT_CLASS} .file-actions,
            .${ROOT_CLASS} .file-info {
                padding-left: max(4px, env(safe-area-inset-left, 0px)) !important;
                padding-right: max(4px, env(safe-area-inset-right, 0px)) !important;
            }

            /* ChatGPT Codex diff view optimization */
            .${ROOT_CLASS} .diff-tailwindcss-wrapper .diff-table-scroll-container {
                --diff-aside-width--: 10px !important;
            }

            .${ROOT_CLASS} .diff-tailwindcss-wrapper td.diff-line-num,
            .${ROOT_CLASS} .diff-tailwindcss-wrapper .unified-diff-table td.diff-line-num {
                width: 1% !important;
                min-width: 0 !important;
                max-width: none !important;
                padding-left: 2px !important;
                padding-right: 2px !important;
            }

            .${ROOT_CLASS} .diff-tailwindcss-wrapper .unified-diff-table {
                table-layout: auto !important;
            }

            .${ROOT_CLASS} .diff-tailwindcss-wrapper .unified-diff-table-num-col {
                width: 1% !important;
            }

            .${ROOT_CLASS} .diff-tailwindcss-wrapper td.diff-line-content {
                width: auto !important;
            }
        `;

        document.head.append(styleElement);
        return styleElement;
    }

    function updateState() {
        rafToken = null;

        const shouldEnable = hasDiffContent();
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
        observeDiffChanges();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
