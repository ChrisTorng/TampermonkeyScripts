// ==UserScript==
// @name         The Neuron Daily script
// @namespace    http://tampermonkey.net/
// @version      2025-12-27_1.0.1
// @description  Hide non-essential elements on The Neuron Daily to keep focus on the main content.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TheNeuronDaily.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TheNeuronDaily.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=theneurondaily.com
// @match        https://www.theneurondaily.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function hideElements() {
        const archiveGrid = document.querySelector('.grid.grid-cols-1.gap-6.md\\:grid-cols-2.lg\\:grid-cols-3');
        if (!archiveGrid) return;

        let currentElement = archiveGrid;
        while (currentElement.previousElementSibling) {
            currentElement.previousElementSibling.style.display = 'none';
            currentElement = currentElement.previousElementSibling;
        }

        // Also hide parent elements' siblings until main content
        let parent = archiveGrid.parentElement;
        while (parent && !parent.matches('main')) {
            let sibling = parent.previousElementSibling;
            while (sibling) {
                sibling.style.display = 'none';
                sibling = sibling.previousElementSibling;
            }
            parent = parent.parentElement;
        }

        if (parent.matches('main')) {
            let sibling = parent.previousElementSibling;
            while (sibling) {
                sibling.style.display = 'none';
                sibling = sibling.previousElementSibling;
            }
            parent = parent.parentElement;
        }
    }

    // Run on page load
    hideElements();

    // Watch for dynamic content changes
    const observer = new MutationObserver(hideElements);
    observer.observe(document.body, { childList: true, subtree: true });
})();
