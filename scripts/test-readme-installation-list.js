const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const root = path.join(__dirname, '..');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const installationIndex = readme.indexOf('## Installation');
const installation = installationIndex < 0 ? '' : readme.slice(installationIndex);

test('README installation lists every userscript exactly once', () => {
    assert.ok(installation, 'README.md must contain an Installation section');
    const scripts = fs.readdirSync(path.join(root, 'src'))
        .filter((name) => name.endsWith('.user.js'));
    for (const script of scripts) {
        const expected = 'src/' + script + ')';
        const matches = installation.split(expected).length - 1;
        assert.equal(matches, 1, script + ' must appear exactly once in Installation');
    }
});
