const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css/garbageconfig.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('Garbage Kliko settings are forced below the text styling section', () => {
  assert.match(css, /\.garbage-text-style-section/);
  assert.match(css, /\.garbage-kliko-scale-fields/);
  assert.match(css, /grid-column:\s*1\s*\/\s*-1/);
  assert.match(css, /flex:\s*0 0 100%/);
  assert.match(css, /width:\s*100%/);
  assert.match(index, /css\/garbageconfig\.css\?t=1/);
});
