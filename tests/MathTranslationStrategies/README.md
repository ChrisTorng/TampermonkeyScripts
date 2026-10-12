# Math translation compatibility research

This directory is a **retained research corpus**, not a production userscript or a claim that Microsoft Edge honors `translate="no"` universally. The pages serve static English mathematical paragraphs with duplicate cases, so testers can distinguish an initially visible case from one reached by scrolling **using actual visibility events**, not by the misleading labels `first` and `second` alone.

## Maintained regression cases

| Page | Library/output | Why retained | Status |
| --- | --- | --- | --- |
| [english-source.html](english-source.html) | MathJax 2, `script[type=math/tex]` | Plover-like inline TeX in a genuinely English initial document; controls browser language detection | **Manual Android Edge test** passed in one fixture, not a universal solution |
| [inline-katex.html](inline-katex.html) | KaTeX | Same translated prose + three inline equations; compares unprotected, sibling and entire-paragraph protection | **Known Android Edge failure**: formulas may disappear after translation, sometimes position-dependent |
| [inline-mathjax4-chtml.html](inline-mathjax4-chtml.html) | MathJax 4 CommonHTML | Reproduce disappearance of normal `mjx-container` output | **Known Android Edge failure** |
| [inline-mathjax4-svg.html](inline-mathjax4-svg.html) | MathJax 4 SVG | Distinguish renderer format from DOM translation corruption | **Known Android Edge failure** |
| [atomic-math.html](atomic-math.html) | MathJax 4 export to SVG `<img>`, inline SVG, shadow DOM, iframe | Verified MathJax 4 line-breaking, `currentColor` loss, source-placeholder replay, and real Edge sibling reordering | **Partial**: full SVG pictures survive but second formula can move earlier |
| [anchored-math.html](anchored-math.html) | MathJax 4 exported image; nested span, CSS pseudo-element, and grouped element | Follow-up isolated hypotheses for preserving text/formula association | **Experimental**, not validated as general protection |

## Historical comparison

- [index.html](index.html) is the original A-J matrix, including W3C-style nested `translate=no` / `translate=yes`, `contenteditable`, MathJax v2 script source, and simulated translation. Retained to prevent retrying known failures and to facilitate comparisons with another browser or translation extension.
- [scripts/test-math-translation-strategies.js](../../scripts/test-math-translation-strategies.js) checks page syntax, DOM fixture structure, mobile-sized initial viewport placement, SVG integrity and Chrome rendering. **Headless Chrome has no native Microsoft Edge translation engine**; green CI does not imply user-visible Android compatibility.

## Manual test procedure

1. Disable installed page-modifying userscripts (in particular Math Translation Guard, Translate Preformatted Text, and Translation Crash Guard) when isolating native browser translation. Reopen the page in a new tab after changing their state.
2. Use a focused URL such as `inline-katex.html?mode=focus&method=siblings` or `atomic-math.html?mode=focus&method=image&paint=white`. Verify the selected case's first visibility record has `scrollY: 0` if an initial-viewport trial is required.
3. Use the browser's own English-to-Traditional-Chinese page translation. Confirm an ordinary English control paragraph was actually translated; otherwise the math case is inconclusive.
4. Check all equations **visually and semantically**, not just existence of three DOM nodes. Scroll down to the repeated case, repeat the inspection, and capture diagnostics with timestamp, user-agent, original order, translation status and formula evidence.
5. If testing a userscript's strategy mode, compare its output against the no-userscript control in separate sessions. Switching browser translation back to the original language is a distinct secondary test and may cause formula loss.
6. Compare Windows Edge, Android Edge, and other browsers separately. Results are version-specific and can change as translation engines evolve.

## Findings that should not be lost

- **MathJax 2 on Plover:** early `!!...!!` handling can interfere with MathJax; G-style script containers succeeded in one controlled English-source fixture. Validate on the real article before marking fixed.
- **MathJax 4 and KaTeX:** `translate=no` alone is not a guaranteed boundary. Source delimiters can be changed into full-width punctuation, or rendered nodes can disappear.
- **MathJax 4 SVG images:** `MathJax.tex2svgPromise()` may return multiple inline SVG fragments unless `output.linebreaks.inline=false`. Taking only `querySelector('svg')` silently truncates formulas. Exported SVG descendants using `currentColor` must have explicit paint to avoid black-on-black images. Standalone image width is **not a requested problem to fix**.
- **Dynamic translation:** a pre-render TeX text placeholder can reappear after the page translator restores a cached text node. An image-only source avoids that particular failure but does not prevent the translator from rearranging sibling `<img>` nodes.
- **Real Edge reorder:** observed twice: `T0 M0 T1 M1 T2 M2 T3` became `T0 M0 M1 T1 T2 M2 T3`. The translated language may validly reorder words; judge whether equation-to-meaning associations survive instead of requiring literal original DOM order.
- **User priority:** mathematical content should not disappear. Raw TeX is an inferior but sometimes readable fallback; misplaced yet visible equations can be paired with F1/F2 references. Pixel contrast and switching back to original language are separate concerns.

## Scope and future maintenance

Prioritize MathJax 2, MathJax 3/4, KaTeX, and native MathML. Other engines should be added only when a real page demonstrates a reproducible problem. Keep the historical test fixtures for future library versions, different translation providers, and mobile/desktop comparisons; do not treat every experimental technique as a recommended automatic mitigation.
