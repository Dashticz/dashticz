const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

/* Source text of one top-level function declaration of a file, so the real
   helpers (choose, isDefined, number_format) are used and not copies. */
function functionSource(file, name) {
  const source = read(file);
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} in ${file}`);
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function loadThermostat(overrides) {
  const requests = [];
  const rendered = [];
  const context = {
    settings: { timeformat: 'HH:mm', setpoint_min: 8, setpoint_max: 28 },
    _TEMP_SYMBOL: '°C',
    _THOUSAND_SEPARATOR: ',',
    _DECIMAL_POINT: '.',
    moment: () => ({ format: () => '12:00' }),
    titleAndValueSwitch: () => false,
    getBlockTitle: (block) => block.title,
    showUpdateInformation: () => false,
    templateEngine: {
      load: () => ({
        then: (callback) => callback((data) => (rendered.push(data), 'html')),
      }),
    },
    DT_function: { promptPassword: () => true },
    Domoticz: {
      syncRequest: (idx, query) => requests.push([idx, query]),
    },
    ...overrides,
  };
  vm.createContext(context);
  for (const [file, name] of [
    ['js/dt_function.js', 'choose'],
    ['js/functions.js', 'isDefined'],
    ['js/functions.js', 'number_format'],
  ]) {
    vm.runInContext(functionSource(file, name), context);
  }
  vm.runInContext(
    read('js/tempcontrol.js') +
      '\nthis.getThermostatBlock = getThermostatBlock;' +
      '\nthis.switchThermostat = switchThermostat;',
    context
  );
  return { context, requests, rendered };
}

const element = {
  html: () => {},
  find: () => element,
  on: () => element,
};

function block(extra) {
  return {
    key: 'k',
    idx: 7,
    title: 'Living',
    device: { idx: 7, Data: 20.25, LastUpdate: '2026-10-10 12:00:00' },
    $mountPoint: { find: () => element },
    ...extra,
  };
}

test('thermostat block takes min, max and unit from block, device, settings and defaults in that order', () => {
  const { context } = loadThermostat();

  const fromSettings = block();
  context.getThermostatBlock(fromSettings);
  assert.equal(fromSettings.min, 8);
  assert.equal(fromSettings.max, 28);
  assert.equal(fromSettings.unit, '°C');

  const fromDevice = block({
    device: { idx: 7, Data: 1, min: '10', max: '30', vunit: '°F' },
  });
  context.getThermostatBlock(fromDevice);
  assert.equal(fromDevice.min, 10);
  assert.equal(fromDevice.max, 30);
  assert.equal(fromDevice.unit, '°F');

  const fromBlock = block({
    min: 12,
    max: 25,
    unit: 'K',
    device: { idx: 7, Data: 1, min: 10, max: 30, vunit: '°F' },
  });
  context.getThermostatBlock(fromBlock);
  assert.equal(fromBlock.min, 12);
  assert.equal(fromBlock.max, 25);
  assert.equal(fromBlock.unit, 'K');

  const defaults = loadThermostat({ settings: { timeformat: 'HH:mm' } });
  const plain = block();
  defaults.context.getThermostatBlock(plain);
  assert.equal(plain.min, 5);
  assert.equal(plain.max, 40);
});

test('thermostat block renders the value and hides the buttons for a protected block', () => {
  const { context, rendered } = loadThermostat();
  context.getThermostatBlock(block());
  assert.equal(rendered[0].value, '20.3°C');
  assert.equal(rendered[0].title, 'Living');
  assert.equal(rendered[0].buttons, true);
  assert.equal(rendered[0].mImage, 'heating.png');

  context.getThermostatBlock(block({ protected: true }));
  assert.equal(rendered[1].buttons, false);
});

test('switching the thermostat sends the setpoint command unless the password prompt is refused', () => {
  const allowed = loadThermostat();
  allowed.context.switchThermostat(block(), 21.5);
  assert.deepEqual(allowed.requests, [
    [7, 'type=command&param=setsetpoint&idx=7&setpoint=21.5'],
  ]);

  const refused = loadThermostat({
    DT_function: { promptPassword: () => false },
  });
  refused.context.switchThermostat(block({ password: 'x' }), 21.5);
  assert.deepEqual(refused.requests, []);
});
