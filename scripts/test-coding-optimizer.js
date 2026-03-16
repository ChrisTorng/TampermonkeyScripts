const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

const { createHarness } = require('./dom-harness');

const repoRoot = path.join(__dirname, '..');
const scriptPath = path.join(repoRoot, 'src', 'CodingOptimizer.user.js');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');
const codexFixturePath = path.join(repoRoot, 'tests', 'Coding Diff Optimizer', 'chatgpt.com_codex_tasks_task_e_68e41a320a388322a04ba2f35d096cd7.html');
const pullFixturePath = path.join(repoRoot, 'tests', 'Coding Diff Optimizer', 'github.com_ChrisTorng_TampermonkeyScripts_pull_7_files.html');
const commitFixturePath = path.join(repoRoot, 'tests', 'Coding Diff Optimizer', 'github.com_ChrisTorng_TampermonkeyScripts_commit_267c2b3f52c428e3b68b9560ed165cb21dfa4602.html');
const codexFixtureHtml = fs.readFileSync(codexFixturePath, 'utf8');
const pullFixtureHtml = fs.readFileSync(pullFixturePath, 'utf8');
const commitFixtureHtml = fs.readFileSync(commitFixturePath, 'utf8');

function executeCodingOptimizer(url) {
    const harness = createHarness({ url, readyState: 'loading' });
    harness.context.globalThis = harness.context;
    harness.context.global = harness.context;
    vm.runInNewContext(scriptContents, harness.context, { filename: scriptPath });
    return harness;
}

describe('CodingOptimizer on captured diff pages', () => {
    test('fixtures contain known diff selectors from captured GitHub pages', () => {
        assert.match(codexFixtureHtml, /CONTENT_CLASS:\s*INVALID_ANTI_BOT/);
        assert.match(codexFixtureHtml, /chatgpt\.com|codex/i);
        assert.match(pullFixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(pullFixtureHtml, /js-diff-table/);
        assert.match(commitFixtureHtml, /CONTENT_CLASS:\s*VALID_/);
        assert.match(commitFixtureHtml, /diffs-|diff-view|DiffLines|js-diff-table/i);
    });

    test('chatgpt codex diff selectors enable optimizer on supported task pages', () => {
        const harness = executeCodingOptimizer('https://chatgpt.com/codex/tasks/task_e_68e41a320a388322a04ba2f35d096cd7');
        const diffWrapper = harness.document.createElement('div');
        diffWrapper.className = 'diff-tailwindcss-wrapper';
        harness.appendToBody(diffWrapper);
        harness.dispatchDocumentEvent('DOMContentLoaded');
        harness.flushAnimationFrames();

        const style = harness.document.getElementById('tm-git-diff-optimizer-style');
        assert(style, 'Expected optimizer style on ChatGPT Codex diff pages.');
        assert.equal(style.disabled, false);
        assert.equal(harness.document.documentElement.classList.contains('tm-git-diff-optimizer'), true);
    });

    test('diff content enables optimizer class and style on load', () => {
        const harness = executeCodingOptimizer('https://github.com/ChrisTorng/TampermonkeyScripts/pull/7/files');
        const diffTable = harness.document.createElement('table');
        diffTable.className = 'diff-table js-diff-table';
        harness.appendToBody(diffTable);
        harness.dispatchDocumentEvent('DOMContentLoaded');
        harness.flushAnimationFrames();

        const style = harness.document.getElementById('tm-git-diff-optimizer-style');
        assert(style, 'Expected optimizer style element to be created.');
        assert.equal(style.disabled, false);
        assert.equal(harness.document.documentElement.classList.contains('tm-git-diff-optimizer'), true);
    });

    test('mutation observer enables optimizer when diff content appears later', () => {
        const harness = executeCodingOptimizer('https://github.com/ChrisTorng/TampermonkeyScripts/commit/267c2b3f52c428e3b68b9560ed165cb21dfa4602');
        harness.dispatchDocumentEvent('DOMContentLoaded');
        harness.flushAnimationFrames();

        assert.equal(harness.document.documentElement.classList.contains('tm-git-diff-optimizer'), false);

        const diffContainer = harness.document.createElement('div');
        diffContainer.className = 'js-diff-progressive-container';
        harness.appendToBody(diffContainer);
        harness.triggerMutation([diffContainer]);
        harness.flushAnimationFrames();

        const style = harness.document.getElementById('tm-git-diff-optimizer-style');
        assert(style, 'Expected optimizer style element after diff appears.');
        assert.equal(style.disabled, false);
        assert.equal(harness.document.documentElement.classList.contains('tm-git-diff-optimizer'), true);
    });
});
