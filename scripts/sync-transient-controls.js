const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const shared = fs.readFileSync(path.join(root, 'src', 'TransientControl.js'), 'utf8').trimEnd();
const start = '    // BEGIN SHARED TRANSIENT CONTROL';
const end = '    // END SHARED TRANSIENT CONTROL';
const block = `${start}\n${shared}\n${end}`;
for (const name of ['TranslatePreformattedText.user.js', 'FullscreenGameView.user.js']) {
    const file = path.join(root, 'src', name);
    const original = fs.readFileSync(file, 'utf8');
    const newline = original.includes('\r\n') ? '\r\n' : '\n';
    let updated;
    if (original.includes(start)) {
        const first = original.indexOf(start);
        const last = original.indexOf(end, first);
        if (last < 0) throw new Error(`Missing end marker in ${name}`);
        updated = original.slice(0, first) + block + original.slice(last + end.length);
    } else {
        const anchor = name === 'TranslatePreformattedText.user.js'
            ? '    if (floatingMenuForbiddenHost()) return;'
            : "    'use strict';";
        const index = original.indexOf(anchor);
        if (index < 0) throw new Error(`Missing insertion point in ${name}`);
        updated = original.slice(0, index + anchor.length) + '\n\n' + block + original.slice(index + anchor.length);
    }
    fs.writeFileSync(file, updated.replace(/\r?\n/g, newline));
}
