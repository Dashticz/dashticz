const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const endpointSource = path.join(root, 'js', 'savedevicerules.php');

function makeFixture() {
  const fixture = fs.mkdtempSync(
    path.join(os.tmpdir(), 'dashticz-device-rules-')
  );
  fs.mkdirSync(path.join(fixture, 'js'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'vendor', 'dashticz'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'custom'), { recursive: true });
  fs.copyFileSync(
    endpointSource,
    path.join(fixture, 'js', 'savedevicerules.php')
  );

  fs.writeFileSync(
    path.join(fixture, 'vendor', 'dashticz', 'security.php'),
    `<?php
function dashticz_require_same_origin() {}
function dashticz_require_csrf() {}
function dashticz_json_error($status, $message) {
    http_response_code($status);
    echo json_encode(array('error' => $message));
    exit(23);
}
function dashticz_owner_info($path) { return ''; }
function dashticz_acquire_file_update_lock($path) {
    return fopen($path . '.lock', 'c');
}
function dashticz_release_file_update_lock($handle) {
    if (is_resource($handle)) fclose($handle);
}
function dashticz_atomic_write_file($path, $contents, $mode) {
    $directory = dirname($path);
    if (!is_dir($directory)) return false;
    $tmp = tempnam($directory, '.device-rules-');
    if ($tmp === false) return false;
    $ok = file_put_contents($tmp, $contents) !== false;
    if ($ok) $ok = rename($tmp, $path);
    if (!$ok && file_exists($tmp)) unlink($tmp);
    if ($ok) chmod($path, $mode);
    return $ok;
}
`,
    'utf8'
  );

  fs.writeFileSync(
    path.join(fixture, 'runner.php'),
    `<?php
$_SERVER['REQUEST_METHOD'] = 'POST';
$_POST = json_decode(base64_decode($argv[1]), true);
include __DIR__ . '/js/savedevicerules.php';
`,
    'utf8'
  );

  fs.writeFileSync(
    path.join(fixture, 'custom', 'custom.js'),
    '// hand-written JavaScript must remain\nwindow.userFunction = true;\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(fixture, 'custom', 'custom.css'),
    '/* hand-written CSS must remain */\n.manual-class { color: white; }\n',
    'utf8'
  );
  return fixture;
}

function runEndpoint(fixture, rules, source = 'device_123') {
  const post = {
    source,
    schema_version: 2,
    rules: JSON.stringify(rules),
    custom_js_handler: '',
    css_file: 'custom.css',
    custom_folder: 'custom',
  };
  const encoded = Buffer.from(JSON.stringify(post)).toString('base64');
  return spawnSync('php', [path.join(fixture, 'runner.php'), encoded], {
    encoding: 'utf8',
    cwd: fixture,
  });
}

function dualActionRule(backgroundColor = '#ff0000') {
  return {
    id: 'door_warning',
    enabled: true,
    trigger: {
      property: 'Status',
      operator: 'eq',
      value: 'Open',
    },
    actions: {
      css: {
        enabled: true,
        target: 'self',
        className: 'door_warning_open',
        style: {
          mode: 'background-border',
          backgroundColor,
          backgroundOpacity: 0.4,
          borderWidth: 3,
          borderStyle: 'dashed',
          borderColor: '#00ff00',
          textColor: '#ffffff',
          bannerText: '',
          bannerTop: 40,
          fontSize: 20,
        },
      },
      text: {
        enabled: true,
        target: 'status_message',
        textOn: 'The door is open',
        textOff: 'The door is closed',
      },
    },
  };
}

test('schema v2 writes both actions and preserves hand-written custom files', () => {
  const fixture = makeFixture();
  try {
    const first = runEndpoint(fixture, [dualActionRule()]);
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const response = JSON.parse(first.stdout);
    assert.equal(response.success, true);
    assert.equal(response.schema_version, 2);

    const customJs = fs.readFileSync(
      path.join(fixture, 'custom', 'custom.js'),
      'utf8'
    );
    const customCss = fs.readFileSync(
      path.join(fixture, 'custom', 'custom.css'),
      'utf8'
    );

    assert.match(customJs, /window\.userFunction = true/);
    assert.match(customJs, /"schemaVersion": 2/);
    assert.match(customJs, /"trigger": \{/);
    assert.match(customJs, /"css": \{/);
    assert.match(customJs, /"text": \{/);
    assert.match(customJs, /"target": "status_message"/);
    assert.match(customCss, /\.manual-class/);
    assert.match(
      customCss,
      /html body \.dt_block\.transbg\.door_warning_open,/
    );
    assert.match(customCss, /html body \.mh\.transbg\.door_warning_open/);
    assert.match(customCss, /rgba\(255, 0, 0, 0\.40\)/);
    assert.match(customCss, /border: 3px dashed #00ff00/);

    // Updating the same source replaces its managed block instead of
    // duplicating it, while unrelated hand-written content survives.
    const second = runEndpoint(fixture, [dualActionRule('#0000ff')]);
    assert.equal(second.status, 0, second.stderr || second.stdout);
    const updatedCss = fs.readFileSync(
      path.join(fixture, 'custom', 'custom.css'),
      'utf8'
    );
    assert.equal(
      (updatedCss.match(/dashticz-device-rules-css:/g) || []).length,
      2,
      'one start and one end marker remain'
    );
    assert.match(updatedCss, /rgba\(0, 0, 255, 0\.40\)/);
    assert.doesNotMatch(updatedCss, /rgba\(255, 0, 0, 0\.40\)/);
    assert.match(updatedCss, /\.manual-class/);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('legacy flat text rules are converted without losing their behavior', () => {
  const fixture = makeFixture();
  try {
    const legacy = {
      enabled: true,
      property: 'Status',
      operator: 'eq',
      value: 'On',
      action: 'text',
      target: 'legacy_message',
      textOn: 'Active',
      textOff: 'Inactive',
    };
    const result = runEndpoint(fixture, [legacy], 'device_9');
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const customJs = fs.readFileSync(
      path.join(fixture, 'custom', 'custom.js'),
      'utf8'
    );
    assert.match(customJs, /"trigger": \{/);
    assert.match(
      customJs,
      /"enabled": true,\s*\n\s*"target": "legacy_message"/
    );
    assert.match(customJs, /"textOn": "Active"/);
    assert.match(customJs, /"textOff": "Inactive"/);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('an enabled text action requires a target and at least one text value', () => {
  const fixture = makeFixture();
  try {
    const invalid = dualActionRule();
    invalid.actions.css.enabled = false;
    invalid.actions.text.target = 'status_message';
    invalid.actions.text.textOn = '';
    invalid.actions.text.textOff = '';
    const result = runEndpoint(fixture, [invalid]);
    assert.equal(result.status, 23);
    const response = JSON.parse(result.stdout);
    assert.match(response.error, /true and\/or false/);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
