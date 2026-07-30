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
  assert.match(source, /\$customMode/);
  assert.doesNotMatch(source, /\$newconf\.="config/);
});

test('config mode writer only accepts custom or wizard', () => {
  const source = read('js/saveconfigmode.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /config_mode/);
  assert.match(source, /custom/);
  assert.match(source, /wizard/);
  assert.match(source, /configwriter_write_config/);
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
  const writer = read('js/configwriter.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /configwriter_write_config/);
  /* generates named block entries, not raw IDX arrays */
  assert.match(writer, /typeof blocks/);
  assert.match(writer, /typeof columns/);
  assert.match(writer, /typeof screens/);
  assert.match(source, /configwriter_editor_markers\('device'/);
  assert.match(source, /configwriter_editor_markers\('widget'/);
  assert.match(writer, /function configwriter_editor_markers/);
  assert.match(source, /blockKeys/);
  /* accepts both legacy bare integers and {idx,name} objects */
  assert.match(source, /is_int\(\$entry\)/);
  assert.match(source, /\$entry\['idx'\]/);
  assert.match(writer, /function configwriter_chunk_items_by_width/);
  assert.match(source, /array_key_exists\('height'/);
  assert.match(source, /round\(\$height \/ 10\) \* 10/);
  assert.match(writer, /height/);
  assert.doesNotMatch(source, /array_chunk\(\$.*,\s*4\)/);
  /* no raw IDX-only column block from the old implementation */
  assert.doesNotMatch(source, /columns\['device_editor'\]/);
});

test('widget writer whitelists widgets and protects CONFIG.js writes', () => {
  const source = read('js/savewidgets.php');
  const writer = read('js/configwriter.php');
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
    'secpanel',
    'publictransport',
    'trafficinfo',
    'alarmmeldingen',
    'camera',
    'map',
    'longfonds',
    'moon',
    'news',
  ]) {
    assert.match(source, new RegExp(`'${id}'\\s*=>`));
  }
  assert.match(source, /weather_icons/);
  assert.match(source, /showGust/);
  assert.match(source, /allowedWeatherIcons/);
  assert.match(source, /Unknown widget id/);
  assert.match(source, /Unknown weather provider/);
  assert.match(source, /Unknown clock type/);
  assert.match(source, /Calendar requires a valid http\(s\) ICS URL/);
  assert.match(source, /Camera requires a valid http\(s\) image URL/);
  assert.match(source, /A camera widget supports up to 12 cameras/);
  assert.match(source, /\$props\['cameras'\] = \$widget\['cameras'\]/);
  assert.match(writer, /is_array\(\$value\)/);
  assert.match(source, /configwriter_editor_markers\('widget'/);
  assert.match(source, /blockKeys/);
  assert.match(source, /configwriter_write_config/);
});

test('layout writer stores safe references in one grouped dashboard section', () => {
  const source = read('js/savelayout.php');
  const writer = read('js/configwriter.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /\^\[A-Za-z_\]\[A-Za-z0-9_\]\*\$/);
  assert.match(source, /configwriter_editor_markers\(\s*'dashboard'/);
  assert.match(source, /configwriter\.php/);
  assert.match(source, /configwriter_extract_section_config_settings/);
  assert.match(source, /configwriter_extract_wrapped_section/);
  assert.match(source, /configwriter_remove_editor_sections/);
  assert.match(source, /configwriter_upsert_root_config_settings/);
  assert.match(source, /configwriter_build_layout_section/);
  assert.match(source, /configwriter_parse_screen_number/);
  assert.match(writer, /function configwriter_upsert_root_config_settings/);
  assert.match(writer, /function configwriter_extract_wrapped_section/);
  assert.match(writer, /function configwriter_editor_markers/);
  assert.match(writer, /configwriter_section_header\('BLOCKS'\)/);
  assert.match(writer, /configwriter_section_header\('COLUMNS'\)/);
  assert.match(writer, /configwriter_section_header\('SCREENS'\)/);
  assert.match(writer, /\(de\|we\|le\)_col/);
  assert.match(writer, /configwriter_column_prefix\('le'/);
  assert.match(source, /configwriter_write_config/);
});

test('device and widget writers keep the grouped layout until consolidation', () => {
  const devices = read('js/saveblocks.php');
  const widgets = read('js/savewidgets.php');
  for (const source of [devices, widgets]) {
    assert.doesNotMatch(
      source,
      /configwriter_remove_section\(\s*\$config,\s*['"]\/\/ \[layout-editor-start\]/
    );
    assert.doesNotMatch(
      source,
      /configwriter_remove_section\(\s*\$config,\s*['"]\/\/ \[dashboard-editor-start\]/
    );
  }
});

test('layout writer keeps tall blocks on the same full-width grid', () => {
  const writer = read('js/configwriter.php');
  const layout = read('js/savelayout.php');
  const styles = read('css/creative.css');
  assert.match(writer, /function configwriter_pack_columns_by_height/);
  assert.match(writer, /rowsBeside/);
  assert.match(writer, /Keep every tile in one full-width parent column/);
  assert.match(layout, /configwriter_build_layout_section/);
  assert.match(layout, /height/);
  assert.match(styles, /display: contents/);
  assert.match(styles, /id\^=\"block_\"/);
});

test('widget writer preserves existing settings when none are posted', () => {
  const source = read('js/savewidgets.php');
  const writer = read('js/configwriter.php');
  assert.match(source, /configwriter_extract_section_config_settings/);
  assert.match(source, /existingSettings/);
  assert.match(writer, /function configwriter_extract_section_config_settings/);
  assert.match(writer, /function configwriter_emit_config_settings/);
});

test('git update endpoint allowlists branches and requires CSRF', () => {
  const source = read('js/update.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /branchMap/);
  assert.match(source, /'beta'\s*=>\s*'beta'/);
  assert.match(source, /'main'\s*=>\s*'master'/);
  assert.match(source, /pull',\s*'--ff-only'/);
  assert.match(source, /bypass_shell/);
  assert.match(source, /safe\.directory/);
  assert.match(source, /dashticz_git_writable_check/);
  assert.match(source, /Permission denied/);
  assert.doesNotMatch(source, /shell_exec|exec\(|passthru|system\(/);
});

test('standby editor section removal does not target screen 1', () => {
  const writer = read('js/configwriter.php');
  // Previously max(1, (int)$screenNumber) turned standby (0) into screen 1
  // and deleted the dashboard section.
  assert.match(
    writer,
    /function configwriter_remove_editor_sections\(\$config, \$screenNumber = 1\)/
  );
  assert.match(writer, /Screen 0 = standby; do not coerce to 1/);
  assert.doesNotMatch(
    writer,
    /function configwriter_remove_editor_sections[\s\S]{0,200}max\(1,\s*\(int\)\$screenNumber\)/
  );
  assert.match(writer, /\$n === 0[\s\S]{0,80}editor-standby-start/);
});

test('settings writer leaves the standby layout untouched', () => {
  const source = read('js/savesettings.php');
  assert.doesNotMatch(source, /standby_blocks/);
  assert.doesNotMatch(source, /configwriter_replace_standby_section/);
  assert.doesNotMatch(source, /configwriter\.php/);
});

test('background list endpoint safely exposes bundled and custom images', () => {
  const source = read('js/listbackgrounds.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /REQUEST_METHOD.*GET/);
  assert.match(source, /preg_match\(\'\/\^\(bg/);
  assert.match(source, /\$customDir = \$imgDir \. DIRECTORY_SEPARATOR \. 'custom'/);
  assert.match(source, /preg_match\(\'\/\^\(bg_\[a-z0-9\]/);
  assert.match(source, /\$images\[\] = 'img\/custom\/' \. \$entry/);
  assert.match(source, /is_link\(\$full\)/);
  assert.doesNotMatch(source, /\$_GET\[/);
  assert.doesNotMatch(source, /\$_POST\[/);
});

test('screens writer can add extra screens with CSRF protection', () => {
  const source = read('js/savescreens.php');
  const writer = read('js/configwriter.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /configwriter_replace_screens_section/);
  assert.match(source, /Only extra screens/);
  assert.match(writer, /function configwriter_replace_screens_section/);
  assert.match(writer, /function configwriter_emit_new_screen/);
  assert.match(writer, /screens-editor-start/);
});
