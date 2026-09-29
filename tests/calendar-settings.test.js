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
    /if \(!empty\(\$widgets\) \|\| !empty\(\$configSettings\)\)/
  );
  assert.match(
    source,
    /array_diff_key\(\$existingSettings, \$configSettings\)/
  );
});
