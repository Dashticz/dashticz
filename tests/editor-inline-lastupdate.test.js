const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

// An inline grid block must pass the same html/iframe checks as saveblocks.php.
test('savegridlayout.php checks htmlfile and frameurl of an inline block', () => {
  const source = read('js/savegridlayout.php');
  assert.match(
    source,
    /property_exists\(\$decodedProps, 'htmlfile'\)[\s\S]*?Enter a valid html filename/
  );
  assert.match(
    source,
    /property_exists\(\$decodedProps, 'frameurl'\)[\s\S]*?Enter a valid iFrame URL/
  );
});

// last_update:false on a block overrides a global true and must survive a
// Widget Editor save; a block without the property keeps following the global.
test('Widget Editor keeps an explicit last_update false', () => {
  const editor = read('js/widgeteditor.js');
  assert.match(
    editor,
    /options\.last_update =\s*typeof definition\.last_update === 'undefined'/
  );
  assert.match(editor, /options\.hide_data = !!definition\.hide_data;/);
  assert.match(
    editor,
    /if \(typeof blockOptions\.last_update !== 'undefined'\) \{\s*entry\.last_update = blockOptions\.last_update === true;/
  );
  const writer = read('js/savewidgets.php');
  assert.match(
    writer,
    /if \(isset\(\$widget\['last_update'\]\)\) \{\s*\$props\['last_update'\] = \$widget\['last_update'\] === true;/
  );
});
