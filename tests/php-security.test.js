const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('remote proxy endpoints use the validated fetch helper', () => {
  for (const file of [
    'vendor/dashticz/cors.php',
    'vendor/dashticz/nocache.php',
  ]) {
    const source = read(file);
    assert.match(source, /dashticz_require_same_origin\(\)/);
    assert.match(source, /dashticz_fetch_remote\(/);
    assert.doesNotMatch(source, /Access-Control-Allow-Origin:\s*\*/);
    assert.doesNotMatch(source, /file_get_contents\(\$_SERVER\["QUERY_STRING"\]\)/);
  }
});

test('calendar fetching is URL validated and does not expose stack traces', () => {
  const source = read('vendor/dashticz/ical/index.php');
  assert.match(source, /dashticz_fetch_remote\(/);
  assert.doesNotMatch(source, /debug_backtrace/);
  assert.doesNotMatch(source, /initUrl\(\$ICS/);
  assert.doesNotMatch(source, /die\(\$e\)/);
});

test('settings writes require CSRF and serialize values as JSON', () => {
  const source = read('js/savesettings.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /json_decode\(\$serializedValue/);
  assert.match(source, /file_put_contents\(\$configPath, \$newContents, LOCK_EX\)/);
  assert.match(source, /if \(file_exists\(\$configPath\)\)/);
  assert.match(source, /trim\(\$config\) !== '#EMPTY#'/);
  assert.match(source, /!file_exists\(\$configPath\) && !is_writable\(\$customDir\)/);
  assert.doesNotMatch(source, /\$newconf\.="config/);
});

test('first-run access check verifies CONFIG.js as the web server user', () => {
  const source = read('js/checkconfigaccess.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /REQUEST_METHOD.*GET/);
  assert.match(source, /is_writable\(\$configPath\)/);
  assert.match(source, /is_writable\(\$customDir\)/);
  assert.match(source, /'writable' => \$writable/);
  assert.doesNotMatch(source, /chmod|file_put_contents/);
});

test('Apache write-access installer derives the path and verifies a real write', () => {
  const installer = read('tools/install-dashticz-write-access');

  assert.match(installer, /INSTALL_DIR=.*SCRIPT_DIR\/\.\./);
  assert.match(installer, /js\/savesettings\.php/);
  assert.match(installer, /chmod 2775/);
  assert.match(installer, /runuser -u .* touch/);
  assert.doesNotMatch(installer, /sudoers/);
  assert.doesNotMatch(installer, /NOPASSWD/);
  assert.doesNotMatch(installer, /\/var\/www\/html/);
});

test('bundled Horizon remote requires POST, CSRF and a key allowlist', () => {
  const source = read('tools/switch_horizon.php');
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /\$allowedKeys = array\(/);
  assert.doesNotMatch(source, /\$_GET\['key'\]/);
});

test('blocks writer requires CSRF, POST, and generates named block definitions', () => {
  const source = read('js/saveblocks.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /file_put_contents\(\$configPath,.*LOCK_EX\)/);
  /* generates named block entries, not raw IDX arrays */
  assert.match(source, /typeof blocks/);
  assert.match(source, /typeof columns/);
  assert.match(source, /typeof screens/);
  assert.match(source, /device-editor-start/);
  assert.match(source, /widget-editor-start/);
  assert.match(source, /layout-editor-start/);
  assert.match(source, /blockKeys/);
  /* accepts both legacy bare integers and {idx,name} objects */
  assert.match(source, /is_int\(\$entry\)/);
  assert.match(source, /\$entry\['idx'\]/);
  assert.match(source, /function _chunkBlockKeysByWidth/);
  assert.match(source, /\$defaultBlockWidth = 3/);
  assert.match(source, /array_key_exists\('height'/);
  assert.match(source, /round\(\$height \/ 10\) \* 10/);
  assert.match(source, /,height:/);
  assert.doesNotMatch(source, /array_chunk\(\$blockKeys,\s*4\)/);
  /* no raw IDX-only column block from the old implementation */
  assert.doesNotMatch(source, /columns\['device_editor'\]/);
});

test('widget writer whitelists widgets and protects CONFIG.js writes', () => {
  const source = read('js/savewidgets.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /\$catalog = \[/);
  for (const id of [
    'weather',
    'garbage',
    'spotify',
    'sonarr',
    'clock',
    'calendar',
  ]) {
    assert.match(source, new RegExp(`'${id}'\\s*=>`));
  }
  assert.match(source, /Unknown widget id/);
  assert.match(source, /Unknown weather provider/);
  assert.match(source, /Unknown clock type/);
  assert.match(source, /Calendar requires a valid http\(s\) ICS URL/);
  assert.match(source, /widget-editor-start/);
  assert.match(source, /layout-editor-start/);
  assert.match(source, /blockKeys/);
  assert.match(source, /file_put_contents\(\$configPath, \$config \. "\\n", LOCK_EX\)/);
});

test('layout writer only stores safe managed block references', () => {
  const source = read('js/savelayout.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /\^\[A-Za-z_\]\[A-Za-z0-9_\]\*\$/);
  assert.match(source, /layout-editor-start/);
  assert.match(source, /\(de\|we\|le\)_col/);
  assert.match(source, /file_put_contents\(\$configPath, \$config \. "\\n", LOCK_EX\)/);
});
