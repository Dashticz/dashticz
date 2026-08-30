const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

test('Garbage icon and Kliko layout enhancements stay available', () => {
  const helper = fs.readFileSync(
    path.join(root, 'js/garbageconfig.js'),
    'utf8'
  );
  const garbage = fs.readFileSync(
    path.join(root, 'js/components/garbage.js'),
    'utf8'
  );
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  assert.match(
    helper,
    /\[data-cfg-key="garbage_company"\]/,
    'the helper must only act on the Garbage Widget Config popup'
  );
  assert.match(
    helper,
    /data-generated-icon['"],\s*['"]false/,
    'the selected Garbage Font Awesome icon must be marked explicit before save'
  );
  assert.match(
    helper,
    /var SCALE_FIELD = 'kliko_scale'/,
    'Garbage blocks must use one per-widget Kliko scale percentage'
  );
  assert.match(
    helper,
    /removeManagedCustomRow\(popup, 'kliko_width'\)/,
    'the previous pixel width field must be removed from the editor'
  );
  assert.match(
    helper,
    /removeManagedCustomRow\(popup, 'kliko_height'\)/,
    'the previous pixel height field must be removed from the editor'
  );
  assert.match(
    helper,
    /setProperty\('left', '70px', 'important'\)/,
    'the Kliko image must be shifted 70px to the right'
  );
  assert.match(
    helper,
    /setProperty\('text-align', 'left', 'important'\)/,
    'the Garbage title must be left aligned'
  );
  assert.match(
    helper,
    /'scale\(' \+ scale \/ 100 \+ '\)'/,
    'the Kliko must be proportionally scaled from one percentage value'
  );
  assert.match(
    helper,
    /garbage-row-first\{font-weight:700!important;/,
    'the first collection row must stay bold'
  );
  assert.match(
    garbage,
    /img\/garbage\/kliko\.png/,
    'the existing Garbage kliko image must remain in the component'
  );
  assert.match(
    garbage,
    /me\.block\.icon_use_colors/,
    'the existing dynamic Garbage icon color/image behavior must remain intact'
  );
  assert.match(
    index,
    /<script src="js\/garbageconfig\.js\?t=7"><\/script>/,
    'the updated Garbage helper must be loaded with a fresh cache key'
  );
});
