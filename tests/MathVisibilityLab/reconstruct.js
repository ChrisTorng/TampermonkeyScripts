/* Math Visibility Lab — conservative reconstruction from verified source slots.
   Does not translate text, execute TeX, modify the translated DOM or change MathJax layout.
   The final result is protected as one complete translation unit. */
(function () {
    'use strict';

    const partPattern = /^[TM](?:0|[1-9]\d*)$/;
    const markerRegex = /⟦\s*MATH[_\s-]*([0-9]+)\s*⟧/gi;
    const renderedMath = 'mjx-container,.MathJax,.katex,math,svg,img';

    function orderedParts(reference) {
        if (!reference) return [];
        return Array.from(reference.querySelectorAll('[data-part]'))
            .filter(el => partPattern.test(el.getAttribute('data-part') || '') &&
                !el.parentElement?.closest('[data-part]') && !el.closest('[data-hybrid-root]'));
    }

    let cloneInstance = 0;
    // SVG formulas can reference local glyph/clip IDs via <use href="#glyph">.
    // Removing the IDs makes those formulas vanish despite intact DOM.
    // Rewrite IDs *and their local references* instead of simply removing them.
    function namespaceIds(root) {
        if (root.nodeType !== 1) return;
        const withIds = [root, ...root.querySelectorAll('[id]')].filter(el => el.hasAttribute('id'));
        const translations = new Map();
        for (const element of withIds) {
            const oldId = element.getAttribute('id');
            if (!oldId) continue;
            const nextId = 'tm-math-copy-' + (++cloneInstance) + '-' +
                oldId.replace(/[^a-zA-Z0-9_-]/g, '_');
            translations.set(oldId, nextId);
            element.setAttribute('id', nextId);
        }
        if (!translations.size) return;
        const elements = [root, ...root.querySelectorAll('*')];
        const attrs = ['href','xlink:href','aria-labelledby','aria-describedby',
            'clip-path','mask','filter','fill','stroke','style'];
        for (const element of elements) {
            for (const attr of attrs) {
                const value = element.getAttribute(attr);
                if (!value) continue;
                let updated = value.replace(/url\(#([^)]+)\)/g,
                    (all, id) => translations.has(id) ? 'url(#' + translations.get(id) + ')' : all);
                if ((attr === 'href' || attr === 'xlink:href') && updated.startsWith('#')) {
                    updated = '#' + (translations.get(updated.slice(1)) || updated.slice(1));
                }
                if (attr === 'aria-labelledby' || attr === 'aria-describedby') {
                    updated = updated.split(/\s+/).map(id => translations.get(id) || id).join(' ');
                }
                if (value !== updated) element.setAttribute(attr, updated);
            }
        }
        root.querySelectorAll('style').forEach(style => {
            let css = style.textContent || '';
            for (const [oldId,newId] of translations) {
                css = css.split('url(#' + oldId + ')').join('url(#' + newId + ')');
            }
            style.textContent = css;
        });
    }

    function cloneMath(referencePart) {
        if (!referencePart) return null;
        if (!referencePart.querySelector(renderedMath)) return null;
        const clone = referencePart.cloneNode(true);
        clone.removeAttribute('data-part');
        clone.removeAttribute('data-math-index');
        clone.setAttribute('translate', 'no');
        clone.setAttribute('data-restored-formula', referencePart.dataset.part);
        namespaceIds(clone);
        return clone;
    }

    function isSentenceEnd(string, index) {
        const c = string[index];
        if ('。！？!?'.includes(c)) return true;
        if (c !== '.') return false;
        if (/\d/.test(string[index - 1] || '') && /\d/.test(string[index + 1] || '')) return false;
        // Avoid obvious English abbreviations; ambiguous segmentation is signaled in the UI.
        const prefix = string.slice(Math.max(0, index - 5), index + 1);
        if (/(?:Mr|Dr|Ms|Mrs|Prof|etc|e\.g|i\.e)\.$/i.test(prefix)) return false;
        return true;
    }

    function sentenceGroups(pieces) {
        const result = [];
        let current = [];
        const finish = () => {
            if (current.length) { result.push(current); current = []; }
        };
        for (const piece of pieces) {
            if (piece.kind === 'math') { current.push(piece); continue; }
            const s = piece.value;
            let begin = 0;
            for (let i = 0; i < s.length; i++) {
                if (!isSentenceEnd(s, i)) continue;
                while (i + 1 < s.length && /[”"'」』）]/.test(s[i + 1])) i++;
                current.push({ kind: 'text', value: s.slice(begin, i + 1) });
                finish();
                begin = i + 1;
            }
            if (begin < s.length) current.push({ kind: 'text', value: s.slice(begin) });
        }
        finish();
        return result;
    }

    function mathIds(pieces) {
        return pieces.filter(p => p.kind === 'math').map(p => p.id).join(',');
    }

    function buildPartPieces(translated, reference) {
        const source = orderedParts(reference);
        const specs = source.map(s => s.dataset.part);
        const translatedParts = Array.from(translated.querySelectorAll('[data-part]'))
            .filter(el => partPattern.test(el.getAttribute('data-part') || ''));
        const targets = new Map();
        for (const part of translatedParts) {
            const name = part.dataset.part;
            if (!targets.has(name)) targets.set(name, part);
        }
        const pieces = [];
        const originals = [];
        const missing = [];
        for (const part of source) {
            const id = part.dataset.part;
            if (id.startsWith('M')) {
                const math = cloneMath(part);
                if (!math) { missing.push(id + ':unrendered'); continue; }
                pieces.push({ kind:'math', id, node:math });
                originals.push({ kind:'math', id, node:cloneMath(part) });
            } else {
                const chinese = targets.get(id);
                if (!chinese) missing.push(id + ':translated-text-missing');
                else pieces.push({ kind:'text', value:chinese.textContent || '' });
                originals.push({ kind:'text', value:part.textContent || '' });
            }
        }
        if (!specs.length) missing.push('reference-empty');
        return { pieces, originals, missing, spec:specs };
    }

    function buildMarkerPieces(translated, reference) {
        const source = orderedParts(reference);
        const originals = source.map(p => p.dataset.part.startsWith('M')
            ? { kind:'math', id:p.dataset.part, node:cloneMath(p) }
            : { kind:'text', value:p.textContent || '' });
        const lookup = new Map(source.filter(p => p.dataset.part.startsWith('M')).map(p => [p.dataset.part.slice(1), p]));
        const raw = translated.textContent || '';
        const matches = [...raw.matchAll(markerRegex)];
        const pieces = [], missing = [];
        let at = 0;
        for (const match of matches) {
            const start = match.index;
            if (start > at) pieces.push({ kind:'text', value:raw.slice(at,start) });
            const ref = lookup.get(match[1]);
            const math = cloneMath(ref);
            if (!math || pieces.some(p => p.kind === 'math' && p.id === 'M' + match[1])) {
                missing.push('M' + match[1] + ':missing-or-duplicate');
            } else {
                pieces.push({ kind:'math', id:'M'+match[1], node:math });
            }
            at = start + match[0].length;
        }
        if (at < raw.length) pieces.push({ kind:'text', value:raw.slice(at) });
        const required = Array.from(lookup.keys()).map(x => 'M'+x);
        for (const id of required) {
            if (!pieces.some(p => p.kind === 'math' && p.id === id)) missing.push(id + ':placeholder-not-found');
        }
        if (!required.length) missing.push('reference-empty');
        return { pieces, originals, missing, markerMatches:matches.map(x=>x[0]), raw:raw.slice(0,500) };
    }

    function appendPieces(target, pieces, document) {
        for (const piece of pieces) {
            if (piece.kind === 'math') {
                if (piece.node) {
                const copy = piece.node.cloneNode(true);
                namespaceIds(copy);
                target.appendChild(copy);
            }
            } else if (piece.value) target.appendChild(document.createTextNode(piece.value));
        }
    }

    function render(target, record, sourceTranslated) {
        const doc = target.ownerDocument;
        const content = target.querySelector('[data-hybrid-content]');
        const note = target.querySelector('[data-hybrid-note]');
        if (!content || !note) return;
        // Never show a purportedly correct reconstruction if any formula or
        // translated text fragment was not recovered. Keep both source copies.
        const ready = record.missing.length === 0;
        if (!ready) {
            target.dataset.reconstruction = 'incomplete';
            note.textContent = '無法完整重建：' + record.missing.join(', ') +
                '。仍保留下方完整原文參考，不使用猜測的公式。';
            content.replaceChildren();
            return;
        }
        const translatedGroups = sentenceGroups(record.pieces);
        const sourceGroups = sentenceGroups(record.originals);
        const alignment = translatedGroups.length === sourceGroups.length &&
            translatedGroups.every((g,i) => mathIds(g) === mathIds(sourceGroups[i]));
        const result = doc.createDocumentFragment();
        translatedGroups.forEach((group,i) => {
            const row = doc.createElement('div');
            row.className = 'math-hybrid-sentence';
            row.dataset.sentence = String(i + 1);
            const line = doc.createElement('div');
            line.className = 'math-hybrid-translated';
            appendPieces(line, group, doc);
            row.appendChild(line);
            if (alignment) {
                const original = doc.createElement('details');
                original.className = 'math-hybrid-original';
                const summary = doc.createElement('summary');
                summary.textContent = '原文對照 ' + (i + 1);
                original.appendChild(summary);
                const origLine = doc.createElement('div');
                appendPieces(origLine, sourceGroups[i], doc);
                original.appendChild(origLine);
                row.appendChild(original);
            }
            result.appendChild(row);
        });
        content.replaceChildren(result);
        target.dataset.reconstruction = 'complete';
        target.dataset.sentenceAligned = String(alignment);
        target.dataset.mathCount = String(record.pieces.filter(x => x.kind === 'math').length);
        target.dataset.formulaIds = record.pieces.filter(x => x.kind === 'math').map(x => x.id).join(',');
        note.textContent = (sourceTranslated ? '已使用中文片段' : '尚未執行中文翻譯，顯示英文預覽') +
            '；公式 ' + target.dataset.mathCount + ' 個已由完整原文複製。' +
            (alignment ? '逐句可展開英文對照。' :
                '中英文句數或公式分布不同，暫停逐句配對；下方仍有完整原文。');
    }

    function rebuildPair(section, kind = 'slots') {
        if (!section) return [];
        const results = [];
        for (const position of ['near','late']) {
            const translated = section.querySelector('[data-hybrid-translated="'+position+'"]');
            const reference = section.querySelector('[data-original-reference="true"][data-hybrid-reference="'+position+'"]');
            const target = section.querySelector('[data-hybrid-root="'+position+'"]');
            if (!translated || !reference || !target) continue;
            const text = translated.textContent || '';
            const sourceTranslated = /[\u3400-\u9fff]/.test(text);
            const record = kind === 'markers'
                ? buildMarkerPieces(translated, reference)
                : buildPartPieces(translated, reference);
            render(target, record, sourceTranslated);
            results.push({
                position, kind, status:target.dataset.reconstruction,
                sourceTranslated, missing:record.missing,
                markerMatches:record.markerMatches,
                recoveredMath:target.dataset.mathCount || '0',
                formulaIds:target.dataset.formulaIds || '',
                sentenceAligned:target.dataset.sentenceAligned || '',
                sentenceCount:target.querySelectorAll('.math-hybrid-sentence').length,
                originalMath:reference.querySelectorAll('mjx-container,.katex').length,
                translatedMath:translated.querySelectorAll('mjx-container,.katex').length,
                translatedText:text.slice(0,300)
            });
        }
        return results;
    }

    document.addEventListener('click', (event) => {
        const button = event.target.closest?.('[data-hybrid-toggle]');
        if (!button) return;
        const article = button.closest('article');
        if (!article) return;
        const hybrid = button.closest('[data-hybrid-root]');
        if (hybrid?.dataset.reconstruction !== 'complete') {
            button.textContent = '尚未完整重建，請保留前兩份';
            return;
        }
        article.classList.toggle('math-hybrid-focus');
        button.textContent = article.classList.contains('math-hybrid-focus')
            ? '展開翻譯版與完整原文'
            : '只看重建版（收合前兩份）';
    });

    window.MathVisibilityReconstructor = { rebuildPair, buildPartPieces, buildMarkerPieces, sentenceGroups };
})();
