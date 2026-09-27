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
    `dashticz-subdevice-${process.pid}-${Math.random().toString(36).slice(2)}.php`
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

function customBlockLine(idxPhp) {
  return runPhp(`
echo configwriter_emit_block_line('Stroom_1', configwriter_special_block_props([
    'kind' => 'custom',
    'idx' => ${idxPhp},
    'name' => 'Stroom (1)',
    'width' => 3,
    'last_update' => false,
]));
`);
}

// #1309: a P1 sub-device placed on a grid screen is stored as
// blocks['Stroom_1'] = {idx: '274_1', ...}, which the Device Editor treats as
// a Custom device. Its next save wrote idx:274, so the tile showed every value
// of the P1 meter instead of the one sub-device.
test('configwriter keeps the sub-index of a Custom device sub-device idx', () => {
  assert.equal(
    customBlockLine("'274_1'"),
    "blocks['Stroom_1'] = {idx:'274_1', width:3, title:'Stroom (1)', last_update:false};\n"
  );
});

test('configwriter leaves plain and variable Custom device idx values unchanged', () => {
  assert.match(customBlockLine('42'), /\{idx:42, /);
  assert.match(customBlockLine("'v3'"), /\{idx:'v3', /);
  // Only a positive '<idx>_<subidx>' is kept as a string; anything else
  // keeps the previous integer cast.
  assert.match(customBlockLine("'274_0'"), /\{idx:274, /);
});

test('saveblocks.php accepts the same sub-device idx shape for Custom devices', () => {
  const saveblocks = fs.readFileSync(
    path.join(root, 'js', 'saveblocks.php'),
    'utf8'
  );
  const writer = fs.readFileSync(configwriterPath, 'utf8');
  const shape = "preg_match('/^(?:v\\d+|[1-9]\\d*_[1-9]\\d*)$/'";
  assert.ok(saveblocks.includes(shape), 'saveblocks.php validation');
  assert.ok(writer.includes(shape), 'configwriter.php custom branch');
});

test('Device Editor keeps a Custom device sub-device idx as a string', () => {
  const deviceEditor = fs.readFileSync(
    path.join(root, 'js', 'deviceeditor.js'),
    'utf8'
  );
  assert.match(
    deviceEditor,
    /function _isCustomSubdeviceIdx\(idx\) \{\s*return typeof idx === 'string' && \/\^\[1-9\]\[0-9\]\*_\[1-9\]\[0-9\]\*\$\/\.test\(idx\);/
  );
  // _specialFromReference(): the sub-device string is kept instead of
  // falling through to parseInt(), which dropped the sub-index.
  assert.match(
    deviceEditor,
    /: kind === 'custom' && _isCustomSubdeviceIdx\(definition\.idx\)\s*\? definition\.idx\s*: parseInt\(definition\.idx, 10\),/
  );
});
