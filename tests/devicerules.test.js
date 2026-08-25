const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'devicerules.js'),
  'utf8'
);

const serverPath = path.join(__dirname, '..', 'js', 'savedevicerules.php');
const serverSource = fs.readFileSync(serverPath, 'utf8');

function normalizeRuleWithPhp(rule, sourceKey = 'source') {
  const definitionsStart = serverSource.indexOf('$allowedOperators = array(');
  const requestHandlerStart = serverSource.indexOf('\n$rules = array();');
  assert.notEqual(definitionsStart, -1);
  assert.notEqual(requestHandlerStart, -1);

  const definitions = serverSource.slice(definitionsStart, requestHandlerStart);
  const ruleBase64 = Buffer.from(JSON.stringify(rule)).toString('base64');
  const sourceBase64 = Buffer.from(String(sourceKey)).toString('base64');
  const script = `${definitions}
$input = json_decode(base64_decode('${ruleBase64}'), true);
list($normalized, $error) = device_rules_normalize_rule($input, 0, base64_decode('${sourceBase64}'));
echo json_encode(array('rule' => $normalized, 'error' => $error));`;
  const result = spawnSync('php', ['-r', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function phpManagedClass(sourceKey, ruleId) {
  const definitionsStart = serverSource.indexOf('$allowedOperators = array(');
  const requestHandlerStart = serverSource.indexOf('\n$rules = array();');
  const definitions = serverSource.slice(definitionsStart, requestHandlerStart);
  const sourceBase64 = Buffer.from(String(sourceKey)).toString('base64');
  const idBase64 = Buffer.from(String(ruleId)).toString('base64');
  const script = `${definitions}
echo device_rules_managed_class_name(base64_decode('${sourceBase64}'), base64_decode('${idBase64}'));`;
  const result = spawnSync('php', ['-r', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

function emptyCollection() {
  const collection = {
    length: 0,
    add() {
      return this;
    },
    addClass() {
      return this;
    },
    appendTo() {
      return this;
    },
    attr() {
      return arguments.length > 1 ? this : '';
    },
    closest() {
      return this;
    },
    each() {
      return this;
    },
    find() {
      return this;
    },
    first() {
      return this;
    },
    html() {
      return this;
    },
    is() {
      return false;
    },
    off() {
      return this;
    },
    on() {
      return this;
    },
    prependTo() {
      return this;
    },
    removeClass() {
      return this;
    },
    text() {
      return arguments.length ? this : '';
    },
    trigger() {
      return this;
    },
  };
  return collection;
}

function createRuntime(initialBlocks = {}, liveDevices = {}) {
  const blocks = initialBlocks;
  const runtimeStyles = [];
  const head = {
    appendChild(node) {
      node.parentNode = this;
      runtimeStyles.push(node);
      return node;
    },
    removeChild(node) {
      const index = runtimeStyles.indexOf(node);
      if (index !== -1) runtimeStyles.splice(index, 1);
      node.parentNode = null;
      return node;
    },
  };
  const document = {
    body: null,
    head,
    addEventListener() {},
    createElement(tagName) {
      return {
        tagName: String(tagName).toUpperCase(),
        textContent: '',
        parentNode: null,
        attributes: {},
        setAttribute(name, value) {
          this.attributes[name] = String(value);
        },
      };
    },
    getElementById() {
      return null;
    },
    getElementsByTagName(tagName) {
      return String(tagName).toLowerCase() === 'head' ? [head] : [];
    },
  };
  function jQuery(value) {
    if (value && value.__testCollection) return value;
    return emptyCollection();
  }

  const window = {
    blocks,
    document,
    console,
    config: { language: 'en_US' },
    settings: {},
    _PARAMS: {},
    _CFG: { customfolder: 'custom' },
    MutationObserver: function MutationObserver() {},
    clearInterval() {},
    setInterval() {
      return 1;
    },
    setTimeout(callback) {
      callback();
      return 1;
    },
    getCustomFunction() {},
    DashticzDeviceEditor: {
      openConfig() {},
      openLayoutConfig() {},
    },
    Domoticz: {
      getAllDevices(idx) {
        return liveDevices[String(idx)] || null;
      },
    },
  };
  window.window = window;
  window.Dashticz = {
    setBlock(key, state) {
      if (!blocks[key]) blocks[key] = {};
      if (state) Object.assign(blocks[key], state);
    },
  };

  const context = {
    window,
    document,
    blocks,
    Dashticz: window.Dashticz,
    Domoticz: window.Domoticz,
    settings: window.settings,
    _PARAMS: window._PARAMS,
    $: jQuery,
    console,
    setTimeout: window.setTimeout,
    clearTimeout() {},
  };
  vm.runInNewContext(source, context, { filename: 'devicerules.js' });
  return {
    api: window.DashticzDeviceRules,
    blocks,
    store: (window.DashticzDeviceRulesConfig = {}),
    runtimeStyles,
    window,
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('text actions target the data value and leave the block title untouched', () => {
  assert.match(source, /setBlockState\(target, \{ value: value \}\)/);
  assert.doesNotMatch(source, /setBlockState\(target, \{ title: value \}\)/);
  assert.match(source, /\.col-data \.value/);
});

test('removes generated addClass Custom fields before Device Editor saves', () => {
  assert.match(source, /function syncAutomationAddClassCustomField\(/);
  assert.match(source, /field !== 'addclass'/);
  assert.match(source, /stripManagedAddClassValue\(/);
  const syncIndex = source.indexOf(
    'syncAutomationAddClassCustomField($popup, source, ['
  );
  const redispatchIndex = source.indexOf('$ok[0].click();');
  assert.ok(syncIndex !== -1 && syncIndex < redispatchIndex);
});

test('keeps the Device Rules writer on its fixed endpoint', () => {
  assert.match(source, /var SAVE_URL = 'js\/savedevicerules\.php';/);
  assert.match(source, /phpPath \+ 'info\.php\?get=csrf'/);
  assert.match(source, /url: SAVE_URL/);
  assert.doesNotMatch(source, /url: phpPath \+ 'savedevicerules\.php'/);
});

test('normalises schema v2 with one trigger and two independent actions', () => {
  const { api } = createRuntime();
  const rules = api.normaliseRules(
    [
      {
        id: 'door_open',
        enabled: true,
        trigger: { property: 'Status', operator: 'eq', value: 'Open' },
        actions: {
          css: {
            enabled: true,
            target: 'self',
            className: 'door-warning',
            style: {
              mode: 'background-border',
              backgroundColor: '#112233',
              backgroundOpacity: 0.5,
              borderWidth: 3,
              borderStyle: 'dashed',
              borderColor: '#445566',
            },
          },
          text: {
            enabled: true,
            target: 'message',
            outputMode: 'line',
            textOn: 'Door open',
            textOff: 'Door closed',
          },
        },
      },
    ],
    'front_door'
  );

  assert.deepEqual(plain(rules[0].trigger), {
    property: 'Status',
    operator: 'eq',
    value: 'Open',
  });
  assert.equal(rules[0].actions.css.enabled, true);
  assert.equal(rules[0].actions.css.target, 'self');
  assert.equal(rules[0].actions.text.enabled, true);
  assert.equal(rules[0].actions.text.target, 'message');
  assert.equal(rules[0].actions.text.outputMode, 'line');
});

test('keeps previous flat CSS and text rules backwards compatible', () => {
  const { api } = createRuntime();
  const rules = api.normaliseRules(
    [
      {
        enabled: true,
        property: 'Status',
        operator: 'eq',
        value: 'On',
        action: 'class',
        target: 'legacy_target',
        className: 'legacy-warning',
      },
      {
        enabled: true,
        property: 'Status',
        operator: 'eq',
        value: 'On',
        action: 'text',
        target: 'legacy_text',
        textOn: 'On text',
        textOff: 'Off text',
      },
    ],
    'source'
  );

  assert.equal(rules[0].actions.css.enabled, true);
  assert.equal(rules[0].actions.css.target, 'legacy_target');
  assert.equal(rules[0].actions.css.legacyTarget, true);
  assert.equal(rules[0].actions.css.style.mode, 'existing');
  assert.equal(rules[0].actions.text.enabled, false);

  assert.equal(rules[1].actions.css.enabled, false);
  assert.equal(rules[1].actions.text.enabled, true);
  assert.equal(rules[1].actions.text.target, 'legacy_text');
  assert.equal(rules[1].actions.text.outputMode, 'line');
  assert.equal(rules[1].actions.text.textOn, 'On text');
});

test('removing the final text action restores live Domoticz data when no custom value existed', () => {
  const { api, blocks, store } = createRuntime(
    {
      source: { title: 'Source' },
      message: { idx: 20, title: 'Status message' },
    },
    {
      20: {
        Data: 'Original Domoticz text',
        Status: 'Original Domoticz text',
      },
    }
  );
  store.source = {
    schemaVersion: 2,
    rules: [
      {
        id: 'temporary_text',
        trigger: { property: 'Status', operator: 'eq', value: 'On' },
        actions: {
          css: { enabled: false },
          text: {
            enabled: true,
            target: 'message',
            textOn: 'Automation text',
            textOff: '',
          },
        },
      },
    ],
  };

  const block = { key: 'source', device: { Status: 'On' } };
  api.process(block);
  assert.equal(blocks.message.value, 'Automation text');
  assert.equal(blocks.message.title, 'Status message');

  store.source.rules = [];
  api.process(block);
  assert.equal(blocks.message.value, undefined);
  assert.equal(blocks.message.title, 'Status message');
});

test('strips managed automation classes from Device Config addClass values', () => {
  const { api } = createRuntime();
  const rules = [
    {
      id: 'managed_class',
      enabled: true,
      trigger: { property: 'Status', operator: 'eq', value: 'On' },
      actions: {
        css: {
          enabled: true,
          target: 'self',
          className: 'dt-auto-generated',
          style: { mode: 'background-border' },
        },
        text: { enabled: false },
      },
    },
  ];

  assert.equal(
    api.stripManagedAddClassValue(
      'manual-one dt-auto-generated manual-two',
      'source',
      'source',
      [rules]
    ),
    'manual-one manual-two'
  );
});

test('Device Config addClass row keeps manual classes and removes generated-only rows', () => {
  const { api } = createRuntime();
  const rules = [
    {
      id: 'managed_class',
      trigger: { property: 'Status', operator: 'eq', value: 'On' },
      actions: {
        css: {
          enabled: true,
          target: 'self',
          className: 'dt-auto-generated',
          style: { mode: 'background-border' },
        },
        text: { enabled: false },
      },
    },
  ];

  function field(value) {
    return {
      __testCollection: true,
      length: 1,
      current: value,
      val(next) {
        if (!arguments.length) return this.current;
        this.current = String(next);
        return this;
      },
    };
  }

  function row(settingValue) {
    const name = field('addClass');
    const setting = field(settingValue);
    const removeButton = {
      __testCollection: true,
      length: 1,
      removed: false,
      prop() {
        return false;
      },
      trigger(event) {
        if (event === 'click') this.removed = true;
        return this;
      },
    };
    const collection = {
      __testCollection: true,
      name,
      setting,
      removeButton,
      rowRemoved: false,
      find(selector) {
        if (selector === '.de-custom-field-name') return name;
        if (selector === '.de-custom-field-setting') return setting;
        if (selector === '.de-custom-field-remove') return removeButton;
        return emptyCollection();
      },
      addClass() {
        return this;
      },
      remove() {
        this.rowRemoved = true;
        return this;
      },
    };
    return collection;
  }

  const manualRow = row('manual dt-auto-generated');
  const generatedOnlyRow = row('dt-auto-generated');
  const popup = {
    __testCollection: true,
    find(selector) {
      if (selector !== '.de-custom-field-row') return emptyCollection();
      return {
        __testCollection: true,
        length: 2,
        each(callback) {
          callback.call(manualRow);
          callback.call(generatedOnlyRow);
          return this;
        },
      };
    },
  };

  api.syncAutomationAddClassCustomField(popup, 'source', [rules]);
  assert.equal(manualRow.setting.current, 'manual');
  assert.equal(manualRow.removeButton.removed, false);
  assert.equal(generatedOnlyRow.removeButton.removed, true);
  assert.equal(generatedOnlyRow.rowRemoved, true);
});

test('inactive CSS does not leave an empty addClass property for Device Config', () => {
  const { api, blocks, store } = createRuntime({ source: { addClass: '' } });
  store.source = {
    schemaVersion: 2,
    rules: [
      {
        id: 'inactive_css',
        enabled: true,
        trigger: { property: 'Status', operator: 'eq', value: 'On' },
        actions: {
          css: {
            enabled: true,
            target: 'self',
            className: 'dt-auto-inactive',
            style: { mode: 'background-border' },
          },
          text: { enabled: false },
        },
      },
    ],
  };

  api.process({ key: 'source', device: { Status: 'Off' } });
  assert.equal(
    Object.prototype.hasOwnProperty.call(blocks.source, 'addClass'),
    false
  );
});

test('saving cleans a generated class accidentally persisted as the base addClass', () => {
  const { api, blocks, store } = createRuntime({
    source: { addClass: 'manual-base dt-auto-persisted' },
  });
  const activeRule = {
    id: 'persisted_class',
    enabled: true,
    trigger: { property: 'Status', operator: 'eq', value: 'On' },
    actions: {
      css: {
        enabled: true,
        target: 'self',
        className: 'dt-auto-persisted',
        style: { mode: 'background-border' },
      },
      text: { enabled: false },
    },
  };
  store.source = { schemaVersion: 2, rules: [activeRule] };

  const block = { key: 'source', device: { Status: 'On' } };
  api.process(block);
  assert.match(blocks.source.addClass, /dt-auto-persisted/);

  const disabledRule = JSON.parse(JSON.stringify(activeRule));
  disabledRule.enabled = false;
  api.updateRuleStore('source', [disabledRule], '');
  assert.equal(blocks.source.addClass, 'manual-base');

  api.updateRuleStore('source', [activeRule], '');
  assert.deepEqual(blocks.source.addClass.split(/\s+/).sort(), [
    'dt-auto-persisted',
    'manual-base',
  ]);
});

test('one trigger applies CSS to the current device and text to another device block', () => {
  const { api, blocks, store } = createRuntime({
    source: { addClass: 'existing-class', title: 'Source' },
    message: { title: 'Status message', value: 'Original message' },
  });
  store.source = {
    schemaVersion: 2,
    rules: [
      {
        id: 'combined',
        enabled: true,
        trigger: { property: 'Status', operator: 'eq', value: 'On' },
        actions: {
          css: {
            enabled: true,
            target: 'self',
            className: 'automation-active',
            style: { mode: 'background-border' },
          },
          text: {
            enabled: true,
            target: 'message',
            textOn: 'Device is on',
            textOff: 'Device is off',
          },
        },
      },
    ],
  };

  const block = { key: 'source', idx: 12, device: { Status: 'On' } };
  api.process(block);
  assert.deepEqual(blocks.source.addClass.split(/\s+/).sort(), [
    'automation-active',
    'existing-class',
  ]);
  assert.equal(blocks.message.value, 'Device is on');
  assert.equal(blocks.message.title, 'Status message');

  block.device.Status = 'Off';
  api.process(block);
  assert.equal(blocks.source.addClass, 'existing-class');
  assert.equal(blocks.message.value, 'Device is off');

  store.source.rules = [];
  api.process(block);
  assert.equal(blocks.source.addClass, 'existing-class');
  assert.equal(blocks.message.value, 'Original message');
});

test('separate-line text actions from multiple devices share one target', () => {
  const { api, blocks, store, runtimeStyles } = createRuntime({
    alpha: { title: 'Alpha door' },
    beta: { title: 'Beta door' },
    message: {
      title: 'Status message',
      value: 'Original message',
      addClass: 'existing-target-class',
    },
  });

  function textRule(id, message) {
    return {
      id,
      enabled: true,
      trigger: { property: 'Status', operator: 'eq', value: 'Open' },
      actions: {
        css: { enabled: false },
        text: {
          enabled: true,
          target: 'message',
          outputMode: 'line',
          textOn: message,
          textOff: '',
        },
      },
    };
  }

  store.alpha = {
    schemaVersion: 2,
    rules: [textRule('alpha_open', 'Alpha is open')],
  };
  store.beta = {
    schemaVersion: 2,
    rules: [textRule('beta_open', 'Beta is open')],
  };

  const beta = { key: 'beta', device: { Status: 'Open' } };
  const alpha = { key: 'alpha', device: { Status: 'Open' } };

  // Process them in reverse order. The combined output remains deterministic:
  // friendly source name first, followed by the rule order within that source.
  api.process(beta);
  api.process(alpha);
  assert.equal(blocks.message.value, 'Alpha is open\nBeta is open');
  assert.deepEqual(blocks.message.addClass.split(/\s+/).sort(), [
    'dt-automation-multiline',
    'existing-target-class',
  ]);
  const multilineStyle = runtimeStyles.find((style) =>
    /dt-automation-multiline[\s\S]*white-space: pre-line/.test(
      style.textContent
    )
  );
  assert.ok(multilineStyle);
  assert.match(multilineStyle.textContent, /\.col-data \.value/);
  assert.doesNotMatch(multilineStyle.textContent, /\.dt_title/);

  alpha.device.Status = 'Closed';
  api.process(alpha);
  assert.equal(blocks.message.value, 'Beta is open');

  beta.device.Status = 'Closed';
  api.process(beta);
  assert.equal(blocks.message.value, '');

  store.alpha.rules = [];
  api.process(alpha);
  store.beta.rules = [];
  api.process(beta);
  assert.equal(blocks.message.value, 'Original message');
  assert.equal(blocks.message.addClass, 'existing-target-class');
});

test('replace text remains compatible beside separate-line messages', () => {
  const { api, blocks, store } = createRuntime({
    header: { title: 'Header source' },
    line: { title: 'Line source' },
    message: { title: 'Status message', value: 'Original message' },
  });
  store.header = {
    schemaVersion: 2,
    rules: [
      {
        id: 'header_text',
        trigger: { property: 'Status', operator: 'eq', value: 'On' },
        actions: {
          css: { enabled: false },
          text: {
            enabled: true,
            target: 'message',
            outputMode: 'replace',
            textOn: 'General warning',
            textOff: '',
          },
        },
      },
    ],
  };
  store.line = {
    schemaVersion: 2,
    rules: [
      {
        id: 'line_text',
        trigger: { property: 'Status', operator: 'eq', value: 'On' },
        actions: {
          css: { enabled: false },
          text: {
            enabled: true,
            target: 'message',
            outputMode: 'line',
            textOn: 'Front door is open',
            textOff: '',
          },
        },
      },
    ],
  };

  const header = { key: 'header', device: { Status: 'On' } };
  const line = { key: 'line', device: { Status: 'On' } };
  api.process(header);
  api.process(line);
  assert.equal(blocks.message.value, 'General warning\nFront door is open');

  store.line.rules = [];
  api.process(line);
  assert.equal(blocks.message.value, 'General warning');
  assert.doesNotMatch(blocks.message.addClass || '', /dt-automation-multiline/);

  store.header.rules = [];
  api.process(header);
  assert.equal(blocks.message.value, 'Original message');
});

test('switching the master automation Off removes active CSS and text immediately', () => {
  const { api, blocks, store, runtimeStyles } = createRuntime({
    source: { addClass: 'source-base', title: 'Source' },
    message: { title: 'Status message', value: 'Original message' },
  });
  const activeRule = {
    id: 'master_switch',
    enabled: true,
    trigger: { property: 'Status', operator: 'eq', value: 'On' },
    actions: {
      css: {
        enabled: true,
        target: 'self',
        className: 'master-switch-active',
        style: {
          mode: 'background-border',
          backgroundColor: '#112233',
          backgroundOpacity: 0.5,
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: '#445566',
        },
      },
      text: {
        enabled: true,
        target: 'message',
        outputMode: 'replace',
        textOn: 'Automation is active',
        textOff: 'Automation is inactive',
      },
    },
  };
  store.source = { schemaVersion: 2, rules: [activeRule] };

  const block = { key: 'source', idx: 12, device: { Status: 'On' } };
  api.process(block);
  assert.match(blocks.source.addClass, /master-switch-active/);
  assert.equal(blocks.message.value, 'Automation is active');
  assert.equal(runtimeStyles.length, 1);

  const disabledRule = JSON.parse(JSON.stringify(activeRule));
  disabledRule.enabled = false;
  api.updateRuleStore('source', [disabledRule], '');

  // No new Domoticz update is needed: saving Off clears both owned effects.
  assert.equal(blocks.source.addClass, 'source-base');
  assert.equal(blocks.message.value, '');
  assert.equal(runtimeStyles.length, 0);

  // Later source updates must not reactivate a disabled rule or restore a
  // previously captured Automation value into the target data field.
  api.process(block);
  assert.equal(blocks.source.addClass, 'source-base');
  assert.equal(blocks.message.value, '');

  // Switching the stored rule back On uses the cached current device state and
  // restores both actions immediately as well.
  api.updateRuleStore('source', [activeRule], '');
  assert.match(blocks.source.addClass, /master-switch-active/);
  assert.equal(blocks.message.value, 'Automation is active');
});

test('switching one shared text automation Off removes only its own line', () => {
  const { api, blocks, store } = createRuntime({
    front: { title: 'Front door' },
    garage: { title: 'Garage door' },
    message: { title: 'Status message', value: 'Original message' },
  });

  function lineRule(id, value) {
    return {
      id,
      enabled: true,
      trigger: { property: 'Status', operator: 'eq', value: 'On' },
      actions: {
        css: { enabled: false },
        text: {
          enabled: true,
          target: 'message',
          outputMode: 'line',
          textOn: value,
          textOff: '',
        },
      },
    };
  }

  const frontRule = lineRule('front_open', 'Front door is open');
  const garageRule = lineRule('garage_open', 'Garage door is open');
  store.front = { schemaVersion: 2, rules: [frontRule] };
  store.garage = { schemaVersion: 2, rules: [garageRule] };

  const frontBlock = { key: 'front', device: { Status: 'On' } };
  const garageBlock = { key: 'garage', device: { Status: 'On' } };
  api.process(frontBlock);
  api.process(garageBlock);
  assert.equal(blocks.message.value, 'Front door is open\nGarage door is open');

  const disabledFront = JSON.parse(JSON.stringify(frontRule));
  disabledFront.enabled = false;
  api.updateRuleStore('front', [disabledFront], '');
  assert.equal(blocks.message.value, 'Garage door is open');

  const disabledGarage = JSON.parse(JSON.stringify(garageRule));
  disabledGarage.enabled = false;
  api.updateRuleStore('garage', [disabledGarage], '');
  assert.equal(blocks.message.value, '');

  // Processing the disabled sources again must keep the field empty instead
  // of restoring either their old line or the captured base value.
  api.process(frontBlock);
  api.process(garageBlock);
  assert.equal(blocks.message.value, '');
});

test('switching only the text action Off clears its own shared contribution', () => {
  const { api, blocks, store } = createRuntime({
    first: { title: 'First source' },
    second: { title: 'Second source' },
    message: { title: 'Status message', value: 'Original message' },
  });

  const firstRule = {
    id: 'first_line',
    enabled: true,
    trigger: { property: 'Status', operator: 'eq', value: 'On' },
    actions: {
      css: { enabled: false },
      text: {
        enabled: true,
        target: 'message',
        outputMode: 'line',
        textOn: 'First line',
        textOff: '',
      },
    },
  };
  const secondRule = JSON.parse(JSON.stringify(firstRule));
  secondRule.id = 'second_line';
  secondRule.actions.text.textOn = 'Second line';
  store.first = { schemaVersion: 2, rules: [firstRule] };
  store.second = { schemaVersion: 2, rules: [secondRule] };

  api.process({ key: 'first', device: { Status: 'On' } });
  api.process({ key: 'second', device: { Status: 'On' } });
  assert.equal(blocks.message.value, 'First line\nSecond line');

  const textOff = JSON.parse(JSON.stringify(firstRule));
  textOff.actions.text.enabled = false;
  api.updateRuleStore('first', [textOff], '');
  assert.equal(blocks.message.value, 'Second line');
});

test('disabled master rules do not generate client-side CSS', () => {
  const { api } = createRuntime();
  const css = api.generatedCssForRules(
    [
      {
        id: 'disabled_visual',
        enabled: false,
        trigger: { property: 'Status', operator: 'eq', value: 'On' },
        actions: {
          css: {
            enabled: true,
            target: 'self',
            className: 'disabled-visual',
            style: { mode: 'background' },
          },
          text: { enabled: false },
        },
      },
    ],
    'source'
  );
  assert.equal(css, '');
});

test('runtime CSS upgrades previously generated weak selectors without a resave', () => {
  const { api, runtimeStyles, store } = createRuntime({
    source: { addClass: '' },
  });
  store.source = {
    schemaVersion: 2,
    rules: [
      {
        id: 'runtime-css',
        trigger: { property: 'Status', operator: 'eq', value: 'On' },
        actions: {
          css: {
            enabled: true,
            target: 'self',
            className: 'runtime-active',
            style: {
              mode: 'background-border',
              backgroundColor: '#112233',
              backgroundOpacity: 0.5,
              borderWidth: 2,
              borderStyle: 'solid',
              borderColor: '#445566',
            },
          },
          text: { enabled: false, target: '', textOn: '', textOff: '' },
        },
      },
    ],
  };

  api.process({ key: 'source', idx: 12, device: { Status: 'On' } });

  assert.equal(runtimeStyles.length, 1);
  assert.equal(
    runtimeStyles[0].attributes['data-dashticz-device-rules-runtime'],
    'true'
  );
  assert.match(
    runtimeStyles[0].textContent,
    /html body \.mh\.transbg\.runtime-active/
  );
  assert.match(
    runtimeStyles[0].textContent,
    /background: rgba\(17, 34, 51, 0\.50\)/
  );

  store.source.rules = [];
  api.process({ key: 'source', idx: 12, device: { Status: 'Off' } });
  assert.equal(runtimeStyles.length, 0);
});

test('self CSS uses the rendered block key even for a legacy numeric store key', () => {
  const { api, blocks, store } = createRuntime({
    named_device: { addClass: 'base' },
  });
  store['321'] = {
    schemaVersion: 2,
    rules: [
      {
        id: 'numeric_source',
        trigger: { property: 'Status', operator: 'eq', value: 'On' },
        actions: {
          css: {
            enabled: true,
            target: 'self',
            className: 'numeric-rule-active',
            style: { mode: 'background' },
          },
          text: { enabled: false, target: '', textOn: '', textOff: '' },
        },
      },
    ],
  };

  api.process({ key: 'named_device', idx: 321, device: { Status: 'On' } });
  assert.match(blocks.named_device.addClass, /numeric-rule-active/);
  assert.equal(blocks['321'], undefined);
});

test('changing action targets removes state from the previous targets', () => {
  const { api, blocks, store } = createRuntime({
    source: { title: 'Source' },
    old_css: { addClass: 'old-base' },
    new_css: { addClass: 'new-base' },
    old_text: { title: 'Old text', value: 'Old original' },
    new_text: { title: 'New text', value: 'New original' },
  });
  const rule = {
    id: 'move_targets',
    trigger: { property: 'Status', operator: 'eq', value: 'On' },
    actions: {
      css: {
        enabled: true,
        target: 'old_css',
        className: 'moving-class',
        style: { mode: 'existing' },
      },
      text: {
        enabled: true,
        target: 'old_text',
        textOn: 'Active',
        textOff: 'Inactive',
      },
    },
  };
  store.source = { schemaVersion: 2, rules: [rule] };
  const block = { key: 'source', idx: 1, device: { Status: 'On' } };

  api.process(block);
  assert.equal(blocks.old_css.addClass, 'old-base moving-class');
  assert.equal(blocks.old_text.value, 'Active');

  rule.actions.css.target = 'new_css';
  rule.actions.text.target = 'new_text';
  api.process(block);

  assert.equal(blocks.old_css.addClass, 'old-base');
  assert.equal(blocks.new_css.addClass, 'new-base moving-class');
  assert.equal(blocks.old_text.value, 'Old original');
  assert.equal(blocks.new_text.value, 'Active');
});

test('generated block selectors override important theme panel rules', () => {
  const { api } = createRuntime();
  const selectors = api.generatedBlockSelectors('automation-active');

  assert.match(selectors, /html body \.dt_block\.transbg\.automation-active/);
  assert.match(selectors, /html body \.mh\.transbg\.automation-active/);
  assert.match(selectors, /html body \.transbg\.automation-active/);
});

test('generated CSS contains the configured background, opacity and border', () => {
  const { api } = createRuntime();
  const css = api.generatedCssForRules(
    [
      {
        id: 'visual',
        enabled: true,
        trigger: { property: 'Status', operator: 'eq', value: 'On' },
        actions: {
          css: {
            enabled: true,
            target: 'self',
            className: 'visual-rule',
            style: {
              mode: 'background-border',
              backgroundColor: '#102030',
              backgroundOpacity: 0.4,
              borderWidth: 4,
              borderStyle: 'double',
              borderColor: '#abcdef',
            },
          },
          text: { enabled: false },
        },
      },
    ],
    'source'
  );

  assert.match(css, /html body \.dt_block\.transbg\.visual-rule,/);
  assert.match(css, /html body \.mh\.transbg\.visual-rule/);
  assert.match(css, /background: rgba\(16, 32, 48, 0\.40\) !important;/);
  assert.match(css, /border: 4px double #abcdef !important;/);
});

test('text target dropdown data shows friendly names, IDX and text devices first', () => {
  const { api } = createRuntime(
    {
      lamp: { idx: 10, title: 'Lamp' },
      message: { idx: 20, title: 'Status message' },
      custom_note: { idx: 30, type: 'text', title: 'Custom note' },
    },
    {
      10: { Name: 'Living room lamp', Type: 'Light/Switch', SubType: 'Switch' },
      20: { Name: 'Alarm text', Type: 'General', SubType: 'Text' },
    }
  );

  const rows = plain(api.blockOptionData('missing_target'));
  assert.equal(rows[0].key, 'message');
  assert.equal(rows[0].textDevice, true);
  assert.match(rows[0].label, /Alarm text/);
  assert.match(rows[0].label, /IDX 20/);
  assert.match(rows[0].label, /message/);
  assert.equal(rows[1].key, 'custom_note');
  assert.equal(rows.find((row) => row.key === 'lamp').textDevice, false);
  assert.equal(
    rows.find((row) => row.key === 'missing_target').unavailable,
    true
  );
});

test('text target control renders a real device pulldown with the saved target selected', () => {
  const { api } = createRuntime(
    {
      message: { idx: 20, title: 'Status message' },
      lamp: { idx: 10, title: 'Lamp' },
      weather: { type: 'weather', title: 'Weather widget' },
    },
    {
      20: { Name: 'Alarm text', Type: 'General', SubType: 'Text' },
      10: { Name: 'Living room lamp', Type: 'Light/Switch', SubType: 'Switch' },
    }
  );

  const html = api.targetOptions('message', false);
  assert.match(html, /<optgroup label=\"Text devices\">/);
  assert.match(
    html,
    /<option value=\"message\" selected>Alarm text — IDX 20 — message<\/option>/
  );
  assert.match(html, /<optgroup label=\"Other available devices\">/);
  assert.match(html, /Living room lamp — IDX 10 — lamp/);
  assert.doesNotMatch(html, /Weather widget/);
});

test('text output selector offers replace and separate-line modes', () => {
  const { api } = createRuntime();
  const lineHtml = api.textOutputModeOptions('line');
  assert.match(lineHtml, /value="replace">Replace existing text<\/option>/);
  assert.match(
    lineHtml,
    /value="line" selected>Add as a separate line<\/option>/
  );
  assert.equal(api.normaliseTextOutputMode('unsupported'), 'line');
});

test('numeric and text trigger comparisons keep their previous behaviour', () => {
  const { api } = createRuntime();
  assert.equal(api.compare('20.0', 'gte', '19,5'), true);
  assert.equal(api.compare('Door Open', 'contains', 'Open'), true);
  assert.equal(api.compare('', 'empty', ''), true);
  assert.equal(api.compare('Off', 'ne', 'On'), true);
});

test('PHP writer accepts schema v2, preserves legacy rules and matches generated classes', () => {
  const canonical = normalizeRuleWithPhp(
    {
      id: 'dual_action',
      enabled: true,
      trigger: { property: 'Status', operator: 'eq', value: 'On' },
      actions: {
        css: {
          enabled: true,
          target: 'self',
          className: '',
          style: {
            mode: 'background-border',
            backgroundColor: '#123456',
            backgroundOpacity: 0.5,
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: '#abcdef',
            textColor: '#ffffff',
          },
        },
        text: {
          enabled: true,
          target: 'message',
          outputMode: 'line',
          textOn: 'On',
          textOff: 'Off',
        },
      },
    },
    'source-device'
  );
  assert.equal(canonical.error, null);
  assert.deepEqual(canonical.rule.trigger, {
    property: 'Status',
    operator: 'eq',
    value: 'On',
  });
  assert.equal(canonical.rule.actions.css.target, 'self');
  assert.equal(canonical.rule.actions.text.target, 'message');
  assert.equal(canonical.rule.actions.text.outputMode, 'line');

  const { api } = createRuntime();
  const expectedClass = api.managedClassName('source-device', 'dual_action');
  assert.equal(canonical.rule.actions.css.className, expectedClass);
  assert.equal(phpManagedClass('source-device', 'dual_action'), expectedClass);

  const legacy = normalizeRuleWithPhp({
    property: 'Status',
    operator: 'eq',
    value: 'On',
    action: 'text',
    target: 'legacy_message',
    textOn: 'Legacy on',
    textOff: 'Legacy off',
  });
  assert.equal(legacy.error, null);
  assert.equal(legacy.rule.actions.css.enabled, false);
  assert.equal(legacy.rule.actions.text.enabled, true);
  assert.equal(legacy.rule.actions.text.target, 'legacy_message');
  assert.equal(legacy.rule.actions.text.outputMode, 'line');
});
