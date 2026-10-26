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
            const left = viewport ? viewport.offsetLeft : 0;
            const top = viewport ? viewport.offsetTop : 0;
            const right = left + (viewport ? viewport.width : window.innerWidth);
            const lower = top + (viewport ? viewport.height : window.innerHeight);
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
