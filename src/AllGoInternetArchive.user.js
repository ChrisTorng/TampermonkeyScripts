// ==UserScript==
// @name         All Go InternetArchive Redirect
// @namespace    http://tampermonkey.net/
// @version      2025-09-17_1.2.0
// @description  Provide all sites go to Internet Archive
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AllGoInternetArchive.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/AllGoInternetArchive.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=web.archive.org
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 檢查是否為最上層視窗
    if (window !== window.top) {
        return;
    }

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

    const archiveTodayIconUrl = 'https://www.google.com/s2/favicons?sz=64&domain=archive.is';
    const archiveTodayIconSymbol = Symbol('archiveTodayIconElement');

    function createArchiveTodayIconWrapper() {
        const wrapper = document.createElement('span');
        wrapper.className = 'agi-archive-today-icon';
        wrapper.style.display = 'inline-flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.marginRight = '4px';

        const icon = document.createElement('img');
        icon.src = archiveTodayIconUrl;
        icon.alt = 'Archive Today';
        icon.style.width = '16px';
        icon.style.height = '16px';
        icon.style.borderRadius = '2px';
        icon.style.display = 'block';

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

    function createFloatingGoButton() {
        if (!document.body) {
            return;
        }

        const goButton = document.createElement('button');
        goButton.textContent = '→';
        goButton.style.cssText = `
            position: fixed;
            top: 70px;
            right: 0px;
            z-index: 2147483647;
            padding: 5px 10px;
            background-color: rgba(0, 0, 0, 0.3);
            color: darkgray;
            border: none;
            border-radius: 4px;
            cursor: move;
            font-size: 14px;
            user-select: none;
            touch-action: none;
        `;
        document.body.appendChild(goButton);

        let isDragging = false;
        let hasMoved = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        function dragStart(e) {
            if (e.target === goButton) {
                isDragging = true;
                hasMoved = false;

                if (e.type === 'touchstart') {
                    initialX = e.touches[0].clientX - goButton.offsetLeft;
                    initialY = e.touches[0].clientY - goButton.offsetTop;
                } else {
                    initialX = e.clientX - goButton.offsetLeft;
                    initialY = e.clientY - goButton.offsetTop;
                }
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                hasMoved = true;

                if (e.type === 'touchmove') {
                    currentX = e.touches[0].clientX - initialX;
                    currentY = e.touches[0].clientY - initialY;
                } else {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                }

                // 防止按鈕拖出視窗
                currentX = Math.min(Math.max(currentX, 0), window.innerWidth - goButton.offsetWidth);
                currentY = Math.min(Math.max(currentY, 0), window.innerHeight - goButton.offsetHeight);

                goButton.style.left = currentX + 'px';
                goButton.style.top = currentY + 'px';
                goButton.style.right = 'auto';
            }
        }

        function dragEnd() {
            isDragging = false;
        }

        goButton.addEventListener('mousedown', dragStart);
        goButton.addEventListener('touchstart', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchend', dragEnd);

        goButton.addEventListener('click', () => {
            if (!hasMoved) {
                const targetUrl = window.location.href;
                if (isArchiveTodayHost) {
                    window.location.href = `https://archive.is/submit/?url=${targetUrl}`;
                } else {
                    window.location.href = `https://web.archive.org/${targetUrl}`;
                }
            }
        });
    }

    onDocumentReady(createFloatingGoButton);
})();
