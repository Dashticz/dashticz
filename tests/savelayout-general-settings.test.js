const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const configwriterPath = path.join(__dirname, '..', 'js', 'configwriter.php');
const savelayoutPath = path.join(__dirname, '..', 'js', 'savelayout.php');

function runPhp(expression) {
  const file = path.join(
    os.tmpdir(),
    `dashticz-savelayout-${process.pid}-${Math.random().toString(36).slice(2)}.php`
  );
  fs.writeFileSync(
    file,
    `<?php\nrequire_once(${JSON.stringify(configwriterPath)});\n${expression}\n`
  );
  try {
    const result = spawnSync('php', [file], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return result.stdout;
  } finally {
    fs.unlinkSync(file);
  }
}

function sampleConfigWithSettings(startMarker, endMarker) {
  return [
    'var config = {};',
    "config['language'] = 'nl';",
    '',
    startMarker,
    "if (typeof blocks === 'undefined') var blocks = {}",
    'blocks[\'widget_owmwidget\'] = {"type":"owmwidget","title":"Weather","width":6};',
    '',
    'config["owm_api"] = "abcd1234efgh5678";',
    'config["garbage_company"] = "hvc";',
    endMarker,
    '',
  ].join('\n');
}

test('savelayout.php passes a syntax check', () => {
  const result = spawnSync('php', ['-l', savelayoutPath], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

// Companion to tests/configwriter-grid-settings.test.js (discussion #271):
// the column-layout editor (savelayout.php, used whenever a screen is not
// in grid mode) had the exact same bug as the grid-layout editor. Both
// its normal-screen branch and its standby (screen 0) branch called
// configwriter_upsert_root_config_settings() before removing the editor
// sections, so the "preserved" setting got rewritten in place - still
// inside the section - and was deleted along with it a moment later.
test('saving a normal-screen column layout preserves general widget settings', () => {
  const sampleConfig = sampleConfigWithSettings(
    '// [widget-editor-start]',
    '// [widget-editor-end]'
  );
  const encoded = Buffer.from(sampleConfig, 'utf8').toString('base64');
  const output = runPhp(`
$config = base64_decode('${encoded}');

// Mirrors savelayout.php's normal-screen branch (screenNumber >= 1) in the
// fixed order: remove the editor sections first, then upsert the settings.
list($startMarker, $endMarker) = configwriter_editor_markers('widget', 1);
$widgetSettings = configwriter_extract_section_config_settings($config, $startMarker, $endMarker);
$config = configwriter_remove_editor_sections($config, 1);
$config = configwriter_upsert_root_config_settings($config, $widgetSettings, true);
echo $config;
`);

  assert.match(output, /config\["owm_api"\]\s*=\s*"abcd1234efgh5678";/);
  assert.match(output, /config\["garbage_company"\]\s*=\s*"hvc";/);
  assert.doesNotMatch(output, /\[widget-editor-start\]/);
});

test('saving the standby (screen 0) column layout preserves general widget settings', () => {
  const sampleConfig = sampleConfigWithSettings(
    '// [widget-editor-standby-start]',
    '// [widget-editor-standby-end]'
  );
  const encoded = Buffer.from(sampleConfig, 'utf8').toString('base64');
  const output = runPhp(`
$config = base64_decode('${encoded}');

// Mirrors savelayout.php's standby branch (screenNumber === 0) in the
// fixed order: remove the editor sections first, then upsert the settings.
list($startMarker, $endMarker) = configwriter_editor_markers('widget', 0);
$widgetSettings = configwriter_extract_section_config_settings($config, $startMarker, $endMarker);
$config = configwriter_remove_editor_sections($config, 0);
$config = configwriter_remove_section($config, '// [standby-editor-start]', '// [standby-editor-end]');
$config = configwriter_upsert_root_config_settings($config, $widgetSettings, true);
echo $config;
`);

  assert.match(output, /config\["owm_api"\]\s*=\s*"abcd1234efgh5678";/);
  assert.match(output, /config\["garbage_company"\]\s*=\s*"hvc";/);
  assert.doesNotMatch(output, /\[widget-editor-standby-start\]/);
});
