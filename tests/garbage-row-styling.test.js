const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const helper = fs.readFileSync(path.join(root, 'js/garbageconfig.js'), 'utf8');

test('Garbage text styling is stored per widget instead of as global config', () => {
  assert.match(helper, /row1_fontsize/);
  assert.match(helper, /row1_color/);
  assert.match(helper, /row2_fontsize/);
  assert.match(helper, /row2_color/);
  assert.match(
    helper,
    /createManagedCustomRow/,
    'row styling must be persisted through per-widget custom block fields'
  );
  assert.match(
    helper,
    /removeLegacyConfigField\(popup, key\)/,
    'the old global row styling inputs must be removed from the Garbage popup'
  );
});

test('Garbage text styling uses the same compact LMS-style layout', () => {
  assert.match(helper, /heading\.textContent = garbageUiText\('text_styling'/);
  assert.match(helper, /title: garbageUiText\('first_pickup_row'/);
  assert.match(helper, /title: garbageUiText\('pickup_rows_other'/);
  assert.match(helper, /className = 'row g-2 mb-3'/);
  assert.match(helper, /className = 'col-12 col-md-6'/);
  assert.match(helper, /form-control form-control-sm garbage-row-size-input/);
  assert.match(
    helper,
    /form-control form-control-color garbage-row-color-input/
  );
});

test('Explicit Garbage row styles override theme rules', () => {
  assert.match(helper, /--garbage-row1-font-size/);
  assert.match(helper, /--garbage-row1-color/);
  assert.match(helper, /--garbage-row2-font-size/);
  assert.match(helper, /--garbage-row2-color/);
  assert.match(
    helper,
    /font-size:var\(--garbage-row1-font-size\)!important;/,
    'row 1 font size must beat theme declarations'
  );
  assert.match(
    helper,
    /color:var\(--garbage-row1-color\)!important;/,
    'row 1 color must beat theme declarations'
  );
  assert.match(
    helper,
    /font-size:var\(--garbage-row2-font-size\)!important;/,
    'row 2+ font size must beat theme declarations'
  );
  assert.match(
    helper,
    /color:var\(--garbage-row2-color\)!important;/,
    'row 2+ color must beat theme declarations'
  );
});

test('Garbage rows are separated into first and remaining pickup rows', () => {
  assert.match(helper, /garbage-row-first/);
  assert.match(helper, /garbage-row-other/);
  assert.match(
    helper,
    /i === 0 \? 'garbage-row-first' : 'garbage-row-other'/,
    'only the first rendered pickup row may receive first-row styling'
  );
});
