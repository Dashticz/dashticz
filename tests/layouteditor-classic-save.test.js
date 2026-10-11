const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js/layouteditor.js'),
  'utf8'
);

function functionSource(name) {
  const start = source.indexOf('  function ' + name + '(');
  assert.ok(start >= 0, name);
  return source.slice(start, source.indexOf('\n  }\n', start) + 5);
}

function load(blocks, items) {
  const context = {
    blocks,
    items,
    _titleReferencesIssued: {},
  };
  vm.createContext(context);
  vm.runInContext(
    functionSource('_classicDeviceEntry') +
      functionSource('_nextTitleReference') +
      'this._entry = _classicDeviceEntry;',
    context
  );
  return context;
}

test('a block that is defined in CONFIG.js is saved as a reference only', () => {
  const ctx = load({ lamp: { idx: 5, icon: 'fas fa-bed' } }, []);
  const item = { reference: 'lamp', idx: 5, name: 'Lamp', width: 6 };
  assert.equal(
    JSON.stringify(ctx._entry(item)),
    JSON.stringify({ ref: 'lamp', width: 6 })
  );
});

test('a bare device idx is still described in full', () => {
  const ctx = load({}, []);
  const item = { reference: '12', idx: 12, subidx: 2, name: 'X', width: 3 };
  assert.equal(
    JSON.stringify(ctx._entry(item)),
    JSON.stringify({ idx: 12, name: 'X', width: 3, subidx: 2 })
  );
});

test('a pending tile is never saved as a reference', () => {
  const ctx = load({ dle_pending_x: {} }, []);
  const item = {
    isPending: true,
    reference: 'dle_pending_x',
    idx: 8,
    name: 'New',
    width: 3,
  };
  assert.equal(ctx._entry(item).ref, undefined);
  assert.equal(ctx._entry(item).idx, 8);
});

test('a pending separator gets a free Title_N key', () => {
  const taken = { reference: 'Title_1' };
  const ctx = load({ Title_2: {} }, [taken]);
  const first = ctx._entry({
    isPending: true,
    kind: 'separator',
    reference: 'dle_pending_separator_1',
    name: 'Rij',
    width: 12,
  });
  assert.equal(first.kind, 'title');
  assert.equal(first.key, 'Title_3');
  const second = ctx._entry({
    isPending: true,
    kind: 'separator',
    reference: 'dle_pending_separator_2',
    name: '',
    width: 12,
  });
  assert.equal(second.key, 'Title_4');
  assert.equal(second.title, 'Title');
});
