// ==UserScript==
// @name         eBird Map Links
// @namespace    http://tampermonkey.net/
// @version      2026-09-26_1.0.0
// @description  Add direct recent-species and recent-checklist links to eBird hotspot map results.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/EBirdScript.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/EBirdScript.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ebird.org
// @match        https://ebird.org/hotspots*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const hotspotPathPattern = /^\/hotspot\/(L\d+)/;

    function addLink(afterElement, href, text) {
        const item = document.createElement('li');
        item.dataset.ebirdLinksAdded = 'true';
        const link = document.createElement('a');
        link.href = href;
        link.textContent = text;
        item.appendChild(link);
        afterElement.insertAdjacentElement('afterend', item);
        return item;
    }

    function addHotspotLinks() {
        document.querySelectorAll('li > a[href^="/hotspot/L"]').forEach((link) => {
            const item = link.parentElement;
            if (!item || item.dataset.ebirdLinksAdded === 'true') {
                return;
            }

            const match = link.pathname.match(hotspotPathPattern);
            if (!match) {
                return;
            }

            const basePath = `/hotspot/${match[1]}`;
            const birdListItem = addLink(item, `${basePath}/bird-list`, '最近鳥種');
            addLink(birdListItem, `${basePath}/recent-checklists`, '最近紀錄');
            item.dataset.ebirdLinksAdded = 'true';
        });
    }

    addHotspotLinks();
    new MutationObserver(addHotspotLinks).observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();
