const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/deviceeditor.js'), 'utf8');

/* The helpers are top-level functions of an IIFE, indented two spaces, so the
   closing brace is the first '  }' line after the declaration. */
function functionSource(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf('\n  }\n', start);
  assert.ok(end > start, name);
  return source.slice(start, end + 5);
}

function objectSource(name) {
  const start = source.indexOf(`  var ${name} = {`);
  assert.ok(start >= 0, name);
  const end = source.indexOf('\n  };\n', start);
  assert.ok(end > start, name);
  return source.slice(start, end + 6);
}

function load(names, extra) {
  const context = {
    $: { trim: (text) => String(text).trim() },
    unescape,
    encodeURIComponent,
  };
  vm.createContext(context);
  vm.runInContext(
    (extra || '') +
      names.map(functionSource).join('') +
      names.map((name) => `this.${name} = ${name};`).join(''),
    context
  );
  return context;
}

test('titles are cut on bytes like the server does, without splitting a character', () => {
  const context = load(['_utf8Length', '_cutUtf8']);
  assert.equal(context._utf8Length('abc'), 3);
  assert.equal(context._utf8Length('é'), 2);
  assert.equal(context._cutUtf8('abc', 2), 'ab');
  // 60 Cyrillic letters are 120 bytes: only 50 fit in 100 bytes.
  const cut = context._cutUtf8('ж'.repeat(60), 100);
  assert.equal(Array.from(cut).length, 50);
  assert.equal(context._utf8Length(cut), 100);
  assert.equal(context._cutUtf8('a' + 'ж', 2), 'a');
});

test('LMS-only field names are reserved on an LMS block only', () => {
  const context = load(
    ['_isProtectedCustomProperty'],
    objectSource('protectedCustomDeviceProperties') +
      objectSource('lmsOnlyCustomProperties')
  );
  ['refresh', 'server', 'port', 'username', 'password', 'player'].forEach(
    (field) => {
      assert.equal(context._isProtectedCustomProperty(field, ''), false, field);
      assert.equal(context._isProtectedCustomProperty(field, 'iframe'), false);
      assert.equal(context._isProtectedCustomProperty(field, 'lms'), true);
    }
  );
  assert.equal(context._isProtectedCustomProperty('width', ''), true);
  assert.equal(
    context._isProtectedCustomProperty('constructor', 'iframe'),
    true
  );
});

test('switch values the components accept are read as on', () => {
  const context = load(['_settingIsOn']);
  [true, 1, '1', 'true', 'TRUE', 'on'].forEach((value) =>
    assert.equal(context._settingIsOn(value), true, String(value))
  );
  [false, 0, '0', 'false', '', 'no'].forEach((value) =>
    assert.equal(context._settingIsOn(value), false, String(value))
  );
});

test('a time zone offset keeps its half and quarter hours', () => {
  const context = load(['_settingRound']);
  assert.equal(context._settingRound(5.5, [-24, 24, 0.25]), 5.5);
  assert.equal(context._settingRound(5.75, [-24, 24, 0.25]), 5.75);
  assert.equal(context._settingRound(99, [-24, 24, 0.25]), 24);
  assert.equal(context._settingRound(5.5, [0, 60, 1]), 6);
});

test('font sizes outside 6-100 pass unchanged until the field is edited', () => {
  const context = load(['_parseTextFontSize']);
  assert.equal(context._parseTextFontSize(150, true), 150);
  assert.equal(context._parseTextFontSize(150), 100);
  assert.equal(context._parseTextFontSize(2), 6);
  assert.equal(context._parseTextFontSize('x'), null);
});

test('a legacy calendars list becomes the icalurl object of the component', () => {
  const context = load(['_legacyCalendarIcalurl']);
  const result = context._legacyCalendarIcalurl({
    calendars: [
      { calendar: { icalurl: 'https://a/x.ics' }, color: 'red' },
      { calendar: {} },
      { calendar: { icalurl: 'https://b/y.ics' } },
    ],
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    calendar0: { ics: 'https://a/x.ics', color: 'red' },
    calendar2: { ics: 'https://b/y.ics', color: 'white' },
  });
  assert.equal(context._legacyCalendarIcalurl({}), '');
});

test('a calendar with one named source stays an object, and the limits match saveblocks.php', () => {
  const context = load([
    '_utf8Length',
    '_calendarSourcesFromIcalurl',
    '_calendarIsMulti',
    '_readCalendarFields',
  ]);
  context._captureCalendarFields = () => {};
  const read = (sources) => context._readCalendarFields('x', {}, sources, {});

  const object = context._calendarSourcesFromIcalurl({
    Werk: { ics: 'https://a/x.ics', color: 'red' },
  });
  assert.equal(object.length, 1);
  assert.equal(context._calendarIsMulti(object), true);
  assert.deepEqual(JSON.parse(JSON.stringify(read(object).icalurl)), {
    Werk: { ics: 'https://a/x.ics', color: 'red' },
  });

  const plain = context._calendarSourcesFromIcalurl('https://a/x.ics');
  assert.equal(context._calendarIsMulti(plain), false);
  assert.equal(read(plain).icalurl, 'https://a/x.ics');

  const two = [
    { name: '1', ics: 'webcal://a/x.ics', color: 'red' },
    { name: '__proto__', ics: 'https://b/y.ics', color: 'blue' },
  ];
  const result = read(two);
  assert.equal(result.valid, true);
  assert.deepEqual(Object.keys(result.icalurl), ['1', '__proto__']);

  assert.equal(
    read([
      { name: 'a', ics: 'ftp://a/x.ics', color: 'red' },
      { name: 'b', ics: 'https://b/y.ics', color: 'red' },
    ]).reason,
    'url'
  );
  const many = [];
  for (let i = 0; i < 21; i++) {
    many.push({ name: 'c' + i, ics: 'https://a/' + i + '.ics', color: 'red' });
  }
  assert.equal(read(many).reason, 'toomany');
});

test('a pasted :port moves to the LMS port field', () => {
  const context = load(['_normalizeLmsServer', '_lmsPortFromServer']);
  assert.equal(
    context._normalizeLmsServer('http://nas.local:9001/x'),
    'nas.local'
  );
  assert.equal(context._lmsPortFromServer('http://nas.local:9001/x'), 9001);
  assert.equal(context._lmsPortFromServer('nas.local'), 0);
  assert.equal(context._lmsPortFromServer('[::1]'), 0);
});

/* The scans and the save chain need a page; these pins check the decisions
   the review asked for. */
test('the Device Editor scans keep catalog widgets, skip the topbar and read standby once', () => {
  assert.match(source, /function _catalogWidgetFromReference/);
  assert.match(source, /if \(columnKey === 'bar'\) return;/);
  assert.match(source, /columnKey\.replace\(\/\^standby\/, ''\)/);
  // a special that was seen before never falls through to the device path
  assert.match(
    source,
    /if \(special\) \{\s*if \(!seen\[special\.orderKey\]\) \{[\s\S]{0,120}?\}\s*return;\s*\}/
  );
});

test('the save chain is locked and reports a half-written save', () => {
  assert.match(source, /var saveInFlight = false;/);
  assert.match(source, /if \(saveInFlight\) return;/);
  assert.match(source, /blocksWritten = true;/);
  assert.match(source, /t\.partial_save_hint/);
});

test('quick-add popups disable their Save button before they close', () => {
  const closes = source.match(
    /\$\(this\)\.prop\('disabled', true\);\s*_hideModal\(document\.getElementById\('[a-z]+'\)\);\s*_save\(\);/g
  );
  assert.ok(closes && closes.length >= 17, String(closes && closes.length));
});

test('a slide button never sends slide or button_key as custom fields', () => {
  assert.match(
    source,
    /delete specialEntry\.custom_fields\.slide;\s*delete specialEntry\.custom_fields\.button_key;/
  );
});
