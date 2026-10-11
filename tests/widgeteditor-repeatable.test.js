const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js/widgeteditor.js'),
  'utf8'
);

/* Blocks such as a second iframe or camera map to the same catalog item as the
   first one. Only the first may be managed by the Widget Editor, otherwise two
   layout items get the same block reference (grid: 400 "Duplicate grid block
   reference."). */
test('widget editor manages only the first block of a catalog kind', () => {
  assert.match(source, /if \(!item \|\| selectedWidgets\[item\.id\]\) return;/);
  assert.match(
    source,
    /if \(item && selectedWidgets\[item\.id\]\) item = null;/
  );
});

test('widget editor saves layout items of other blocks of the same kind unchanged', () => {
  assert.equal(
    (source.match(/if \(_isManagedLayoutItem\(item\)\) \{/g) || []).length,
    2
  );
  assert.doesNotMatch(
    source,
    /layoutOrder\.forEach\(function \(item\) \{\s+if \(item\.widgetId\) \{/
  );
});
