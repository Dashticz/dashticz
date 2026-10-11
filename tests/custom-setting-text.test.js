const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

/* The helpers are top-level functions of an IIFE, indented two spaces, so the
   closing brace is the first '  }' line after the declaration. */
function functionSource(source, name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf('\n  }\n', start);
  assert.ok(end > start, name);
  return source.slice(start, end + 5);
}

/* Both editors carry the same pair of helpers for the custom field rows. */
['js/widgeteditor.js', 'js/deviceeditor.js'].forEach((file) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const context = { $: { trim: (text) => String(text).trim() } };
  vm.createContext(context);
  vm.runInContext(
    functionSource(source, '_settingToText') +
      functionSource(source, '_parseCustomSetting') +
      'this.toText = _settingToText; this.parse = _parseCustomSetting;',
    context
  );
  const roundTrip = (value) => context.parse(context.toText(value)).value;

  test(`${file}: text values keep their type through the field row`, () => {
    ['007', '0612345678', 'true', 'false', '1e3', '"quoted"'].forEach((value) =>
      assert.strictEqual(roundTrip(value), value, value)
    );
  });

  test(`${file}: plain text, numbers, booleans and objects are unchanged`, () => {
    assert.equal(context.toText('hello'), 'hello');
    assert.strictEqual(roundTrip('hello'), 'hello');
    assert.strictEqual(roundTrip(42), 42);
    assert.strictEqual(roundTrip(1.5), 1.5);
    assert.strictEqual(roundTrip(true), true);
    assert.equal(JSON.stringify(roundTrip({ a: [1, 'b'] })), '{"a":[1,"b"]}');
  });

  test(`${file}: an empty text value is shown as "" and kept`, () => {
    assert.equal(context.toText(''), '""');
    assert.strictEqual(roundTrip(''), '');
  });

  test(`${file}: a typed JSON string is read as a string`, () => {
    assert.equal(
      JSON.stringify(context.parse('"007"')),
      '{"valid":true,"value":"007"}'
    );
    assert.equal(
      JSON.stringify(context.parse('007')),
      '{"valid":true,"value":7}'
    );
  });
});
