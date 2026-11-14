// ==UserScript==
// @name         Math Translation Guard
// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts
// @version      2026-11-14_1.2.3
// @description  Restore math inline by combining translated fragments with protected rendered formulas; preserve originals if incomplete.
// @author       Chris Torng
// @match        *://*/*
// @exclude      *://christorng.idv.tw/*
// @exclude      *://*.christorng.idv.tw/*
// @exclude      https://tm-math-translation-lab.christorng.workers.dev/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // Alex Wang uses MathJax 4. Isolating each formula with translate=no
    // demonstrably moves formulas to the paragraph tail in native Android Edge.
    // The supported safe fallback is one translatable paragraph AND a complete
    // original sibling, protected as a whole translation unit. Neither sibling
    // has its MathJax formula children reparented or reordered by this script.
    if (location.hostname === 'alexwang.ai' || location.hostname.endsWith('.alexwang.ai')) {
        // Only math-containing blocks are touched. Native Edge must remain
        // responsible for translation; this script never translates text.
        const sourcePattern = /\$\$[\s\S]{1,4000}?\$\$|\$[^\r\n$]{1,500}?\$|\\\([\s\S]{1,500}?\\\)|\\\[[\s\S]{1,4000}?\\\]/;
        const renderedSelector = 'mjx-container, .MathJax, .katex, math';
        const formulaSelector = 'mjx-container, .MathJax, .katex, math';
        const sourceAttribute = 'data-tm-math-dual-original';
        const referenceAttribute = 'data-tm-math-dual-reference';
        const partAttribute = 'data-tm-math-part';
        const referenceClass = 'tm-math-reference';
        const processed = new WeakMap();
        const activePairs = new Set();
        const mathOnly = new WeakSet();
        let nextId = 0;
        let updateTimer = null;
        let mutateLock = false;
        const paragraphLike = 'p, div';
        // MathJax 4 renders display equations as direct children of the
        // article container, *outside* <p>. They were missed by paragraph-only
        // protection, and native Edge could expose their raw $...$ source.
        const standaloneSelector = 'mjx-container[display="true"]';
        const standaloneAttribute = 'data-tm-math-display-guard';
        const standaloneGuards = new Set();

        function mathExpressionText(text) {
            const match = String(text || '').match(sourcePattern);
            if (!match) return false;
            if (match[0].startsWith('$') && !match[0].startsWith('$$')) {
                const value = match[0].slice(1, -1).trim();
                // Avoid interpreting ordinary currency such as "$15 and $20" as mathematics.
                if (/^\d+(?:[.,]\d+)?(?:\s+\w+)*$/.test(value)) return false;
            }
            return true;
        }

        function isMathElement(el) {
            return !!el && el.nodeType === 1 && el.matches(formulaSelector);
        }

        function eligibleBlock(block) {
            if (!block || block.nodeType !== 1 || !block.isConnected ||
                !block.matches(paragraphLike) ||
                block.closest('[' + referenceAttribute + '], [' + standaloneAttribute + '], script, style, noscript, textarea, pre, code, [contenteditable="true"]')) return false;
            if (block.tagName === 'DIV') {
                // Only leaf-like divs with direct formula output are eligible.
                // Never duplicate container divs, whole articles or nested paragraphs.
                if (block.querySelector('p, article, section, div, table, ul, ol, pre, blockquote, h1, h2, h3, h4')) return false;
                if (![...block.children].some(isMathElement)) return false;
            }
            return !!block.querySelector(renderedSelector) || mathExpressionText(block.textContent);
        }

        function hasNonMathProse(block) {
            if (block.querySelector('[' + partAttribute + '^="T"]')) {
                return [...block.querySelectorAll('[' + partAttribute + '^="T"]')]
                    .some(node => (node.textContent || '').trim().length > 0);
            }
            let content = '';
            for (const node of block.childNodes) {
                if (node.nodeType === 3) content += node.nodeValue || '';
                else if (node.nodeType === 1 && !isMathElement(node))
                    content += node.textContent || '';
            }
            return content.trim().length > 0;
        }

        // Preserve SVG glyph paths, clips, masks and MathJax SVG <use> links.
        // The previous approach removed every ID and could make copies invisible.
        function namespaceIds(root) {
            const mapping = new Map();
            const nodes = [root, ...root.querySelectorAll('[id]')];
            for (const node of nodes) {
                if (!node.hasAttribute?.('id')) continue;
                const from = node.getAttribute('id');
                if (!from) continue;
                const to = 'tm-math-' + (++nextId) + '-' + from.replace(/[^a-zA-Z0-9_-]/g, '_');
                mapping.set(from, to);
                node.setAttribute('id', to);
            }
            if (!mapping.size) return;
            const fields = ['href', 'xlink:href', 'aria-labelledby', 'aria-describedby',
                'clip-path', 'mask', 'filter', 'fill', 'stroke', 'style'];
            for (const el of [root, ...root.querySelectorAll('*')]) {
                for (const attribute of fields) {
                    const old = el.getAttribute?.(attribute);
                    if (!old) continue;
                    let updated = old.replace(/url\(#([^)]+)\)/g,
                        (all, id) => mapping.has(id) ? 'url(#' + mapping.get(id) + ')' : all);
                    if ((attribute === 'href' || attribute === 'xlink:href') && updated.startsWith('#')) {
                        updated = '#' + (mapping.get(updated.slice(1)) || updated.slice(1));
                    }
                    if (attribute.startsWith('aria-')) {
                        updated = updated.split(/\s+/).map(id => mapping.get(id) || id).join(' ');
                    }
                    if (updated !== old) el.setAttribute(attribute, updated);
                }
            }
            for (const style of root.querySelectorAll('style')) {
                let css = style.textContent || '';
                for (const [from, to] of mapping) css = css.split('url(#' + from + ')').join('url(#' + to + ')');
                if (css !== style.textContent) style.textContent = css;
            }
        }

        function protectStandaloneDisplay(element) {
            if (!element || !element.isConnected ||
                !element.matches?.(standaloneSelector) ||
                !element.querySelector('mjx-math, svg') ||
                element.closest('p, pre, code, [' + referenceAttribute + '], [' + standaloneAttribute + ']')) return;
            // Only genuinely standalone display equations. A display expression
            // inside a paragraph or leaf div belongs to the existing block logic.
            if (!element.parentElement?.matches('.c-article__content')) return;
            const wrapper = document.createElement('div');
            wrapper.setAttribute(standaloneAttribute, 'true');
            wrapper.setAttribute('translate', 'no');
            wrapper.className = 'tm-math-display-guard notranslate';
            element.setAttribute('translate', 'no');
            element.classList.add('notranslate');
            // Retain original site MathJax layout/margins. No additional
            // typography, background or visible bilingual reference is added.
            element.parentNode.insertBefore(wrapper, element);
            wrapper.appendChild(element);
            const snapshot = element.cloneNode(true);
            standaloneGuards.add({ wrapper, snapshot });
        }

        function restoreStandaloneDisplays() {
            for (const entry of standaloneGuards) {
                if (!entry.wrapper.isConnected) {
                    standaloneGuards.delete(entry);
                    continue;
                }
                // Native translation occasionally replaces a rendered display
                // equation with the original $\\TeX$ text. Restore the
                // previously typeset DOM rather than running a second TeX
                // interpreter (which may not know the site's custom macros).
                if (entry.wrapper.querySelector('mjx-container[display="true"] mjx-math, mjx-container[display="true"] svg')) continue;
                const formula = entry.snapshot.cloneNode(true);
                namespaceIds(formula);
                entry.wrapper.replaceChildren(formula);
            }
        }

        function assignSlots(block) {
            // Wait for the site's own renderer: splitting unprocessed TeX
            // before MathJax loads can break MathJax's scanning rules.
            if (!block.querySelector(renderedSelector)) return false;
            if (block.hasAttribute('data-tm-math-slotted')) return true;
            const nodes = Array.from(block.childNodes).filter(n => n.nodeType === 3 || n.nodeType === 1);
            if (!nodes.length || nodes.length > 80) return false;
            if (nodes.some(n => n.nodeType === 1 &&
                (!isMathElement(n) && n.querySelector(renderedSelector)))) return false;
            let textIndex = 0, mathIndex = 0;
            for (const node of nodes) {
                const math = isMathElement(node);
                const slot = document.createElement('span');
                slot.setAttribute(partAttribute, (math ? 'M' + mathIndex++ : 'T' + textIndex++));
                if (math) slot.className = 'tm-math-output-slot';
                block.insertBefore(slot, node);
                slot.appendChild(node);
            }
            if (!mathIndex) return false;
            block.setAttribute('data-tm-math-slotted', 'true');
            return true;
        }

        function mathSlots(reference) {
            return [...reference.querySelectorAll('[' + partAttribute + ']')]
                .filter(node => node.parentElement === reference);
        }

        function copyRenderedMath(part) {
            if (!part?.querySelector(renderedSelector)) return null;
            const clone = part.cloneNode(true);
            clone.removeAttribute(partAttribute);
            clone.setAttribute('translate', 'no');
            clone.setAttribute('data-tm-restored-math', part.getAttribute(partAttribute));
            namespaceIds(clone);
            return clone;
        }

        function splitSentences(pieces) {
            const groups = [];
            let current = [];
            const finish = () => { if (current.length) { groups.push(current); current = []; } };
            for (const piece of pieces) {
                if (piece.type === 'math') { current.push(piece); continue; }
                let from = 0;
                for (let i = 0; i < piece.value.length; i++) {
                    const ch = piece.value[i];
                    if (!'。！？!?'.includes(ch) && ch !== '.') continue;
                    if (ch === '.' && /\d/.test(piece.value[i-1] || '') &&
                        /\d/.test(piece.value[i+1] || '')) continue;
                    // Common English abbreviations should not create a new sentence.
                    if (ch === '.' && /(?:Mr|Dr|Ms|Mrs|Prof|etc|e\.g|i\.e)\.$/i.test(piece.value.slice(Math.max(0,i-5),i+1))) continue;
                    current.push({type:'text',value:piece.value.slice(from,i+1)});
                    finish();
                    from = i+1;
                }
                if (from < piece.value.length) current.push({type:'text',value:piece.value.slice(from)});
            }
            finish();
            return groups;
        }

        function mathSequence(parts) {
            return parts.filter(p => p.type === 'math').map(p => p.id).join(',');
        }

        function addPieces(target, pieces) {
            for (const piece of pieces) {
                if (piece.type === 'text') target.appendChild(document.createTextNode(piece.value));
                else {
                    const clone = copyRenderedMath(piece.part);
                    if (clone) target.appendChild(clone);
                }
            }
        }

        function rebuild(pair) {
            const {original, wrapper, reference, merged, backup} = pair;
            if (!original.isConnected || !reference.isConnected || !wrapper.isConnected) {
                activePairs.delete(pair);
                return;
            }
            if (!reference.hasAttribute('data-tm-math-slotted') &&
                reference.querySelector(renderedSelector)) assignSlots(reference);
            if (!original.hasAttribute('data-tm-math-slotted') &&
                original.querySelector(renderedSelector)) assignSlots(original);
            if (!reference.hasAttribute('data-tm-math-slotted') ||
                !original.hasAttribute('data-tm-math-slotted')) return;
            const source = mathSlots(reference);
            const translated = mathSlots(original);
            if (!source.length || source.length !== translated.length) return;
            const byId = new Map();
            for (const item of translated) {
                const key = item.getAttribute(partAttribute);
                if (byId.has(key)) return;
                byId.set(key, item);
            }
            if (new Set(source.map(x=>x.getAttribute(partAttribute))).size !== source.length) return;

            const translatedPieces = [], originalPieces = [];
            let textChanged = false, totalMath = 0;
            for (const part of source) {
                const id = part.getAttribute(partAttribute);
                const current = byId.get(id);
                if (!current) return; // Edge may have dropped a translation unit.
                if (id.startsWith('M')) {
                    if (!copyRenderedMath(part)) return;
                    translatedPieces.push({type:'math',id,part});
                    originalPieces.push({type:'math',id,part});
                    totalMath++;
                } else {
                    const text = current.textContent || '';
                    const english = part.textContent || '';
                    if (english.trim() && !text.trim()) return;
                    if (/[^\s]/.test(english) && /[\u3400-\u9fff]/.test(text) &&
                        text.trim() !== english.trim()) textChanged = true;
                    translatedPieces.push({type:'text',value:text});
                    originalPieces.push({type:'text',value:english});
                }
            }
            // A rendered formula is not enough: the translation must actually
            // have produced Chinese text, otherwise the "third" view is redundant.
            if (!textChanged || !totalMath) return;
            const signature = translatedPieces.map(piece => piece.type === 'text' ?
                'T:' + piece.value : 'M:' + piece.id).join('\u2063') + '|' +
                source.map(part => part.getAttribute(partAttribute)).join(',') + '|' +
                totalMath;
            if (pair.signature === signature) return;
            const translatedGroups = splitSentences(translatedPieces);
            const originalGroups = splitSentences(originalPieces);
            const aligned = translatedGroups.length === originalGroups.length &&
                translatedGroups.every((g,i)=>mathSequence(g)===mathSequence(originalGroups[i]));
            const content = document.createDocumentFragment();
            for (let i=0;i<translatedGroups.length;i++) {
                const row = document.createElement('div');
                row.className = 'tm-math-sentence';
                addPieces(row, translatedGroups[i]);
                // Sentence-level English references are useful only where
                // the sentence contains mathematics. Normal prose does not
                // need another bilingual UI or translation manipulation.
                if (aligned && mathSequence(translatedGroups[i])) {
                    const toggle = document.createElement('details');
                    toggle.className = 'tm-math-original-sentence';
                    const summary = document.createElement('summary');
                    summary.textContent = '原文 ' + (i+1);
                    toggle.appendChild(summary);
                    const line = document.createElement('div');
                    addPieces(line, originalGroups[i]);
                    toggle.appendChild(line);
                    row.appendChild(toggle);
                }
                content.appendChild(row);
            }
            merged.replaceChildren(content);
            pair.signature = signature;
            merged.setAttribute('data-tm-math-merged', 'complete');
            merged.setAttribute('data-tm-math-aligned', String(aligned));
            merged.setAttribute('data-tm-math-formulas', String(totalMath));
            backup.textContent = aligned ? '查看完整中英文段落' : '查看完整中英文段落（句子未精準配對）';
            wrapper.classList.add('tm-math-merged-ready');
            original.classList.add('tm-math-translated-source');
            // The original and backup are never deleted, and remain accessible.
        }

        function maybeRenderBackup(copy) {
            if (copy.querySelector(renderedSelector) || !mathExpressionText(copy.textContent)) return;
            const typeset = () => {
                if (!copy.isConnected || copy.querySelector(renderedSelector)) return;
                if (typeof window.MathJax?.typesetPromise === 'function') {
                    Promise.resolve(window.MathJax.typesetPromise([copy])).catch(error =>
                        console.warn('Math Translation Guard: reference typeset failed',error));
                }
            };
            if (window.MathJax?.startup?.promise) {
                Promise.resolve(window.MathJax.startup.promise).then(typeset).catch(()=>{});
            }
            window.addEventListener('load', typeset, {once:true});
        }

        function createReference(block) {
            if (processed.has(block) || block.hasAttribute(sourceAttribute) ||
                block.nextElementSibling?.hasAttribute(referenceAttribute)) return;
            // Mathematical-only blocks need no bilingual copy.
            if (block.querySelector(renderedSelector) && !hasNonMathProse(block)) {
                block.setAttribute('translate','no');
                block.classList.add('notranslate');
                mathOnly.add(block);
                processed.set(block, null);
                return;
            }
            if (mathExpressionText(block.textContent) && block.childNodes.length === 1) {
                // A raw TeX-only line can be protected without duplicating it.
                const text = (block.textContent || '').trim();
                if (/^(?:\$\$[\s\S]+?\$\$|\$[^\r\n$]+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])$/.test(text)) {
                    block.setAttribute('translate', 'no');
                    block.classList.add('notranslate');
                    mathOnly.add(block);
                    processed.set(block, null);
                    return;
                }
            }
            if (block.querySelector(renderedSelector)) assignSlots(block);
            block.setAttribute(sourceAttribute,'true');
            const wrapper = document.createElement('div');
            wrapper.setAttribute(referenceAttribute,'true');
            wrapper.setAttribute('translate','no');
            wrapper.className = referenceClass;
            const merged = document.createElement('div');
            merged.className = 'tm-math-combined';
            merged.setAttribute('translate','no');
            const backup = document.createElement('button');
            backup.type = 'button';
            backup.className = 'tm-math-view-toggle';
            backup.setAttribute('translate','no');
            backup.textContent = '原文參考（數學式保留）';
            const copy = block.cloneNode(true);
            copy.removeAttribute(sourceAttribute);
            copy.setAttribute('translate','no');
            copy.classList.add('notranslate','tm-math-backup-copy');
            namespaceIds(copy);
            wrapper.append(merged,backup,copy);
            block.parentNode.insertBefore(wrapper,block.nextSibling);
            const pair = { original:block, wrapper, reference:copy, merged, backup };
            processed.set(block,pair);
            activePairs.add(pair);
            backup.addEventListener('click', () => {
                wrapper.classList.toggle('tm-math-expanded');
                backup.textContent = wrapper.classList.contains('tm-math-expanded') ?
                    '收合中英文對照' : '查看完整中英文段落';
            });
            maybeRenderBackup(copy);
            rebuild(pair);
        }

        function scan(root) {
            if (!root) return;
            if (root.nodeType === 3) {
                if (root.parentElement) scan(root.parentElement);
                return;
            }
            if (root.nodeType !== 1 && root.nodeType !== 9) return;
            if (root.nodeType === 1 &&
                root.closest('['+referenceAttribute+']')) return;
            if (root.nodeType === 1 && root.matches(standaloneSelector)) protectStandaloneDisplay(root);
            root.querySelectorAll?.(standaloneSelector).forEach(protectStandaloneDisplay);
            const targets = new Set();
            if (root.nodeType === 1 && root.matches(paragraphLike)) targets.add(root);
            if (root.nodeType === 1) {
                const nearest = root.closest(paragraphLike);
                if (nearest) targets.add(nearest);
            }
            root.querySelectorAll?.(paragraphLike).forEach(node => targets.add(node));
            for (const block of targets) if (eligibleBlock(block)) createReference(block);
        }

        function requestRebuild() {
            // Throttle, do not debounce: MathJax and native Edge can mutate
            // the document continuously. Resetting the timer on every mutation
            // starves the reconciliation pass on long math-heavy articles.
            if (updateTimer !== null) return;
            updateTimer = setTimeout(() => {
                updateTimer = null;
                for (const pair of activePairs) rebuild(pair);
                restoreStandaloneDisplays();
            },160);
        }

        function start() {
            const style = document.createElement('style');
            style.textContent = [
                '.tm-math-reference{border-left:2px solid #8294a6;padding:3px 0 3px 9px;margin:5px 0 12px;opacity:.95}',
                '.tm-math-reference .tm-math-combined{font:inherit}',
                '.tm-math-reference .tm-math-sentence{margin:0 0 5px;line-height:inherit}',
                '.tm-math-reference .tm-math-original-sentence{font:12px/1.5 system-ui,sans-serif;opacity:.8;margin:0 0 4px}',
                '.tm-math-reference .tm-math-original-sentence summary{cursor:pointer}',
                '.tm-math-reference .tm-math-original-sentence>div{font:16px/1.55 Georgia,serif;padding:3px 0}',
                '.tm-math-reference .tm-math-view-toggle{font:12px system-ui,sans-serif;background:transparent;border:0;color:inherit;opacity:.8;cursor:pointer;padding:4px 0;text-decoration:underline}',
                '.tm-math-reference.tm-math-merged-ready .tm-math-backup-copy{display:none}',
                '.tm-math-reference.tm-math-merged-ready.tm-math-expanded .tm-math-backup-copy{display:block}',
                '.tm-math-translated-source:has(+.tm-math-reference.tm-math-merged-ready){display:none!important}',
                '.tm-math-translated-source:has(+.tm-math-reference.tm-math-merged-ready.tm-math-expanded){display:block!important}',
                '.tm-math-reference:not(.tm-math-merged-ready) .tm-math-combined{display:none}',
                '.tm-math-reference:not(.tm-math-merged-ready) .tm-math-backup-copy{display:block}',
                '.tm-math-reference:not(.tm-math-merged-ready) .tm-math-view-toggle{display:none}'
            ].join('\n');
            (document.head || document.documentElement).appendChild(style);
            scan(document.documentElement);
            const observer = new MutationObserver(records => {
                if (mutateLock) return;
                mutateLock = true;
                let needsRebuild = false;
                try {
                    for (const record of records) {
                        const target = record.target.nodeType === 3 ?
                            record.target.parentElement : record.target;
                        const reference = target?.closest?.('[' + referenceAttribute + ']');
                        // The merged bilingual view is our own output. Observing
                        // its replacement again would cause a rebuild feedback loop.
                        if (reference && !target.closest('.tm-math-backup-copy')) continue;
                        needsRebuild = true;
                        if (reference) continue; // MathJax may still render backup copy.
                        if (record.type === 'characterData') scan(record.target);
                        else for (const node of record.addedNodes) scan(node);
                    }
                } finally { mutateLock = false; }
                if (needsRebuild) requestRebuild();
            });
            observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
            requestRebuild();
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded',start,{once:true});
        } else start();
        return;
    }

    // Formula protection only. Inline position repair belongs to
    // InlineTranslationOrderGuard.user.js, never to this userscript.
    const outputSelectors = ['.MathJax', '.MathJax_Display', 'mjx-container', '.katex', 'math'];
    const outputSelector = outputSelectors.join(', ');
    const sourceAttribute = 'data-tm-math-protected';
    const mathHosts = new Set(['alexwang.ai', 'blog.plover.com']);
    const isPlover = location.hostname === 'blog.plover.com';
    let sourceMathEnabled = mathHosts.has(location.hostname);

    function hasMathLoader(root) {
        const isLoader = (element) => {
            if (!element || !element.getAttribute) return false;
            const link = element.getAttribute('src') || element.getAttribute('href') || '';
            return /mathjax|katex/i.test(link);
        };
        if (isLoader(root)) return true;
        if (!root || !root.querySelectorAll) return false;
        return Array.from(root.querySelectorAll('script[src], link[href]')).some(isLoader);
    }

    function markMath(element, kind) {
        if (!element || element.nodeType !== 1) return;
        if (element.getAttribute(sourceAttribute) !== kind) element.setAttribute(sourceAttribute, kind);
        if (element.getAttribute('translate') !== 'no') element.setAttribute('translate', 'no');
        if (!element.classList.contains('notranslate')) element.classList.add('notranslate');
    }

    function protectOutput(element) {
        if (!element || element.nodeType !== 1 || !outputSelectors.some((selector) => element.matches(selector))) return;
        if (element.closest('.MathJax_Preview')) return;
        // Only protect the outermost rendered formula. Nested MathML is not a new slot.
        if (element.parentElement && outputSelectors.some((selector) => element.parentElement.closest(selector))) return;
        markMath(element, 'output');
    }

    function protectSourceText(textNode) {
        if (!sourceMathEnabled || !textNode || textNode.nodeType !== 3) return;
        const parent = textNode.parentElement;
        if (!parent || !parent.isConnected ||
            parent.closest('script, style, noscript, textarea, pre, code, option, svg, math, mjx-container, .katex, .MathJax, .MathJax_Preview, [data-tm-math-protected], [contenteditable="true"]')) return;

        const input = textNode.nodeValue || '';
        if (!input || input.length > 20000 || (!input.includes('$') && !input.includes('\\') && !input.includes('!!'))) return;

        // Retain delimiters for the site's own MathJax configuration. Inserting
        // MathJax 2-specific <script type="math/tex"> broke formula placement in
        // the older experiment and is intentionally not repeated here.
        const tokens = /\$\$[\s\S]{1,4000}?\$\$|\$[^\r\n$]{1,500}?\$|\\\([\s\S]{1,500}?\\\)|\\\[[\s\S]{1,4000}?\\\]|!![\s\S]{1,1000}?!!/g;
        const matches = [];
        for (const match of input.matchAll(tokens)) {
            const raw = match[0];
            if (raw.startsWith('!!') && !isPlover) continue;
            const preceding = input.slice(0, match.index).match(/\\+$/);
            if (preceding && preceding[0].length % 2 === 1) continue;
            matches.push(match);
        }
        if (!matches.length) return;

        let offset = 0;
        for (const match of matches) {
            if (match.index > offset) {
                parent.insertBefore(document.createTextNode(input.slice(offset, match.index)), textNode);
            }
            const formula = document.createElement('span');
            markMath(formula, 'source');
            formula.textContent = match[0];
            parent.insertBefore(formula, textNode);
            offset = match.index + match[0].length;
        }
        if (offset < input.length) {
            parent.insertBefore(document.createTextNode(input.slice(offset)), textNode);
        }
        parent.removeChild(textNode);
    }

    function scan(root) {
        if (!root) return;
        if (!sourceMathEnabled && hasMathLoader(root)) sourceMathEnabled = true;
        if (root.nodeType === 1) protectOutput(root);
        if (root.querySelectorAll) root.querySelectorAll(outputSelector).forEach(protectOutput);
        if (!sourceMathEnabled) return;
        if (root.nodeType === 3) {
            protectSourceText(root);
        } else if (root.nodeType === 1 || root.nodeType === 9) {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            const nodes = [];
            let node;
            while ((node = walker.nextNode())) nodes.push(node);
            nodes.forEach(protectSourceText);
        }
    }

    function scanAfterMathLoader(root) {
        const hadSourceMath = sourceMathEnabled;
        scan(root);
        if (!hadSourceMath && sourceMathEnabled) scan(document.documentElement);
    }

    const observer = new MutationObserver((records) => {
        for (const record of records) {
            if (record.type === 'characterData') {
                scan(record.target);
                continue;
            }
            if (record.type === 'attributes') {
                protectOutput(record.target);
                continue;
            }
            for (const node of record.addedNodes) scanAfterMathLoader(node);
        }
    });
    observer.observe(document.documentElement, {
        childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ['class']
    });
    scanAfterMathLoader(document.documentElement);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => scanAfterMathLoader(document.documentElement), { once: true });
    }
})();
