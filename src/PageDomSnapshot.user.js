// ==UserScript==
// @name         Page DOM Snapshot Diagnostics
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-11-08_1.0.0
// @description  Download an on-demand live DOM snapshot and translation diagnostics locally; no uploads.
// @author       Chris Torng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/PageDomSnapshot.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/PageDomSnapshot.user.js
// @match        http://*/*
// @match        https://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
    'use strict';
    if (window !== window.top) return;

    const hostId = 'tm-dom-snapshot-control';
    const activity = { added: 0, removed: 0, characterData: 0, attributes: 0 };
    let captures = 0;

    // Observe original-site mutations without changing page text or navigation.
    const observer = new MutationObserver((records) => {
        for (const record of records) {
            const source = record.target.nodeType === 1 ? record.target : record.target.parentElement;
            if (source && (source.id === hostId || source.closest?.('#' + hostId))) continue;
            if (record.type === 'childList') {
                activity.added += record.addedNodes.length;
                activity.removed += record.removedNodes.length;
            } else if (record.type === 'characterData') activity.characterData++;
            else if (record.type === 'attributes') activity.attributes++;
        }
    });
    observer.observe(document, {
        subtree: true, childList: true, characterData: true, attributes: true,
        attributeFilter: ['translate', 'class', 'lang', 'content']
    });

    const serializeDoctype = () => {
        const d = document.doctype;
        if (!d) return '<!DOCTYPE html>';
        return '<!DOCTYPE ' + d.name
            + (d.publicId ? ' PUBLIC "' + d.publicId + '"' : '')
            + (d.systemId ? (d.publicId ? ' ' : ' SYSTEM ') + '"' + d.systemId + '"' : '')
            + '>';
    };

    function diagnostics(phase) {
        const blocked = Array.from(document.querySelectorAll('[translate="no"], .notranslate, meta[name="google"]'));
        return {
            version: '1.0.0',
            phase,
            sourceUrl: location.href,
            capturedAt: new Date().toISOString(),
            title: document.title,
            readyState: document.readyState,
            htmlLang: document.documentElement.getAttribute('lang'),
            htmlTranslate: document.documentElement.getAttribute('translate'),
            bodyTranslate: document.body?.getAttribute('translate') || null,
            bodyTextLength: (document.body?.innerText || document.body?.textContent || '').length,
            blockingMarkers: blocked.slice(0, 80).map((node) => ({
                tag: node.tagName,
                id: node.id || '',
                className: typeof node.className === 'string' ? node.className.slice(0, 160) : '',
                translate: node.getAttribute('translate'),
                name: node.getAttribute('name'),
                content: node.getAttribute('content')
            })),
            blockingMarkerCount: blocked.length,
            mutationsSinceStart: { ...activity },
            iframeCount: document.querySelectorAll('iframe').length,
            note: 'Live light DOM only: shadow roots and cross-origin frame documents are not included. No network upload.'
        };
    }

    function snapshot(phase) {
        if (!document.documentElement) return;
        const metadata = diagnostics(phase);
        const clone = document.documentElement.cloneNode(true);
        clone.querySelector('#' + hostId)?.remove();
        const safeJson = encodeURIComponent(JSON.stringify(metadata));
        const fullHtml = '<!-- TM_DOM_SNAPSHOT_URLENCODED ' + safeJson + ' -->\n'
            + serializeDoctype() + '\n' + clone.outerHTML;
        const url = URL.createObjectURL(new Blob([fullHtml], { type: 'text/html;charset=utf-8' }));
        const a = document.createElement('a');
        const date = new Date().toISOString().replace(/[:.]/g, '-');
        const site = location.hostname.replace(/[^a-z0-9.-]/gi, '_');
        a.download = 'dom-' + site + '-' + phase + '-' + date + '.html';
        a.href = url;
        a.style.display = 'none';
        document.documentElement.appendChild(a);
        try { a.click(); } finally {
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 15000);
        }
    }

    function mount() {
        if (!document.body || document.getElementById(hostId)) return;
        const host = document.createElement('div');
        host.id = hostId;
        host.setAttribute('translate', 'no');
        host.style.cssText = 'position:fixed!important;right:5px!important;bottom:56px!important;'
            + 'z-index:2147483647!important;display:flex!important;flex-direction:column!important;'
            + 'gap:4px!important;align-items:flex-end!important;font:12px system-ui!important;';
        const hint = document.createElement('span');
        hint.textContent = 'DOM snapshots (local only)';
        hint.style.cssText = 'background:rgba(0,0,0,.76)!important;color:white!important;'
            + 'padding:2px 5px!important;border-radius:4px!important;';
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'HTML↓';
        button.title = 'Download current DOM, first in original mode and then after translation';
        button.style.cssText = 'appearance:none!important;border:0!important;border-radius:5px!important;'
            + 'background:rgba(0,0,0,.65)!important;color:white!important;'
            + 'font:600 13px/28px system-ui!important;padding:2px 7px!important;'
            + 'min-height:32px!important;min-width:52px!important;cursor:pointer!important;';
        button.addEventListener('click', () => {
            const phase = ++captures === 1 ? '01' : ('0' + captures).slice(-2);
            try {
                snapshot(phase);
                hint.textContent = 'Snapshot ' + phase + ' requested';
            } catch (error) {
                hint.textContent = 'Download failed: ' + (error?.message || error);
            }
        });
        host.append(button, hint);
        document.body.appendChild(host);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount, { once: true });
    } else mount();
})();
