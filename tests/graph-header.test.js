const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js/components/graph.js'),
  'utf8'
);

/* A custom graph header is evaluated as JavaScript after the current value of
   its devices has been filled in. A text device could contain a quote, so the
   value must be turned into a number first, not pasted into the expression. */
test('graph custom header only inserts numeric device values into its expression', () => {
  assert.ok(
    source.includes(`'parseFloat("' + parseFloat(device.currentValue) + '")'`)
  );
  assert.doesNotMatch(source, /'parseFloat\("' \+ device\.currentValue/);
});
