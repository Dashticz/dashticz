const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('Settings menu offers the calendar format and language in Localize', () => {
  const source = read('js/settings.js');
  assert.match(source, /settingList\['localize'\]\['calendarformat'\] = \{\}/);
  assert.match(
    source,
    /settingList\['localize'\]\['calendarlanguage'\]\['type'\] = 'select'/
  );
});

test('adding a calendar from the Device Editor writes the calendar settings', () => {
  const source = read('js/deviceeditor.js');
  assert.match(
    source,
    /\['calendarformat', 'calendarlanguage'\]\.forEach\(function \(name\)/
  );
});

test('savewidgets.php saves settings without widgets and keeps other settings', () => {
  const source = read('js/savewidgets.php');
  assert.match(
    source,
    /if \(!empty\(\$widgets\) \|\| !empty\(\$configSettings\) \|\|/
  );
  assert.match(
    source,
    /array_diff_key\(\s*\$existingSettings,\s*\$configSettings,\s*\$clearedSettings\s*\)/
  );
});

// An empty number setting (for example gm_zoomlevel, which has no default and
// no field) must not become 0 in CONFIG.js; it is left out and a value saved
// earlier is removed.
test('savewidgets.php does not write 0 for an empty number setting', () => {
  const source = read('js/savewidgets.php');
  assert.match(
    source,
    /\$type === 'number'\) \{\s*if \(\$value === null \|\| \(is_string\(\$value\) && trim\(\$value\) === ''\)\) \{\s*\$clearedSettings\[\$key\] = true;\s*continue;/
  );
});
