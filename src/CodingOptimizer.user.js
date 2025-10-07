// ==UserScript==
// @name         Coding Diff Mobile Optimizer
// @namespace    http://tampermonkey.net/
// @version      2025-10-07_1.0.1
// @description  Expand diff code columns on mobile portrait layouts to maximize reading space on ChatGPT Codex and GitHub.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/CodingOptimizer.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/CodingOptimizer.user.js
// @match        https://chatgpt.com/codex/*
// @match        https://github.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STYLE_ID = 'tm-git-diff-mobile-style';
    const ROOT_CLASS = 'tm-git-diff-mobile';
    const MOBILE_USER_AGENT_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk/i;
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
        const { userAgent = '', maxTouchPoints = 0, userAgentData } = navigator;

        if (userAgentData && typeof userAgentData.mobile === 'boolean') {
            if (userAgentData.mobile) {
                return true;
            }
        }

        if (MOBILE_USER_AGENT_REGEX.test(userAgent)) {
            return true;
        }

        const maybeTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || maxTouchPoints > 1);
        if (maybeTouchDevice) {
            return window.innerWidth <= WIDTH_THRESHOLD || window.innerHeight <= WIDTH_THRESHOLD;
        }

        return false;
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
            }

            .${ROOT_CLASS} table.diff-table,
            .${ROOT_CLASS} .diff-table,
            .${ROOT_CLASS} .js-file-line-container,
            .${ROOT_CLASS} [data-testid="diff-viewer"] table {
                table-layout: fixed !important;
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
                width: max(2rem, calc(3.6ch + 6px)) !important;
                min-width: max(2rem, calc(3.6ch + 6px)) !important;
                padding-left: 2px !important;
                padding-right: 2px !important;
                box-sizing: border-box !important;
                text-align: right !important;
            }

            .${ROOT_CLASS} td.blob-code,
            .${ROOT_CLASS} .diff-line-content,
            .${ROOT_CLASS} [class*="line-content"],
            .${ROOT_CLASS} [data-testid="diff-line"] pre,
            .${ROOT_CLASS} pre code,
            .${ROOT_CLASS} code[class*="diff"],
            .${ROOT_CLASS} [data-testid="diff-line-content"] {
                padding-left: 8px !important;
                padding-right: 8px !important;
                box-sizing: border-box !important;
                white-space: pre !important;
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
