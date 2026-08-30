const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const helper = fs.readFileSync(path.join(root, 'js/garbageconfig.js'), 'utf8');
const languageFiles = {
  en: JSON.parse(fs.readFileSync(path.join(root, 'lang/en_US.json'), 'utf8')),
  nl: JSON.parse(fs.readFileSync(path.join(root, 'lang/nl_NL.json'), 'utf8')),
  fr: JSON.parse(fs.readFileSync(path.join(root, 'lang/fr_FR.json'), 'utf8')),
};
const keys = [
  'text_styling',
  'first_pickup_row',
  'pickup_rows_other',
  'font_size',
  'font_color',
  'kliko_image',
  'kliko_scale',
  'kliko_scale_help',
];

test('Garbage Widget Config reads its labels from the selected language', () => {
  assert.match(helper, /language\.garbage\.ui/);
  for (const key of keys) {
    const pattern = new RegExp("garbageUiText\\([\\s\\S]{0,80}'" + key + "'");
    assert.match(helper, pattern, 'helper must read garbage.ui.' + key);
  }
});

test('English, Dutch and French provide all Garbage Widget Config translations', () => {
  for (const [locale, data] of Object.entries(languageFiles)) {
    assert.ok(
      data.garbage && data.garbage.ui,
      locale + ' must define garbage.ui'
    );
    for (const key of keys) {
      assert.equal(
        typeof data.garbage.ui[key],
        'string',
        locale + ' must define garbage.ui.' + key
      );
      assert.ok(
        data.garbage.ui[key].trim(),
        locale + ' translation may not be empty'
      );
    }
  }
});

test('Garbage translations differ appropriately between supported languages', () => {
  assert.equal(languageFiles.en.garbage.ui.text_styling, 'Text styling');
  assert.equal(languageFiles.nl.garbage.ui.text_styling, 'Tekstopmaak');
  assert.equal(
    languageFiles.fr.garbage.ui.text_styling,
    'Mise en forme du texte'
  );
});
