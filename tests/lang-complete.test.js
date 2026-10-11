const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const langDir = path.join(__dirname, '..', 'lang');

function flatten(value, prefix, out) {
  Object.keys(value).forEach((key) => {
    const item = value[key];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      flatten(item, `${prefix}${key}.`, out);
    } else {
      out[`${prefix}${key}`] = item;
    }
  });
  return out;
}

function load(locale) {
  return flatten(
    JSON.parse(fs.readFileSync(path.join(langDir, `${locale}.json`), 'utf8')),
    '',
    {}
  );
}

/* The interface falls back to en_US for a missing key, so the other language
   files may lag behind. These two are maintained and must stay complete. */
for (const locale of ['nl_NL', 'fr_FR']) {
  test(`${locale} has a translation for every en_US key`, () => {
    const english = load('en_US');
    const translated = load(locale);
    const missing = Object.keys(english).filter((key) => !(key in translated));
    assert.deepEqual(missing, []);
  });
}
