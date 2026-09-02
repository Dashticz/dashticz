const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadComponent(relativePath, globals) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  let registered;
  const context = Object.assign(
    {
      console,
      Dashticz: {
        register(component) {
          registered = component;
        },
      },
    },
    globals
  );
  vm.runInNewContext(source, context, { filename: relativePath });
  return registered;
}

test('Group toggleoff always sends an explicit On or Off command', () => {
  const calls = [];
  const devices = {
    1: { Status: 'Off' },
    2: { Status: 'On' },
  };
  const group = loadComponent('js/components/group.js', {
    Domoticz: { getAllDevices: () => devices },
    toLower: (value) => String(value).toLowerCase(),
    switchDevice: (block, state) => calls.push([block.idx, state]),
  });
  const clickHandler = group.defaultCfg().clickHandler;

  clickHandler({
    block: { switchMode: 'toggleoff' },
    groupState: 'off',
    devices: [1, 2],
  });
  assert.deepEqual(calls, [
    [1, 'On'],
    [2, 'On'],
  ]);

  calls.length = 0;
  clickHandler({
    block: { switchMode: 'toggleoff' },
    groupState: 'on',
    devices: [1, 2],
  });
  assert.deepEqual(calls, [
    [1, 'Off'],
    [2, 'Off'],
  ]);
});

test('Domoticz log escapes messages and keeps one namespaced listener set', () => {
  const handlers = new Map();
  const $items = {
    rendered: '',
    html(value) {
      this.rendered = value;
      return this;
    },
    off(namespace) {
      for (const eventName of handlers.keys()) {
        if (eventName.endsWith(namespace)) handlers.delete(eventName);
      }
      return this;
    },
    on(eventName, handler) {
      handlers.set(eventName, handler);
      return this;
    },
    scrollTop(callback) {
      this.lastScrollTop = callback.call({ scrollHeight: 123 });
      return this;
    },
  };
  const records = () => [
    {
      level: '1\" onclick=\"alert(2)',
      message: '2026-08-15 07:00:00.000 <img src=x onerror=alert(1)>',
    },
  ];
  const log = loadComponent('js/components/log.js', {
    $: () => $items,
    Domoticz: {
      request: () => ({
        then(callback) {
          callback({ result: records() });
        },
      }),
    },
  });
  const me = {
    block: { level: 1, ascending: true, maxitems: 0, scrolltimeout: 60 },
    mountPoint: '#log',
    popup: false,
  };

  log.refresh(me);
  log.refresh(me);

  assert.match($items.rendered, /class="level1"/);
  assert.match($items.rendered, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch($items.rendered, /<img|onclick=/);
  assert.deepEqual([...handlers.keys()].sort(), [
    'scroll.dashticzLog',
    'scrollend.dashticzLog',
  ]);
  assert.equal($items.lastScrollTop, 123);
});

test('Legacy iframe and Sunrise blocks do not acquire a new default icon', () => {
  const frame = loadComponent('js/components/frame.js', {
    navigator: { userAgent: '' },
  });
  const simpleBlock = loadComponent('js/components/simpleblock.js', {});

  assert.equal(
    Object.prototype.hasOwnProperty.call(frame.defaultCfg(), 'icon'),
    false
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      simpleBlock.defaultCfg({ type: 'sunrise' }),
      'icon'
    ),
    false
  );
});

test('Blocktitle separator does not acquire a runtime default icon', () => {
  // #169: a legacy/custom-mode blocktitle entry with no `icon` property must
  // render as a clean separator with no icon. getBlockConfig() (js/dashticz.js)
  // only merges block.icon onto the runtime cfg when CONFIG.js actually
  // defines it, so blocktitle.js's own defaultCfg must not inject one.
  const blocktitle = loadComponent('js/components/blocktitle.js', {});
  assert.equal(
    Object.prototype.hasOwnProperty.call(blocktitle.defaultCfg, 'icon'),
    false
  );
});

test('Lyrion Music Server block dispatches on type: lms and has no default icon', () => {
  const lms = loadComponent('js/components/lms.js', {
    settings: { dashticz_php_path: 'js/' },
    language: { misc: {} },
    $: Object.assign(() => ({ text: () => ({ html: () => '' }) }), {
      ajax: () => ({ then: () => ({ catch: () => {} }) }),
    }),
  });
  assert.equal(lms.name, 'lms');
  assert.equal(lms.canHandle({ type: 'lms' }), true);
  assert.equal(lms.canHandle({ type: 'blocktitle' }), false);
  assert.equal(!!lms.canHandle(null), false);
  // #169 precedent: a component's own defaultCfg must not inject a runtime
  // default icon - getBlockConfig() (js/dashticz.js) only applies block.icon
  // when the block's own CONFIG.js entry defines it. The cover artwork is
  // this block's own visual, so no icon is shown unless explicitly configured.
  assert.equal(
    Object.prototype.hasOwnProperty.call(lms.defaultCfg, 'icon'),
    false
  );
  assert.equal(lms.defaultCfg.refresh, 5);
  assert.equal(lms.defaultCfg.width, 6);
  assert.equal(lms.defaultCfg.port, 9000);
  assert.equal(typeof lms.refresh, 'function');
});

test('Webpack cleans stale output while preserving legacy font assets', () => {
  const config = require(path.join(root, 'build/webpack.config.js'));
  assert.equal(config.output.clean.keep.test('assets/fonts/legacy.woff'), true);
  assert.equal(config.output.clean.keep.test('obsolete-chunk.js'), false);
});
