const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const phpPath = path.join(__dirname, '..', 'js', 'savedevicerules.php');
const phpSource = fs.readFileSync(phpPath, 'utf8');

function runPhpLibrary(expression) {
  const start = phpSource.indexOf('$allowedOperators = array(');
  const end = phpSource.indexOf('\n$rules = array();', start);
  assert.notEqual(start, -1, 'allowed operator block not found');
  assert.notEqual(end, -1, 'normalization library end not found');

  const file = path.join(
    os.tmpdir(),
    `dashticz-device-rules-${process.pid}-${Math.random().toString(36).slice(2)}.php`
  );
  fs.writeFileSync(
    file,
    '<?php\n' + phpSource.slice(start, end) + '\n' + expression + '\n'
  );
  try {
    const result = spawnSync('php', [file], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return result.stdout;
  } finally {
    fs.unlinkSync(file);
  }
}

function normalize(rule, source = 'source') {
  const encoded = Buffer.from(JSON.stringify(rule), 'utf8').toString('base64');
  const output = runPhpLibrary(`
$input = json_decode(base64_decode('${encoded}'), true);
list($rule, $error) = device_rules_normalize_rule($input, 0, ${JSON.stringify(
    source
  )});
echo json_encode(array('rule' => $rule, 'error' => $error));
`);
  return JSON.parse(output);
}

test('PHP endpoint passes a syntax check', () => {
  const result = spawnSync('php', ['-l', phpPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('server normalises schema v2 with CSS and text actions', () => {
  const result = normalize({
    id: 'combined',
    enabled: true,
    trigger: { property: 'Status', operator: 'eq', value: 'On' },
    actions: {
      css: {
        enabled: true,
        target: 'self',
        className: 'combined-active',
        style: {
          mode: 'background-border',
          backgroundColor: '#123456',
          backgroundOpacity: 0.45,
          borderWidth: 3,
          borderStyle: 'dashed',
          borderColor: '#abcdef',
        },
      },
      text: {
        enabled: true,
        target: 'message',
        outputMode: 'line',
        textOn: 'Active',
        textOff: 'Inactive',
      },
    },
  });

  assert.equal(result.error, null);
  assert.equal(result.rule.id, 'combined');
  assert.equal(result.rule.actions.css.target, 'self');
  assert.equal(result.rule.actions.css.style.backgroundOpacity, 0.45);
  assert.equal(result.rule.actions.text.target, 'message');
  assert.equal(result.rule.actions.text.outputMode, 'line');
  assert.equal(result.rule.actions.text.textOn, 'Active');
});

test('server converts previous flat rules to the grouped schema', () => {
  const cssResult = normalize({
    enabled: true,
    property: 'Status',
    operator: 'eq',
    value: 'On',
    action: 'class',
    target: 'legacy_target',
    className: 'legacy-warning',
  });
  assert.equal(cssResult.error, null);
  assert.equal(cssResult.rule.actions.css.enabled, true);
  assert.equal(cssResult.rule.actions.css.target, 'legacy_target');
  assert.equal(cssResult.rule.actions.css.style.mode, 'existing');
  assert.equal(cssResult.rule.actions.text.enabled, false);

  const textResult = normalize({
    enabled: true,
    property: 'Status',
    operator: 'eq',
    value: 'On',
    action: 'text',
    target: 'legacy_text',
    textOn: 'True',
    textOff: 'False',
  });
  assert.equal(textResult.error, null);
  assert.equal(textResult.rule.actions.css.enabled, false);
  assert.equal(textResult.rule.actions.text.enabled, true);
  assert.equal(textResult.rule.actions.text.target, 'legacy_text');
  assert.equal(textResult.rule.actions.text.outputMode, 'line');
});

test('server rejects unsafe trigger paths and incomplete enabled text actions', () => {
  const unsafe = normalize({
    id: 'unsafe',
    trigger: { property: '__proto__.polluted', operator: 'eq', value: '1' },
    actions: {
      css: {
        enabled: true,
        target: 'self',
        className: 'safe-class',
        style: { mode: 'background' },
      },
      text: { enabled: false },
    },
  });
  assert.match(unsafe.error, /Invalid Device Rule property/);

  const missingTarget = normalize({
    id: 'missing_target',
    trigger: { property: 'Status', operator: 'eq', value: 'On' },
    actions: {
      css: { enabled: false },
      text: { enabled: true, target: '', textOn: 'On', textOff: '' },
    },
  });
  assert.match(missingTarget.error, /target device/);
});

test('server rejects unknown text output modes', () => {
  const result = normalize({
    id: 'bad_output_mode',
    enabled: true,
    trigger: { property: 'Status', operator: 'eq', value: 'On' },
    actions: {
      css: { enabled: false },
      text: {
        enabled: true,
        target: 'message',
        outputMode: 'append-html',
        textOn: 'On',
        textOff: '',
      },
    },
  });
  assert.match(result.error, /text output mode/);
});

test('disabled CSS drafts may keep an empty banner without blocking a text action', () => {
  const result = normalize({
    id: 'text_only',
    enabled: true,
    trigger: { property: 'Status', operator: 'eq', value: 'On' },
    actions: {
      css: {
        enabled: false,
        target: 'self',
        className: '',
        style: { mode: 'banner', bannerText: '' },
      },
      text: {
        enabled: true,
        target: 'message',
        textOn: 'On',
        textOff: 'Off',
      },
    },
  });
  assert.equal(result.error, null);
  assert.equal(result.rule.actions.css.style.mode, 'banner');
  assert.equal(result.rule.actions.css.style.bannerText, '');
});

test('server CSS generation skips a disabled master rule', () => {
  const rule = {
    id: 'disabled_visual',
    enabled: false,
    trigger: { property: 'Status', operator: 'eq', value: 'On' },
    actions: {
      css: {
        enabled: true,
        target: 'self',
        className: 'disabled-visual',
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
  };
  const encoded = Buffer.from(JSON.stringify(rule), 'utf8').toString('base64');
  const output = runPhpLibrary(`
$input = json_decode(base64_decode('${encoded}'), true);
list($rule, $error) = device_rules_normalize_rule($input, 0, 'source');
if ($error !== null) { echo $error; exit(2); }
echo device_rules_css_for_rules(array($rule));
`);
  assert.equal(output, '');
});

test('server CSS generation reads the nested CSS action', () => {
  const rule = {
    id: 'visual',
    enabled: true,
    trigger: { property: 'Status', operator: 'eq', value: 'On' },
    actions: {
      css: {
        enabled: true,
        target: 'self',
        className: 'visual-active',
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
  };
  const encoded = Buffer.from(JSON.stringify(rule), 'utf8').toString('base64');
  const output = runPhpLibrary(`
$input = json_decode(base64_decode('${encoded}'), true);
list($rule, $error) = device_rules_normalize_rule($input, 0, 'source');
if ($error !== null) { echo $error; exit(2); }
echo device_rules_css_for_rules(array($rule));
`);
  assert.match(output, /html body \.dt_block\.transbg\.visual-active,/);
  assert.match(output, /html body \.mh\.transbg\.visual-active/);
  assert.match(output, /background: rgba\(16, 32, 48, 0\.40\) !important;/);
  assert.match(output, /border: 4px double #abcdef !important;/);
});

test('endpoint keeps the existing same-origin, CSRF, managed-block and atomic-write protections', () => {
  assert.match(phpSource, /dashticz_require_same_origin\(\)/);
  assert.match(phpSource, /dashticz_require_csrf\(\)/);
  assert.match(phpSource, /device_rules_managed_markers/);
  assert.match(phpSource, /dashticz_acquire_file_update_lock/);
  assert.match(phpSource, /dashticz_atomic_write_file/);
  assert.match(phpSource, /'schemaVersion' => 2/);
  assert.match(phpSource, /'actions' => array\(/);
  assert.match(phpSource, /Duplicate Device Rule id/);
});
