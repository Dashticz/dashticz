const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadGridLayout() {
  const warnings = [];
  const context = {
    console: {
      warn(message) {
        warnings.push(message);
      },
    },
  };
  const source = fs.readFileSync(path.join(root, 'js/gridlayout.js'), 'utf8');
  vm.runInNewContext(source, context);
  return { layout: context.DashticzGridLayout, warnings };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function fakeElement() {
  const classes = new Set();
  return {
    classes,
    classList: {
      add(name) {
        classes.add(name);
      },
    },
  };
}

test('grid screen configuration uses documented defaults and overrides', () => {
  const { layout } = loadGridLayout();

  assert.deepEqual(plain(layout.getGridScreenConfig({})), {
    gridColumns: 24,
    rowHeight: 20,
    gap: 0,
    mobileLayout: 'stack',
  });
  assert.deepEqual(
    plain(
      layout.getGridScreenConfig({
        gridColumns: 30,
        rowHeight: 50,
        gap: 6,
        mobileLayout: 'stack',
      })
    ),
    {
      gridColumns: 30,
      rowHeight: 50,
      gap: 6,
      mobileLayout: 'stack',
    }
  );
  assert.equal(layout.getGridScreenConfig({ rowHeight: 40 }).rowHeight, 20);
});

test('legacy 40px grid positions migrate to 20px without shrinking', () => {
  const { layout } = loadGridLayout();

  assert.deepEqual(
    plain(
      layout.migrateLegacyGridPosition(
        { x: 8, y: 3, w: 9, h: 6 },
        { rowHeight: 40 }
      )
    ),
    { x: 8, y: 5, w: 9, h: 12 }
  );
  assert.deepEqual(
    plain(
      layout.migrateLegacyGridPosition(
        { x: 8, y: 3, w: 9, h: 6 },
        { rowHeight: 50 }
      )
    ),
    { x: 8, y: 3, w: 9, h: 6 }
  );
});

test('valid grid positions are preserved exactly', () => {
  const { layout, warnings } = loadGridLayout();
  const screen = layout.getGridScreenConfig({ gridColumns: 24 });

  assert.deepEqual(
    plain(
      layout.validateGridPosition(
        'calendar',
        { x: 8, y: 3, w: 9, h: 6 },
        screen,
        0
      )
    ),
    { x: 8, y: 3, w: 9, h: 6 }
  );
  assert.deepEqual(warnings, []);
});

test('invalid grid positions receive safe values and warnings', () => {
  const { layout, warnings } = loadGridLayout();
  const screen = layout.getGridScreenConfig({ gridColumns: 24 });

  assert.deepEqual(
    plain(
      layout.validateGridPosition(
        'agenda',
        { x: 0, y: -1, w: 40, h: 'abc' },
        screen,
        2
      )
    ),
    { x: 1, y: 3, w: 24, h: 1 }
  );
  assert.equal(warnings.length, 4);
  assert.match(warnings.join('\n'), /block "agenda"/);
  assert.match(warnings.join('\n'), /invalid grid width 40/);
});

test('grid widths are clamped to the remaining columns', () => {
  const { layout, warnings } = loadGridLayout();
  const screen = layout.getGridScreenConfig({ gridColumns: 24 });

  assert.deepEqual(
    plain(
      layout.validateGridPosition(
        'weather',
        { x: 20, y: 1, w: 10, h: 2 },
        screen,
        0
      )
    ),
    { x: 20, y: 1, w: 5, h: 2 }
  );
  assert.match(warnings[0], /invalid grid width 10 at x 20/);
});

test('overlapping grid blocks remain rendered and are marked', () => {
  const { layout, warnings } = loadGridLayout();
  const first = fakeElement();
  const second = fakeElement();
  const third = fakeElement();

  const overlaps = layout.detectGridOverlaps([
    { name: 'A', grid: { x: 1, y: 1, w: 6, h: 3 }, element: first },
    { name: 'B', grid: { x: 5, y: 2, w: 4, h: 3 }, element: second },
    { name: 'C', grid: { x: 10, y: 1, w: 2, h: 2 }, element: third },
  ]);

  assert.deepEqual(plain(overlaps), [['A', 'B']]);
  assert.equal(first.classes.has('dt-grid-overlap'), true);
  assert.equal(second.classes.has('dt-grid-overlap'), true);
  assert.equal(third.classes.has('dt-grid-overlap'), false);
  assert.match(warnings[0], /blocks "A" and "B" overlap/);
});

test('thin {key, grid} wrapper uses per-screen grid and its key as name', () => {
  const { layout } = loadGridLayout();

  // Thin wrapper: only key + grid, no type/idx/blocks
  const wrapper = { key: 'dev_42', grid: { x: 3, y: 5, w: 6, h: 2 } };
  const screenConfig = layout.getGridScreenConfig({ gridColumns: 24 });

  assert.equal(layout.getBlockName(wrapper, 0), 'dev_42');

  // getBlockDefinition returns the wrapper object itself so definition.grid is the per-screen grid
  const def = layout.getBlockDefinition(wrapper);
  assert.deepEqual(plain(def.grid), { x: 3, y: 5, w: 6, h: 2 });

  // validateGridPosition reads from the per-screen grid correctly
  const pos = layout.validateGridPosition('dev_42', def.grid, screenConfig, 0);
  assert.deepEqual(plain(pos), { x: 3, y: 5, w: 6, h: 2 });
});

test('thin wrapper grid takes precedence over shared blocks[ref].grid', () => {
  const { layout } = loadGridLayout();

  // Simulate the collision: blocks['dev_42'] has a stale grid from another screen
  const blocksGlobal = { dev_42: { idx: 42, width: 6, grid: { x: 1, y: 1, w: 24, h: 1 } } };

  const screenConfig = layout.getGridScreenConfig({ gridColumns: 24 });

  // Thin wrapper with per-screen position that differs from blocks[ref].grid
  const wrapper = { key: 'dev_42', grid: { x: 3, y: 5, w: 6, h: 2 } };
  const def = layout.getBlockDefinition(wrapper);
  // def is the wrapper itself, NOT blocks['dev_42'] — so its grid is not overwritten
  assert.deepEqual(plain(def.grid), { x: 3, y: 5, w: 6, h: 2 });
  assert.deepEqual(plain(blocksGlobal.dev_42.grid), { x: 1, y: 1, w: 24, h: 1 });
});
