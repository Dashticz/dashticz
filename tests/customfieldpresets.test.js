const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'customfieldpresets.js'),
  'utf8'
);

function createRuntime() {
  function noopCollection() {
    var collection = {
      on() {
        return collection;
      },
      off() {
        return collection;
      },
      text() {
        return collection;
      },
      appendTo() {
        return collection;
      },
      remove() {
        return collection;
      },
      find() {
        return collection;
      },
      length: 0,
    };
    return collection;
  }
  function jQuery() {
    return noopCollection();
  }
  jQuery.trim = function (value) {
    return String(value == null ? '' : value).trim();
  };

  const document = {
    getElementById() {
      return null;
    },
  };
  const context = {
    $: jQuery,
    document,
    config: { language: 'en_US' },
    language: undefined,
    window: {},
    console,
  };
  context.window = context;
  vm.runInNewContext(source, context, { filename: 'customfieldpresets.js' });
  return context.DashticzCustomFieldPresets;
}

test('presetsForContext("device") (or no context) returns the full preset list, including device-only fields', () => {
  const api = createRuntime();
  const device = api.presetsForContext('device');
  assert.ok(device.length > 20, 'expected the full, unfiltered preset list');
  assert.ok(
    device.some((preset) => preset.field === 'iconOn'),
    'device-only fields like iconOn must still be present for device context'
  );
  assert.ok(
    device.some((preset) => preset.field === 'addClass'),
    'block-agnostic fields must also be present for device context'
  );
});

test('presetsForContext("widget") only returns fields explicitly marked widget: true', () => {
  const api = createRuntime();
  const widget = api.presetsForContext('widget');
  // widget is an array from the vm sandbox's own realm; rebuild it as a
  // plain array in this realm before deep-comparing (deepStrictEqual
  // otherwise flags matching-but-cross-realm arrays as unequal).
  const fields = Array.from(widget, (preset) => preset.field).sort();

  assert.deepEqual(fields, [
    'addClass',
    'backgroundimage',
    'backgroundopacity',
    'backgroundsize',
    'newwindow',
    'popup',
    'url',
  ]);

  // Device-only fields (tied to a live Domoticz device's Status/Data) must
  // never leak into the widget suggestion list.
  [
    'iconOn',
    'iconOff',
    'textOn',
    'textOff',
    'batteryThreshold',
    'showvalues',
  ].forEach((field) => {
    assert.ok(
      !fields.includes(field),
      field + ' is device-only and must not appear in the widget preset list'
    );
  });
});

test('find(field, context) respects the same widget filtering as presetsForContext', () => {
  const api = createRuntime();

  assert.equal(api.find('addClass', 'widget').field, 'addClass');
  assert.equal(api.find('iconOn', 'widget'), null);
  assert.equal(api.find('iconOn', 'device').field, 'iconOn');
  assert.equal(api.find('iconOn').field, 'iconOn'); // omitted context = unfiltered
});
