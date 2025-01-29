// ==UserScript==
// @name         All Go InternetArchive Redirect
// @namespace    http://tampermonkey.net/
// @version      2025-01-29_1.1.0
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

    const hostname = window.location.hostname;
    
    if (hostname !== 'web.archive.org' &&
        hostname !== 'archive.is' &&
        hostname !== 'archive.ph') {
        const goButton = document.createElement('button');
        goButton.textContent = 'Go';
        goButton.style.cssText = `
            position: fixed;
            top: 70px;
            right: 0px;
            z-index: 2147483647;
            padding: 5px 10px;
            background-color: rgba(76, 175, 80, 0.3);
            color: white;
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

        goButton.addEventListener('mousedown', dragStart);
        goButton.addEventListener('touchstart', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchend', dragEnd);

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

        goButton.addEventListener('click', (e) => {
            if (!hasMoved) {
                const targetUrl = window.location.href;
                window.location.href = `https://web.archive.org/${targetUrl}`;
            }
        });
    }
})();
