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
    transforms: [stripRawBase]
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
  return markdown.replace(
    /\]\((?:\.\/)?TestCases\.md(#[^)]+)?\)/g,
    '](TestCases.html$1)'
  );
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
