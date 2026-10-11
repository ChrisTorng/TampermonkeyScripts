const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'tests', 'EdgeTranslatorApi', 'index.html'), 'utf8');
const scripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];

test('Edge Translator diagnostic page has valid executable JavaScript', () => {
    assert.equal(scripts.length, 1, 'The diagnostic should be self-contained');
    assert.doesNotThrow(() => new vm.Script(scripts[0][1], { filename: 'EdgeTranslatorApi/index.html' }));
});

test('diagnostic probes real browser API with no remote translation service', () => {
    assert.match(source, /window\.Translator/);
    assert.match(source, /api\.availability\(/);
    assert.match(source, /api\.create\(/);
    assert.match(source, /activeSession\.translate\(/);
    assert.match(source, /monitor: monitor =>/);
    assert.match(source, /document\.permissionsPolicy/);
    assert.match(source, /navigator\.userAgent/);
    assert.match(source, /window\.LanguageDetector/);
    assert.match(source, /sourceLanguage, targetLanguage/);
    assert.doesNotMatch(source, /(?:fetch|XMLHttpRequest|sendBeacon|WebSocket)\s*\(/);
    assert.doesNotMatch(source, /<script[^>]+src=/);
});

test('page offers a report that remains on-device unless explicitly copied', () => {
    assert.match(source, /id="copyButton"/);
    assert.match(source, /id="report"/);
    assert.match(source, /id="availabilityResult"/);
    assert.match(source, /id="translatedText"/);
    assert.match(source, /zh-TW/);
    assert.match(source, /zh-Hant/);
    assert.match(source, /en', 'es'/);
});
