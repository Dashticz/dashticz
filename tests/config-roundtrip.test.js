const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.join(__dirname, '..');
const configwriterPath = path.join(root, 'js', 'configwriter.php');

function runPhp(expression) {
  const file = path.join(
    os.tmpdir(),
    `dashticz-roundtrip-${process.pid}-${Math.random().toString(36).slice(2)}.php`
  );
  fs.writeFileSync(
    file,
    `<?php\nrequire_once(${JSON.stringify(configwriterPath)});\n${expression}\n`
  );
  try {
    const result = spawnSync('php', [file], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return result.stdout;
  } finally {
    fs.unlinkSync(file);
  }
}

function specialLine(block) {
  return runPhp(
    `echo configwriter_emit_block_line('b', configwriter_special_block_props(${block}));`
  );
}

function deviceLine(device) {
  return runPhp(
    `echo configwriter_emit_block_line('b', configwriter_device_block_props(${device}));`
  );
}

// A documented Group idx 's12' (docs/blocks/specials/group.rst) used to be
// read as null by the Device Editor, so every save of that screen failed
// with "A group block requires an idx or at least one device". A bare 12
// would mean device 12 to js/devicerules.js, so the string is kept.
test('a Group block keeps its s<idx> group/scene reference', () => {
  assert.match(
    specialLine("['kind' => 'group', 'idx' => 's12', 'name' => 'G']"),
    /\{[^}]*idx:'s12'/
  );
  assert.match(
    specialLine("['kind' => 'group', 'idx' => 12, 'name' => 'G']"),
    /\{[^}]*idx:12[,}]/
  );
});

// A scene under a hand-picked key is a Custom device (like #1309's
// sub-devices) and keeps its s<idx> instead of being renamed to key 's5'.
test('a Custom device keeps an s<idx> reference', () => {
  assert.match(
    specialLine("['kind' => 'custom', 'idx' => 's5', 'name' => 'Scene']"),
    /^blocks\['b'\] = \{idx:'s5', /
  );
});

// last_update null = the block had none and the toggle was not changed:
// it must stay out so the tile keeps following settings['last_update'].
test('an inherited Last update is left out, an explicit one is kept', () => {
  assert.doesNotMatch(
    deviceLine("['idx' => 43, 'last_update' => null]"),
    /last_update/
  );
  assert.match(
    deviceLine("['idx' => 43, 'last_update' => false]"),
    /last_update:false/
  );
  assert.match(
    deviceLine("['idx' => 43, 'last_update' => true]"),
    /last_update:true/
  );
  assert.doesNotMatch(
    specialLine(
      "['kind' => 'group', 'idx' => 's12', 'name' => 'G', 'last_update' => null]"
    ),
    /last_update/
  );
  assert.match(
    specialLine(
      "['kind' => 'group', 'idx' => 's12', 'name' => 'G', 'last_update' => false]"
    ),
    /last_update:false/
  );
});

test('saveblocks.php passes an omitted Last update on as null', () => {
  const saveblocks = fs.readFileSync(
    path.join(root, 'js', 'saveblocks.php'),
    'utf8'
  );
  assert.match(
    saveblocks,
    /function _dashticz_editor_last_update\(\$entry\)\s*\{\s*return is_array\(\$entry\) && array_key_exists\('last_update', \$entry\)\s*\? !empty\(\$entry\['last_update'\]\)\s*: null;/
  );
  assert.doesNotMatch(saveblocks, /!empty\(\$entry\['last_update'\]\),/);
  // Group idx and Custom idx accept the documented s<idx> form.
  assert.match(
    saveblocks,
    /preg_match\('\/\^s\[1-9\]\\d\*\$\/', \$entry\['idx'\]\)/
  );
  assert.match(
    saveblocks,
    /preg_match\('\/\^\(\?:v\\d\+\|s\[1-9\]\\d\*\|\[1-9\]\\d\*_\[1-9\]\\d\*\)\$\/', \$entry\['idx'\]\)/
  );
});

// A TVgids block (js/components/tvgids.js) is dispatched on its tvgids
// channel list, which - like every other TVgids setting - arrives as a
// custom field.
test('a TVgids block is written with its channel list and settings', () => {
  const line = specialLine(
    "['kind' => 'tvgids', 'name' => 'TVgids', 'width' => 12, 'icon' => 'fas fa-tv', 'custom_fields' => ['tvgids' => 'npo_1,rtl_4', 'tvgidsmaxitems' => 5]]"
  );
  assert.match(line, /tvgids:'npo_1,rtl_4'/);
  assert.match(line, /tvgidsmaxitems:5/);
  assert.match(line, /width:12/);
  assert.doesNotMatch(line, /type:/);
});

// A Fully Kiosk block (js/components/fullykiosk.js) is dispatched on
// fullymode; the connection and charge settings arrive as custom fields.
test('a Fully Kiosk block is written with its mode and settings', () => {
  const line = specialLine(
    "['kind' => 'fullykiosk', 'name' => 'Fully Kiosk', 'width' => 4, 'icon' => 'fas fa-tablet-screen-button', 'custom_fields' => ['fullymode' => 'charge', 'fullyhost' => '192.168.1.50', 'fullyswitch' => 123]]"
  );
  assert.match(line, /fullymode:'charge'/);
  assert.match(line, /fullyhost:'192\.168\.1\.50'/);
  assert.match(line, /fullyswitch:123/);
  assert.match(line, /width:4/);
  assert.doesNotMatch(line, /type:/);
});
