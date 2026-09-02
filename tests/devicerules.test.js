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
  jQuery.extend = function extend() {
    const args = Array.prototype.slice.call(arguments);
    const target = args.shift() || {};
    args.forEach((source) => Object.assign(target, source));
    return target;
  };

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

test('text actions target the value field and leave titles untouched', () => {
  assert.match(source, /setBlockState\(target, \{ value: value \}\)/);
  assert.doesNotMatch(source, /setBlockState\(target, \{ title: value \}\)/);
  assert.match(source, /function renderedDataField\(/);
});

test('generated addClass fields are cleaned before Device Editor saves', () => {
  assert.match(source, /function syncAutomationAddClassCustomField\(/);
  assert.match(source, /field !== 'addclass'/);
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
});

test('a disabled action always normalises to a non-empty class name so re-enabling it in the popup does not fail validation on an empty field', () => {
  const { api } = createRuntime();
  // Simulates a rule saved before the text action's own CSS toggle existed:
  // actions.text has no css sub-object at all, and the top CSS action was
  // never enabled either, so neither ever got a class name persisted.
  const rules = api.normaliseRules(
    [
      {
        id: 'legacy_rule',
        enabled: true,
        trigger: { property: 'Data', operator: 'gt', value: '2' },
        actions: {
          css: { enabled: false, target: 'self' },
          text: { enabled: true, target: 'message', textOn: 'Alarm' },
        },
      },
    ],
    'source'
  );

  assert.ok(rules[0].actions.css.className);
  assert.ok(rules[0].actions.text.css.className);
  assert.notEqual(
    rules[0].actions.css.className,
    rules[0].actions.text.css.className
  );
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
  assert.equal(rules[1].actions.text.textOn, 'On text');
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

test("the text action's own CSS borders its target only while the trigger and text action are both active", () => {
  const { api, blocks, store } = createRuntime({
    source: { title: 'Source' },
    message: { addClass: 'existing-class', title: 'Status message' },
  });
  store.source = {
    schemaVersion: 2,
    rules: [
      {
        id: 'bordered',
        enabled: true,
        trigger: { property: 'Data', operator: 'gt', value: '2' },
        actions: {
          css: { enabled: false },
          text: {
            enabled: true,
            target: 'message',
            textOn: 'Alarm',
            textOff: '',
            css: {
              enabled: true,
              className: 'text-target-border',
              style: { mode: 'border' },
            },
          },
        },
      },
    ],
  };

  const block = { key: 'source', idx: 1, device: { Data: '1,8Bar' } };
  api.process(block);
  // Trigger is false (1.8 is not > 2): text and border both stay off.
  assert.equal(blocks.message.value, '');
  assert.equal(blocks.message.addClass, 'existing-class');

  block.device.Data = '2,3Bar';
  api.process(block);
  assert.equal(blocks.message.value, 'Alarm');
  assert.deepEqual(blocks.message.addClass.split(/\s+/).sort(), [
    'existing-class',
    'text-target-border',
  ]);

  block.device.Data = '1,8Bar';
  api.process(block);
  assert.equal(blocks.message.value, '');
  assert.equal(blocks.message.addClass, 'existing-class');
});

test('the text action’s own CSS never applies while the text action itself is disabled, even if its style is enabled', () => {
  const { api, blocks, store } = createRuntime({
    source: { title: 'Source' },
    message: { title: 'Status message' },
  });
  store.source = {
    schemaVersion: 2,
    rules: [
      {
        id: 'no_text_no_border',
        enabled: true,
        trigger: { property: 'Status', operator: 'eq', value: 'On' },
        actions: {
          css: { enabled: false },
          text: {
            enabled: false,
            target: 'message',
            textOn: 'Alarm',
            textOff: '',
            css: {
              enabled: true,
              className: 'should-never-appear',
              style: { mode: 'border' },
            },
          },
        },
      },
    ],
  };

  const block = { key: 'source', idx: 1, device: { Status: 'On' } };
  api.process(block);
  assert.equal(blocks.message.addClass || '', '');
});

test('several devices share one chosen text target on separate lines', () => {
  const { api, blocks, store, runtimeStyles } = createRuntime({
    alpha: { title: 'Alpha door' },
    beta: { title: 'Beta door' },
    message: { title: 'Status message', value: 'Original message' },
  });

  function textRule(id, value) {
    return {
      id,
      enabled: true,
      trigger: { property: 'Status', operator: 'eq', value: 'On' },
      actions: {
        css: { enabled: false },
        text: {
          enabled: true,
          target: 'message',
          textOn: value,
          textOff: '',
        },
      },
    };
  }

  const alphaRule = textRule('alpha_active', 'Alpha is active');
  const betaRule = textRule('beta_active', 'Beta is active');
  store.alpha = { schemaVersion: 2, rules: [alphaRule] };
  store.beta = { schemaVersion: 2, rules: [betaRule] };

  const alpha = { key: 'alpha', device: { Status: 'On' } };
  const beta = { key: 'beta', device: { Status: 'On' } };

  // Processing order must not affect the displayed order.
  api.process(beta);
  api.process(alpha);
  assert.equal(blocks.message.value, 'Alpha is active\nBeta is active');
  assert.equal(blocks.message.title, 'Status message');
  const multilineStyle = runtimeStyles.find((style) =>
    /dt-automation-multiline-value[\s\S]*white-space: pre-line/.test(
      style.textContent
    )
  );
  assert.ok(multilineStyle);

  alpha.device.Status = 'Off';
  api.process(alpha);
  assert.equal(blocks.message.value, 'Beta is active');

  const disabledBetaRule = JSON.parse(JSON.stringify(betaRule));
  disabledBetaRule.enabled = false;
  api.updateRuleStore('beta', [disabledBetaRule], '');
  assert.equal(blocks.message.value, '');

  store.alpha.rules = [];
  api.process(alpha);
  store.beta.rules = [];
  api.process(beta);
  assert.equal(blocks.message.value, 'Original message');
  assert.equal(blocks.message.title, 'Status message');
});

test('false-result texts also remain independent in a shared target', () => {
  const { api, blocks, store } = createRuntime({
    kitchen: { title: 'Kitchen' },
    living: { title: 'Living room' },
    message: { title: 'Overview', value: 'Original' },
  });

  function statusRule(id, target, textOn, textOff) {
    return {
      id,
      trigger: { property: 'Status', operator: 'eq', value: 'On' },
      actions: {
        css: { enabled: false },
        text: { enabled: true, target, textOn, textOff },
      },
    };
  }

  store.kitchen = {
    schemaVersion: 2,
    rules: [statusRule('kitchen', 'message', 'Kitchen on', 'Kitchen off')],
  };
  store.living = {
    schemaVersion: 2,
    rules: [statusRule('living', 'message', 'Living on', 'Living off')],
  };

  api.process({ key: 'living', device: { Status: 'On' } });
  api.process({ key: 'kitchen', device: { Status: 'Off' } });
  assert.equal(blocks.message.value, 'Kitchen off\nLiving on');
});

test('removing a text action restores an implicit live device value', () => {
  const { api, blocks, store } = createRuntime(
    {
      source: { title: 'Source' },
      message: { idx: 20, title: 'Status message' },
    },
    { 20: { Data: 'Domoticz message', Status: 'On' } }
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
            textOn: 'Party mode is on',
            textOff: 'Party mode is off',
          },
        },
      },
    ],
  };

  const sourceBlock = { key: 'source', device: { Status: 'On' } };
  api.process(sourceBlock);
  assert.equal(blocks.message.value, 'Party mode is on');
  assert.equal(blocks.message.title, 'Status message');

  store.source.rules = [];
  api.process(sourceBlock);
  assert.equal(
    Object.prototype.hasOwnProperty.call(blocks.message, 'value'),
    false
  );
  assert.equal(blocks.message.title, 'Status message');
});

test('switching an active automation Off removes its CSS immediately', () => {
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
        textOn: 'Automation is active',
        textOff: 'Automation is inactive',
      },
    },
  };
  store.source = { schemaVersion: 2, rules: [activeRule] };

  const block = { key: 'source', idx: 12, device: { Status: 'On' } };
  api.process(block);
  assert.equal(blocks.source.addClass, 'source-base master-switch-active');
  assert.equal(blocks.message.value, 'Automation is active');
  assert.equal(runtimeStyles.length, 1);

  const disabledRule = JSON.parse(JSON.stringify(activeRule));
  disabledRule.enabled = false;
  api.updateRuleStore('source', [disabledRule], '');

  // Saving Off is enough; no new Domoticz update is required.
  assert.equal(blocks.source.addClass || '', 'source-base');
  assert.equal(blocks.message.value, 'Original message');
  assert.equal(runtimeStyles.length, 0);

  api.updateRuleStore('source', [activeRule], '');
  assert.equal(blocks.source.addClass, 'source-base master-switch-active');
  assert.equal(blocks.message.value, 'Automation is active');
});

test('generated automation classes cannot become a permanent addClass base', () => {
  const { api, blocks, store } = createRuntime({
    source: { addClass: 'manual-base' },
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

  api.process({ key: 'source', device: { Status: 'On' } });
  assert.equal(blocks.source.addClass, 'manual-base dt-auto-persisted');

  const disabledRule = JSON.parse(JSON.stringify(activeRule));
  disabledRule.enabled = false;
  api.updateRuleStore('source', [disabledRule], '');
  assert.equal(blocks.source.addClass || '', 'manual-base');
  assert.equal(
    api.stripManagedAddClassValue(
      'manual-base dt-auto-persisted',
      'source',
      'source',
      [[activeRule, disabledRule]]
    ),
    'manual-base'
  );
});

test('Device Config keeps manual addClass names and removes generated-only rows', () => {
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
    return {
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
  }

  const manualRow = row('manual dt-auto-generated');
  const generatedOnlyRow = row('dt-auto-generated');
  const popup = {
    find(selector) {
      if (selector !== '.de-custom-field-row') return emptyCollection();
      return {
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

test("generated CSS includes the text action's own class, distinct from the CSS action's", () => {
  const { api } = createRuntime();
  const css = api.generatedCssForRules(
    [
      {
        id: 'dual_style',
        enabled: true,
        trigger: { property: 'Status', operator: 'eq', value: 'On' },
        actions: {
          css: {
            enabled: true,
            target: 'self',
            className: 'self-visual',
            style: { mode: 'background' },
          },
          text: {
            enabled: true,
            target: 'message',
            textOn: 'Alarm',
            textOff: '',
            css: {
              enabled: true,
              className: 'target-border',
              style: {
                mode: 'border',
                borderWidth: 3,
                borderStyle: 'dashed',
                borderColor: '#ff0000',
              },
            },
          },
        },
      },
    ],
    'source'
  );
  assert.match(css, /html body \.dt_block\.transbg\.self-visual,/);
  assert.match(css, /html body \.dt_block\.transbg\.target-border,/);
  assert.match(css, /border: 3px dashed #ff0000 !important;/);
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

test('numeric and text trigger comparisons keep their previous behaviour', () => {
  const { api } = createRuntime();
  assert.equal(api.compare('20.0', 'gte', '19,5'), true);
  assert.equal(api.compare('Door Open', 'contains', 'Open'), true);
  assert.equal(api.compare('', 'empty', ''), true);
  assert.equal(api.compare('Off', 'ne', 'On'), true);
});

test('numeric trigger comparisons parse a unit suffixed straight onto the value, comma or dot decimal', () => {
  const { api } = createRuntime();
  // Domoticz custom sensors (e.g. a pressure gauge configured with unit
  // "Bar") return Data like "1,8Bar" with no separating space (#219 follow-up).
  assert.equal(api.compare('1,8Bar', 'gt', '2'), false);
  assert.equal(api.compare('2,3Bar', 'gt', '2'), true);
  assert.equal(api.compare('2,3Bar', 'lt', '2'), false);
  assert.equal(api.compare('1.8Bar', 'gt', '2'), false);
  // European-formatted values that combine a thousands separator with a
  // decimal comma must not be truncated at the thousands separator.
  assert.equal(api.compare('1.020,5 hPa', 'gt', '1000'), true);
  assert.equal(api.compare('-2,3 Bar', 'lt', '0'), true);
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
});

test('hasEnabledRules reports whether a block has at least one enabled Automation rule', () => {
  const { api, store } = createRuntime({ living: { key: 'living' } });

  assert.equal(api.hasEnabledRules({ key: 'living' }), false);

  api.updateRuleStore(
    'living',
    [
      {
        id: 'rule1',
        trigger: { property: 'Status', operator: 'eq', value: 'On' },
        actions: {
          css: { enabled: true, target: 'self' },
          text: { enabled: false },
        },
      },
    ],
    ''
  );
  assert.equal(api.hasEnabledRules({ key: 'living' }), true);

  store.living.rules[0].enabled = false;
  assert.equal(api.hasEnabledRules({ key: 'living' }), false);

  assert.equal(api.hasEnabledRules(null), false);
});

function permissiveCollection() {
  // Chainable no-op stand-in for any jQuery collection this test doesn't
  // care about (.dr-rules, .dt-device-rule, .de-custom-field-row, ...):
  // any method call returns the proxy itself and .each() never fires.
  const target = { __testCollection: true, length: 0 };
  const proxy = new Proxy(target, {
    get(obj, prop) {
      if (prop in obj) return obj[prop];
      return function () {
        return proxy;
      };
    },
  });
  return proxy;
}

test('enhancePopup skips the Automation section for special blocks (Title, Separator, ...) but keeps it for real devices', () => {
  const { api } = createRuntime();

  function makePopup(blockKind) {
    const beforeCalls = [];
    const customSection = {
      __testCollection: true,
      length: 1,
      before(html) {
        beforeCalls.push(html);
        return this;
      },
    };
    const okButton = { __testCollection: true, length: 1 };
    var target = {
      __testCollection: true,
      length: 1,
      _dashticzDeviceRulesSource: 'living',
      _dashticzDeviceRulesEnhanced: false,
      attr(name) {
        return name === 'data-block-kind' ? blockKind : undefined;
      },
      find(selector) {
        if (selector === '.de-custom-fields-section') return customSection;
        if (selector === '#de-config-ok') return okButton;
        return permissiveCollection();
      },
    };
    // The popup root itself also needs the same permissive fallback (e.g.
    // for the .on(...) event wiring enhancePopup does once it proceeds).
    var popup = new Proxy(target, {
      get(obj, prop) {
        if (prop in obj) return obj[prop];
        return function () {
          return popup;
        };
      },
      set(obj, prop, value) {
        obj[prop] = value;
        return true;
      },
    });
    return { popup, beforeCalls };
  }

  const special = makePopup('special');
  api.enhancePopup(special.popup);
  assert.equal(
    special.beforeCalls.length,
    0,
    'a special (e.g. Title/Separator) popup must not get an Automation section'
  );
  assert.notEqual(
    special.popup._dashticzDeviceRulesEnhanced,
    true,
    'bailing out for a special must not mark the popup as enhanced'
  );

  const device = makePopup('device');
  api.enhancePopup(device.popup);
  assert.equal(
    device.beforeCalls.length,
    1,
    'a real device popup must still get its Automation section'
  );
  assert.equal(device.popup._dashticzDeviceRulesEnhanced, true);
});
