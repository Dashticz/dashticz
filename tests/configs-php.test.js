const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { spawn, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

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

/* Serves a temporary copy of js/configs.php with the PHP built-in server, so
   the real request handling (methods, CSRF, file creation) is exercised. */
async function withServer(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dashticz-configs-'));
  let server;
  try {
    fs.mkdirSync(path.join(tmp, 'js'));
    fs.mkdirSync(path.join(tmp, 'custom'));
    fs.mkdirSync(path.join(tmp, 'vendor/dashticz'), { recursive: true });
    fs.copyFileSync(
      path.join(root, 'js/configs.php'),
      path.join(tmp, 'js/configs.php')
    );
    for (const file of ['security.php', 'info.php']) {
      fs.copyFileSync(
        path.join(root, 'vendor/dashticz', file),
        path.join(tmp, 'vendor/dashticz', file)
      );
    }
    fs.writeFileSync(
      path.join(tmp, 'custom/CONFIG.js'),
      'var config = {a:1};\n'
    );
    fs.writeFileSync(path.join(tmp, 'custom/CONFIG_DEFAULT.js'), 'x\n');
    fs.writeFileSync(path.join(tmp, 'custom/custom.css'), 'body{}\n');

    const port = await freePort();
    server = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', tmp], {
      stdio: 'ignore',
    });
    const base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 50; i++) {
      try {
        await fetch(base + '/js/configs.php');
        break;
      } catch (e) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // One cookie jar: the CSRF token lives in the PHP session.
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
      return request('/js/configs.php', {
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

test('configs endpoint is same-origin, CSRF-protected and name-restricted', () => {
  const source = read('js/configs.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /\^CONFIG\[A-Za-z0-9_-\]\*\\\.js\$/);
  assert.match(source, /fopen\(\$newPath, 'x'\)/);
});

test('settings has a Configurations category that uses the endpoint', () => {
  const settings = read('js/settings.js');
  assert.match(settings, /settingList\['configs'\]/);
  assert.match(settings, /js\/configs\.php/);
  assert.match(settings, /bindConfigsPanel\(\);/);
  assert.match(settings, /'CONFIG' \+ next \+ '\.js'/);
  // js/configs.php lives in js/, not under dashticz_php_path (vendor/dashticz/).
  assert.match(settings, /'js\/configs\.php'/);
  assert.doesNotMatch(settings, /php_path'\]\s*\+\s*'js\//);
  assert.match(read('js/components/simpleblock.js'), /logo-config/);
});

test(
  'configs endpoint lists configs and creates new ones',
  { skip: !hasPhp },
  async () => {
    await withServer(async ({ tmp, request, post }) => {
      fs.writeFileSync(
        path.join(tmp, 'custom/CONFIG2.js'),
        'var config = {};\n'
      );
      fs.writeFileSync(path.join(tmp, 'custom/notes.js'), 'x\n');

      let res = await request('/js/configs.php');
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.configs, ['CONFIG.js', 'CONFIG2.js']);

      // Empty config.
      res = await post({ name: 'empty', source: '' });
      assert.equal(res.status, 200);
      assert.equal(res.body.file, 'CONFIGempty.js');
      assert.equal(
        fs.readFileSync(path.join(tmp, 'custom/CONFIGempty.js'), 'utf8'),
        'var config = {};\n'
      );

      // Copy with stylesheet (CONFIG.js -> custom.css, CONFIG3.js -> custom3.css).
      res = await post({ name: '3', source: 'CONFIG.js', copy_css: true });
      assert.equal(res.status, 200);
      assert.equal(res.body.css_copied, true);
      assert.equal(
        fs.readFileSync(path.join(tmp, 'custom/CONFIG3.js'), 'utf8'),
        'var config = {a:1};\n'
      );
      assert.ok(fs.existsSync(path.join(tmp, 'custom/custom3.css')));

      res = await request('/js/configs.php');
      assert.deepEqual(res.body.configs, [
        'CONFIG.js',
        'CONFIG2.js',
        'CONFIG3.js',
        'CONFIGempty.js',
      ]);
    });
  }
);

test(
  'configs endpoint refuses overwrites, bad names and missing tokens',
  { skip: !hasPhp },
  async () => {
    await withServer(async ({ tmp, request, post }) => {
      let res = await post({ name: '', source: '' });
      assert.equal(res.status, 400);
      for (const name of ['../x', 'a.b', 'a/b', 'a b', 'x'.repeat(41)]) {
        res = await post({ name, source: '' });
        assert.equal(res.status, 400, name);
      }
      // CONFIG.js and CONFIG_DEFAULT.js can't be recreated or overwritten.
      res = await post({ name: '', source: '' });
      res = await post({ name: '_DEFAULT', source: '' });
      assert.equal(res.status, 400);
      assert.equal(
        fs.readFileSync(path.join(tmp, 'custom/CONFIG_DEFAULT.js'), 'utf8'),
        'x\n'
      );

      res = await post({ name: 'a', source: '../custom/CONFIG.js' });
      assert.equal(res.status, 400);
      res = await post({ name: 'a', source: 'CONFIG_DEFAULT.js' });
      assert.equal(res.status, 400);

      assert.equal((await post({ name: 'a', source: '' })).status, 200);
      res = await post({ name: 'a', source: 'CONFIG.js' });
      assert.equal(res.status, 409);
      assert.equal(
        fs.readFileSync(path.join(tmp, 'custom/CONFIGa.js'), 'utf8'),
        'var config = {};\n'
      );

      res = await post({ name: 'b', source: '' }, false);
      assert.equal(res.status, 403);
      assert.ok(!fs.existsSync(path.join(tmp, 'custom/CONFIGb.js')));
    });
  }
);

test(
  'configs endpoint deletes extra configs but never CONFIG.js',
  { skip: !hasPhp },
  async () => {
    await withServer(async ({ tmp, request, post }) => {
      fs.writeFileSync(
        path.join(tmp, 'custom/CONFIG2.js'),
        'var config = {};\n'
      );
      fs.writeFileSync(path.join(tmp, 'custom/custom2.css'), 'x{}\n');

      let res = await post({ action: 'delete', file: 'CONFIG.js' });
      assert.equal(res.status, 400);
      assert.ok(fs.existsSync(path.join(tmp, 'custom/CONFIG.js')));

      for (const file of [
        'CONFIG_DEFAULT.js',
        '../custom/CONFIG.js',
        'nope.js',
        '',
      ]) {
        res = await post({ action: 'delete', file });
        assert.ok([400, 404].includes(res.status), file);
      }
      assert.ok(fs.existsSync(path.join(tmp, 'custom/CONFIG_DEFAULT.js')));

      res = await post({ action: 'delete', file: 'CONFIG2.js' }, false);
      assert.equal(res.status, 403);
      assert.ok(fs.existsSync(path.join(tmp, 'custom/CONFIG2.js')));

      res = await post({ action: 'delete', file: 'CONFIG2.js' });
      assert.equal(res.status, 200);
      assert.ok(!fs.existsSync(path.join(tmp, 'custom/CONFIG2.js')));
      // The stylesheet is left alone.
      assert.ok(fs.existsSync(path.join(tmp, 'custom/custom2.css')));
    });
  }
);

test(
  'configs endpoint can copy only the base settings of CONFIG.js',
  { skip: !hasPhp },
  async () => {
    await withServer(async ({ tmp, post }) => {
      fs.writeFileSync(
        path.join(tmp, 'custom/CONFIG.js'),
        [
          'var config = {};',
          "config['domoticz_ip'] = 'http://d:8080';",
          "config['user_name'] = 'admin'; // login",
          "//config['pass_word'] = 'commented';",
          "config['theme'] = 'default';",
          "config['screens'] = [1];",
          "config['multi'] = {",
          '  a: 1',
          '};',
          'var blocks = {};',
          "blocks['x'] = { idx: 1 };",
          'screens[1] = { columns: [1] };',
          '',
        ].join('\n')
      );
      const res = await post({
        name: 'base',
        source: 'CONFIG.js',
        base_only: true,
      });
      assert.equal(res.status, 200);
      assert.equal(
        fs.readFileSync(path.join(tmp, 'custom/CONFIGbase.js'), 'utf8'),
        [
          'var config = {};',
          "config['domoticz_ip'] = 'http://d:8080';",
          "config['user_name'] = 'admin'; // login",
          "config['theme'] = 'default';",
          '',
        ].join('\n')
      );
    });
  }
);
