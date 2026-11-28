const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { spawn, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const hasPhp = spawnSync('php', ['-v']).status === 0;

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

async function withServer(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dashticz-log-'));
  let server;
  try {
    fs.mkdirSync(path.join(tmp, 'js'));
    fs.mkdirSync(path.join(tmp, 'custom'));
    fs.mkdirSync(path.join(tmp, 'vendor/dashticz'), { recursive: true });
    fs.copyFileSync(
      path.join(root, 'js/log.php'),
      path.join(tmp, 'js/log.php')
    );
    for (const file of ['security.php', 'info.php', 'log.php']) {
      fs.copyFileSync(
        path.join(root, 'vendor/dashticz', file),
        path.join(tmp, 'vendor/dashticz', file)
      );
    }
    const port = await freePort();
    server = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', tmp], {
      stdio: 'ignore',
    });
    const base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 50; i++) {
      try {
        await fetch(base + '/js/log.php');
        break;
      } catch (e) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    let cookie = '';
    async function request(url, options = {}) {
      const res = await fetch(base + url, {
        ...options,
        headers: { ...(options.headers || {}), Cookie: cookie },
      });
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0];
      return { status: res.status, body: await res.json() };
    }
    async function post(body, withToken = true) {
      const headers = { 'Content-Type': 'application/json' };
      if (withToken) {
        const csrf = await request('/vendor/dashticz/info.php?get=csrf');
        headers['X-Dashticz-CSRF'] = csrf.body.token;
      }
      return request('/js/log.php', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    }
    await fn({ tmp, request, post });
  } finally {
    if (server) server.kill();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

test('log endpoint is same-origin and CSRF protected', () => {
  const source = read('js/log.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
});

test('settings has a Log category and the server blocks custom/logs', () => {
  assert.match(read('js/settings.js'), /settingList\['log'\]/);
  assert.match(read('js/settings.js'), /bindLogPanel\(\);/);
  assert.match(read('docker/default.conf'), /location \^~ \/custom\/logs\//);
  assert.match(read('js/settings.js'), /logLevel: 'error'/);
});

test('the browser log masks secrets', () => {
  const src = read('js/debug.js');
  const match = /function maskSensitive\(text\) \{[\s\S]*?\n {2}\}\n/.exec(src);
  assert.ok(match);
  const mask = new Function(match[0] + '; return maskSensitive;')();
  const out = mask(
    'GET https://user:secret@host/x?password=abc&token=def&idx=5 Bearer abc.def'
  );
  assert.doesNotMatch(out, /secret|abc|def/);
  assert.match(out, /idx=5/);
});

test(
  'log endpoint writes masked entries, filters, limits and clears',
  { skip: !hasPhp },
  async () => {
    await withServer(async ({ tmp, request, post }) => {
      assert.equal((await post({ entries: [] }, false)).status, 403);

      const res = await post({
        entries: [
          {
            l: 'error',
            m: 'failed ?apikey=SECRET123&idx=5',
            t: '2026-11-27T10:00:00.000Z',
          },
          { l: 'action', m: 'Saved: js/savesettings.php' },
          { l: 'bogus', m: 'dropped' },
        ],
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.written, 2);

      const raw = fs.readFileSync(
        path.join(tmp, 'custom/logs/dashticz.log'),
        'utf8'
      );
      assert.doesNotMatch(raw, /SECRET123/);
      assert.match(raw, /idx=5/);
      assert.ok(fs.existsSync(path.join(tmp, 'custom/logs/.htaccess')));

      const all = await request('/js/log.php');
      assert.equal(all.body.entries.length, 2);
      const errors = await request('/js/log.php?level=error');
      assert.equal(errors.body.entries.length, 1);
      assert.equal(errors.body.entries[0].s, 'js');

      const long = await post({
        entries: [{ l: 'error', m: 'x'.repeat(5000) }],
      });
      assert.equal(long.body.written, 1);
      const last = (await request('/js/log.php?limit=1')).body.entries[0];
      assert.ok(last.m.length <= 1000);

      assert.equal((await post({ action: 'clear' })).status, 200);
      assert.equal((await request('/js/log.php')).body.entries.length, 0);
    });
  }
);

test(
  'log endpoint limits the number of lines per minute',
  { skip: !hasPhp },
  async () => {
    await withServer(async ({ post }) => {
      let written = 0;
      for (let i = 0; i < 6; i++) {
        const entries = Array.from({ length: 50 }, (_, n) => ({
          l: 'debug',
          m: `line ${i}-${n}`,
        }));
        written += (await post({ entries })).body.written;
      }
      assert.equal(written, 200);
    });
  }
);

test('widget notifications and bridge errors reach the log', () => {
  const debug = read('js/debug.js');
  assert.match(debug, /widget: widget,/);
  assert.match(debug, /Bridge error: /);
  const hc = read('js/components/homeconnect.js');
  assert.match(hc, /Debug\.widget\('HomeConnect', app\.name \+ ': ' \+ text\)/);
});

test('infoMessage, PostNL and the console report to the log', () => {
  assert.match(read('js/main.js'), /Debug\.widget\(plain\(sub\)/);
  assert.match(read('js/components/postnl.js'), /Debug\.widget\(\s*'PostNL'/);
  assert.match(read('js/debug.js'), /function hookConsole\(\)/);
});

test('every widget with its own message area reports to the log', () => {
  for (const file of [
    'f1',
    'hpilo',
    'tvgids',
    'weatherinfo',
    'mower',
    'toon',
    'fullykiosk',
    'lms',
    'trafficinfo',
    'carstatus',
  ]) {
    assert.match(
      read(`js/components/${file}.js`),
      /DT_function\.widgetLog\(/,
      file
    );
  }
});

test('widget notifications are warnings, widgets that fail are errors', () => {
  const debug = read('js/debug.js');
  assert.match(debug, /WARNING: 5/);
  assert.match(debug, /level === 'error' \? Debug\.ERROR : Debug\.WARNING/);
  assert.match(read('vendor/dashticz/log.php'), /'error', 'warning', 'action'/);
  assert.match(read('js/components/toon.js'), /me\.error, 'error'/);
  assert.match(
    read('js/components/homeconnect.js'),
    /Debug\.widget\('HomeConnect', app\.name/
  );
});
