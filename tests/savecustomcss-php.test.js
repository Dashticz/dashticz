const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { spawn, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
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

/* Serves a temporary copy of the editor save endpoints with the PHP built-in
   server, so the real request handling is exercised. */
async function withServer(fn, env = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dashticz-css-'));
  let server;
  try {
    fs.mkdirSync(path.join(tmp, 'js'));
    fs.mkdirSync(path.join(tmp, 'custom'));
    fs.mkdirSync(path.join(tmp, 'vendor/dashticz'), { recursive: true });
    for (const file of [
      'savecustomcss.php',
      'configwriter.php',
      'update.php',
    ]) {
      fs.copyFileSync(path.join(root, 'js', file), path.join(tmp, 'js', file));
    }
    for (const file of ['security.php', 'info.php']) {
      fs.copyFileSync(
        path.join(root, 'vendor/dashticz', file),
        path.join(tmp, 'vendor/dashticz', file)
      );
    }
    fs.writeFileSync(path.join(tmp, 'custom/custom.css'), 'body{color:red}\n');

    const port = await freePort();
    server = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', tmp], {
      stdio: 'ignore',
      env: { ...process.env, ...env },
    });
    const base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 50; i++) {
      try {
        await fetch(base + '/vendor/dashticz/info.php?get=csrf');
        break;
      } catch (e) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    let cookie = '';
    async function save(query, vars, endpoint = 'savecustomcss.php') {
      const csrf = await fetch(base + '/vendor/dashticz/info.php?get=csrf', {
        headers: { Cookie: cookie },
      });
      const setCookie = csrf.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0];
      const token = (await csrf.json()).token;
      const res = await fetch(base + '/js/' + endpoint + query, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dashticz-CSRF': token,
          Cookie: cookie,
        },
        body: JSON.stringify(
          endpoint === 'update.php' ? { branch: 'beta' } : { vars }
        ),
      });
      return { status: res.status, body: await res.json() };
    }
    await fn({ tmp, save });
  } finally {
    if (server) server.kill();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

test(
  'theme variables go to the stylesheet of the active configuration',
  { skip: !hasPhp },
  async () => {
    await withServer(async ({ tmp, save }) => {
      const main = await save('', { '--main-bg': '#111111' });
      assert.equal(main.status, 200);
      assert.match(
        fs.readFileSync(path.join(tmp, 'custom/custom.css'), 'utf8'),
        /--main-bg: #111111/
      );
      assert.equal(fs.existsSync(path.join(tmp, 'custom/custom2.css')), false);

      const second = await save('?cfg=CONFIG2.js', { '--main-bg': '#222222' });
      assert.equal(second.status, 200);
      const css2 = fs.readFileSync(
        path.join(tmp, 'custom/custom2.css'),
        'utf8'
      );
      assert.match(css2, /--main-bg: #222222/);
      // The new stylesheet starts as a copy of custom.css, so the
      // hand-written rules keep applying.
      assert.match(css2, /body\{color:red\}/);
      const css1 = fs.readFileSync(path.join(tmp, 'custom/custom.css'), 'utf8');
      assert.match(css1, /--main-bg: #111111/);
      assert.doesNotMatch(css1, /#222222/);
    });
  }
);

test(
  'the editor endpoints only accept CONFIG<name>.js and no external url()',
  { skip: !hasPhp },
  async () => {
    await withServer(async ({ save }) => {
      for (const cfg of [
        'custom.js',
        'CONFIG_DEFAULT.js',
        'x.js',
        '..%2Fx.js',
      ]) {
        const res = await save('?cfg=' + cfg, { '--main-bg': '#111111' });
        assert.equal(res.status, 400, cfg);
      }
      const url = await save('', { '--main-bg': 'url(//evil.example/x.png)' });
      assert.equal(url.status, 400);
    });
  }
);

test(
  'the owner can switch the editors and the updater off',
  { skip: !hasPhp },
  async () => {
    await withServer(
      async ({ tmp, save }) => {
        const css = await save('', { '--main-bg': '#111111' });
        assert.equal(css.status, 403);
        assert.match(css.body.error, /read-only/);
        assert.doesNotMatch(
          fs.readFileSync(path.join(tmp, 'custom/custom.css'), 'utf8'),
          /#111111/
        );
        const update = await save('', {}, 'update.php');
        assert.equal(update.status, 403);
        assert.match(update.body.error, /Updating/);
      },
      { DASHTICZ_READ_ONLY: '1' }
    );
    await withServer(
      async ({ save }) => {
        const css = await save('', { '--main-bg': '#111111' });
        assert.equal(css.status, 200);
        const update = await save('', {}, 'update.php');
        assert.equal(update.status, 403);
        assert.match(update.body.error, /Updating/);
      },
      { DASHTICZ_DISABLE_UPDATE: 'yes' }
    );
    // "0" or "off" is not a switch; a marker file in custom/ is.
    await withServer(
      async ({ tmp, save }) => {
        assert.equal((await save('', { '--main-bg': '#111111' })).status, 200);
        fs.writeFileSync(path.join(tmp, 'custom/.readonly'), '');
        assert.equal((await save('', { '--main-bg': '#222222' })).status, 403);
      },
      { DASHTICZ_READ_ONLY: 'off' }
    );
  }
);
