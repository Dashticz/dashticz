const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function filesBelow(directory, extension) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...filesBelow(fullPath, extension));
    else if (entry.isFile() && fullPath.endsWith(extension)) result.push(fullPath);
  }
  return result;
}

function parseLocation(search) {
  const source = fs.readFileSync(path.join(root, 'js/functions.js'), 'utf8');
  const start = source.indexOf('function getLocationParameters()');
  const end = source.indexOf('\nfunction toLower', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const context = {
    window: { location: { search } },
    result: null,
  };
  vm.runInNewContext(
    source.substring(start, end) + '\nresult = getLocationParameters();',
    context
  );
  return Object.assign({}, context.result);
}

function compareVersions(left, right) {
  const source = fs.readFileSync(path.join(root, 'js/version.js'), 'utf8');
  const start = source.indexOf('function compareVersions(left, right)');
  const end = source.indexOf('\n// eslint-disable-next-line no-unused-vars\nfunction initVersion()', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const context = { left, right, result: null };
  vm.runInNewContext(
    source.substring(start, end) +
      '\nresult = compareVersions(left, right);',
    context
  );
  return context.result;
}

test('all application JavaScript files pass a syntax check', () => {
  const files = [
    ...filesBelow(path.join(root, 'js'), '.js'),
    ...filesBelow(path.join(root, 'src'), '.js'),
  ];
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr || file);
  }
});

test('all project JSON files parse', () => {
  const ignored = new Set(['node_modules', '.git']);
  function collect(directory) {
    const result = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && ignored.has(entry.name)) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) result.push(...collect(fullPath));
      else if (entry.isFile() && fullPath.endsWith('.json')) result.push(fullPath);
    }
    return result;
  }

  for (const file of collect(root)) {
    const source = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    assert.doesNotThrow(() => JSON.parse(source), file);
  }
});

test('favicon assets stay minimal and all references resolve', () => {
  const faviconDirectory = path.join(root, 'img/favicon');
  assert.deepEqual(fs.readdirSync(faviconDirectory).sort(), [
    'app-icon-192x192.png',
    'favicon.ico',
  ]);

  for (const relativeFile of ['index.html', 'tools/log.html']) {
    const source = fs.readFileSync(path.join(root, relativeFile), 'utf8');
    const references = Array.from(
      source.matchAll(/(?:href|src|content)="(img\/favicon\/[^"?]+)(?:\?[^\"]*)?"/g),
      (match) => match[1]
    );
    assert.ok(references.length >= 2, relativeFile);
    for (const reference of references) {
      assert.ok(fs.existsSync(path.join(root, reference)), reference);
    }
  }
});

test('location parameters preserve equals signs and decode plus signs', () => {
  assert.deepEqual(parseLocation('?token=a%3Db%3Dc&name=Jane+Doe'), {
    token: 'a=b=c',
    name: 'Jane Doe',
  });
});

test('location parameters ignore malformed and prototype keys', () => {
  assert.deepEqual(
    parseLocation('?bad=%E0%A4%A&__proto__=polluted&constructor=nope&ok=yes'),
    { ok: 'yes' }
  );
});

test('update check only treats a newer remote version as an update', () => {
  assert.equal(compareVersions('3.19', '3.20.0'), -1);
  assert.equal(compareVersions('3.20', '3.20.0'), 0);
  assert.equal(compareVersions('3.20.0', '3.19.2.0'), 1);
  assert.equal(compareVersions('3.20.1', '3.20.0'), 1);
});

test('package and runtime versions remain synchronized', () => {
  const packageVersion = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
  ).version;
  const runtimeVersion = JSON.parse(
    fs.readFileSync(path.join(root, 'version.txt'), 'utf8')
  ).version;
  assert.equal(runtimeVersion, packageVersion);
});

test('JavaScript and stylesheet bundles use the same cache version', () => {
  const loader = fs.readFileSync(path.join(root, 'js/loader.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const loaderVersion = loader.match(/_DASHTICZ_VERSION = (\d+)/);
  const stylesheetVersion = index.match(/bundle\.css\?v=(\d+)/);
  assert.ok(loaderVersion);
  assert.ok(stylesheetVersion);
  assert.equal(stylesheetVersion[1], loaderVersion[1]);
});

test('security-sensitive regressions stay fixed', () => {
  const domoticz = fs.readFileSync(path.join(root, 'js/domoticz-api.js'), 'utf8');
  const loader = fs.readFileSync(path.join(root, 'js/loader.js'), 'utf8');
  const camera = fs.readFileSync(path.join(root, 'js/components/camera.js'), 'utf8');

  assert.match(domoticz, /initialUpdate\.state\(\) !== 'resolved'/);
  assert.match(domoticz, /delete callbackList\[currentRequestId\]/);
  assert.match(loader, /}, \$\.Deferred\(\)\.resolve\(\)\)/);
  assert.match(camera, /trayopentimer = setTimeout/);
  assert.doesNotMatch(camera, /trayopentimer = setInterval/);
});

test('one failing block cannot stop the remaining screen blocks', () => {
  const source = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');
  const lifecycle = fs.readFileSync(path.join(root, 'js/dashticz.js'), 'utf8');
  assert.match(source, /catch \(error\) \{\s*renderUnavailableBlock\(/);
  assert.match(source, /function renderUnavailableBlock\(/);
  assert.match(source, /Unable to mount block/);
  assert.match(lifecycle, /Device update failed for block/);
});

test('Hayman clock does not depend on Moment locale internals for rendering', () => {
  const source = fs.readFileSync(
    path.join(root, 'js/components/haymanclock.js'),
    'utf8'
  );
  assert.match(source, /typeof value !== 'string'/);
  assert.match(source, /var now = new Date\(\)/);
  assert.match(source, /new Intl\.DateTimeFormat/);
  assert.match(source, /\.fromNow\(true\)/);
  assert.match(source, /updateTime\(\);\s*Dashticz\.setInterval/);
  assert.doesNotMatch(source, /moment\(\)\.format\(/);
  assert.doesNotMatch(source, /_relativeTime/);
});

test('clock components use public date APIs and a valid seconds setting', () => {
  const dateTime = fs.readFileSync(path.join(root, 'src/date-time.js'), 'utf8');
  const flipClock = fs.readFileSync(
    path.join(root, 'js/components/flipclock.js'),
    'utf8'
  );
  assert.doesNotMatch(dateTime, /dayjs\.Ls/);
  assert.match(flipClock, /showSeconds: !settings\['hide_seconds'\]/);
  assert.doesNotMatch(flipClock, /showSecoonds/);
});

test('UI dependencies use the maintained compatibility versions', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
  );
  assert.match(packageJson.dependencies.bootstrap, /^\^5\.3\./);
  assert.match(packageJson.dependencies['chart.js'], /^\^4\./);
  assert.ok(packageJson.dependencies.dayjs);
  assert.equal(packageJson.dependencies.moment, undefined);
  assert.equal(packageJson.dependencies['handlebars.moment'], undefined);
});

test('legacy UI configuration is covered by migration adapters', () => {
  const bootstrap = fs.readFileSync(
    path.join(root, 'src/bootstrap-compat.js'),
    'utf8'
  );
  const bootstrapStyles = fs.readFileSync(
    path.join(root, 'src/_bootstrap3-compat.scss'),
    'utf8'
  );
  const chart = fs.readFileSync(path.join(root, 'src/chart-compat.js'), 'utf8');
  const dateTime = fs.readFileSync(path.join(root, 'src/date-time.js'), 'utf8');

  assert.match(bootstrap, /data-bs-toggle/);
  assert.match(bootstrap, /data-bs-backdrop/);
  assert.match(bootstrap, /installJQueryPlugin/);
  assert.match(bootstrap, /config === undefined/);
  assert.match(bootstrap, /MutationObserver/);
  assert.match(bootstrap, /prepareButtonGroup/);
  assert.match(bootstrap, /data-bootstrap3-button-group/);
  assert.match(bootstrap, /input\.name = .*buttonGroupId/);
  assert.match(bootstrapStyles, /\.col-xs-12 \{ width: 100%; \}/);
  assert.match(bootstrapStyles, /\.col-sm-3 \{ width: 25%; \}/);
  assert.match(bootstrapStyles, /\.col-sm-9 \{ width: 75%; \}/);
  assert.match(bootstrapStyles, /data-toggle="buttons"/);
  assert.match(bootstrapStyles, /\.fade\.in/);
  assert.match(chart, /xAxes/);
  assert.match(chart, /migrateTooltipCallbacks/);
  assert.match(dateTime, /badMutable/);
  assert.match(dateTime, /customParseFormat/);
});

test('selector buttons isolate radio groups and dispatch their own value', () => {
  const source = fs.readFileSync(path.join(root, 'js/blocks.js'), 'utf8');

  assert.match(source, /var checked = st \? ' checked' : ''/);
  assert.match(source, /change\.selectorButtons/);
  assert.match(source, /var value = \$\(this\)\.val\(\)/);
  assert.doesNotMatch(source, /on\('click', '\.btn-group'/);
  assert.doesNotMatch(source, /\$\(ev\.target\)\.children\('input'\)\.val\(\)/);
});

test('modern dark theme is portable and documented', () => {
  const theme = fs.readFileSync(
    path.join(root, 'themes/modern-dark/modern-dark.css'),
    'utf8'
  );
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

  assert.match(theme, /--main-bg/);
  assert.match(theme, /--main-border-color: rgba\(91, 98, 117, \.42\)/);
  assert.match(theme, /--main-border-width: 1px/);
  assert.match(theme, /--block-gap: 3px/);
  assert.match(theme, /border: var\(--block-gap\) solid transparent !important/);
  assert.match(theme, /inset 0 0 0 var\(--main-border-width\) var\(--main-border-color\)/);
  assert.match(theme, /--radius-border: 16px/);
  assert.match(theme, /--control-border: rgb\(42, 94, 151\)/);
  assert.match(theme, /\.transbg \.btn\.active/);
  assert.match(theme, /\.transbg select/);
  assert.doesNotMatch(theme, /linear-gradient/);
  assert.match(theme, /\.mh \.btn\.active/);
  assert.match(theme, /\.transbg\.titlegroups/);
  assert.match(theme, /\.titlegroups[\s\S]*background: var\(--blocktitle\) !important/);
  assert.match(theme, /\.titlegroups[\s\S]*box-shadow: none !important/);
  assert.match(theme, /\.titlegroups \.col-icon img\.icon/);
  assert.match(theme, /@media \(max-width: 767\.98px\)/);
  assert.match(theme, /\.standby \.transbg[\s\S]*background: #000 !important/);
  assert.match(theme, /\.standby \.transbg[\s\S]*border: 0 !important/);
  assert.match(theme, /\.standby \.transbg[\s\S]*backdrop-filter: none !important/);
  assert.doesNotMatch(theme, /https?:\/\//i);
  assert.doesNotMatch(theme, /url\s*\(/i);
  assert.match(readme, /config\['theme'\] = 'modern-dark'/);
});

test('settings modal uses compact Bootstrap 5 controls and aligned help icons', () => {
  const settings = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
  const simpleblock = fs.readFileSync(
    path.join(root, 'js/components/simpleblock.js'),
    'utf8'
  );
  const styles = fs.readFileSync(path.join(root, 'css/creative.css'), 'utf8');

  assert.match(settings, /class="settings-row"/);
  assert.match(settings, /form-check form-switch settings-switch/);
  assert.match(settings, /data-bs-toggle="pill"/);
  assert.match(settings, /class="settings-brand"/);
  assert.match(settings, /img\/favicon\/app-icon-192x192\.png/);
  assert.match(settings, /window\.bootstrap\.Tooltip/);
  assert.doesNotMatch(settings, /material-switch/);

  assert.match(simpleblock, /data-bs-target="#settingspopup"/);
  assert.doesNotMatch(simpleblock, /\sdata-target="#settingspopup"/);

  assert.match(styles, /\.settings-row\s*\{/);
  assert.match(styles, /grid-template-columns:/);
  assert.match(styles, /\.settings-switch \.form-check-input/);
  assert.match(styles, /width: 30px;/);
  assert.match(styles, /height: 16px;/);
  assert.match(styles, /\.settings-help \.fas/);
  assert.doesNotMatch(styles, /\.material-switch/);
});

test('migration sources use LF line endings', () => {
  for (const file of [
    '.gitattributes',
    'index.html',
    'package.json',
    'package-lock.json',
    'src/_bootstrap3-compat.scss',
    'src/bootstrap-compat.js',
    'src/index.js',
    'src/chart-compat.js',
    'src/date-time.js',
    'src/handlebars-helpers.js',
    'src/loader.scss',
    'themes/modern-dark/modern-dark.css',
    'tools/log.html',
    'css/creative.css',
    'js/components/graph.js',
    'js/components/simpleblock.js',
    'js/components/timegraph.js',
    'js/settings.js',
    'tpl/camera_video.tpl',
  ]) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /\r\n/, file);
  }
});
