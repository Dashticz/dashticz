// @ts-check
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Saving from the editors WITHOUT changing anything must leave every block
// exactly as configured. Unlike the mocked editor tests in
// gridlayout.spec.js this runs the real js/saveblocks.php and
// js/configwriter.php against a real CONFIG.js in custom/, because the
// regressions it guards (a documented idx form or an inherited setting
// rewritten on save) only show up in what is written back to disk.

const baseUrl = process.env.DASHTICZ_TEST_URL || 'http://build:8082';
const root = path.join(__dirname, '..');

// Documented block shapes (docs/blocks/domoticzblocks.rst and
// docs/blocks/specials/group.rst), stored the way the Wizard stores them:
// in the Screen Editor's grid-layout section.
const BLOCKS = {
  rt_plain: '{idx: 43, width: 3}',
  rt_sub: "{idx: '43_2', width: 3, title: 'Sub 2'}",
  rt_scene: "{idx: 's5', width: 3, title: 'Scene'}",
  // A second block on the same scene: 4.1.0 merged both into one 's5' tile
  // and dropped this one from the screen.
  rt_scene2: "{idx: 's5', width: 3, title: 'Scene 2'}",
  // A block stored under the scene key itself (as the editor writes plain
  // groups/scenes) stays the plain scene device it was.
  s5: "{width: 2, hide_data: false, switch: false, title: 'Scene key'}",
  rt_var: "{idx: 'v1', width: 3, title: 'Variable'}",
  rt_lu_false: "{idx: 43, width: 3, title: 'No update', last_update: false}",
  rt_props:
    "{idx: 43, width: 3, title: 'Props', decimals: 2, unit: ' W', popup: 'rt_popup', showvalues: [1, 2], single_line: true}",
  rt_dial: "{idx: 43, width: 3, type: 'dial', title: 'Dial'}",
  rt_group_s: "{type: 'group', idx: 's5', title: 'Group s', width: 3}",
  rt_group_devices:
    "{type: 'group', devices: [43, 44], title: 'Group devices', width: 3}",
  rt_title: "{type: 'blocktitle', title: 'Section', width: 12, height: 120}",
};

function gridSection() {
  const keys = Object.keys(BLOCKS);
  const lines = [];
  const entries = [];
  keys.forEach((key, index) => {
    const grid = `{x:${1 + (index % 4) * 6}, y:${1 + Math.floor(index / 4) * 6}, w:6, h:5}`;
    lines.push(`blocks['${key}'] = ${BLOCKS[key]};`);
    lines.push(`blocks['${key}']['grid'] = ${grid};`);
    entries.push(`{key:'${key}', grid:${grid}}`);
  });
  return [
    '',
    '// [grid-layout-editor-start]',
    "if (typeof blocks === 'undefined') var blocks = {}",
    ...lines,
    '',
    "if (typeof screens === 'undefined') var screens = {}",
    "if (typeof screens[1] === 'undefined') screens[1] = {};",
    "screens[1]['layout'] = 'grid';",
    "screens[1]['gridColumns'] = 24;",
    "screens[1]['rowHeight'] = 20;",
    "screens[1]['gap'] = 5;",
    "screens[1]['mobileLayout'] = 'stack';",
    `screens[1]['blocks'] = [${entries.join(', ')}];`,
    '// [grid-layout-editor-end]',
    '',
  ].join('\n');
}

function evaluateBlocks(source) {
  const sandbox = { window: {}, document: {}, navigator: {}, language: {} };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { timeout: 5000 });
  return sandbox.blocks;
}

function comparable(definition) {
  // A block that was renamed or dropped on save is simply missing.
  if (typeof definition === 'undefined') return undefined;
  const sort = (value) =>
    Array.isArray(value)
      ? value.map(sort)
      : value && typeof value === 'object'
        ? Object.keys(value)
            .filter((key) => key !== 'grid')
            .sort()
            .reduce((out, key) => ((out[key] = sort(value[key])), out), {})
        : value;
  return sort(JSON.parse(JSON.stringify(definition)));
}

async function tileState(page) {
  return page.evaluate(() => {
    const count = (key, selector) =>
      document.querySelectorAll(
        `.screen1 [data-grid-block="${key}"] ${selector}`
      ).length;
    return {
      plainLastUpdate: count('rt_plain', '.lastupdate'),
      subLastUpdate: count('rt_sub', '.lastupdate'),
      titleIcons: count('rt_title', '.col-icon'),
      sceneTiles: count('rt_scene', '.dt_block'),
      scene2Tiles: count('rt_scene2', '.dt_block'),
      sceneKeyTiles: count('s5', '.dt_block'),
      groupTiles: count('rt_group_s', '.dt_block'),
    };
  });
}

test.describe('saving without changes keeps the configuration', () => {
  let cfgName = '';
  let cfgPath = '';
  let original = '';

  test.beforeEach(async ({ request }, testInfo) => {
    cfgName = `CONFIGRT${process.pid}${testInfo.workerIndex}${Date.now()}.js`;
    cfgPath = path.join(root, 'custom', cfgName);
    original =
      fs.readFileSync(path.join(root, 'tests', 'CONFIG.pw.js'), 'utf8') +
      gridSection() +
      `// ${cfgName}\n`;
    fs.writeFileSync(cfgPath, original);
    // The file is written next to this test; skip when the dashboard is
    // served from another file system (for example the docker 'build' host).
    const served = await request
      .get(`${baseUrl}/custom/${cfgName}`)
      .then((response) => response.text())
      .catch(() => '');
    test.skip(
      !served.includes(`// ${cfgName}`),
      'dashboard is not served from this checkout'
    );
  });

  test.afterEach(async ({ page }) => {
    page.on('dialog', (dialog) =>
      (dialog.type() === 'beforeunload'
        ? dialog.accept()
        : dialog.dismiss()
      ).catch(() => {})
    );
    await page.goto('about:blank').catch(() => {});
    for (const file of [cfgPath, cfgPath + '.lock']) {
      fs.rmSync(file, { force: true });
    }
  });

  async function openDashboard(page) {
    await page.goto(`${baseUrl}/?cfg=${cfgName}`);
    await page.locator('#loaderHolder').waitFor({
      state: 'hidden',
      timeout: 20000,
    });
    // Tiles fill in once the fake Domoticz data has been applied.
    await expect
      .poll(async () => (await tileState(page)).plainLastUpdate)
      .toBeGreaterThan(0);
  }

  async function expectUnchanged(page, before) {
    const saved = fs.readFileSync(cfgPath, 'utf8');
    const was = evaluateBlocks(original);
    const is = evaluateBlocks(saved);
    for (const key of Object.keys(BLOCKS)) {
      if (key === 'rt_title') continue;
      expect(comparable(is[key]), key).toEqual(comparable(was[key]));
    }
    // A separator without an icon keeps rendering without one (#169); the
    // editor may store that as an explicit icon: ''.
    expect(['', undefined]).toContain(is.rt_title.icon);
    expect(comparable({ ...is.rt_title, icon: undefined })).toEqual(
      comparable(was.rt_title)
    );

    await openDashboard(page);
    expect(await tileState(page)).toEqual(before);
  }

  test('via the cog of one tile in the Layout Editor', async ({ page }) => {
    await openDashboard(page);
    const before = await tileState(page);
    expect(before.titleIcons).toBe(0);

    const saved = page.waitForResponse(/\/js\/saveblocks\.php/);
    await page.locator('.screen1 .layouteditoricon').click();
    await expect(page.locator('body')).toHaveClass(/dle-active/);
    await page
      .locator('.screen1 [data-grid-block="rt_plain"] .dle-config-button')
      .first()
      .click();
    await expect(page.locator('#de-config-popup')).toBeVisible();
    await page.locator('#de-config-ok').click();
    expect((await saved).status()).toBe(200);
    await expect(page.locator('#de-config-popup')).toHaveCount(0);

    await expectUnchanged(page, before);
  });

  test('via Save in the Device Editor', async ({ page }) => {
    await openDashboard(page);
    const before = await tileState(page);

    const gridSaved = page.waitForResponse(/\/js\/savegridlayout\.php/);
    await page.evaluate(() =>
      window.DT_function.loadDTScript('js/deviceeditor.js').then(() =>
        window.DashticzDeviceEditor.open()
      )
    );
    await expect(page.locator('#deviceeditorpopup')).toBeVisible();
    await page.locator('#de-save-btn').evaluate((button) => {
      button.disabled = false;
    });
    await page.locator('#de-save-btn').click();
    expect((await gridSaved).status()).toBe(200);

    await expectUnchanged(page, before);
  });
});
