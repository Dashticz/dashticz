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

test('xmltv proxy validates remote URLs and keeps cache handling local', () => {
  const source = read('vendor/dashticz/xmltv.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_validate_remote_url\(\$url,\s*true\)/);
  assert.match(source, /dashticz_fetch_remote\(\$url,\s*52428800,\s*3,\s*true\)/);
  assert.match(source, /sha1\(\$url\)/);
  assert.match(source, /86400/);
  assert.match(source, /gzdecode/);
  assert.match(source, /ZipArchive/);
  assert.match(source, /file_put_contents\(\$tmpFile,\s*\$xml,\s*LOCK_EX\)/);
  assert.doesNotMatch(source, /shell_exec|exec\(|passthru|system\(/);
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
  const writer = read('js/configwriter.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /json_decode\(\$serializedValue/);
  assert.match(source, /configwriter_read_config/);
  assert.match(source, /configwriter_upsert_root_config_settings/);
  assert.match(source, /configwriter_write_config/);
  assert.match(writer, /function configwriter_upsert_root_config_settings/);
  assert.match(writer, /function configwriter_remove_config_key/);
  assert.match(writer, /PREG_OFFSET_CAPTURE/);
  assert.doesNotMatch(source, /\$rows/);
  assert.doesNotMatch(source, /unset\(\$rows/);
});

test('every configuration editor writes to the active safe cfg file', () => {
  const writer = read('js/configwriter.php');
  assert.match(writer, /function configwriter_resolve_config_path/);
  assert.match(writer, /basename\(\$cfgFile\) !== \$cfgFile/);
  assert.match(writer, /\^\[A-Za-z0-9_-\]\+\\\.js\$/);

  [
    'saveblocks.php',
    'savewidgets.php',
    'savelayout.php',
    'savegridlayout.php',
    'saveconfigmode.php',
    'savescreens.php',
    'savesettings.php',
  ].forEach((file) => {
    assert.match(
      read('js/' + file),
      /configwriter_resolve_config_path\(\$customDir\)/,
      file + ' must honor ?cfg='
    );
  });
});

test('config mode writer only accepts custom or wizard', () => {
  const source = read('js/saveconfigmode.php');
  const writer = read('js/configwriter.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /config_mode/);
  assert.match(source, /custom/);
  assert.match(source, /wizard/);
  assert.match(source, /configwriter_set_config_mode/);
  assert.match(writer, /function configwriter_set_config_mode/);
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
  const installer = read('tools/install-dashticz-write-access.sh');

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
  assert.match(source, /configwriter_make_device_block_key/);
  assert.match(source, /\$keyCollisionConfig = configwriter_remove_editor_sections/);
  assert.match(source, /configwriter_editor_markers\(\s*'grid-layout'/);
  assert.match(source, /extract_declared_block_refs\(\$keyCollisionConfig\)/);
  assert.match(writer, /function configwriter_make_device_block_key/);
  assert.match(writer, /'device_'\s*\.\s*\(int\)\$idx/);
  assert.match(writer, /isset\(\$device\['title'\]\)[\s\S]*\$props\['title'\]/);
  assert.match(writer, /\$isGroup && \(!isset\(\$device\['title'\]\)/);
  assert.match(source, /\$blocksOnly/);
  /* accepts both legacy bare integers and {idx,name} objects */
  assert.match(source, /is_int\(\$entry\)/);
  assert.match(source, /\$entry\['idx'\]/);
  assert.match(writer, /function configwriter_chunk_items_by_width/);
  assert.match(source, /array_key_exists\('height'/);
  assert.match(source, /round\(\$height \/ 10\) \* 10/);
  assert.match(writer, /height/);
  /* Device Editor helper blocks are explicitly validated and whitelisted. */
  assert.match(source, /in_array\(\$entry\['kind'\], \['dummy', 'title', 'custom'\], true\)/);
  assert.match(source, /\^dummyblock_/);
  assert.match(source, /Existing hand-written blocktitle keys remain editable/);
  assert.match(source, /\^\[A-Za-z_\$\]/);
  assert.match(source, /positive integer idx/);
  assert.match(source, /configwriter_special_block_props/);
  assert.match(source, /custom_fields/);
  assert.match(source, /Invalid or reserved custom device field/);
  assert.match(source, /_validate_custom_device_value/);
  assert.match(writer, /\$device\['custom_fields'\]/);
  assert.match(source, /\$height = \$kind === 'title' \? 120 : null/);
  assert.match(source, /Special block key already exists/);
  assert.match(source, /\$device\['preserveExisting'\] = in_array/);
  assert.match(source, /if \(!empty\(\$device\['preserveExisting'\]\)\)/);
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
  assert.match(source, /custom_fields/);
  assert.match(source, /Invalid or reserved custom widget field/);
  // Checkbox/core widget properties duplicated in custom_fields are ignored;
  // truly dangerous prototype keys remain rejected.
  assert.match(source, /\$managedCustomFields = \[/);
  assert.match(source, /in_array\(\$fieldKey, \$managedCustomFields, true\)/);
  assert.match(source, /\$dangerousCustomFields = \['__proto__', 'prototype', 'constructor'\]/);
  assert.match(source, /legacy custom icons/);
  assert.match(source, /_validate_custom_widget_value/);
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
    'xmltvguide',
    'radio',
    'log',
    'sunrise',
    'owm',
    'timegraph',
  ]) {
    assert.match(source, new RegExp(`'${id}'\\s*=>`));
  }
  assert.match(source, /weather_icons/);
  assert.match(source, /showGust/);
  assert.match(source, /allowedWeatherIcons/);
  assert.match(source, /'garbage_maxdays'\s*=>\s*'number'/);
  assert.match(source, /'calendar_maxitems'\s*=>\s*'number'/);
  assert.match(source, /\$props\['maxdays'\] = \$widget\['maxdays'\]/);
  assert.match(source, /\$props\['maxitems'\] = \$widget\['maxitems'\]/);
  assert.match(source, /\$props\['aspectratio'\] = \$widget\['aspectratio'\]/);
  assert.match(source, /Unknown widget id/);
  assert.match(source, /Unknown weather provider/);
  assert.match(source, /Unknown clock type/);
  assert.match(source, /Calendar requires a valid http\(s\) ICS URL/);
  assert.match(source, /Calendar requires one to twenty calendar sources/);
  assert.match(source, /foreach \(\$icalurl as \$name => \$source\)/);
  assert.match(source, /Camera requires a valid http\(s\) image URL/);
  assert.match(source, /A camera widget supports up to 12 cameras/);
  assert.match(source, /\$props\['cameras'\] = \$widget\['cameras'\]/);
  assert.match(writer, /is_array\(\$value\)/);
  assert.match(source, /configwriter_editor_markers\('widget'/);
  assert.match(source, /blockKeys/);
  assert.match(source, /\$blocksOnly/);
  assert.match(source, /configwriter_write_config/);
});

test('custom CSS writer only manages theme variables', () => {
  const source = read('js/savecustomcss.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /array_key_exists\('vars', \$data\)/);
  assert.match(source, /if \(\$updateVars\)/);
  assert.match(source, /dashticz-theme-vars/);
  assert.doesNotMatch(source, /deviceAlignments/);
  assert.doesNotMatch(source, /dashticz-device-align/);
  assert.doesNotMatch(source, /text-align/);
  assert.match(source, /LOCK_EX/);
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
  assert.match(
    source,
    /configwriter_upsert_root_config_settings\([\s\S]*?if \(\$screenNumber === 0\)/
  );
  assert.doesNotMatch(
    source,
    /if \(\$screenNumber === 1\)\s*\{[\s\S]*?configwriter_upsert_root_config_settings/
  );
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

test('grid layout writer validates and stores positions without column packing', () => {
  const source = read('js/savegridlayout.php');
  const writer = read('js/configwriter.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /CONTENT_LENGTH/);
  assert.match(source, /1048576/);
  assert.match(source, /\^\[A-Za-z_\]\[A-Za-z0-9_\]\*\$/);
  assert.match(source, /FILTER_VALIDATE_INT/);
  assert.match(source, /configwriter_extract_declared_block_refs/);
  assert.match(source, /configwriter_remove_editor_sections\(\$config, \$screenNumber\)/);
  assert.match(source, /\/\/ \[standby-editor-start\]/);
  assert.match(source, /propsJson/);
  assert.match(source, /is_object\(\$decodedProps\)/);
  assert.match(source, /configwriter_make_block_key/);
  assert.match(source, /configwriter_set_config_mode/);
  // TAAK1 (issue #98 follow-up): a plain repositioning within this screen's
  // grid must also clone when the ref is owned by another screen, not just
  // on a Wizard-conversion clone request - except for streamplayer/sunrise,
  // which are dispatched by their literal block key matching a registered
  // component name, so cloning them under a renamed key would make the
  // clone invisible to every component's dispatch check. 'log' used to be
  // exempted the same way, but now carries an explicit type:'log' so it can
  // be cloned per screen too (see savewidgets.php's _widgetBlockProps).
  assert.match(
    source,
    /\$forceClone = !configwriter_is_component_dispatched_key\(\$ref\)\s*\n\s*&& \(\(\$screenNumber === 0 && !empty\(\$entry\['clone'\]\)\) \|\| \$ownedByOtherScreen\);/
  );
  assert.match(writer, /function configwriter_is_component_dispatched_key\(\$key\)/);
  assert.match(
    writer,
    /return in_array\(\$key, \['streamplayer', 'sunrise'\], true\);/
  );
  assert.match(source, /configwriter_normalise_grid_position/);
  assert.match(source, /configwriter_build_grid_layout_section/);
  assert.match(source, /configwriter_editor_markers\(\s*'grid-layout'/);
  assert.match(
    source,
    /empty\(\$items\) && !isset\(\$data\['configMode'\]\)/
  );
  assert.match(source, /configwriter_extract_numbered_screens/);
  assert.match(source, /configwriter_remove_numbered_screen_and_compact/);
  assert.match(source, /'removedScreen'\s*=>\s*\$screenNumber/);
  assert.match(source, /configwriter_write_config/);
  assert.doesNotMatch(source, /configwriter_pack_columns_by_height/);
  assert.doesNotMatch(source, /configwriter_build_layout_section/);
  assert.match(writer, /function configwriter_extract_declared_block_refs/);
  assert.match(writer, /PREG_OFFSET_CAPTURE/);
  assert.match(writer, /\$objectStart/);
  assert.match(writer, /\$depth\+\+/);
  assert.doesNotMatch(writer, /\\\{\[\^;\]\*\\\}/);
  assert.match(writer, /function configwriter_normalise_grid_position/);
  assert.match(writer, /function configwriter_build_grid_layout_section/);
  assert.match(writer, /function configwriter_extract_numbered_screens/);
  assert.match(writer, /function configwriter_remove_numbered_screen_and_compact/);
  assert.match(writer, /\['device', 'widget', 'layout', 'dashboard', 'grid-layout'\]/);
  assert.match(writer, /\(de\|we\|le\)_s/);
  assert.match(writer, /isset\(\$item\['props'\]\)/);
  assert.match(writer, /isset\(\$item\['propsLiteral'\]\)/);
  assert.match(writer, /\$target \. "\['layout'\] = 'grid'/);
  assert.match(writer, /blocks\['.*'\]\['grid'\]/);
  assert.match(writer, /standby_screen/);
  assert.doesNotMatch(source, /not available for standby/);
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
  assert.match(source, /configwriter_upsert_root_config_settings/);
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

test('theme list endpoint exposes only valid direct theme directories', () => {
  const source = read('js/listthemes.php');

  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /REQUEST_METHOD.*GET/);
  assert.match(source, /realpath\(__DIR__ \. '\/\.\.\/themes'\)/);
  assert.match(source, /preg_match\('\/\^\[a-z0-9\]\[a-z0-9_-\]\*\$\/i'/);
  assert.match(source, /\$entry \. '\.css'/);
  assert.match(source, /is_link\(\$themeDir\)/);
  assert.match(source, /is_link\(\$themeCss\)/);
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
