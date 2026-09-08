const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const configwriterPath = path.join(__dirname, '..', 'js', 'configwriter.php');
const savegridlayoutPath = path.join(
  __dirname,
  '..',
  'js',
  'savegridlayout.php'
);

function runPhp(expression) {
  const file = path.join(
    os.tmpdir(),
    `dashticz-configwriter-${process.pid}-${Math.random().toString(36).slice(2)}.php`
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

test('configwriter.php passes a syntax check', () => {
  const result = spawnSync('php', ['-l', configwriterPath], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('savegridlayout.php passes a syntax check', () => {
  const result = spawnSync('php', ['-l', savegridlayoutPath], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

// Regression test for discussion #271: general widget settings (OpenWeatherMap,
// Garbage collection, Google Maps, XMLTV API keys/config, saved via the Widget
// Editor) disappeared from CONFIG.js the moment a grid layout was saved
// afterwards, even though the widget-specific block properties stayed intact.
//
// Root cause: savegridlayout.php extracts these settings from the
// widget-editor section, then relies on configwriter_upsert_root_config_settings()
// to re-home them onto the root config before the section is deleted.
// configwriter_upsert_root_config_settings() prefers to update an existing
// simple `config['key'] = value;` line in place rather than appending a new
// one. While the widget-editor section had not been removed yet, that
// in-place match found the *old* line still sitting inside the section and
// rewrote it there - so the "preserved" value was deleted a moment later
// along with the whole section, and no new line was ever appended elsewhere.
//
// The fix removes the editor sections first, so the in-place match can no
// longer find the settings inside a section that's already gone, forcing
// configwriter_upsert_root_config_settings() onto its append path instead.
test('saving a grid layout preserves general widget settings instead of deleting them', () => {
  const sampleConfig = [
    'var config = {};',
    "config['language'] = 'nl';",
    '',
    '// [widget-editor-start]',
    "if (typeof blocks === 'undefined') var blocks = {}",
    'blocks[\'widget_owmwidget\'] = {"type":"owmwidget","title":"Weather","width":6};',
    '',
    'config["owm_api"] = "abcd1234efgh5678";',
    'config["garbage_company"] = "hvc";',
    'config["xmltv_url"] = "https://example.invalid/guide.xml";',
    '// [widget-editor-end]',
    '',
  ].join('\n');

  const encoded = Buffer.from(sampleConfig, 'utf8').toString('base64');
  const output = runPhp(`
$config = base64_decode('${encoded}');

// Mirrors the exact sequence savegridlayout.php runs for screen 1.
list($startMarker, $endMarker) = configwriter_editor_markers('widget', 1);
$widgetSettings = configwriter_extract_section_config_settings($config, $startMarker, $endMarker);
$config = configwriter_remove_editor_sections($config, 1);
$config = configwriter_upsert_root_config_settings($config, $widgetSettings, true);
echo $config;
`);

  assert.match(output, /config\["owm_api"\]\s*=\s*"abcd1234efgh5678";/);
  assert.match(output, /config\["garbage_company"\]\s*=\s*"hvc";/);
  assert.match(
    output,
    /config\["xmltv_url"\]\s*=\s*"https:\/\/example\.invalid\/guide\.xml";/
  );
  // The section that used to hold these settings must actually be gone -
  // otherwise this test would trivially pass by never having removed anything.
  assert.doesNotMatch(output, /\[widget-editor-start\]/);
  assert.doesNotMatch(output, /\[widget-editor-end\]/);
});

test('the old (buggy) call order loses general widget settings, demonstrating the bug this fixes', () => {
  const sampleConfig = [
    'var config = {};',
    "config['language'] = 'nl';",
    '',
    '// [widget-editor-start]',
    "if (typeof blocks === 'undefined') var blocks = {}",
    'blocks[\'widget_owmwidget\'] = {"type":"owmwidget","title":"Weather","width":6};',
    '',
    'config["owm_api"] = "abcd1234efgh5678";',
    '// [widget-editor-end]',
    '',
  ].join('\n');

  const encoded = Buffer.from(sampleConfig, 'utf8').toString('base64');
  const output = runPhp(`
$config = base64_decode('${encoded}');

// The pre-fix order: upsert (which rewrites the setting IN PLACE, still
// inside the section) before removing the section.
list($startMarker, $endMarker) = configwriter_editor_markers('widget', 1);
$widgetSettings = configwriter_extract_section_config_settings($config, $startMarker, $endMarker);
$config = configwriter_upsert_root_config_settings($config, $widgetSettings, true);
$config = configwriter_remove_editor_sections($config, 1);
echo $config;
`);

  // This asserts the historical bug's behaviour so the fix's commit can't be
  // silently reverted without this test catching it.
  assert.doesNotMatch(output, /config\["owm_api"\]/);
});
