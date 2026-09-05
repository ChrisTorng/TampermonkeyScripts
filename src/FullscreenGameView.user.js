// ==UserScript==
// @name         Fullscreen Game View
// @namespace    http://tampermonkey.net/
// @version      2026-09-05_1.0.0
// @description  Fit embedded games within mobile screens and add a distraction-free fullscreen toggle.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/FullscreenGameView.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/FullscreenGameView.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.tampermonkey.net
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const BUTTON_ID = 'tm-fullscreen-game-view-button';
    const TARGET_CLASS = 'tm-fullscreen-game-view-target';
    const FALLBACK_CLASS = 'tm-fullscreen-game-view-fallback';
    const STYLE_ID = 'tm-fullscreen-game-view-style';
    const GENERIC_MEDIA_SELECTOR = 'canvas, iframe, video, [role="application"]';

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
html.tm-fullscreen-game-view-active,
html.tm-fullscreen-game-view-active body {
    overflow: hidden !important;
}

.${TARGET_CLASS} {
    position: relative !important;
}

#${BUTTON_ID} {
    align-items: center !important;
    background: rgba(0, 0, 0, 0.72) !important;
    border: 1px solid rgba(255, 255, 255, 0.75) !important;
    border-radius: 8px !important;
    box-sizing: border-box !important;
    color: white !important;
    cursor: pointer !important;
    display: flex !important;
    font: 700 22px/1 sans-serif !important;
    height: 42px !important;
    justify-content: center !important;
    margin: 0 !important;
    padding: 0 !important;
    position: absolute !important;
    right: max(8px, env(safe-area-inset-right)) !important;
    top: max(8px, env(safe-area-inset-top)) !important;
    width: 42px !important;
    z-index: 2147483647 !important;
}

#${BUTTON_ID}:focus-visible {
    outline: 3px solid #4da3ff !important;
    outline-offset: 2px !important;
}

.${TARGET_CLASS}:fullscreen,
.${TARGET_CLASS}.${FALLBACK_CLASS} {
    align-items: center !important;
    background: #000 !important;
    box-sizing: border-box !important;
    display: flex !important;
    height: 100dvh !important;
    justify-content: center !important;
    max-height: none !important;
    max-width: none !important;
    overflow: auto !important;
    padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left)) !important;
    width: 100dvw !important;
}

.${TARGET_CLASS}.${FALLBACK_CLASS} {
    inset: 0 !important;
    position: fixed !important;
    z-index: 2147483646 !important;
}

/* ARC Prize tasks use a content-box handheld shell that can overflow narrow viewports. */
body:has(#task-detail-root) {
    overflow-x: hidden !important;
}

#playground,
#playground .game-page-inner,
#playground .shell-page,
#playground .shell-header,
#playground .shell-header-scale,
#playground .shell-header-content {
    box-sizing: border-box !important;
    max-width: 100% !important;
    width: 100% !important;
}

#playground .shell-root {
    box-sizing: border-box !important;
    max-width: min(540px, 100%) !important;
}
`;
    (document.head || document.documentElement).appendChild(style);

    function getTarget() {
        const arcGame = document.querySelector('#playground .game-page-inner');
        if (arcGame) {
            return arcGame;
        }

        const candidates = Array.from(document.querySelectorAll(GENERIC_MEDIA_SELECTOR));
        if (!candidates.length) {
            return null;
        }

        const visibleCandidates = candidates.filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width >= 160 && rect.height >= 120;
        });
        const candidate = (visibleCandidates.length ? visibleCandidates : candidates)
            .sort((left, right) => {
                const leftRect = left.getBoundingClientRect();
                const rightRect = right.getBoundingClientRect();
                return (rightRect.width * rightRect.height) - (leftRect.width * leftRect.height);
            })[0];

        return candidate.parentElement || candidate;
    }

    function isFullscreen(target) {
        return document.fullscreenElement === target || target.classList.contains(FALLBACK_CLASS);
    }

    function updateButton(button, target) {
        const active = isFullscreen(target);
        button.textContent = active ? '×' : '⛶';
        button.setAttribute('aria-label', active ? 'Exit fullscreen game view' : 'Enter fullscreen game view');
        button.title = active ? 'Exit fullscreen' : 'Fullscreen game view';
        button.setAttribute('aria-pressed', String(active));
    }

    async function toggleFullscreen(target, button) {
        if (document.fullscreenElement === target) {
            await document.exitFullscreen();
        } else if (target.classList.contains(FALLBACK_CLASS)) {
            target.classList.remove(FALLBACK_CLASS);
        } else if (typeof target.requestFullscreen === 'function') {
            try {
                await target.requestFullscreen({ navigationUI: 'hide' });
            } catch (_error) {
                target.classList.add(FALLBACK_CLASS);
            }
        } else {
            target.classList.add(FALLBACK_CLASS);
        }

        document.documentElement.classList.toggle('tm-fullscreen-game-view-active', isFullscreen(target));
        updateButton(button, target);
    }

    function mountButton() {
        if (document.getElementById(BUTTON_ID)) {
            return;
        }

        const target = getTarget();
        if (!target) {
            return;
        }

        target.classList.add(TARGET_CLASS);
        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.type = 'button';
        updateButton(button, target);
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation?.();
            void toggleFullscreen(target, button);
        });
        target.appendChild(button);

        document.addEventListener('fullscreenchange', () => {
            document.documentElement.classList.toggle('tm-fullscreen-game-view-active', isFullscreen(target));
            updateButton(button, target);
        });
    }

    mountButton();
    new MutationObserver(mountButton).observe(document.documentElement, { childList: true, subtree: true });
})();
