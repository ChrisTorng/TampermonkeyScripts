'use strict';

// The five standalone files remain canonical; generate one self-contained
// all-in-one distribution without remote @require scripts or eval().
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const names = [
    'AllGoInternetArchive',
    'InternetArchive',
    'ForceMobileView',
    'ForceDarkMode',
    'TranslatePreformattedText'
];
const bundlePath = path.join(root, 'src', 'SharedMenuAllInOne.user.js');
const metaPath = path.join(root, 'src', 'SharedMenuAllInOne.meta.js');
const raw = 'https://raw.githubusercontent.com/ChrisTorng/TampermonkeyScripts/main/src/';
const versionPattern = /^\/\/ @version\s+([^\r\n]+)$/m;

function metadata(source) {
    const end = source.indexOf('// ==/UserScript==');
    assert(end >= 0, 'Missing userscript metadata');
    const header = source.slice(0, end);
    function values(kind) {
        return Array.from(header.matchAll(new RegExp('^// @' + kind + '\\s+(.+)$', 'gm')),
            match => match[1].trim());
    }
    return { matches: values('match'), excludes: values('exclude') };
}

function header(version) {
    return [
        '// ==UserScript==',
        '// @name         Shared Floating Menu — All in One',
        '// @namespace    https://github.com/ChrisTorng/TampermonkeyScripts/all-in-one',
        '// @version      ' + version,
        '// @description  Bundle five shared floating-menu scripts in one install, with immediate main-version notices.',
        '// @author       ChrisTorng',
        '// @homepage     https://github.com/ChrisTorng/TampermonkeyScripts/',
        '// @downloadURL  ' + raw + 'SharedMenuAllInOne.user.js',
        '// @updateURL    ' + raw + 'SharedMenuAllInOne.meta.js',
        '// @match        *://*/*',
        '// @run-at       document-start',
        '// @sandbox      raw',
        '// @grant        GM_info',
        '// @grant        GM_openInTab',
        '// @grant        GM_getValue',
        '// @grant        GM_setValue',
        '// @grant        GM_listValues',
        '// @grant        GM_deleteValue',
        '// @grant        GM_xmlhttpRequest',
        '// @connect      raw.githubusercontent.com',
        '// ==/UserScript==',
        ''
    ].join('\n');
}

function renderMeta(version) {
    return header(version).replace(/^\/\/ @(?:match|run-at|sandbox|grant|connect)\s+[^\n]*\n/gm, '');
}

function renderBundle(version, files, updateRuntime) {
    const out = [
        header(version),
        '',
        '(function () {',
        "    'use strict';",
        '    // Runtime dispatch preserves the exact original userscript scope.',
        '    function matchesPattern(pattern, url) {',
        "        const parts = pattern.split('*');",
        '        if (parts.length === 1) return pattern === url;',
        '        if (!url.startsWith(parts[0])) return false;',
        '        let offset = parts[0].length;',
        '        for (let i = 1; i < parts.length - 1; i++) {',
        '            const index = url.indexOf(parts[i], offset);',
        '            if (index < 0) return false;',
        '            offset = index + parts[i].length;',
        '        }',
        '        return url.slice(offset).endsWith(parts[parts.length - 1]);',
        '    }',
        '    function applies(matches, excludes) {',
        '        const url = location.href;',
        '        return matches.some(pattern => matchesPattern(pattern, url))',
        '            && !excludes.some(pattern => matchesPattern(pattern, url));',
        '    }'
    ];
    for (const name of names) {
        const source = files[name];
        assert(source, 'Missing ' + name);
        const marker = '// ==/UserScript==';
        const index = source.indexOf(marker);
        assert(index >= 0, 'Missing metadata end in ' + name);
        const meta = metadata(source);
        out.push('    // BEGIN BUNDLED ' + name);
        out.push('    if (applies(' + JSON.stringify(meta.matches) + ', ' + JSON.stringify(meta.excludes) + ')) {');
        out.push('        try {');
        out.push(source.slice(index + marker.length));
        out.push('        } catch (error) { console.error("SharedMenuAllInOne: ' + name + ' failed", error); }');
        out.push('    }');
        out.push('    // END BUNDLED ' + name);
    }
    out.push(updateRuntime
        .replaceAll('__ALL_IN_ONE_VERSION__', JSON.stringify(version))
        .replaceAll('__ALL_IN_ONE_INSTALL_URL__', JSON.stringify(raw + 'SharedMenuAllInOne.user.js'))
        .replaceAll('__ALL_IN_ONE_META_URL__', JSON.stringify(raw + 'SharedMenuAllInOne.meta.js')));
    out.push('})();', '');
    return out.join('\n');
}

function versionFromExisting() {
    if (!fs.existsSync(bundlePath)) return '2026-11-23_1.0.0';
    const match = fs.readFileSync(bundlePath, 'utf8').match(versionPattern);
    assert(match, 'Existing all-in-one script must have @version');
    return match[1];
}

function bumpedVersion(previous) {
    const now = new Date().toISOString().slice(0, 10);
    const parts = previous.match(/^(\d{4}-\d{2}-\d{2})_(\d+)\.(\d+)\.(\d+)$/);
    assert(parts, 'Invalid current @version');
    const date = now > parts[1] ? now : parts[1];
    return date + '_' + parts[2] + '.' + parts[3] + '.' + (Number(parts[4]) + 1);
}

function main() {
    const args = new Set(process.argv.slice(2));
    const previous = versionFromExisting();
    const version = args.has('--bump') ? bumpedVersion(previous) : previous;
    const files = Object.fromEntries(names.map(name => [
        name, fs.readFileSync(path.join(root, 'src', name + '.user.js'), 'utf8')
    ]));
    const updateRuntime = fs.readFileSync(
        path.join(root, 'scripts', 'shared-menu-all-in-one-updates.js'), 'utf8');
    const bundle = renderBundle(version, files, updateRuntime);
    const meta = renderMeta(version);
    if (args.has('--check')) {
        assert.equal(fs.readFileSync(bundlePath, 'utf8'), bundle,
            'Bundle is stale: run node scripts/build-shared-menu-all-in-one.js --bump');
        assert.equal(fs.readFileSync(metaPath, 'utf8'), meta,
            'Metadata is stale: run node scripts/build-shared-menu-all-in-one.js --bump');
    } else {
        fs.writeFileSync(bundlePath, bundle);
        fs.writeFileSync(metaPath, meta);
        process.stdout.write('Generated SharedMenuAllInOne ' + version + '\n');
    }
}

if (require.main === module) main();
module.exports = { metadata, renderBundle, renderMeta, bumpedVersion, names };
