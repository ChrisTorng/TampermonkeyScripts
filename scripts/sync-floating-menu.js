const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const shared = fs.readFileSync(path.join(root, 'src', 'FloatingMenu.js'), 'utf8').trimEnd();
const start = '    // BEGIN SHARED FLOATING MENU';
const end = '    // END SHARED FLOATING MENU';
const block = `${start}\n${shared}\n${end}`;
const files = [
    'AllGoInternetArchive.user.js',
    'ForceMobileView.user.js',
    'ForceDarkMode.user.js',
    'TranslatePreformattedText.user.js',
];

for (const name of files) {
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
        const anchor = "    'use strict';";
        const index = original.indexOf(anchor);
        if (index < 0) throw new Error(`Missing insertion point in ${name}`);
        updated = original.slice(0, index + anchor.length) + '\n\n' + block + original.slice(index + anchor.length);
    }
    fs.writeFileSync(file, updated.replace(/\r?\n/g, newline));
}
