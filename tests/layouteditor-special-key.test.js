const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js/layouteditor.js'),
  'utf8'
);

/* deviceeditor.js's _specialFromReference() only recognises special blocks under
   a plain identifier key, so the Layout Editor must not offer a config (cog)
   control for any other key: its popup would not open. */
test('layout editor only offers the config control for special blocks under an identifier key', () => {
  const start = source.indexOf('function _hasOpenableConfig(item)');
  assert.ok(start >= 0);
  const body = source.slice(start, source.indexOf('function _openItemConfig'));
  assert.ok(body.includes('/^[A-Za-z_$][A-Za-z0-9_$]*$/'));
  assert.ok(body.includes('REFERENCE_BASED_SPECIAL_KINDS.indexOf(item.kind)'));

  const deviceEditor = fs.readFileSync(
    path.join(__dirname, '..', 'js/deviceeditor.js'),
    'utf8'
  );
  assert.ok(
    deviceEditor.includes('/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference)')
  );
});

test('the cog and its click handler use the same check', () => {
  // the definition plus the two callers
  assert.equal((source.match(/_hasOpenableConfig\(item\)/g) || []).length, 3);
});
