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
    /if \(hasNonDefaultTheme\(\)\) \{[^}]*setProperty\('left', '70px', 'important'\)/,
    'the Kliko image is only shifted 70px to the right in non-default themes'
  );
  assert.match(
    helper,
    /removeProperty\('left'\)/,
    'the default theme must not shift the Kliko image'
  );
  assert.doesNotMatch(
    helper,
    /setProperty\('text-align'/,
    'the Garbage title alignment must come from the theme (.dt_title), not an inline override'
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
    /'js\/garbageconfig\.js'\][\s\S]*src \+ '\?t=' \+ bust/,
    'the updated Garbage helper must be loaded with a fresh cache key'
  );
});
