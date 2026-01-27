const fs = require('fs');
const path = require('path');
const assert = require('assert');

const fixturePath = path.join(__dirname, '..', 'tests', 'fixtures', 'hackernews.betacat.io.html');
const scriptPath = path.join(__dirname, '..', 'src', 'BetterMobileView.user.js');

const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');
const scriptContents = fs.readFileSync(scriptPath, 'utf8');

assert(
    fixtureHtml.includes('class="post-summary"'),
    'Expected fixture to include .post-summary container.'
);
assert(
    fixtureHtml.includes('class="feature-image"'),
    'Expected fixture to include .feature-image link.'
);
assert(
    fixtureHtml.includes('class="summary-text"'),
    'Expected fixture to include .summary-text block.'
);
assert(
    fixtureHtml.includes('class="img-rounded"'),
    'Expected fixture to include .img-rounded image.'
);

const requiredSnippets = [
    '@media (max-width: 768px) and (orientation: portrait)',
    '.post-summary .feature-image',
    '.post-summary .feature-image img',
    '.post-summary .summary-text',
    'width: 100%'
];

requiredSnippets.forEach((snippet) => {
    assert(
        scriptContents.includes(snippet),
        `Expected script to include CSS snippet: ${snippet}`
    );
});

console.log('BetterMobileView checks passed.');
