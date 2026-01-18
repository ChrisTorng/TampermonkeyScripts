#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = path.resolve(__dirname, '..');
const RAW_BASE_URL = 'https://github.com/ChrisTorng/TampermonkeyScripts/raw/main';
const PAGES = [
  {
    source: path.join(ROOT, 'README.md'),
    output: path.join(ROOT, 'index.html'),
    title: 'Tampermonkey Scripts',
    transforms: [stripRawBase, rewriteTestCasesLink]
  },
  {
    source: path.join(ROOT, 'TestCases.md'),
    output: path.join(ROOT, 'TestCases.html'),
    title: 'Tampermonkey Script Test Cases',
    transforms: [stripRawBase, linkifyPlainUrls]
  }
];

marked.setOptions({
  mangle: false,
  headerIds: false
});

PAGES.forEach((page) => {
  const markdown = applyTransforms(
    fs.readFileSync(page.source, 'utf8'),
    page.transforms
  );
  const bodyContent = marked.parse(markdown).trim();
  const html = buildHtml(page.title, bodyContent);
  fs.writeFileSync(page.output, html, 'utf8');
  console.log(`${path.basename(page.output)} generated from ${path.basename(page.source)}.`);
});

function stripRawBase(markdown) {
  const escapedBase = RAW_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rawPattern = new RegExp(escapedBase, 'g');
  return markdown.replace(rawPattern, '');
}

function rewriteTestCasesLink(markdown) {
  const updatedLabel = markdown.replace(
    /\[TestCases\.md\]\((?:\.\/)?TestCases\.md(#[^)]+)?\)/g,
    '[TestCases.html](TestCases.html$1)'
  );
  return updatedLabel.replace(
    /\]\((?:\.\/)?TestCases\.md(#[^)]+)?\)/g,
    '](TestCases.html$1)'
  );
}

function linkifyPlainUrls(markdown) {
  return markdown.replace(/https?:\/\/[^\s)]+/g, (url, offset, text) => {
    if (offset >= 2 && text.slice(offset - 2, offset) === '](') {
      return url;
    }
    return `<a href="${url}">${url}</a>`;
  });
}

function applyTransforms(markdown, transforms) {
  return transforms.reduce((result, transform) => transform(result), markdown);
}

function buildHtml(title, bodyContent) {
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="UTF-8">',
    `  <title>${title}</title>`,
    '</head>',
    '<body>',
    indent(bodyContent),
    '</body>',
    '</html>',
    ''
  ].join('\n');
}

function indent(htmlContent) {
  return htmlContent
    .split('\n')
    .map((line) => (line.length ? `  ${line}` : ''))
    .join('\n');
}
