'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const versionLine = /^\/\/\s*@version\s+(\d{4})-(\d{2})-(\d{2})_(\d+)\.(\d+)\.(\d+)\s*$/m;

function parseVersion(source, filename = 'userscript') {
    const match = source.match(versionLine);
    assert(match, `${filename} needs @version YYYY-MM-DD_Major.Minor.Patch`);
    return match.slice(1).map(Number);
}

function compareVersions(next, previous) {
    for (let i = 0; i < next.length; i++) {
        if (next[i] !== previous[i]) return Math.sign(next[i] - previous[i]);
    }
    return 0;
}

function git(...args) {
    return execFileSync('git', args, {
        cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe']
    }).trimEnd();
}

test('userscript versions use a numeric calendar and semantic triple', () => {
    const oldVersion = parseVersion('// @version 2026-11-21_1.5.14');
    const newVersion = parseVersion('// @version 2026-11-21_1.5.15');
    assert.equal(compareVersions(newVersion, oldVersion), 1);
    assert.equal(compareVersions(oldVersion, newVersion), -1);
    assert.equal(compareVersions(newVersion, newVersion), 0);
    assert.equal(compareVersions(parseVersion('// @version 2026-11-22_1.0.0'), newVersion), 1);
    assert.throws(() => parseVersion('// @version same-version'), /needs @version/);
});

test('every modified userscript increases @version relative to the PR base', {
    skip: !process.env.PR_BASE_REF && 'Run this check in pull_request CI'
}, () => {
    const baseRef = process.env.PR_BASE_REF;
    assert.match(baseRef, /^[a-zA-Z0-9._/-]+$/, 'invalid base branch');
    const base = `origin/${baseRef}`;
    const changed = git('diff', '--name-only', '--diff-filter=ACMRT', `${base}...HEAD`, '--', 'src')
        .split('\n').filter(p => p.endsWith('.user.js'));
    for (const filename of changed) {
        const current = fs.readFileSync(path.join(root, filename), 'utf8');
        const next = parseVersion(current, filename);
        let previousSource;
        try {
            previousSource = git('show', `${base}:${filename}`);
        } catch (_) {
            // A newly created script has no base version, but must declare one.
            continue;
        }
        const previous = parseVersion(previousSource, `base:${filename}`);
        assert(compareVersions(next, previous) > 0,
            `${filename} was changed without increasing @version: ${previous.join('.')} -> ${next.join('.')}`);
    }
});
