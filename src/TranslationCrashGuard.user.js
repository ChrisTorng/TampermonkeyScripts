// ==UserScript==
// @name         Translation Crash Guard
// @namespace    http://tampermonkey.net/
// @version      2026-08-26_1.0.0
// @description  Prevent machine-translation DOM rewrites from crashing dynamic web applications.
// @author       ChrisTorng
// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/
// @downloadURL  https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TranslationCrashGuard.user.js
// @updateURL    https://github.com/ChrisTorng/TampermonkeyScripts/raw/main/src/TranslationCrashGuard.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.microsoft.com
// @match        http://*/*
// @match        https://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    if (typeof Node !== 'function' || !Node.prototype) {
        return;
    }

    const patchMarker = Symbol.for('translation-crash-guard-patched');
    if (Node.prototype[patchMarker]) {
        return;
    }

    const originalRemoveChild = Node.prototype.removeChild;
    const originalInsertBefore = Node.prototype.insertBefore;

    Object.defineProperty(Node.prototype, patchMarker, {
        configurable: false,
        enumerable: false,
        value: true
    });

    Node.prototype.removeChild = function(child) {
        if (child?.parentNode !== this) {
            console.warn('Translation Crash Guard skipped removeChild for a node moved by page translation.', child, this);
            return child;
        }
        return originalRemoveChild.apply(this, arguments);
    };

    Node.prototype.insertBefore = function(newNode, referenceNode) {
        if (referenceNode && referenceNode.parentNode !== this) {
            console.warn('Translation Crash Guard skipped insertBefore for a reference node moved by page translation.', referenceNode, this);
            return newNode;
        }
        return originalInsertBefore.apply(this, arguments);
    };
})();
