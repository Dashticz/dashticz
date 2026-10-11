const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const bridge = 'vendor/dashticz/garbage/index.php';

function request(port, headers) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      {
        host: '127.0.0.1',
        port,
        path: `/${bridge}?service=unknown&zipcode=1234AB&nr=1`,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ res, body }));
      }
    );
    req.on('error', reject);
  });
}

async function withPhpServer(callback) {
  const port = 21000 + (process.pid % 10000);
  const proc = spawn('php', ['-S', `127.0.0.1:${port}`], { cwd: root });
  try {
    const deadline = Date.now() + 5000;
    for (;;) {
      try {
        await request(port, {});
        break;
      } catch (e) {
        if (Date.now() > deadline) throw e;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    return await callback(port);
  } finally {
    proc.kill();
  }
}

test('garbage bridge refuses cross-site requests and sends no open CORS header', async () => {
  await withPhpServer(async (port) => {
    const same = await request(port, { 'Sec-Fetch-Site': 'same-origin' });
    assert.equal(same.res.statusCode, 200);
    assert.equal(same.res.headers['access-control-allow-origin'], undefined);
    assert.ok(Array.isArray(JSON.parse(same.body)));

    const cross = await request(port, { 'Sec-Fetch-Site': 'cross-site' });
    assert.equal(cross.res.statusCode, 403);
    assert.equal(cross.res.headers['access-control-allow-origin'], undefined);

    const foreign = await request(port, { Origin: 'http://evil.example' });
    assert.equal(foreign.res.statusCode, 403);
  });
});

test('garbage bridge encodes request parameters in provider URLs and bodies', () => {
  const source = fs.readFileSync(path.join(root, bridge), 'utf8');
  const raw = source
    .split(/\r?\n/)
    .filter(
      (line) =>
        /^\s*\$(url|urltmp|data)\s*=/.test(line) &&
        /\$_GET\['(zipcode|nr|t|street)'\]/.test(line) &&
        !/urlencode\(/.test(line)
    );
  assert.deepEqual(raw, []);
});
