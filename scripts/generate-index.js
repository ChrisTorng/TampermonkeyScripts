#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = path.resolve(__dirname, '..');
const README_PATH = path.join(ROOT, 'README.md');
const OUTPUT_PATH = path.join(ROOT, 'index.html');
const RAW_BASE_URL = 'https://github.com/ChrisTorng/TampermonkeyScripts/raw/main';

const readme = fs.readFileSync(README_PATH, 'utf8');

const normalizedMarkdown = stripRawBase(readme);

marked.setOptions({
  mangle: false,
  headerIds: false
});

const bodyContent = marked.parse(normalizedMarkdown).trim();

const html = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '  <meta charset="UTF-8">',
  '  <title>Tampermonkey Scripts</title>',
  '</head>',
  '<body>',
  indent(bodyContent),
  '</body>',
  '</html>',
  ''
].join('\n');

fs.writeFileSync(OUTPUT_PATH, html, 'utf8');

console.log('index.html generated from README.md with raw GitHub links converted to relative paths.');

function stripRawBase(markdown) {
  const escapedBase = RAW_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rawPattern = new RegExp(escapedBase, 'g');
  return markdown.replace(rawPattern, '');
}

function indent(htmlContent) {
  return htmlContent
    .split('\n')
    .map((line) => (line.length ? `  ${line}` : ''))
    .join('\n');
}
