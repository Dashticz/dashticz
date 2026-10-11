const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function makeFixture() {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'dashticz-blocks-'));
  fs.mkdirSync(path.join(fixture, 'js'));
  fs.mkdirSync(path.join(fixture, 'custom'));
  fs.mkdirSync(path.join(fixture, 'vendor', 'dashticz'), { recursive: true });
  ['configwriter.php', 'widgets.json'].forEach((file) =>
    fs.copyFileSync(path.join(root, 'js', file), path.join(fixture, 'js', file))
  );
  // The request body comes from the environment instead of php://input.
  fs.writeFileSync(
    path.join(fixture, 'js', 'saveblocks.php'),
    fs
      .readFileSync(path.join(root, 'js', 'saveblocks.php'), 'utf8')
      .replace("file_get_contents('php://input')", "getenv('BODY')")
  );
  // Same-origin and CSRF checks need a browser session.
  fs.writeFileSync(
    path.join(fixture, 'vendor', 'dashticz', 'security.php'),
    fs
      .readFileSync(
        path.join(root, 'vendor', 'dashticz', 'security.php'),
        'utf8'
      )
      .replace(
        /function dashticz_require_same_origin\(\)\s*\{/,
        'function dashticz_require_same_origin() { return;'
      )
      .replace(
        /function dashticz_require_csrf\(\)\s*\{/,
        'function dashticz_require_csrf() { return;'
      )
  );
  fs.writeFileSync(
    path.join(fixture, 'runner.php'),
    "<?php\n$_SERVER['REQUEST_METHOD'] = 'POST';\ninclude __DIR__ . '/js/saveblocks.php';\n"
  );
  fs.writeFileSync(path.join(fixture, 'custom', 'CONFIG.js'), '');
  return fixture;
}

function post(fixture, body) {
  const result = spawnSync('php', [path.join(fixture, 'runner.php')], {
    encoding: 'utf8',
    cwd: fixture,
    env: Object.assign({}, process.env, { BODY: JSON.stringify(body) }),
  });
  const output = (result.stdout || '').replace(/^[\s\S]*?(?=\{)/, '');
  return { status: result.status, json: output ? JSON.parse(output) : null };
}

function readConfig(fixture) {
  return fs.readFileSync(path.join(fixture, 'custom', 'CONFIG.js'), 'utf8');
}

test('a reference-only entry keeps the definition of an existing block', () => {
  const fixture = makeFixture();
  try {
    const first = post(fixture, {
      devices: [{ idx: 5, name: 'Lamp', width: 3, icon: 'fas fa-lightbulb' }],
    });
    assert.equal(first.json.success, true);
    assert.deepEqual(first.json.blockKeys, ['device_5']);
    assert.match(readConfig(fixture), /fas fa-lightbulb/);

    const second = post(fixture, {
      devices: [
        { idx: 9, name: 'Nieuw', width: 3 },
        { ref: 'device_5', width: 6 },
      ],
    });
    assert.equal(second.json.success, true, JSON.stringify(second.json));
    assert.deepEqual(second.json.blockKeys, ['device_9', 'device_5']);
    const config = readConfig(fixture);
    assert.match(config, /blocks\['device_5'\] = \{[^\n]*fas fa-lightbulb/);
    assert.match(config, /blocks\['device_9'\]/);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('a reference-only entry for an unknown or malformed block is refused', () => {
  const fixture = makeFixture();
  try {
    assert.equal(
      post(fixture, { devices: [{ ref: 'nope', width: 3 }] }).json.error,
      'Unknown block reference.'
    );
    assert.equal(
      post(fixture, { devices: [{ ref: "a'b", width: 3 }] }).json.error,
      'Invalid block reference.'
    );
    assert.equal(
      post(fixture, { devices: [{ ref: 'x\n', width: 3 }] }).json.error,
      'Invalid block reference.'
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('a new separator entry is written as a title block', () => {
  const fixture = makeFixture();
  try {
    const result = post(fixture, {
      devices: [{ kind: 'title', key: 'Title_1', title: 'Rij', width: 12 }],
    });
    assert.equal(result.json.success, true, JSON.stringify(result.json));
    assert.deepEqual(result.json.blockKeys, ['Title_1']);
    assert.match(readConfig(fixture), /blocks\['Title_1'\][^\n]*blocktitle/);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('a block key with a trailing newline is refused', () => {
  const fixture = makeFixture();
  try {
    const result = post(fixture, {
      devices: [{ kind: 'title', key: 'Title_1\n', title: 'Rij', width: 12 }],
    });
    assert.equal(result.json.error, 'Invalid special block key.');
    assert.equal(readConfig(fixture), '');
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('a long title is cut on a character boundary', () => {
  const fixture = makeFixture();
  try {
    // 99 ASCII bytes and then a 2-byte character: byte 100 is half a character.
    const title = 'a'.repeat(99) + 'é' + 'b';
    const result = post(fixture, {
      devices: [{ kind: 'title', key: 'Title_1', title, width: 12 }],
    });
    assert.equal(result.json.success, true, JSON.stringify(result.json));
    const config = readConfig(fixture);
    assert.ok(config.includes('a'.repeat(99) + "'"));
    assert.ok(!config.includes('�'));
    assert.doesNotThrow(() =>
      new TextDecoder('utf-8', { fatal: true }).decode(
        fs.readFileSync(path.join(fixture, 'custom', 'CONFIG.js'))
      )
    );
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('custom fields cannot overwrite the validated LMS settings', () => {
  const fixture = makeFixture();
  try {
    const result = post(fixture, {
      devices: [
        {
          kind: 'lms',
          key: 'lms_1',
          title: 'Muziek',
          server: '192.168.1.5',
          custom_fields: { port: 'abc' },
        },
      ],
    });
    assert.equal(result.json.error, 'Invalid or reserved custom device field.');
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

function blockLines(fixture) {
  const script = path.join(fixture, 'lines.php');
  fs.writeFileSync(
    script,
    `<?php require_once ${JSON.stringify(path.join(root, 'js', 'configwriter.php'))};
echo json_encode(configwriter_extract_block_lines(file_get_contents(${JSON.stringify(path.join(fixture, 'custom', 'CONFIG.js'))})));`
  );
  return JSON.parse(spawnSync('php', [script], { encoding: 'utf8' }).stdout);
}

const savedClassicScreen = (blocks, screen = 1) =>
  `var config = {}\n// [dashboard-editor${screen === 1 ? '' : '-s' + screen}-start]\n${blocks}\n// [dashboard-editor${screen === 1 ? '' : '-s' + screen}-end]\n`;

test('a special block that the editor saved before can be edited again (classic screen)', () => {
  const fixture = makeFixture();
  try {
    fs.writeFileSync(
      path.join(fixture, 'custom', 'CONFIG.js'),
      savedClassicScreen(
        "blocks['Title_1'] = {type:'blocktitle', title:'Old title', width:12};"
      )
    );
    const result = post(fixture, {
      devices: [
        { kind: 'title', key: 'Title_1', title: 'NEW title', width: 12 },
      ],
    });
    assert.equal(result.json.success, true, JSON.stringify(result.json));
    assert.match(blockLines(fixture).Title_1, /NEW title/);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('a hand-written special block outside the editor sections stays as it is', () => {
  const fixture = makeFixture();
  try {
    fs.writeFileSync(
      path.join(fixture, 'custom', 'CONFIG.js'),
      "var config = {}\nblocks['Title_1'] = {type:'blocktitle', title:'Mine', extra:1};\n"
    );
    const result = post(fixture, {
      devices: [
        { kind: 'title', key: 'Title_1', title: 'NEW title', width: 12 },
      ],
    });
    assert.equal(result.json.success, true, JSON.stringify(result.json));
    assert.match(blockLines(fixture).Title_1, /Mine/);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('a device that another classic screen already owns gets its own block', () => {
  const fixture = makeFixture();
  try {
    fs.writeFileSync(
      path.join(fixture, 'custom', 'CONFIG.js'),
      savedClassicScreen(
        "blocks['device_5'] = {idx:5, title:'My lamp title'};"
      ) + 'config["x"] = 1;\nscreens[1] = {};\nscreens[2] = {};\n'
    );
    const result = post(fixture, {
      screen: 2,
      devices: [
        {
          idx: 5,
          name: 'Lamp',
          width: 6,
          title: 'Screen two title',
          key: 'device_5',
        },
      ],
    });
    assert.equal(result.json.success, true, JSON.stringify(result.json));
    assert.deepEqual(result.json.blockKeys, ['screen2_device_5']);
    assert.match(blockLines(fixture).device_5, /My lamp title/);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('calendar names that look like numbers and webcal:// sources are accepted', () => {
  const fixture = makeFixture();
  try {
    const result = post(fixture, {
      devices: [
        {
          kind: 'calendar',
          key: 'calendar_1',
          title: 'Agenda',
          custom_fields: {
            icalurl: {
              2024: { ics: 'webcal://x.nl/a.ics', color: 'red' },
              Werk: { ics: 'https://x.nl/b.ics', color: 'blue' },
            },
          },
        },
      ],
    });
    assert.equal(result.json.success, true, JSON.stringify(result.json));
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('the slide button target and key cannot be overwritten by a custom field', () => {
  const fixture = makeFixture();
  try {
    ['slide', 'button_key'].forEach((field) => {
      const result = post(fixture, {
        devices: [
          {
            kind: 'slidebutton',
            key: 'slide_1',
            slide: 2,
            custom_fields: { [field]: 0 },
          },
        ],
      });
      assert.equal(
        result.json.error,
        'Invalid or reserved custom device field.',
        field
      );
    });
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('a special block key that the layout save would refuse fails before anything is written', () => {
  const fixture = makeFixture();
  try {
    const result = post(fixture, {
      devices: [{ kind: 'title', key: 'T$1', title: 'Rij', width: 12 }],
    });
    assert.equal(result.json.error, 'Invalid special block key.');
    assert.equal(readConfig(fixture), '');
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
