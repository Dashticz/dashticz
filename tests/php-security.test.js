const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { spawn, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

/* Runs dashticz_normalize_host_input() through the real PHP interpreter
   (not a regex on the source) so the fix for the exact reported bug -
   "http://192.168.1.6/" (pasted scheme + trailing slash) producing
   "Remote host could not be resolved." because it got concatenated into
   "http://http://192.168.1.6/:9000/jsonrpc.js" - is verified against
   actual PHP semantics, not just a pattern match. */
function normalizeHostInput(value) {
  const securityPhp = path.join(root, 'vendor/dashticz/security.php');
  const script = `require '${securityPhp}'; echo json_encode(dashticz_normalize_host_input(${JSON.stringify(value)}));`;
  const result = spawnSync('php', ['-r', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

/* Runs vendor/dashticz/lms/index.php's header setup + shutdown-handler
   registration (everything before its own try/catch) followed by a
   deliberate, uncatchable fatal error, to prove the shutdown handler turns
   that into the fixed JSON error message instead of the empty/broken
   response a bare PHP fatal error would otherwise produce (see the
   "Content-Length: 0" HTTP 500 reported for a live, genuinely unreachable
   LMS server - a fatal error the try/catch's `catch (RuntimeException)`
   can't see at all). */
function lmsShutdownFatalOutput() {
  const source = read('vendor/dashticz/lms/index.php');
  const marker = '/* Single backend bridge';
  const cut = source.indexOf(marker);
  assert.ok(cut !== -1, 'try/catch marker not found in lms/index.php');
  const prefix =
    source.slice(0, cut) +
    '\ndashticz_lms_test_only_undefined_function_call();\n';
  // __DIR__ resolves against the process cwd under `php -r`, and the file's
  // own require_once(__DIR__ . '/../security.php') expects to sit in
  // vendor/dashticz/lms/, so cwd is pointed there to match.
  const result = spawnSync('php', ['-r', prefix.replace(/^<\?php\n?/, '')], {
    encoding: 'utf8',
    cwd: path.join(root, 'vendor/dashticz/lms'),
  });
  return result.stdout;
}

/* Runs the real vendor/dashticz/lms/index.php end to end, over a real HTTP
   request, with the curl extension disabled (`php -n`, confirmed by the
   test below to actually remove ext-curl in this environment) - exactly
   like the live PHP-FPM/Apache request that produced "Uncaught Error:
   Undefined constant \"CURLOPT_POST\"" (an ext-curl-less server built a
   CURLOPT_* array as part of *calling* dashticz_lms_curl(), before that
   function's own function_exists('curl_init') guard was ever reached).
   php://input only ever carries a request body under a web SAPI (Apache/
   FPM/the CLI dev server) - a direct `php -r`/`php file.php` invocation
   always sees it as empty, so a real `php -S` server is required here
   rather than piping into a CLI invocation. Confirms the guard moved into
   the try block actually prevents the crash, not just that the source
   contains the check.
   `-n` also drops ext-json on PHP < 8 (where it's a loadable module,
   unlike 8.0+ where it's a permanent core extension) - explicitly
   reloading it keeps json_decode()/json_encode() (used by both the
   request parser and the shutdown handler's own fallback) working while
   curl stays disabled, so this only ever exercises the curl guard. */
async function lmsRequestWithoutCurl(payload) {
  const port = 20000 + (process.pid % 10000);
  const proc = spawn(
    'php',
    [
      '-n',
      '-d',
      'extension=json',
      '-d',
      'display_errors=0',
      '-S',
      `127.0.0.1:${port}`,
    ],
    { cwd: root }
  );
  let serverStderr = '';
  proc.stderr.on('data', (chunk) => {
    serverStderr += chunk;
  });
  try {
    const deadline = Date.now() + 3000;
    let ready = false;
    while (Date.now() < deadline && !ready) {
      const probe = spawnSync('curl', [
        '-s',
        '-S',
        '-o',
        '/dev/null',
        '-w',
        '%{http_code}',
        `http://127.0.0.1:${port}/`,
      ]);
      if (probe.stdout && probe.stdout.toString().trim() !== '000')
        ready = true;
    }
    const result = spawnSync(
      'curl',
      [
        '-s',
        '-S',
        '-X',
        'POST',
        '-H',
        'Content-Type: application/json',
        '-H',
        `Origin: http://127.0.0.1:${port}`,
        '-H',
        `Host: 127.0.0.1:${port}`,
        '--data',
        JSON.stringify(payload),
        `http://127.0.0.1:${port}/vendor/dashticz/lms/index.php`,
      ],
      { encoding: 'utf8' }
    );
    // A brief settle so the server's own stderr (its per-request access log
    // line, or a fatal error) has actually been flushed and read before it
    // gets attached to the diagnostics below.
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      curlStatus: result.status,
      curlError: result.error ? result.error.message : null,
      serverStderr,
    };
  } finally {
    proc.kill();
  }
}

/* vendor/dashticz/lms/index.php's own top level reads php://input and can
   die() (dashticz_require_same_origin/dashticz_json_error), so it can't be
   require()'d directly from a CLI one-liner - only the function definitions
   (everything from dashticz_lms_read_input() onward) are pulled out and
   required, to call dashticz_lms_connect_error_reason() in isolation. */
function lmsConnectErrorReason(errno) {
  const source = read('vendor/dashticz/lms/index.php');
  const marker = 'function dashticz_lms_read_input';
  const cut = source.indexOf(marker);
  assert.ok(cut !== -1, 'dashticz_lms_read_input() not found in lms/index.php');
  const securityPhp = path.join(root, 'vendor/dashticz/security.php');
  const funcsFile = path.join(
    os.tmpdir(),
    `dashticz-lms-funcs-${process.pid}.php`
  );
  fs.writeFileSync(funcsFile, '<?php\n' + source.slice(cut));
  try {
    const script = `require '${securityPhp}'; require '${funcsFile}'; echo dashticz_lms_connect_error_reason(${Number(errno)});`;
    const result = spawnSync('php', ['-r', script], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  } finally {
    fs.unlinkSync(funcsFile);
  }
}

test('remote proxy endpoints use the validated fetch helper', () => {
  for (const file of [
    'vendor/dashticz/cors.php',
    'vendor/dashticz/nocache.php',
  ]) {
    const source = read(file);
    assert.match(source, /dashticz_require_same_origin\(\)/);
    assert.match(source, /dashticz_fetch_remote\(/);
    assert.doesNotMatch(source, /Access-Control-Allow-Origin:\s*\*/);
    assert.doesNotMatch(
      source,
      /file_get_contents\(\$_SERVER\["QUERY_STRING"\]\)/
    );
  }
});

test('xmltv proxy validates remote URLs and keeps cache handling local', () => {
  const source = read('vendor/dashticz/xmltv.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_validate_remote_url\(\$url,\s*true\)/);
  assert.match(
    source,
    /dashticz_fetch_remote\(\$url,\s*52428800,\s*3,\s*true\)/
  );
  assert.match(source, /sha1\(\$url\)/);
  assert.match(source, /86400/);
  assert.match(source, /gzdecode/);
  assert.match(source, /ZipArchive/);
  assert.match(source, /file_put_contents\(\$tmpFile,\s*\$xml,\s*LOCK_EX\)/);
  assert.doesNotMatch(source, /shell_exec|exec\(|passthru|system\(/);
});

test('LMS backend bridge is same-origin gated, allows LAN access, and never leaks credentials', () => {
  const source = read('vendor/dashticz/lms/index.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  // A pasted "http://192.168.1.6/" (scheme + trailing slash) must be
  // normalized before being concatenated into 'http://' . $server . ':' .
  // $port . '/jsonrpc.js' below, or it produces a malformed double-scheme
  // URL whose host resolves to the literal string "http" and fails with
  // "Remote host could not be resolved."
  assert.match(
    source,
    /\$server = isset\(\$input\['server'\]\) \? dashticz_normalize_host_input\(\$input\['server'\]\) : '';/
  );
  // dashticz_lms_curl()'s own function_exists('curl_init') guard runs too
  // late without ext-curl: dashticz_lms_request() builds a CURLOPT_POST/...
  // array as part of *calling* that function, so PHP resolves those
  // undefined constants (a PHP 8+ fatal Error) before the guard is ever
  // reached. The same check must also run in the try block, before either
  // branch, so it is hit first.
  assert.match(
    source,
    /\$input = dashticz_lms_read_input\(\);\s*\n(?:\s*\/\/[^\n]*\n)*\s*if \(!function_exists\('curl_init'\)\) \{\s*\n\s*throw new RuntimeException\('The PHP curl extension is required for the Lyrion Music Server block\.'\);\s*\n\s*\}\s*\n\s*if \(\$input\['action'\] === 'cover'\)/
  );
  // LMS is virtually always a LAN-only server, like Domoticz itself, so the
  // private/reserved-IP block dashticz_validate_remote_url() applies by
  // default must be explicitly lifted here (mirrors xmltv.php above).
  assert.match(
    source,
    /dashticz_validate_remote_url\(\s*\n?\s*'http:\/\/' \. \$request\['server'\] \. ':' \. \$request\['port'\] \. '\/jsonrpc\.js',\s*\n\s*true/
  );
  // artwork_url is LMS-server-relative (its own image proxy/cache, e.g.
  // "/imageproxy/https%3A%2F%2Flastfm.../image.jpg" for an internet radio
  // track, or "imageproxy/..." without the leading slash from some plugins
  // - confirmed live) whenever it isn't itself an absolute http(s) URL, so
  // THAT gets the same private-IP allowance as LMS's own endpoints, after
  // normalizing a missing leading slash; only a genuinely absolute external
  // artwork_url must NOT get it (SSRF hygiene).
  assert.match(
    source,
    /if \(!preg_match\('#\^https\?:\/\/#i', \$artworkUrl\)\) \{/
  );
  assert.match(source, /\$lmsPath = '\/' \. ltrim\(\$artworkUrl, '\/'\);/);
  assert.match(
    source,
    /dashticz_validate_remote_url\(\s*\n\s*'http:\/\/' \. \$request\['server'\] \. ':' \. \$request\['port'\] \. \$lmsPath,\s*\n\s*true/
  );
  assert.match(source, /dashticz_validate_remote_url\(\$artworkUrl, false\)/);
  // artwork_url is preferred over coverid whenever LMS provides one - a
  // radio track's synthetic negative coverid has no real library artwork.
  assert.match(source, /if \(\$artworkUrl !== ''\) \{/);
  // POST-only credentials: a username/password never appears in a URL
  // (query string, <img src>) where it could end up in logs/browser history.
  assert.doesNotMatch(source, /\$_GET\[.username.\]|\$_GET\[.password.\]/);
  assert.match(source, /CURLOPT_USERPWD/);
  assert.match(source, /CURLAUTH_BASIC/);
  // Every failure path is a fixed, generic message - never the raw curl
  // error or response body, which might otherwise echo a password back. The
  // connect-failure reason is narrowed by curl_errno() alone (a fixed,
  // enumerated string), never curl_error()'s free-text message.
  assert.doesNotMatch(source, /curl_error\(/);
  assert.doesNotMatch(
    source,
    /\$response\b.*(?:\.|,)\s*getMessage|var_dump|print_r/
  );
  assert.match(
    source,
    /'Unable to connect to Lyrion Music Server' \. \$reason \. '\.'/
  );
  assert.match(source, /function dashticz_lms_connect_error_reason\(\$errno\)/);
  assert.match(source, /CURLE_COULDNT_RESOLVE_HOST/);
  assert.match(source, /CURLE_COULDNT_CONNECT/);
  assert.match(source, /CURLE_OPERATION_TIMEDOUT/);
  assert.match(source, /Authentication failed\./);
  // No SSL-verification opt-out (unlike the known legacy garbage/index.php
  // ignoressl option flagged in AGENTS.md - LMS has no such precedent to follow).
  assert.doesNotMatch(source, /CURLOPT_SSL_VERIFYPEER/);
  // Cover artwork is returned as a data: URI (base64), never a URL the
  // browser would fetch directly - so LMS/radio credentials and any LAN-only
  // hostname never reach the browser's own network requests.
  assert.match(source, /base64_encode\(\$response\['body'\]\)/);
  // A genuinely unreachable server can block in curl_exec() long enough for
  // the host's own max_execution_time to kill the script first - before this
  // file's own try/catch gets a chance to send a clean JSON error - leaving
  // the client with an empty HTTP 500 its dataType: 'json' AJAX call can't
  // parse (reported live as Content-Length: 0). A time budget above curl's
  // own worst case, plus a shutdown handler as a last-resort net for any
  // other fatal error, guarantee a parseable JSON body either way.
  // Comfortably above the image-proxy cover fetch's own worst case
  // (CONNECTTIMEOUT 4 + the 20s CURLOPT_TIMEOUT override below).
  assert.match(source, /set_time_limit\(30\)/);
  assert.match(source, /CURLOPT_TIMEOUT => 20/);
  assert.match(source, /register_shutdown_function\(function \(\) \{/);
  assert.match(source, /error_get_last\(\)/);
  assert.match(source, /E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR/);
  // A PHP engine fatal here only ever describes this file's own code (never
  // LMS response data or request credentials), so its message/line/basename
  // are safe to always surface for diagnosis - unlike a curl transport
  // error, which is still never exposed raw (checked above).
  assert.match(source, /'message' => \$error\['message'\]/);
  assert.match(source, /'file' => basename\(\$error\['file'\]\)/);
});

test('dashticz_normalize_host_input() cleans a pasted scheme/path/port from a server field', () => {
  // The exact value the user pasted into the "Server / IP" field that
  // triggered "Remote host could not be resolved.".
  assert.equal(normalizeHostInput('http://192.168.1.6/'), '192.168.1.6');
  assert.equal(normalizeHostInput('https://192.168.1.6'), '192.168.1.6');
  assert.equal(normalizeHostInput('http://lms.local/'), 'lms.local');
  assert.equal(normalizeHostInput('  192.168.1.6  '), '192.168.1.6');
  assert.equal(normalizeHostInput('192.168.1.6/'), '192.168.1.6');
  // A trailing path beyond a bare slash is stripped the same way.
  assert.equal(
    normalizeHostInput('http://192.168.1.6/jsonrpc.js'),
    '192.168.1.6'
  );
  // An accidentally-included port (the field's own job) is dropped too.
  assert.equal(normalizeHostInput('192.168.1.6:9000'), '192.168.1.6');
  // A plain host/IP with nothing to strip is returned unchanged.
  assert.equal(normalizeHostInput('192.168.1.6'), '192.168.1.6');
  assert.equal(normalizeHostInput('lms.local'), 'lms.local');
  // Multi-colon / bracketed values are left alone rather than mis-parsed as
  // "host:port" - not a realistic LMS address, but must not corrupt input.
  assert.equal(normalizeHostInput('[::1]:9000'), '[::1]:9000');
  assert.equal(normalizeHostInput(''), '');
});

test('dashticz_lms_connect_error_reason() narrows a curl connect failure to a fixed, safe reason', () => {
  // 7 = CURLE_COULDNT_CONNECT - what a genuinely unreachable/closed
  // server/port (the follow-up "Unable to connect to Lyrion Music Server"
  // report, after the address-parsing bug above was fixed) produces.
  assert.equal(
    lmsConnectErrorReason(7),
    ': check the address/port and that the server is reachable on your network'
  );
  assert.equal(
    lmsConnectErrorReason(6),
    ': the server address could not be resolved'
  );
  assert.equal(lmsConnectErrorReason(28), ': the connection timed out');
  // Any other curl errno falls back to no extra detail rather than guessing.
  assert.equal(lmsConnectErrorReason(99999), '');
});

/* Runs a real POST to the real vendor/dashticz/lms/index.php's 'cover'
   action against a mock "LMS" server distinguishing its two artwork
   endpoints (a 1x1 red PNG under /imageproxy/, a 1x1 blue PNG under
   /music/), using the exact payload shape a live radio track report sent:
   both a synthetic negative coverid AND an LMS-relative artwork_url
   ("/imageproxy/<url-encoded external URL>/image.jpg"). Confirms which one
   actually got fetched by decoding the returned data: URI and comparing it
   byte-for-byte against the two known images, rather than just asserting
   the source contains the right branch. */
function lmsFetchCover(payload) {
  const mockDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dashticz-lms-mock-'));
  const redPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  );
  const bluePng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  fs.writeFileSync(
    path.join(mockDir, 'router.php'),
    [
      '<?php',
      "header('Content-Type: image/png');",
      "if (strpos($_SERVER['REQUEST_URI'], '/imageproxy/') === 0) {",
      `  echo base64_decode('${redPng.toString('base64')}');`,
      '  exit;',
      '}',
      "if (strpos($_SERVER['REQUEST_URI'], '/music/') === 0) {",
      `  echo base64_decode('${bluePng.toString('base64')}');`,
      '  exit;',
      '}',
      'http_response_code(404);',
    ].join('\n')
  );

  const mockPort = 21000 + (process.pid % 1000);
  const dashticzPort = 22000 + (process.pid % 1000);
  const mockServer = spawn('php', [
    '-S',
    `127.0.0.1:${mockPort}`,
    path.join(mockDir, 'router.php'),
  ]);
  const dashticzServer = spawn('php', ['-S', `127.0.0.1:${dashticzPort}`], {
    cwd: root,
  });
  try {
    const deadline = Date.now() + 3000;
    while (
      Date.now() < deadline &&
      (spawnSync('curl', [
        '-s',
        '-o',
        '/dev/null',
        '-w',
        '%{http_code}',
        `http://127.0.0.1:${dashticzPort}/`,
      ])
        .stdout.toString()
        .trim() === '000' ||
        spawnSync('curl', [
          '-s',
          '-o',
          '/dev/null',
          '-w',
          '%{http_code}',
          `http://127.0.0.1:${mockPort}/`,
        ])
          .stdout.toString()
          .trim() === '000')
    ) {
      /* poll until both servers accept connections */
    }
    const result = spawnSync(
      'curl',
      [
        '-s',
        '-X',
        'POST',
        '-H',
        'Content-Type: application/json',
        '-H',
        `Origin: http://127.0.0.1:${dashticzPort}`,
        '-H',
        `Host: 127.0.0.1:${dashticzPort}`,
        '--data',
        JSON.stringify(
          Object.assign(
            { action: 'cover', server: '127.0.0.1', port: mockPort },
            payload
          )
        ),
        `http://127.0.0.1:${dashticzPort}/vendor/dashticz/lms/index.php`,
      ],
      { encoding: 'utf8' }
    );
    const parsed = JSON.parse(result.stdout);
    const gotBytes = Buffer.from(parsed.dataUrl.split(',')[1], 'base64');
    return {
      matchesRed: gotBytes.equals(redPng),
      matchesBlue: gotBytes.equals(bluePng),
    };
  } finally {
    mockServer.kill();
    dashticzServer.kill();
    fs.rmSync(mockDir, { recursive: true, force: true });
  }
}

test('LMS cover fetch prefers artwork_url over a synthetic radio coverid', () => {
  // The exact payload shape reported live for "Radio Veronica" / "Bryan
  // Adams": a synthetic negative coverid (no real library artwork - LMS's
  // own /music/<id>/cover_*.jpg lookup just returns a generic placeholder)
  // alongside an LMS-relative artwork_url (its own image proxy/cache for
  // the actual, externally-hosted track artwork).
  const result = lmsFetchCover({
    coverid: '-94832537157032',
    artworkUrl:
      '/imageproxy/https%3A%2F%2Flastfm.example%2Fimage.jpg/image.jpg',
  });
  assert.equal(
    result.matchesRed,
    true,
    'expected the imageproxy (artwork_url) image'
  );
  assert.equal(
    result.matchesBlue,
    false,
    'must not fall back to the generic coverid placeholder'
  );
});

test('LMS backend fails gracefully without the curl extension instead of crashing', async () => {
  // Sanity check that `php -n` (no php.ini) genuinely removes ext-curl in
  // this environment, so a pass below actually exercises the no-curl path
  // rather than passing vacuously because curl was loaded anyway.
  const curlCheck = spawnSync(
    'php',
    ['-n', '-r', "var_dump(function_exists('curl_init'));"],
    {
      encoding: 'utf8',
    }
  );
  assert.equal(
    curlCheck.stdout.trim(),
    'bool(false)',
    'php -n did not disable ext-curl here'
  );

  const payload = {
    action: 'rpc',
    server: '192.168.1.6',
    port: 9000,
    username: '',
    password: '',
    player: '',
    params: ['serverstatus', 0, 999],
  };
  const result = await lmsRequestWithoutCurl(payload);
  let parsed;
  assert.doesNotThrow(() => {
    parsed = JSON.parse(result.stdout);
  }, `expected valid JSON, got stdout: ${result.stdout}\nstderr: ${result.stderr}\ncurl exit status: ${result.curlStatus}\ncurl spawn error: ${result.curlError}\nphp -S server stderr: ${result.serverStderr}`);
  assert.equal(
    parsed.error,
    'The PHP curl extension is required for the Lyrion Music Server block.'
  );
  // Not the shutdown handler's fallback - the guard must catch this before
  // any CURLOPT_*/CURLE_* constant is ever referenced, so no fatal happens
  // at all (compare the "unexpectedly" test below, which does hit a fatal).
  assert.equal(parsed.debug, undefined);
});

test('LMS backend shutdown handler turns an uncaught fatal error into valid JSON', () => {
  const output = lmsShutdownFatalOutput();
  let parsed;
  assert.doesNotThrow(() => {
    parsed = JSON.parse(output);
  }, `expected valid JSON, got: ${output}`);
  assert.equal(
    parsed.error,
    'Lyrion Music Server request failed unexpectedly.'
  );
  // The debug block only ever describes this file's own code (an engine
  // fatal, never LMS/request data), and the file name is a basename only -
  // no server path - so it is safe to always include for diagnosis.
  assert.match(
    parsed.debug.message,
    /dashticz_lms_test_only_undefined_function_call/
  );
  // Run via `php -r` (no real source file), so PHP reports its own
  // "Command line code" placeholder here rather than index.php's basename -
  // this only confirms basename() is applied (no directory separator), the
  // real basename is exercised in production.
  assert.doesNotMatch(parsed.debug.file, /[/\\]/);
  assert.equal(typeof parsed.debug.line, 'number');
});

test('calendar fetching is URL validated and does not expose stack traces', () => {
  const source = read('vendor/dashticz/ical/index.php');
  const legacy = read('vendor/dashticz/ical/ical5/index.php');
  const security = read('vendor/dashticz/security.php');
  assert.match(source, /dashticz_fetch_remote\(/);
  assert.doesNotMatch(source, /debug_backtrace/);
  assert.doesNotMatch(source, /initUrl\(\$ICS/);
  assert.doesNotMatch(source, /die\(\$e\)/);
  assert.match(legacy, /dashticz_require_same_origin\(\)/);
  assert.match(legacy, /dashticz_fetch_remote\(/);
  assert.doesNotMatch(legacy, /Access-Control-Allow-Origin:\s*\*/);
  assert.match(security, /function dashticz_resolve_redirect_url/);
  assert.match(security, /if \(\$location\[0\] === '\?'\)/);
});

test('editor writes lock the read-modify-write cycle and replace atomically', () => {
  const security = read('vendor/dashticz/security.php');
  const writer = read('js/configwriter.php');
  assert.match(security, /function dashticz_acquire_file_update_lock/);
  assert.match(security, /flock\(\$lock, LOCK_EX\)/);
  assert.match(security, /function dashticz_atomic_write_file/);
  assert.match(security, /tempnam\(/);
  assert.match(security, /rename\(\$temporary, \$path\)/);
  assert.match(
    writer,
    /configwriter_read_config[\s\S]*dashticz_acquire_file_update_lock/
  );
  assert.match(writer, /dashticz_atomic_write_file\(\$configPath/);
  assert.match(writer, /configwriter_release_config_lock/);
});

test('settings writes require CSRF and serialize values as JSON', () => {
  const source = read('js/savesettings.php');
  const writer = read('js/configwriter.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /json_decode\(\$serializedValue/);
  assert.match(source, /configwriter_read_config/);
  assert.match(source, /configwriter_upsert_root_config_settings/);
  assert.match(source, /configwriter_write_config/);
  assert.match(writer, /function configwriter_upsert_root_config_settings/);
  assert.match(writer, /function configwriter_remove_config_key/);
  assert.match(writer, /PREG_OFFSET_CAPTURE/);
  assert.doesNotMatch(source, /\$rows/);
  assert.doesNotMatch(source, /unset\(\$rows/);
});

test('every configuration editor writes to the active safe cfg file', () => {
  const writer = read('js/configwriter.php');
  assert.match(writer, /function configwriter_resolve_config_path/);
  assert.match(writer, /basename\(\$cfgFile\) !== \$cfgFile/);
  assert.match(writer, /\^\[A-Za-z0-9_-\]\+\\\.js\$/);

  [
    'saveblocks.php',
    'savewidgets.php',
    'savelayout.php',
    'savegridlayout.php',
    'saveconfigmode.php',
    'savescreens.php',
    'savesettings.php',
  ].forEach((file) => {
    assert.match(
      read('js/' + file),
      /configwriter_resolve_config_path\(\$customDir\)/,
      file + ' must honor ?cfg='
    );
  });
});

test('config mode writer only accepts custom or wizard', () => {
  const source = read('js/saveconfigmode.php');
  const writer = read('js/configwriter.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /config_mode/);
  assert.match(source, /custom/);
  assert.match(source, /wizard/);
  assert.match(source, /configwriter_set_config_mode/);
  assert.match(writer, /function configwriter_set_config_mode/);
  assert.match(source, /configwriter_write_config/);
});

test('first-run access check verifies CONFIG.js as the web server user', () => {
  const source = read('js/checkconfigaccess.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /REQUEST_METHOD.*GET/);
  assert.match(source, /is_writable\(\$configPath\)/);
  assert.match(source, /is_writable\(\$customDir\)/);
  assert.match(source, /'writable' => \$writable/);
  assert.doesNotMatch(source, /chmod|file_put_contents/);
});

test('Apache write-access installer derives the path and verifies a real write', () => {
  const installer = read('tools/install-dashticz-write-access.sh');

  assert.match(installer, /INSTALL_DIR=.*SCRIPT_DIR\/\.\./);
  assert.match(installer, /js\/savesettings\.php/);
  assert.match(installer, /chmod 2775/);
  assert.match(installer, /runuser -u .* touch/);
  assert.doesNotMatch(installer, /sudoers/);
  assert.doesNotMatch(installer, /NOPASSWD/);
  assert.doesNotMatch(installer, /\/var\/www\/html/);
});

test('bundled Horizon remote requires POST, CSRF and a key allowlist', () => {
  const source = read('tools/switch_horizon.php');
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /\$allowedKeys = array\(/);
  assert.doesNotMatch(source, /\$_GET\['key'\]/);
});

test('blocks writer requires CSRF, POST, and generates named block definitions', () => {
  const source = read('js/saveblocks.php');
  const writer = read('js/configwriter.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /configwriter_write_config/);
  /* generates named block entries, not raw IDX arrays */
  assert.match(writer, /typeof blocks/);
  assert.match(writer, /typeof columns/);
  assert.match(writer, /typeof screens/);
  assert.match(source, /configwriter_editor_markers\('device'/);
  assert.match(source, /configwriter_editor_markers\('widget'/);
  assert.match(writer, /function configwriter_editor_markers/);
  assert.match(source, /blockKeys/);
  assert.match(source, /configwriter_make_device_block_key/);
  assert.match(
    source,
    /\$keyCollisionConfig = configwriter_remove_editor_sections/
  );
  assert.match(source, /configwriter_editor_markers\(\s*'grid-layout'/);
  assert.match(source, /extract_declared_block_refs\(\$keyCollisionConfig\)/);
  assert.match(writer, /function configwriter_make_device_block_key/);
  assert.match(writer, /'device_'\s*\.\s*\(int\)\$idx/);
  assert.match(writer, /isset\(\$device\['title'\]\)[\s\S]*\$props\['title'\]/);
  assert.match(writer, /\$isGroup && \(!isset\(\$device\['title'\]\)/);
  assert.match(source, /\$blocksOnly/);
  /* accepts both legacy bare integers and {idx,name} objects */
  assert.match(source, /is_int\(\$entry\)/);
  assert.match(source, /\$entry\['idx'\]/);
  assert.match(writer, /function configwriter_chunk_items_by_width/);
  assert.match(source, /array_key_exists\('height'/);
  assert.match(source, /round\(\$height \/ 10\) \* 10/);
  assert.match(writer, /height/);
  /* Device Editor helper blocks are explicitly validated and whitelisted. */
  assert.match(
    source,
    /in_array\(\$entry\['kind'\], \['dummy', 'title', 'custom', 'group', 'html', 'lms'\], true\)/
  );
  /* Lyrion Music Server block: server/port/player validated, credentials
     never echoed back in an error message. */
  assert.match(source, /kind === 'lms'/);
  assert.match(source, /Enter the Lyrion Music Server address\./);
  assert.match(source, /Enter a valid Lyrion Music Server port\./);
  assert.match(source, /Select a Lyrion Music Server player\./);
  assert.match(writer, /\$kind === 'lms'/);
  assert.match(writer, /'type' => 'lms'/);
  assert.match(source, /\^dummyblock_/);
  assert.match(source, /Existing hand-written blocktitle keys remain editable/);
  assert.match(source, /\^\[A-Za-z_\$\]/);
  assert.match(source, /positive integer idx/);
  assert.match(source, /configwriter_special_block_props/);
  assert.match(
    writer,
    /array_key_exists\('icon', \$block\) && \$block\['icon'\] !== null/
  );
  assert.match(source, /custom_fields/);
  assert.match(source, /Invalid or reserved custom device field/);
  assert.match(source, /_validate_custom_device_value/);
  assert.match(writer, /\$device\['custom_fields'\]/);
  assert.match(source, /\$height = \$kind === 'title' \? 120 : null/);
  assert.match(source, /Special block key already exists/);
  assert.match(source, /\$device\['preserveExisting'\] = in_array/);
  assert.match(source, /if \(!empty\(\$device\['preserveExisting'\]\)\)/);
  assert.doesNotMatch(source, /array_chunk\(\$.*,\s*4\)/);
  /* no raw IDX-only column block from the old implementation */
  assert.doesNotMatch(source, /columns\['device_editor'\]/);
});

test('widget writer whitelists widgets and protects CONFIG.js writes', () => {
  const source = read('js/savewidgets.php');
  const writer = read('js/configwriter.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /\$catalog = \[/);
  assert.match(source, /custom_fields/);
  assert.match(source, /Invalid or reserved custom widget field/);
  // Checkbox/core widget properties duplicated in custom_fields are ignored;
  // truly dangerous prototype keys remain rejected.
  assert.match(source, /\$managedCustomFields = \[/);
  assert.match(source, /in_array\(\$fieldKey, \$managedCustomFields, true\)/);
  assert.match(
    source,
    /\$dangerousCustomFields = \['__proto__', 'prototype', 'constructor'\]/
  );
  assert.match(source, /legacy custom icons/);
  assert.match(source, /_validate_custom_widget_value/);
  for (const id of [
    'weather',
    'garbage',
    'spotify',
    'sonarr',
    'clock',
    'calendar',
    'secpanel',
    'publictransport',
    'trafficinfo',
    'alarmmeldingen',
    'camera',
    'map',
    'longfonds',
    'moon',
    'news',
    'xmltvguide',
    'radio',
    'log',
    'sunrise',
    'owm',
    'timegraph',
  ]) {
    assert.match(source, new RegExp(`'${id}'\\s*=>`));
  }
  assert.match(source, /weather_icons/);
  assert.match(source, /showGust/);
  assert.match(source, /allowedWeatherIcons/);
  assert.match(source, /'garbage_maxdays'\s*=>\s*'number'/);
  assert.match(source, /'calendar_maxitems'\s*=>\s*'number'/);
  assert.match(source, /\$props\['maxdays'\] = \$widget\['maxdays'\]/);
  assert.match(source, /\$props\['maxitems'\] = \$widget\['maxitems'\]/);
  assert.match(source, /\$props\['aspectratio'\] = \$widget\['aspectratio'\]/);
  assert.match(source, /Unknown widget id/);
  assert.match(source, /Unknown weather provider/);
  assert.match(source, /Unknown clock type/);
  assert.match(source, /Calendar requires a valid http\(s\) ICS URL/);
  assert.match(source, /Calendar requires one to twenty calendar sources/);
  assert.match(source, /foreach \(\$icalurl as \$name => \$source\)/);
  assert.match(source, /Camera requires a valid http\(s\) image URL/);
  assert.match(source, /A camera widget supports up to 12 cameras/);
  assert.match(source, /\$props\['cameras'\] = \$widget\['cameras'\]/);
  assert.match(writer, /is_array\(\$value\)/);
  assert.match(source, /configwriter_editor_markers\('widget'/);
  assert.match(source, /blockKeys/);
  assert.match(source, /\$blocksOnly/);
  assert.match(source, /configwriter_write_config/);
});

test('custom CSS writer only manages theme variables', () => {
  const source = read('js/savecustomcss.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /array_key_exists\('vars', \$data\)/);
  assert.match(source, /if \(\$updateVars\)/);
  assert.match(source, /dashticz-theme-vars/);
  assert.doesNotMatch(source, /deviceAlignments/);
  assert.doesNotMatch(source, /dashticz-device-align/);
  assert.doesNotMatch(source, /text-align/);
  assert.match(source, /dashticz_acquire_file_update_lock\(\$cssPath\)/);
  assert.match(source, /dashticz_atomic_write_file\(\$cssPath/);
  assert.match(source, /dashticz_release_file_update_lock\(\$cssLock\)/);
});

test('layout writer stores safe references in one grouped dashboard section', () => {
  const source = read('js/savelayout.php');
  const writer = read('js/configwriter.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /\^\[A-Za-z_\]\[A-Za-z0-9_\]\*\$/);
  assert.match(source, /configwriter_editor_markers\(\s*'dashboard'/);
  assert.match(source, /configwriter\.php/);
  assert.match(source, /configwriter_extract_section_config_settings/);
  assert.match(source, /configwriter_extract_wrapped_section/);
  assert.match(source, /configwriter_remove_editor_sections/);
  assert.match(source, /configwriter_upsert_root_config_settings/);
  assert.match(
    source,
    /configwriter_upsert_root_config_settings\([\s\S]*?if \(\$screenNumber === 0\)/
  );
  assert.doesNotMatch(
    source,
    /if \(\$screenNumber === 1\)\s*\{[\s\S]*?configwriter_upsert_root_config_settings/
  );
  assert.match(source, /configwriter_build_layout_section/);
  assert.match(source, /configwriter_parse_screen_number/);
  assert.match(writer, /function configwriter_upsert_root_config_settings/);
  assert.match(writer, /function configwriter_extract_wrapped_section/);
  assert.match(writer, /function configwriter_editor_markers/);
  assert.match(writer, /configwriter_section_header\('BLOCKS'\)/);
  assert.match(writer, /configwriter_section_header\('COLUMNS'\)/);
  assert.match(writer, /configwriter_section_header\('SCREENS'\)/);
  assert.match(writer, /\(de\|we\|le\)_col/);
  assert.match(writer, /configwriter_column_prefix\('le'/);
  assert.match(source, /configwriter_write_config/);
});

test('grid layout writer validates and stores positions without column packing', () => {
  const source = read('js/savegridlayout.php');
  const writer = read('js/configwriter.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /CONTENT_LENGTH/);
  assert.match(source, /1048576/);
  assert.match(source, /\^\[A-Za-z_\]\[A-Za-z0-9_\]\*\$/);
  assert.match(source, /FILTER_VALIDATE_INT/);
  assert.match(source, /configwriter_extract_declared_block_refs/);
  assert.match(
    source,
    /configwriter_remove_editor_sections\(\$config, \$screenNumber\)/
  );
  assert.match(source, /\/\/ \[standby-editor-start\]/);
  assert.match(source, /propsJson/);
  assert.match(source, /is_object\(\$decodedProps\)/);
  assert.match(source, /configwriter_make_block_key/);
  assert.match(source, /configwriter_set_config_mode/);
  // TAAK1 (issue #98 follow-up): a plain repositioning within this screen's
  // grid must also clone when the ref is owned by another screen, not just
  // on a Wizard-conversion clone request - except for streamplayer/sunrise,
  // which are dispatched by their literal block key matching a registered
  // component name, so cloning them under a renamed key would make the
  // clone invisible to every component's dispatch check. 'log' used to be
  // exempted the same way, but now carries an explicit type:'log' so it can
  // be cloned per screen too (see savewidgets.php's _widgetBlockProps).
  assert.match(
    source,
    /\$forceClone = !configwriter_is_component_dispatched_key\(\$ref\)\s*\n\s*&& \(\(\$screenNumber === 0 && !empty\(\$entry\['clone'\]\)\) \|\| \$ownedByOtherScreen\);/
  );
  assert.match(
    writer,
    /function configwriter_is_component_dispatched_key\(\$key\)/
  );
  assert.match(
    writer,
    /return in_array\(\$key, \['streamplayer', 'sunrise'\], true\);/
  );
  assert.match(source, /configwriter_normalise_grid_position/);
  assert.match(source, /configwriter_build_grid_layout_section/);
  assert.match(source, /configwriter_editor_markers\(\s*'grid-layout'/);
  assert.match(source, /empty\(\$items\) && !isset\(\$data\['configMode'\]\)/);
  assert.match(source, /configwriter_extract_numbered_screens/);
  assert.match(source, /configwriter_remove_numbered_screen_and_compact/);
  assert.match(source, /'removedScreen'\s*=>\s*\$screenNumber/);
  assert.match(source, /configwriter_write_config/);
  assert.doesNotMatch(source, /configwriter_pack_columns_by_height/);
  assert.doesNotMatch(source, /configwriter_build_layout_section/);
  assert.match(writer, /function configwriter_extract_declared_block_refs/);
  assert.match(writer, /PREG_OFFSET_CAPTURE/);
  assert.match(writer, /\$objectStart/);
  assert.match(writer, /\$depth\+\+/);
  assert.doesNotMatch(writer, /\\\{\[\^;\]\*\\\}/);
  assert.match(writer, /function configwriter_normalise_grid_position/);
  assert.match(writer, /function configwriter_build_grid_layout_section/);
  assert.match(writer, /function configwriter_extract_numbered_screens/);
  assert.match(
    writer,
    /function configwriter_remove_numbered_screen_and_compact/
  );
  assert.match(
    writer,
    /\['device', 'widget', 'layout', 'dashboard', 'grid-layout'\]/
  );
  assert.match(writer, /\(de\|we\|le\)_s/);
  assert.match(writer, /isset\(\$item\['props'\]\)/);
  assert.match(writer, /isset\(\$item\['propsLiteral'\]\)/);
  assert.match(writer, /\$target \. "\['layout'\] = 'grid'/);
  assert.match(writer, /blocks\['.*'\]\['grid'\]/);
  assert.match(writer, /standby_screen/);
  assert.doesNotMatch(source, /not available for standby/);
});

test('device and widget writers keep the grouped layout until consolidation', () => {
  const devices = read('js/saveblocks.php');
  const widgets = read('js/savewidgets.php');
  for (const source of [devices, widgets]) {
    assert.doesNotMatch(
      source,
      /configwriter_remove_section\(\s*\$config,\s*['"]\/\/ \[layout-editor-start\]/
    );
    assert.doesNotMatch(
      source,
      /configwriter_remove_section\(\s*\$config,\s*['"]\/\/ \[dashboard-editor-start\]/
    );
  }
});

test('layout writer keeps tall blocks on the same full-width grid', () => {
  const writer = read('js/configwriter.php');
  const layout = read('js/savelayout.php');
  const styles = read('css/creative.css');
  assert.match(writer, /function configwriter_pack_columns_by_height/);
  assert.match(writer, /rowsBeside/);
  assert.match(writer, /Keep every tile in one full-width parent column/);
  assert.match(layout, /configwriter_build_layout_section/);
  assert.match(layout, /height/);
  assert.match(styles, /display: contents/);
  assert.match(styles, /id\^='block_'/);
});

test('widget writer preserves existing settings when none are posted', () => {
  const source = read('js/savewidgets.php');
  const writer = read('js/configwriter.php');
  assert.match(source, /configwriter_extract_section_config_settings/);
  assert.match(source, /existingSettings/);
  assert.match(writer, /function configwriter_extract_section_config_settings/);
  assert.match(writer, /function configwriter_emit_config_settings/);
});

test('git update endpoint allowlists branches and requires CSRF', () => {
  const source = read('js/update.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /branchMap/);
  assert.match(source, /'beta'\s*=>\s*'beta'/);
  assert.match(source, /'main'\s*=>\s*'master'/);
  assert.match(source, /pull',\s*'--ff-only'/);
  assert.match(source, /bypass_shell/);
  assert.match(source, /safe\.directory/);
  assert.match(source, /dashticz_git_writable_check/);
  assert.match(source, /Permission denied/);
  assert.doesNotMatch(source, /shell_exec|exec\(|passthru|system\(/);
});

test('standby editor section removal does not target screen 1', () => {
  const writer = read('js/configwriter.php');
  // Previously max(1, (int)$screenNumber) turned standby (0) into screen 1
  // and deleted the dashboard section.
  assert.match(
    writer,
    /function configwriter_remove_editor_sections\(\$config, \$screenNumber = 1\)/
  );
  assert.match(writer, /Screen 0 = standby; do not coerce to 1/);
  assert.doesNotMatch(
    writer,
    /function configwriter_remove_editor_sections[\s\S]{0,200}max\(1,\s*\(int\)\$screenNumber\)/
  );
  assert.match(writer, /\$n === 0[\s\S]{0,80}editor-standby-start/);
});

test('settings writer leaves the standby layout untouched', () => {
  const source = read('js/savesettings.php');
  assert.doesNotMatch(source, /standby_blocks/);
  assert.doesNotMatch(source, /configwriter_replace_standby_section/);
  assert.match(source, /configwriter_upsert_root_config_settings/);
});

test('background list endpoint safely exposes bundled and custom images', () => {
  const source = read('js/listbackgrounds.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /REQUEST_METHOD.*GET/);
  assert.match(source, /preg_match\(\'\/\^\(bg/);
  assert.match(
    source,
    /\$customDir = \$imgDir \. DIRECTORY_SEPARATOR \. 'custom'/
  );
  assert.match(source, /preg_match\(\'\/\^\(bg_\[a-z0-9\]/);
  assert.match(source, /\$images\[\] = 'img\/custom\/' \. \$entry/);
  assert.match(source, /is_link\(\$full\)/);
  assert.doesNotMatch(source, /\$_GET\[/);
  assert.doesNotMatch(source, /\$_POST\[/);
});

test('custom icon list endpoint safely exposes non-background images', () => {
  const source = read('js/listcustomicons.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /REQUEST_METHOD.*GET/);
  assert.match(source, /realpath\(__DIR__ \. '\/\.\.\/img\/custom'\)/);
  assert.match(source, /preg_match\('\/\^bg_\/i', \$entry\)/);
  assert.match(source, /\(\?:jpe\?g\|png\|webp\|gif\)/);
  assert.match(source, /is_link\(\$full\)/);
  assert.match(source, /\$images\[\] = 'custom\/' \. \$entry/);
  assert.doesNotMatch(source, /\$_GET\[/);
  assert.doesNotMatch(source, /\$_POST\[/);
});

test('streamplayer local logo lookup safely exposes tvg-id to filename mappings', () => {
  const source = read('vendor/dashticz/streamplayer.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /REQUEST_METHOD.*GET/);
  assert.match(
    source,
    /realpath\(__DIR__ \. '\/\.\.\/\.\.\/img\/custom\/radio'\)/
  );
  assert.match(source, /\(\?:jpe\?g\|png\|webp\|gif\)/);
  assert.match(source, /is_link\(\$full\)/);
  assert.match(source, /PATHINFO_FILENAME/);
  assert.doesNotMatch(source, /\$_GET\[/);
  assert.doesNotMatch(source, /\$_POST\[/);
});

test('theme list endpoint exposes only valid direct theme directories', () => {
  const source = read('js/listthemes.php');

  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /REQUEST_METHOD.*GET/);
  assert.match(source, /realpath\(__DIR__ \. '\/\.\.\/themes'\)/);
  assert.match(source, /preg_match\('\/\^\[a-z0-9\]\[a-z0-9_-\]\*\$\/i'/);
  assert.match(source, /\$entry \. '\.css'/);
  assert.match(source, /is_link\(\$themeDir\)/);
  assert.match(source, /is_link\(\$themeCss\)/);
});

test('screens writer can add extra screens with CSRF protection', () => {
  const source = read('js/savescreens.php');
  const writer = read('js/configwriter.php');
  assert.match(source, /dashticz_require_same_origin\(\)/);
  assert.match(source, /dashticz_require_csrf\(\)/);
  assert.match(source, /REQUEST_METHOD.*POST/);
  assert.match(source, /configwriter_replace_screens_section/);
  assert.match(source, /Only extra screens/);
  assert.match(writer, /function configwriter_replace_screens_section/);
  assert.match(writer, /function configwriter_emit_new_screen/);
  assert.match(writer, /screens-editor-start/);
});
