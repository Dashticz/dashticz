#!/usr/bin/env node
/* Checks the language files in lang/ against en_US.json.
   Errors (exit code 1): invalid JSON, duplicate keys, empty key names,
   values that are not strings.
   Warnings (exit code 0): keys missing from a language, keys that do not
   exist in en_US, and {placeholders} that differ from en_US. The interface
   falls back to en_US for a missing key, so these may lag behind.
   In GitHub Actions the warnings are shown as annotations and as a summary. */
const fs = require('node:fs');
const path = require('node:path');

const langDir = path.join(__dirname, '..', 'lang');
const base = 'en_US';

/* JSON.parse silently keeps the last of two equal keys, so scan the text. */
function findDuplicates(text) {
  const duplicates = [];
  const stack = [];
  const re = /"(?:[^"\\]|\\.)*"|[{}[\]:,]/g;
  let match;
  let prev = '';
  while ((match = re.exec(text))) {
    const token = match[0];
    if (token === '{') stack.push({ keys: new Set(), path: '' });
    else if (token === '[') stack.push(null);
    else if (token === '}' || token === ']') stack.pop();
    else if (token[0] === '"') {
      const top = stack[stack.length - 1];
      if (top && (prev === '{' || prev === ',')) {
        const key = JSON.parse(token);
        if (top.keys.has(key)) duplicates.push(key);
        top.keys.add(key);
      }
    }
    prev = token[0] === '"' ? '"' : token;
  }
  return duplicates;
}

function flatten(value, prefix, out, errors, file) {
  Object.keys(value).forEach((key) => {
    const item = value[key];
    if (key.trim() === '') errors.push(`${file}: empty key name in ${prefix}`);
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      flatten(item, `${prefix}${key}.`, out, errors, file);
    } else if (typeof item !== 'string' && !Array.isArray(item)) {
      errors.push(`${file}: value of ${prefix}${key} is not a string or array`);
    } else {
      out[`${prefix}${key}`] = item;
    }
  });
  return out;
}

function load(file, errors) {
  const text = fs.readFileSync(path.join(langDir, file), 'utf8');
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    errors.push(`${file}: invalid JSON (${e.message})`);
    return null;
  }
  findDuplicates(text).forEach((key) =>
    errors.push(`${file}: duplicate key "${key}"`)
  );
  return flatten(data, '', {}, errors, file);
}

const placeholders = (s) =>
  typeof s === 'string' ? (s.match(/\{[^{}]*\}/g) || []).sort().join(' ') : '';

const errors = [];
const warnings = [];
const rows = [];
const english = load(`${base}.json`, errors);
const files = fs
  .readdirSync(langDir)
  .filter((f) => f.endsWith('.json') && f !== `${base}.json`)
  .sort();

if (english) {
  const total = Object.keys(english).length;
  files.forEach((file) => {
    const lang = load(file, errors);
    if (!lang) return;
    const missing = Object.keys(english).filter((k) => !(k in lang));
    const extra = Object.keys(lang).filter((k) => !(k in english));
    const mismatch = Object.keys(lang).filter(
      (k) => k in english && placeholders(english[k]) !== placeholders(lang[k])
    );
    if (extra.length)
      warnings.push(`${file}: ${extra.length} key(s) not in ${base}`);
    if (mismatch.length)
      warnings.push(
        `${file}: placeholders differ from ${base} in ${mismatch.length} key(s), e.g. ${mismatch[0]}`
      );
    rows.push({ file, missing: missing.length, extra: extra.length, total });
  });
}

const incomplete = rows.filter((r) => r.missing);
const missingSum = incomplete.reduce((n, r) => n + r.missing, 0);
if (incomplete.length) {
  warnings.unshift(
    `${incomplete.length} language file(s) lack translations (${missingSum} missing keys in total); en_US is used as fallback`
  );
}

const lines = [];
lines.push('Language files compared with en_US.json');
rows.forEach((r) =>
  lines.push(
    `  ${r.file.padEnd(12)} missing ${String(r.missing).padStart(4)} / ${r.total}` +
      (r.extra ? `, ${r.extra} extra` : '')
  )
);
console.log(lines.join('\n'));
errors.forEach((e) => console.log(`::error::${e}`));
warnings.forEach((w) => console.log(`::warning::${w}`));

if (process.env.GITHUB_STEP_SUMMARY) {
  const md = ['### Language files', ''];
  md.push(errors.length ? `**${errors.length} error(s)**` : 'No errors.');
  errors.forEach((e) => md.push(`- ❌ ${e}`));
  md.push('', '| File | Missing keys | Extra keys |', '|---|---|---|');
  rows.forEach((r) =>
    md.push(`| ${r.file} | ${r.missing} / ${r.total} | ${r.extra} |`)
  );
  warnings.forEach((w) => md.push(`- ⚠️ ${w}`));
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
}

process.exit(errors.length ? 1 : 0);
