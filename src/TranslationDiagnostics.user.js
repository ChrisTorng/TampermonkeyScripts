// ==UserScript==
// @name         Translation Diagnostics
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-11-17_1.0.0
// @description  Opt-in, privacy-limited diagnostics for native browser translation blockers without changing page translation.
// @author       Chris Torng
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // No UI, observers, timers or page changes without this explicit URL flag.
    if (window !== window.top || new URLSearchParams(location.search).get('tm_translation_diag') !== '1') return;

    const snapshots = [];
    const started = Date.now();
    const version = '2026-11-17_1.0.0';

    function flags(element) {
        if (!element) return null;
        return {
            tag: element.tagName,
            translate: element.getAttribute('translate'),
            notranslate: element.classList.contains('notranslate'),
            lang: element.getAttribute('lang'),
            contenteditable: element.getAttribute('contenteditable')
        };
    }

    function chain(node) {
        const result = [];
        for (let current = node, depth = 0; current && depth < 18; current = current.parentElement, depth++) {
            result.push(flags(current));
            if (current === document.documentElement) break;
        }
        return result;
    }

    function summarizeArticle(element) {
        const paragraphs = Array.from(element.querySelectorAll('p'));
        const meaningful = paragraphs.filter((p) => (p.textContent || '').trim().length >= 70);
        const heading = element.querySelector('h1, h2');
        const example = meaningful[0] || heading || element;
        return {
            tag: element.tagName,
            headingPresent: Boolean(heading),
            headingLength: heading ? (heading.textContent || '').trim().length : 0,
            paragraphCount: paragraphs.length,
            substantialParagraphs: meaningful.length,
            substantialCharacters: meaningful.reduce((n, p) => n + (p.textContent || '').trim().length, 0),
            ancestorChain: chain(example)
        };
    }

    function snapshot(stage) {
        const html = document.documentElement;
        const body = document.body;
        const candidates = Array.from(document.querySelectorAll('article, main, [role="main"]')).slice(0, 12);
        const blockers = Array.from(document.querySelectorAll('[translate="no"], .notranslate'));
        const googleMeta = document.querySelector('meta[name="google"]');
        return {
            stage,
            elapsedMs: Date.now() - started,
            readyState: document.readyState,
            html: flags(html),
            body: flags(body),
            googleNotranslate: Boolean(googleMeta && /notranslate/i.test(googleMeta.getAttribute('content') || '')),
            totalOptOuts: blockers.length,
            optOutExamples: blockers.slice(0, 8).map(flags),
            articles: candidates.map(summarizeArticle),
            hasAstroViewTransitions: Boolean(document.querySelector('meta[name="astro-view-transitions-enabled"]')),
            hasNextRoot: Boolean(document.querySelector('#__next')),
            hasNuxtRoot: Boolean(document.querySelector('#__nuxt'))
        };
    }

    function record(stage) {
        if (snapshots.length < 12) snapshots.push(snapshot(stage));
    }

    function makeReport() {
        return JSON.stringify({
            diagnosticVersion: version,
            page: location.origin + location.pathname,
            // No page prose, headings, user input, URL search, cookies or credentials.
            snapshots: snapshots.concat(snapshot('manual'))
        }, null, 2);
    }

    function mountButton() {
        if (!document.body || document.getElementById('tm-translation-diag')) return;
        const button = document.createElement('button');
        button.id = 'tm-translation-diag';
        button.type = 'button';
        button.textContent = '翻譯診斷';
        button.title = 'Show translation attributes and copy a report without article content';
        button.setAttribute('translate', 'no');
        button.style.cssText = 'position:fixed!important;bottom:12px!important;left:12px!important;' +
            'z-index:2147483647!important;padding:6px 10px!important;font:14px sans-serif!important;' +
            'background:#333!important;color:white!important;border:1px solid #888!important;' +
            'border-radius:6px!important;';
        button.addEventListener('click', () => {
            record('button');
            let dialog = document.getElementById('tm-translation-diag-report');
            if (dialog) dialog.remove();
            dialog = document.createElement('section');
            dialog.id = 'tm-translation-diag-report';
            dialog.setAttribute('translate', 'no');
            dialog.style.cssText = 'position:fixed!important;z-index:2147483647!important;' +
                'inset:10% 3% auto 3%!important;max-height:75vh!important;overflow:auto!important;' +
                'padding:12px!important;background:#222!important;color:white!important;' +
                'border:1px solid #888!important;border-radius:8px!important;' +
                'font:14px sans-serif!important;';
            const title = document.createElement('div');
            title.textContent = 'Translation DOM diagnostics (no article text)';
            const area = document.createElement('textarea');
            area.readOnly = true;
            area.value = makeReport();
            area.style.cssText = 'display:block!important;width:100%!important;height:45vh!important;' +
                'box-sizing:border-box!important;margin:8px 0!important;font:12px monospace!important;';
            const copy = document.createElement('button');
            copy.type = 'button';
            copy.textContent = 'Copy report';
            copy.addEventListener('click', async () => {
                area.select();
                let copied = false;
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(area.value);
                        copied = true;
                    } else if (document.execCommand) {
                        copied = document.execCommand('copy');
                    }
                } catch (_) { /* Keep the selectable report as a fallback. */ }
                copy.textContent = copied ? 'Copied' : 'Select all and copy';
            });
            const close = document.createElement('button');
            close.type = 'button';
            close.textContent = 'Close';
            close.style.marginLeft = '12px';
            close.addEventListener('click', () => dialog.remove());
            dialog.appendChild(title);
            dialog.appendChild(area);
            dialog.appendChild(copy);
            dialog.appendChild(close);
            document.body.appendChild(dialog);
        });
        document.body.appendChild(button);
    }

    record('document-start');
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            record('dom-ready');
            mountButton();
        }, { once: true });
    } else {
        record('already-ready');
        mountButton();
    }
    window.addEventListener('load', () => { record('load'); mountButton(); }, { once: true });
    setTimeout(() => { record('after-2s'); mountButton(); }, 2000);
    setTimeout(() => { record('after-8s'); mountButton(); }, 8000);
})();
