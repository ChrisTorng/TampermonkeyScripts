// ==UserScript==
// @name         Fullscreen Game View
// @namespace    http://tampermonkey.net/
// @version      2026-10-26_1.0.3
// @description  Fit embedded games within mobile screens with a dim, draggable fullscreen toggle.
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

    function makeTransientControlDraggable(button, container, { bottom = false, size = 24, inset = 6 } = {}) {
        let placement = null;
        let drag = null;
        let suppressClick = false;
        let observer;
        const geometry = () => {
            const rect = container.getBoundingClientRect();
            const viewport = window.visualViewport;
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
            const maxY = Math.min(rect.bottom, lower) - originY - size;
            return { originX, originY, minX, minY, maxX, maxY };
        };
        const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
        const place = (x, y) => {
            button.style.setProperty('left', `${x}px`, 'important');
            button.style.setProperty('top', `${y}px`, 'important');
            button.style.setProperty('right', 'auto', 'important');
            button.style.setProperty('bottom', 'auto', 'important');
        };
        const layout = () => {
            if (!button.isConnected) {
                transientControlLayouts.delete(layout);
                if (observer) observer.disconnect();
                return;
            }
            const area = geometry();
            const hidden = area.maxX < area.minX || area.maxY < area.minY;
            if (button.hidden !== hidden) button.hidden = hidden;
            if (hidden || drag) return;
            place(clamp(placement ? placement.x : area.maxX - inset, area.minX, area.maxX),
                clamp(placement ? placement.y : bottom ? area.maxY - inset : area.minY + inset, area.minY, area.maxY));
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
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    border-radius: 8px !important;
    box-sizing: border-box !important;
    color: #999 !important;
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
    touch-action: none !important;
    text-decoration: none !important;
}

#${BUTTON_ID}[hidden] {
    display: none !important;
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
    overflow: visible !important;
}

/* The site's D-pad grid places its left button one grid column outside the shell. */
@media (max-width: 767px) {
    #playground .d-pad-grid {
        position: relative !important;
        transform: translateX(2rem) !important;
        z-index: 1 !important;
    }
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
        refreshTransientControls();
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
        target.appendChild(button);
        makeTransientControlDraggable(button, target, { size: 42, inset: 8 });
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation?.();
            void toggleFullscreen(target, button);
        });

        document.addEventListener('fullscreenchange', () => {
            document.documentElement.classList.toggle('tm-fullscreen-game-view-active', isFullscreen(target));
            updateButton(button, target);
        });
    }

    mountButton();
    new MutationObserver(mountButton).observe(document.documentElement, { childList: true, subtree: true });
})();
