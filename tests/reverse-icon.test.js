const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function fakeDiv() {
  const classes = new Set();
  return {
    classes,
    toggleClass(name, on) {
      if (on) classes.add(name);
      else classes.delete(name);
      return this;
    },
  };
}

test('applyBlockIconStyle toggles dt-icon-reverse from block.reverseicon', () => {
  const source = read('js/blocks.js');
  const match = source.match(/function applyBlockIconStyle[\s\S]*?\n}\n/);
  assert.ok(match, 'applyBlockIconStyle exists');
  const context = {};
  vm.runInNewContext(match[0] + '\nthis.fn = applyBlockIconStyle;', context);

  const div = fakeDiv();
  context.fn(div, { reverseicon: true });
  assert.ok(div.classes.has('dt-icon-reverse'));
  context.fn(div, { reverseicon: false });
  assert.ok(!div.classes.has('dt-icon-reverse'));
  context.fn(div, {});
  assert.ok(!div.classes.has('dt-icon-reverse'));
});

test('device blocks and components both apply the reverse class', () => {
  assert.match(read('js/blocks.js'), /applyBlockIconStyle\(\$div, block\);/);
  assert.match(read('js/dashticz.js'), /'dt-icon-reverse'/);
});

test('CSS swaps the dimmed state for .dt-icon-reverse', () => {
  const css = read('css/creative.css');
  assert.match(css, /\.off\.icon\s*{\s*opacity: 0\.4 !important;/);
  assert.match(
    css,
    /\.dt-icon-reverse \.off\.icon\s*{\s*opacity: 1 !important;/
  );
  assert.match(
    css,
    /\.dt-icon-reverse \.on\.icon\s*{\s*opacity: 0\.4 !important;/
  );
});

test('Device Editor offers Reverse and saves it as the reverseicon custom field', () => {
  const src = read('js/deviceeditor.js');
  assert.match(src, /configOptions\.push\('reverseicon'\)/);
  assert.match(src, /reverseicon: configured\.reverseicon === true/);
  assert.match(src, /reverseicon: definition\.reverseicon === true/);
  assert.match(src, /reverseicon: true,\s*\n\s*__proto__/);
  const fn = src.match(/function _applyReverseIconField[\s\S]*?\n {2}}\n/);
  assert.ok(fn, '_applyReverseIconField exists');
  const context = {};
  vm.runInNewContext(fn[0] + '\nthis.fn = _applyReverseIconField;', context);
  const on = { reverseicon: false, other: 1 };
  context.fn(on, { reverseicon: true });
  assert.equal(on.reverseicon, true);
  const off = { reverseicon: true, other: 1 };
  context.fn(off, { reverseicon: false });
  assert.deepEqual(Object.keys(off), ['other']);
  assert.equal(src.split('_applyReverseIconField(').length - 1, 3);
});
