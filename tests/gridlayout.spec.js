// @ts-check
import { test, expect } from '@playwright/test';

const dashboardUrl =
  (process.env.DASHTICZ_TEST_URL || 'http://build:8082') +
  '/?cfg=CONFIG.pw.js&folder=tests';

test.describe('optional screen grid layout', () => {
  test('keeps legacy column screens on the Bootstrap path', async ({ page }) => {
    await page.goto(dashboardUrl);
    await waitForDashboard(page);

    await expect(page.locator('.screen1 .row .col1')).toBeVisible();
    await expect(page.locator('.screen1 .dt-grid-layout')).toHaveCount(0);
  });

  test('keeps legacy widgets iconless and lets a classic dial fill its column', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `
blocks['legacy_dial'] = {idx: 1247, type: 'dial', width: 3};
blocks['legacy_frame'] = {frameurl: 'about:blank', width: 3, height: 180};
blocks['sunrise'] = {width: 3};
columns = {1: {blocks: ['legacy_dial', 'legacy_frame', 'sunrise'], width: 12}};
screens[1] = {background: 'bg2.jpg', columns: [1]};
`,
      });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);

    const dialBlock = page.locator(
      '.screen1 .dt_block.dial[data-id="legacy_dial"]'
    );
    await expect(dialBlock).toBeVisible();
    const dialSizes = await dialBlock.evaluate((block) => {
      const dial = block.querySelector('.dt_content .dial');
      return {
        blockWidth: block.getBoundingClientRect().width,
        dialWidth: dial ? dial.getBoundingClientRect().width : 0,
      };
    });
    expect(dialSizes.dialWidth).toBeGreaterThan(dialSizes.blockWidth * 0.8);
    expect(dialSizes.dialWidth).toBeLessThanOrEqual(dialSizes.blockWidth + 1);

    const frame = page.locator(
      '.screen1 .dt_block.frame[data-id="legacy_frame"]'
    );
    await expect(frame.locator('iframe')).toBeAttached();
    await expect(frame.locator('.col-icon')).toHaveCount(0);
    await expect(
      page.locator('.screen1 .sunriseholder[data-id="sunrise"] .sunrise-header')
    ).toHaveCount(0);
  });

  test('keeps grid dials constrained and renders explicitly configured icons', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `
blocks['grid_dial'] = {
  idx: 1247,
  type: 'dial',
  grid: {x: 1, y: 1, w: 8, h: 8}
};
blocks['grid_frame_icon'] = {
  frameurl: 'about:blank',
  icon: 'fas fa-window-maximize',
  grid: {x: 10, y: 1, w: 7, h: 8}
};
blocks['sunrise'] = {
  icon: 'fas fa-sun',
  grid: {x: 18, y: 1, w: 7, h: 8}
};
screens[1] = {
  layout: 'grid',
  gridColumns: 24,
  rowHeight: 20,
  gap: 5,
  blocks: ['grid_dial', 'grid_frame_icon', 'sunrise']
};
`,
      });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);

    const dialItem = page.locator(
      '.screen1 [data-grid-block="grid_dial"]'
    );
    await expect(dialItem.locator('.dt_block.dial')).toBeVisible();
    const dialSizes = await dialItem.evaluate((item) => {
      const dial = item.querySelector('.dt_content .dial');
      const itemRect = item.getBoundingClientRect();
      const dialRect = dial ? dial.getBoundingClientRect() : null;
      return {
        itemWidth: itemRect.width,
        itemHeight: itemRect.height,
        dialWidth: dialRect ? dialRect.width : 0,
        dialHeight: dialRect ? dialRect.height : 0,
      };
    });
    expect(dialSizes.dialWidth).toBeGreaterThan(100);
    expect(dialSizes.dialWidth).toBeLessThanOrEqual(dialSizes.itemWidth + 1);
    expect(dialSizes.dialHeight).toBeLessThanOrEqual(dialSizes.itemHeight + 1);

    // Wizard/Layout Editor resizing updates the outer grid item. Growing used
    // to work because min-height stretched the inner block, but shrinking then
    // measured the stale inline height that dial.js had written on the previous
    // pass. Exercise both directions so the Dial must follow the actual cell.
    await dialItem.evaluate((item) => {
      DashticzGridLayout.applyGridPosition(item, {
        x: 1,
        y: 1,
        w: 8,
        h: 12,
      });
    });
    await expect
      .poll(() =>
        dialItem.evaluate((item) => {
          const dial = item.querySelector('.dt_content .dial');
          return dial ? dial.getBoundingClientRect().height : 0;
        })
      )
      .toBeGreaterThan(dialSizes.dialHeight + 20);
    const grownDialHeight = await dialItem
      .locator('.dt_content .dial')
      .evaluate((dial) => dial.getBoundingClientRect().height);

    await dialItem.evaluate((item) => {
      DashticzGridLayout.applyGridPosition(item, {
        x: 1,
        y: 1,
        w: 8,
        h: 5,
      });
    });
    await expect
      .poll(() =>
        dialItem.evaluate((item) => {
          const block = item.querySelector('.dt_block');
          const dial = item.querySelector('.dt_content .dial');
          const itemHeight = item.getBoundingClientRect().height;
          return Boolean(
            block &&
              dial &&
              block.getBoundingClientRect().height <= itemHeight + 1 &&
              dial.getBoundingClientRect().height <= itemHeight + 1
          );
        })
      )
      .toBe(true);
    const shrunkDialHeight = await dialItem
      .locator('.dt_content .dial')
      .evaluate((dial) => dial.getBoundingClientRect().height);
    expect(shrunkDialHeight).toBeLessThan(grownDialHeight);

    await expect(
      page.locator(
        '.screen1 [data-grid-block="grid_frame_icon"] .col-icon'
      )
    ).toBeVisible();
    await expect(
      page.locator(
        '.screen1 [data-grid-block="sunrise"] .sunrise-header .fa-sun'
      )
    ).toBeVisible();
  });

  test('hides Icon and Title controls only while Device Config is a Dial', async ({
    page,
  }) => {
    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `
blocks['wizard_dial_options'] = {
  idx: 1247,
  type: 'dial',
  icon: 'fas fa-star',
  hide_title: true,
  grid: {x: 1, y: 1, w: 8, h: 8}
};
screens[1] = {
  layout: 'grid',
  gridColumns: 24,
  rowHeight: 20,
  gap: 5,
  blocks: ['wizard_dial_options']
};
`,
      });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await page.locator('.screen1 .layouteditoricon').click();
    await expect(page.locator('body')).toHaveClass(/dle-active/);
    await page
      .locator('[data-grid-block="wizard_dial_options"] .dle-config-button')
      .click();

    const popup = page.locator('#de-config-popup');
    await expect(popup).toBeVisible();
    const iconControl = popup.locator(
      'label:has([data-option="icon"])'
    );
    const titleControl = popup.locator(
      'label:has([data-option="show_title"])'
    );
    const dialControl = popup.locator('[data-option="dial"]');

    await expect(iconControl).toBeHidden();
    await expect(titleControl).toBeHidden();
    await expect(popup.locator('.de-icon-field-row')).toBeHidden();
    await expect(popup.locator('[data-option="hide_data"]')).toBeVisible();
    await expect(popup.locator('[data-option="last_update"]')).toBeVisible();
    await expect(dialControl).toBeChecked();

    await dialControl.uncheck();
    await expect(iconControl).toBeVisible();
    await expect(titleControl).toBeVisible();
    await expect(popup.locator('[data-option="icon"]')).toBeChecked();
    await expect(popup.locator('[data-option="show_title"]')).not.toBeChecked();
    await expect(popup.locator('.de-icon-field-row')).toBeVisible();

    await dialControl.check();
    await expect(iconControl).toBeHidden();
    await expect(titleControl).toBeHidden();
  });

  test('does not restore Dial from another block with the same IDX when saving another device', async ({
    page,
  }) => {
    let blocksRequest = null;
    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `
Object.keys(blocks).forEach(function (key) {
  if (blocks[key] && parseInt(blocks[key].idx, 10) === 1247) delete blocks[key];
});
blocks['offscreen_dial'] = {idx: 1247, type: 'dial', width: 3};
blocks['device_1247'] = {idx: 1247, width: 3};
blocks['device_43'] = {idx: 43, width: 3, icon: 'fas fa-bolt'};
screens[1] = {
  layout: 'grid', gridColumns: 24, rowHeight: 20, gap: 5,
  blocks: [
    {key: 'device_1247', grid: {x: 1, y: 1, w: 8, h: 5}},
    {key: 'device_43', grid: {x: 10, y: 1, w: 8, h: 5}}
  ]
};
screens[2] = {
  layout: 'grid', gridColumns: 24, rowHeight: 20, gap: 5,
  blocks: [{key: 'offscreen_dial', grid: {x: 1, y: 1, w: 8, h: 5}}]
};
`,
      });
    });
    await page.route('**/info.php?get=csrf', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'dial-reference-token' }),
      })
    );
    await page.route('**/js/saveblocks.php*', async (route) => {
      blocksRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          blockKeys: ['device_1247', 'device_43'],
        }),
      });
    });
    await page.route('**/js/savewidgets.php*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, blockKeys: [] }),
      })
    );
    await page.route('**/js/savegridlayout.php*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    );

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await openDeviceEditorFromScreenEditor(page);

    await page.locator('[data-order-key="device:43"] .de-config-btn').click();
    await expect(page.locator('#de-config-popup')).toBeVisible();
    await page.locator('[data-option="icon"]').uncheck();
    await page.locator('#de-config-ok').click();
    await expect(page.locator('#deviceeditorpopup')).toBeVisible();
    await page.locator('#de-save-btn').evaluate((button) => {
      button.disabled = false;
    });
    await page.locator('#de-save-btn').click();

    await expect.poll(() => blocksRequest).not.toBeNull();
    const normalDevice = blocksRequest.devices.find(
      (device) => device.key === 'device_1247'
    );
    const editedDevice = blocksRequest.devices.find(
      (device) => device.key === 'device_43'
    );
    expect(normalDevice).toBeDefined();
    expect(normalDevice).not.toHaveProperty('type');
    expect(editedDevice.icon).toBe('');
  });

  test('persists default icons only for newly added iframe and Sunrise widgets', async ({
    page,
  }) => {
    let widgetRequest = null;
    await page.route('**/info.php?get=csrf', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'legacy-icon-token' }),
      })
    );
    await page.route('**/js/savewidgets.php*', async (route) => {
      widgetRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          blockKeys: widgetRequest.widgets.map((entry) => entry.key),
        }),
      });
    });
    await page.route('**/js/savelayout.php*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    );

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    // The production UI lazy-loads this module from the Screen Editor. Load
    // the same script directly so this regression can focus on its payload
    // semantics without first converting the legacy column screen to a grid.
    await page.addScriptTag({
      url: new URL('/js/widgeteditor.js', dashboardUrl).href,
    });
    await page.evaluate('DashticzWidgetEditor.open()');
    await expect(page.locator('#widgeteditorpopup')).toBeVisible();

    await page.locator('.we-config-btn[data-widget-id="iframe"]').click();
    await expect(page.locator('#we-config-popup')).toBeVisible();
    await page.locator('#we-cfg-iframe-url').fill('about:blank');
    await page.locator('#we-cfg-ok-btn').click();
    await expect(page.locator('#we-config-popup')).toHaveCount(0);

    await page.locator('.we-widget-card[data-widget-id="sunrise"]').click();
    await page.locator('#we-save-btn').click();
    await expect.poll(() => widgetRequest).not.toBeNull();

    const iframe = widgetRequest.widgets.find((entry) => entry.id === 'iframe');
    const sunrise = widgetRequest.widgets.find(
      (entry) => entry.id === 'sunrise'
    );
    expect(iframe.icon).toBe('fas fa-window-maximize');
    expect(sunrise.icon).toBe('fas fa-sun');
  });

  test('Widget Config hides legacy globals and keeps current widget controls', async ({
    page,
  }) => {
    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await page.addScriptTag({
      url: new URL('/js/widgeteditor.js', dashboardUrl).href,
    });
    await page.evaluate('DashticzWidgetEditor.open()');
    await expect(page.locator('#widgeteditorpopup')).toBeVisible();

    const cases = [
      {
        id: 'weather',
        hidden: ['owm-days', 'translate-windspeed'],
        visible: ['owm-api'],
      },
      { id: 'garbage', hidden: ['garbage-width'], visible: ['garbage-company'] },
      {
        id: 'secpanel',
        hidden: ['security-button-icons', 'security-panel-lock'],
        visible: [],
      },
      {
        id: 'map',
        hidden: ['gm-zoomlevel', 'gm-latitude', 'gm-longitude'],
        visible: ['gm-api'],
      },
      { id: 'moon', hidden: ['idx-moonpicture'], visible: [] },
    ];

    for (const item of cases) {
      await page.locator(`.we-config-btn[data-widget-id="${item.id}"]`).click();
      await expect(page.locator('#we-config-popup')).toBeVisible();
      for (const field of item.hidden) {
        await expect(page.locator(`#we-cfg-${field}`)).toHaveCount(0);
      }
      for (const field of item.visible) {
        await expect(page.locator(`#we-cfg-${field}`)).toBeVisible();
      }
      await page.locator('#we-config-popup .btn-secondary').click();
      await expect(page.locator('#we-config-popup')).toHaveCount(0);
    }

    await page.locator('.we-config-btn[data-widget-id="clock"]').click();
    await expect(page.locator('#we-config-popup')).toBeVisible();
    await page.locator('#we-cfg-clock-type').selectOption('flipclock');
    await expect(page.locator('#we-cfg-showSeconds')).toBeVisible();
    await page.locator('#we-cfg-clock-type').selectOption('stationclock');
    await expect(page.locator('#we-cfg-boss')).toBeVisible();
    await expect(page.locator('#we-cfg-secondhand')).toBeVisible();
  });

  test('converts a Wizard column screen to a compact grid after confirmation', async ({
    page,
  }) => {
    let conversionRequest = null;
    await page.route('**/info.php?get=csrf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'conversion-token' }),
      });
    });
    await page.route('**/js/savegridlayout.php*', async (route) => {
      conversionRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    await page.route('**/js/savecustomcss.php*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    const confirmation = page.waitForEvent('dialog');
    await page.locator('.screen1 .layouteditoricon').click();
    const dialog = await confirmation;
    expect(dialog.message()).toContain('24-column grid');
    await dialog.accept();

    await expect.poll(() => conversionRequest).not.toBeNull();
    expect(conversionRequest.gridColumns).toBe(24);
    expect(conversionRequest.rowHeight).toBe(20);
    expect(conversionRequest.items.length).toBeGreaterThan(10);
    const numericDevice = conversionRequest.items.find(
      (item) => item.create && item.create.idx === 43
    );
    expect(numericDevice.create.kind).toBe('device');
    expect(numericDevice.grid.x).toBeGreaterThanOrEqual(1);

    for (let i = 0; i < conversionRequest.items.length; i++) {
      for (let j = i + 1; j < conversionRequest.items.length; j++) {
        const left = conversionRequest.items[i].grid;
        const right = conversionRequest.items[j].grid;
        const overlaps =
          left.x < right.x + right.w &&
          left.x + left.w > right.x &&
          left.y < right.y + right.h &&
          left.y + left.h > right.y;
        expect(overlaps).toBe(false);
      }
    }
  });

  test('converts Custom to Wizard grid in one confirmed save', async ({
    page,
  }) => {
    let conversionRequest = null;
    let separateModeWrites = 0;
    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `\nconfig['config_mode'] = 'custom';\n`,
      });
    });
    await page.route('**/info.php?get=csrf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mode-conversion-token' }),
      });
    });
    await page.route('**/js/savegridlayout.php*', async (route) => {
      conversionRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    await page.route('**/js/saveconfigmode.php*', async (route) => {
      separateModeWrites++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await page.locator('.screen1 .configmodeicon').first().click();
    await expect(page.locator('#configmodepopup')).toBeVisible();
    await expect(
      page.locator('#configmodepopup .config-mode-btn[data-mode="custom"]')
    ).toHaveClass(/active/);
    await page
      .locator('#configmodepopup .config-mode-btn[data-mode="wizard"]')
      .click();
    await expect(page.locator('#configmodepopup')).toHaveCount(0);
    await expect(page.locator('#configmodewarningpopup')).toBeVisible();
    await expect(page.locator('#config-mode-warning-message')).toContainText(
      'Wizard'
    );
    await page.locator('#config-mode-warning-continue').click();

    await expect.poll(() => conversionRequest).not.toBeNull();
    expect(conversionRequest.configMode).toBe('wizard');
    expect(separateModeWrites).toBe(0);
  });

  test('warns before switching from Wizard to Custom', async ({ page }) => {
    let modeRequest = null;
    await page.route('**/info.php?get=csrf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'custom-mode-token' }),
      });
    });
    await page.route('**/js/saveconfigmode.php*', async (route) => {
      modeRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    const modeIcon = page.locator('.screen1 .configmodeicon').first();
    const customTile = page.locator(
      '#configmodepopup .config-mode-btn[data-mode="custom"]'
    );

    await modeIcon.click();
    await customTile.click();
    await expect(page.locator('#configmodewarningpopup')).toBeVisible();
    await expect(page.locator('#config-mode-warning-message')).toContainText(
      'Custom'
    );
    await page
      .locator('#configmodewarningpopup .btn-secondary')
      .click();
    await expect(page.locator('#configmodewarningpopup')).toHaveCount(0);
    expect(modeRequest).toBeNull();

    await modeIcon.click();
    await customTile.click();
    await expect(page.locator('#configmodewarningpopup')).toBeVisible();
    await page.locator('#config-mode-warning-continue').click();
    await expect.poll(() => modeRequest).toEqual({ config_mode: 'custom' });
  });

  test('creates an empty Wizard grid from a clean configuration', async ({
    page,
  }) => {
    let conversionRequest = null;
    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `
blocks = {};
columns = {};
screens = {};
config['config_mode'] = 'custom';
config['auto_positioning'] = 0;
`,
      });
    });
    await page.route('**/info.php?get=csrf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'empty-wizard-token' }),
      });
    });
    await page.route('**/js/savegridlayout.php*', async (route) => {
      conversionRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, blocks: [] }),
      });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await page.locator('.screen1 .configmodeicon').first().click();
    await page
      .locator('#configmodepopup .config-mode-btn[data-mode="wizard"]')
      .click();
    await expect(page.locator('#configmodewarningpopup')).toBeVisible();
    await page.locator('#config-mode-warning-continue').click();

    await expect.poll(() => conversionRequest).not.toBeNull();
    expect(conversionRequest.screen).toBe(1);
    expect(conversionRequest.configMode).toBe('wizard');
    expect(conversionRequest.items).toEqual([]);
    expect(conversionRequest.gridColumns).toBe(24);
  });

  test('converts legacy Standby columns to the same Wizard grid', async ({
    page,
  }) => {
    let conversionRequest = null;
    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `
var columns_standby = {};
columns_standby[1] = {blocks: ['tc1', 'tc2'], width: 12};
`,
      });
    });
    await page.route('**/info.php?get=csrf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'standby-conversion-token' }),
      });
    });
    await page.route('**/js/savegridlayout.php*', async (route) => {
      conversionRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await page
      .locator('.screen1 .dt-screen-btn[data-screen="standby"]')
      .first()
      .click();
    await expect(page.locator('.screenstandby')).toBeVisible();
    await page.mouse.move(10, 10);
    await expect(
      page.locator('.screenstandby .layouteditoricon')
    ).toBeVisible();

    const confirmation = page.waitForEvent('dialog');
    await page.locator('.screenstandby .layouteditoricon').click();
    const dialog = await confirmation;
    expect(dialog.message()).toContain('24-column grid');
    await dialog.accept();

    await expect.poll(() => conversionRequest).not.toBeNull();
    expect(conversionRequest.screen).toBe('standby');
    expect(conversionRequest.items).toHaveLength(2);
    expect(conversionRequest.items.every((item) => item.clone === true)).toBe(
      true
    );
    expect(conversionRequest.items[0].grid.x).toBeGreaterThanOrEqual(1);
    expect(conversionRequest.items[0].grid.w).toBeGreaterThanOrEqual(1);
  });

  test('renders a configured Standby grid', async ({ page }) => {
    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `
blocks['tc1'].grid = {x: 2, y: 2, w: 8, h: 3};
blocks['tc2'].grid = {x: 12, y: 1, w: 10, h: 5};
var standby_screen = {
  layout: 'grid',
  gridColumns: 24,
  rowHeight: 40,
  gap: 5,
  mobileLayout: 'stack',
  blocks: ['tc1', 'tc2']
};
`,
      });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await page
      .locator('.screen1 .dt-screen-btn[data-screen="standby"]')
      .first()
      .click();

    const standbyGrid = page.locator(
      '.screenstandby.dt-grid-screen > .dt-grid-layout'
    );
    await expect(standbyGrid).toHaveCSS('display', 'grid');
    await expect(standbyGrid).toHaveCSS('--dt-grid-row-height', '20px');
    await expect(
      standbyGrid.locator('[data-grid-block="tc1"]')
    ).toHaveCSS('grid-column-start', '2');
    await expect(
      standbyGrid.locator('[data-grid-block="tc2"]')
    ).toHaveCSS('grid-row-end', 'span 10');
    const standbyScreen = page.locator('.screenstandby');
    await expect(standbyScreen).toHaveCSS('position', 'fixed');
    await expect(standbyScreen).toHaveCSS('background-size', 'cover');
    const standbyBox = await standbyScreen.boundingBox();
    expect(standbyBox.width).toBeLessThanOrEqual(
      page.viewportSize().width
    );
    expect(standbyBox.height).toBeLessThanOrEqual(
      page.viewportSize().height
    );
  });

  test('Device Editor preserves grid positions and custom blocks', async ({
    page,
  }) => {
    let gridRequest = null;
    let blocksRequest = null;
    let widgetsRequest = null;
    let customCssWrites = 0;
    let columnSaves = 0;
    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `
blocks['tc1'].grid = {x: 2, y: 2, w: 6, h: 3};
blocks['grid_text'] = {
  type: 'blocktitle',
  title: 'Keep me',
  c: {legacy: true},
  emptyObject: {},
  emptyArray: [],
  unknownOption: {enabled: true},
  text_alignment: 'center',
  grid: {x: 10, y: 5, w: 8, h: 2}
};
screens[1] = {
  layout: 'grid',
  gridColumns: 24,
  rowHeight: 20,
  gap: 5,
  mobileLayout: 'stack',
  blocks: ['tc1', 'grid_text']
};
`,
      });
    });
    await page.route('**/info.php?get=csrf', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'device-grid-token' }),
      })
    );
    await page.route('**/js/saveblocks.php*', async (route) => {
      blocksRequest = route.request().postDataJSON();
      expect(route.request().postDataJSON().blocksOnly).toBe(true);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, blockKeys: ['s5', 'grid_text'] }),
      });
    });
    await page.route('**/js/savewidgets.php*', async (route) => {
      const payload = route.request().postDataJSON();
      widgetsRequest = payload;
      expect(payload.blocksOnly).toBe(true);
      expect(payload.widgets).toEqual([]);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, blockKeys: [] }),
      });
    });
    await page.route('**/js/savecustomcss.php*', async (route) => {
      customCssWrites++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    await page.route('**/js/savelayout.php*', async (route) => {
      columnSaves++;
      await route.fulfill({ status: 500, body: '{}' });
    });
    await page.route('**/js/savegridlayout.php*', async (route) => {
      gridRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await expect(
      page.locator('[data-grid-block="grid_text"] .col-icon .fa-divide')
    ).toBeVisible();
    await page.locator('.screen1 .layouteditoricon').click();
    await expect(page.locator('body')).toHaveClass(/dle-active/);
    const separatorOverlay = page.locator('[data-grid-block="grid_text"] .dle-overlay');
    await expect(separatorOverlay.locator('.dle-drag-icon')).toHaveCount(0);
    await expect(separatorOverlay.locator('.dle-config-button')).toHaveCount(1);
    for (const control of ['.dle-config-button', '.dle-remove-button']) {
      await expect(separatorOverlay.locator(control)).toHaveCSS('width', '32px');
      await expect(separatorOverlay.locator(control)).toHaveCSS('height', '32px');
    }
    await separatorOverlay.locator('.dle-config-button').click();
    await expect(page.locator('#de-config-popup')).toBeVisible();
    await expect(page.locator('#deviceeditorpopup')).toBeHidden();
    await expect(page.locator('.de-config-option')).toHaveCount(2);
    await expect(page.locator('[data-option="icon"]')).toBeChecked();
    await expect(page.locator('[data-option="show_title"]')).toBeChecked();
    const separatorIconRow = page.locator('.de-icon-field-row');
    await expect(separatorIconRow).toBeVisible();
    await expect(separatorIconRow.locator('.de-custom-field-name')).toHaveValue('icon');
    await expect(separatorIconRow.locator('.de-custom-field-setting')).toHaveValue('fas fa-divide');
    await separatorIconRow.locator('.de-icon-source').selectOption('image');
    await expect(separatorIconRow.locator('.de-custom-field-setting')).toHaveValue('');
    await expect(separatorIconRow.locator('.de-custom-field-setting')).toHaveAttribute(
      'placeholder',
      'custom/icon.png'
    );
    await separatorIconRow.locator('.de-icon-source').selectOption('icon');
    await expect(separatorIconRow.locator('.de-custom-field-setting')).toHaveValue('fas fa-divide');
    await separatorIconRow.locator('.de-custom-field-remove').click();
    await expect(separatorIconRow).toHaveCount(0);
    await expect(page.locator('[data-option="icon"]')).not.toBeChecked();
    await page.locator('[data-option="icon"]').check();
    await expect(separatorIconRow).toBeVisible();
    await page.locator('[data-option="icon"]').uncheck();
    await expect(separatorIconRow).toBeHidden();
    await expect(page.locator('.de-custom-field-name').first()).toHaveValue('title');
    await expect(page.locator('.de-custom-field-setting').first()).toHaveValue('Keep me');
    await expect(page.locator('.de-custom-field-name')).toHaveCount(4);
    expect(
      await page.locator('.de-custom-field-name').evaluateAll((inputs) =>
        inputs.map((input) => input.value)
      )
    ).not.toContain('c');
    await page.locator('.de-custom-field-add').first().click();
    await page.locator('.de-custom-field-name').nth(1).fill('Layout');
    await page.locator('.de-custom-field-setting').nth(1).fill('1');
    await page.locator('.de-custom-field-add').nth(1).click();
    await expect(page.locator('.de-custom-field-row')).toHaveCount(6);
    await page.locator('.de-custom-field-name').nth(2).fill('Classes');
    await page.locator('.de-custom-field-setting').nth(2).fill('["wide"]');
    await page.locator('#de-config-ok').click();
    await expect(page.locator('#deviceeditorpopup')).toBeVisible();
    await page
      .locator('[data-order-key="special:grid_text"] .de-title-toggle')
      .uncheck();
    await page
      .locator('[data-order-key="special:grid_text"] .de-text-alignment')
      .selectOption('right');
    await page.locator('#de-save-btn').evaluate((button) => {
      button.disabled = false;
    });
    await page.locator('#de-save-btn').click();

    await expect.poll(() => blocksRequest).not.toBeNull();
    await expect.poll(() => widgetsRequest).not.toBeNull();
    await expect.poll(() => gridRequest).not.toBeNull();
    expect(blocksRequest.devices).toEqual([
      {
        idx: 's5',
        name: 'KeukenLampen',
        width: 2,
        key: 's5',
        title: 'Tuin',
        icon: 'fas fa-car',
        hide_data: true,
        last_update: false,
        switch: false,
      },
      {
        kind: 'title',
        key: 'grid_text',
        title: 'Keep me',
        width: 12,
        icon: '',
        custom_fields: {
          c: { legacy: true },
          layout: 1,
          classes: ['wide'],
          emptyObject: { __dashticz_empty_object__: true },
          emptyArray: [],
          unknownOption: { enabled: true },
        },
      },
    ]);
    expect(columnSaves).toBe(0);
    expect(customCssWrites).toBe(0);
    expect(gridRequest.items).toEqual([
      { ref: 's5', grid: { x: 2, y: 2, w: 6, h: 4 } },
      { ref: 'grid_text', grid: { x: 10, y: 5, w: 8, h: 2 } },
    ]);
  });

  test('Device Editor opens full Widget Config and preserves typed widget fields', async ({
    page,
  }) => {
    let widgetRequest = null;
    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `
blocks['grid_weather'] = {
  type: 'weather', widget_provider: 'openweather', title: 'Forecast',
  icon: 'fas fa-cloud', hide_data: true, last_update: true,
  c: 'legacy-grid', emptyObject: {}, emptyArray: [],
  futureOption: {enabled: true}, grid: {x: 2, y: 2, w: 8, h: 4}
};
config['owm_days'] = 1;
config['translate_windspeed'] = 0;
config['garbage_width'] = 9;
config['security_button_icons'] = 1;
config['security_panel_lock'] = 2;
config['gm_zoomlevel'] = 11;
config['gm_latitude'] = '52.1';
config['gm_longitude'] = '5.1';
config['idx_moonpicture'] = '817';
screens[1] = {
  layout: 'grid', gridColumns: 24, rowHeight: 20, gap: 5,
  mobileLayout: 'stack', blocks: ['grid_weather']
};
`,
      });
    });
    await page.route('**/info.php?get=csrf', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'widget-from-device-token' }),
      })
    );
    await page.route('**/js/listcustomicons.php*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          images: [
            'custom/door.png',
            'custom/garage.png',
            'custom/light.png',
            'custom/motion.png',
            'custom/weather.png',
            'custom/window.png',
            'custom/z-wave.png',
          ],
        }),
      })
    );
    await page.route('**/js/saveblocks.php*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, blockKeys: [] }),
      })
    );
    await page.route('**/js/savewidgets.php*', async (route) => {
      widgetRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, blockKeys: ['grid_weather'] }),
      });
    });
    await page.route('**/js/savegridlayout.php*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    );

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    expect(await page.evaluate(() => blocks.grid_weather.c)).toBe('legacy-grid');
    await openDeviceEditorFromScreenEditor(page);
    await page.locator('[data-order-key="widget:weather"] .de-config-btn').click();
    await expect(page.locator('#we-config-popup')).toBeVisible();
    await expect(page.locator('#we-cfg-weather-provider')).toBeVisible();

    for (const option of ['icon', 'show_title']) {
      await expect(page.locator(`[data-block-option="${option}"]`)).toBeChecked();
    }
    await expect(page.locator('[data-block-option="hide_data"]')).toHaveCount(0);
    await expect(page.locator('[data-block-option="last_update"]')).toHaveCount(0);
    await expect(page.getByText('Custom fields', { exact: true })).toBeVisible();
    await expect(page.locator('[data-block-option="icon"]')).toHaveCSS('width', '32px');
    await expect(page.locator('[data-block-option="icon"]')).toHaveCSS('height', '32px');
    await expect(page.locator('.we-custom-field-name').first()).toHaveValue('title');
    await expect(page.locator('.we-custom-field-setting').first()).toHaveValue('Forecast');
    const widgetIconRow = page.locator('.we-icon-field-row');
    await expect(widgetIconRow).toBeVisible();
    await expect(widgetIconRow.locator('.we-custom-field-name')).toHaveValue('icon');
    await expect(widgetIconRow.locator('.we-custom-field-setting')).toHaveValue('fas fa-cloud');
    await widgetIconRow.locator('.we-custom-field-remove').click();
    await expect(widgetIconRow).toHaveCount(0);
    await expect(page.locator('[data-block-option="icon"]')).not.toBeChecked();
    await page.locator('[data-block-option="icon"]').check();
    await expect(widgetIconRow).toBeVisible();
    await widgetIconRow.locator('.we-icon-source').selectOption('image');
    await expect(widgetIconRow.locator('.we-custom-field-setting')).toHaveValue('');
    await expect(widgetIconRow.locator('.we-custom-field-setting')).toHaveAttribute(
      'placeholder',
      'custom/icon.png'
    );
    await widgetIconRow.locator('.we-custom-field-setting').click();
    const customImageGrid = widgetIconRow.locator('.dt-custom-image-grid');
    await expect(widgetIconRow.locator('.dt-custom-image-picker')).toBeVisible();
    await expect(customImageGrid.locator('.dt-custom-image-option')).toHaveCount(7);
    expect(
      await customImageGrid.evaluate((grid) =>
        getComputedStyle(grid).gridTemplateColumns.split(' ').length
      )
    ).toBe(6);
    await customImageGrid
      .locator('.dt-custom-image-option[data-image-path="custom/weather.png"]')
      .click();
    await expect(widgetIconRow.locator('.we-custom-field-setting')).toHaveValue(
      'custom/weather.png'
    );
    await expect(widgetIconRow.locator('.dt-custom-image-picker')).toBeHidden();
    expect(
      await page.locator('.we-custom-field-name').evaluateAll((inputs) =>
        inputs.map((input) => input.value)
      )
    ).not.toContain('c');
    await page.locator('.we-custom-field-setting').first().fill('Forecast changed');
    await page.locator('#we-cfg-ok-btn').click();
    await expect(page.locator('#deviceeditorpopup')).toBeVisible();
    await page.locator('#de-save-btn').evaluate((button) => {
      button.disabled = false;
    });
    await page.locator('#de-save-btn').click();

    await expect.poll(() => widgetRequest).not.toBeNull();
    const savedWidget = widgetRequest.widgets[0];
    expect(savedWidget.title).toBe('Forecast changed');
    expect(savedWidget).not.toHaveProperty('icon');
    expect(savedWidget.hide_data).toBe(true);
    expect(savedWidget.last_update).toBe(true);
    expect(savedWidget.custom_fields.c).toBe('legacy-grid');
    expect(savedWidget.custom_fields.emptyObject).toEqual({
      __dashticz_empty_object__: true,
    });
    expect(savedWidget.custom_fields.emptyArray).toEqual([]);
    expect(savedWidget.custom_fields.futureOption).toEqual({ enabled: true });
    expect(savedWidget.custom_fields.image).toBe('custom/weather.png');
    expect(widgetRequest.settings.owm_days).toBe(1);
    expect(widgetRequest.settings.translate_windspeed).toBe(0);
    expect(widgetRequest.settings.garbage_width).toBe('9');
    expect(widgetRequest.settings.security_button_icons).toBe(1);
    expect(widgetRequest.settings).not.toHaveProperty('security_panel_lock');
    expect(await page.evaluate(() => settings.security_panel_lock)).toBe(2);
    expect(widgetRequest.settings.gm_zoomlevel).toBe('11');
    expect(widgetRequest.settings.gm_latitude).toBe('52.1');
    expect(widgetRequest.settings.gm_longitude).toBe('5.1');
    expect(widgetRequest.settings.idx_moonpicture).toBe('817');
  });

  test('Calendar Widget Config manages named sources without dropping calendar options', async ({
    page,
  }) => {
    let widgetRequest = null;
    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `
blocks['grid_calendar_sources'] = {
  type: 'calendar', title: 'Family agenda', layout: 2,
  icalurl: {
    Personal: {ics: 'https://calendar.test/personal.ics', color: 'blue'},
    Business: {ics: 'https://calendar.test/business.ics', color: 'purple'}
  },
  holidayurl: 'https://calendar.test/holidays.ics', maxitems: 100,
  weeks: 5, lastweek: true, isoweek: false, width: 12,
  c: 'legacy-calendar-grid', futureCalendarOption: {enabled: true},
  grid: {x: 1, y: 1, w: 24, h: 8}
};
screens[1] = {
  layout: 'grid', gridColumns: 24, rowHeight: 20, gap: 5,
  mobileLayout: 'stack', blocks: ['grid_calendar_sources']
};
`,
      });
    });
    await page.route(/\/ical\/index\.php\?/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );
    await page.route('**/info.php?get=csrf', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'calendar-widget-token' }),
      })
    );
    await page.route('**/js/saveblocks.php*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, blockKeys: [] }),
      })
    );
    await page.route('**/js/savewidgets.php*', async (route) => {
      widgetRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, blockKeys: ['grid_calendar_sources'] }),
      });
    });
    await page.route('**/js/savegridlayout.php*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    );

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await openDeviceEditorFromScreenEditor(page);
    await page.locator('[data-order-key="widget:calendar"] .de-config-btn').click();
    await expect(page.locator('#we-config-popup')).toBeVisible();
    await expect(page.locator('.we-calendar-row')).toHaveCount(2);
    await expect(page.locator('.we-calendar-name').nth(0)).toHaveValue('Personal');
    await expect(page.locator('.we-calendar-url').nth(1)).toHaveValue(
      'https://calendar.test/business.ics'
    );

    await page.locator('.we-calendar-url').nth(0).fill(
      'https://calendar.test/personal-new.ics'
    );
    await page.locator('.we-calendar-color').nth(0).fill('#ff0000');
    await page.locator('#we-calendar-add').click();
    await page.locator('.we-calendar-name').nth(2).fill('Family');
    await page.locator('.we-calendar-url').nth(2).fill(
      'https://calendar.test/family.ics'
    );
    await page.locator('.we-calendar-color').nth(2).fill('#008000');
    await page.locator('.we-calendar-remove').nth(1).click();
    await expect(page.locator('.we-calendar-row')).toHaveCount(2);
    await page.locator('#we-cfg-ok-btn').click();

    await expect(page.locator('#deviceeditorpopup')).toBeVisible();
    await page.locator('[data-order-key="widget:calendar"] .de-config-btn').click();
    await expect(page.locator('.we-calendar-row')).toHaveCount(2);
    await expect(page.locator('.we-calendar-name').nth(0)).toHaveValue('Personal');
    await expect(page.locator('.we-calendar-name').nth(1)).toHaveValue('Family');
    await page.locator('#we-cfg-ok-btn').click();
    await expect(page.locator('#deviceeditorpopup')).toBeVisible();
    await page.locator('#de-save-btn').evaluate((button) => {
      button.disabled = false;
    });
    await page.locator('#de-save-btn').click();

    await expect.poll(() => widgetRequest).not.toBeNull();
    const calendar = widgetRequest.widgets[0];
    expect(calendar.icalurl).toEqual({
      Personal: {
        ics: 'https://calendar.test/personal-new.ics',
        color: '#ff0000',
      },
      Family: {
        ics: 'https://calendar.test/family.ics',
        color: '#008000',
      },
    });
    expect(calendar.maxitems).toBe(100);
    expect(calendar.width).toBe(12);
    expect(calendar.custom_fields).toMatchObject({
      layout: 2,
      holidayurl: 'https://calendar.test/holidays.ics',
      weeks: 5,
      lastweek: true,
      isoweek: false,
      c: 'legacy-calendar-grid',
      futureCalendarOption: { enabled: true },
    });
    expect(calendar.icalurl.Business).toBeUndefined();
  });

  test('Calendar Widget Config reloads a legacy single icalurl safely', async ({ page }) => {
    let widgetRequest = null;
    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `
blocks['single_calendar'] = {
  type: 'calendar', title: 'Single agenda',
  icalurl: 'https://calendar.test/single.ics',
  holidayurl: 'https://calendar.test/holidays.ics', maxitems: 25,
  weeks: 4, lastweek: false, isoweek: true, width: 8,
  grid: {x: 1, y: 1, w: 16, h: 6}
};
screens[1] = {
  layout: 'grid', gridColumns: 24, rowHeight: 20, gap: 5,
  mobileLayout: 'stack', blocks: ['single_calendar']
};
`,
      });
    });
    await page.route(/\/ical\/index\.php\?/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );
    await page.route('**/info.php?get=csrf', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'single-calendar-token' }),
      })
    );
    await page.route('**/js/savewidgets.php*', async (route) => {
      widgetRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, blockKeys: ['single_calendar'] }),
      });
    });
    await page.route('**/js/savegridlayout.php*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    );

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await openWidgetEditorFromScreenEditor(page);
    await page.locator('.we-config-btn[data-widget-id="calendar"]').click();
    await expect(page.locator('.we-calendar-row')).toHaveCount(1);
    await expect(page.locator('.we-calendar-name')).toHaveValue('Calendar');
    await expect(page.locator('.we-calendar-url')).toHaveValue(
      'https://calendar.test/single.ics'
    );
    await expect(page.locator('.we-calendar-color')).toHaveAttribute(
      'data-calendar-color-value',
      'white'
    );
    await page.locator('#we-cfg-ok-btn').click();
    await expect(page.locator('#widgeteditorpopup')).toBeVisible();
    await page.locator('#we-save-btn').click();

    await expect.poll(() => widgetRequest).not.toBeNull();
    const calendar = widgetRequest.widgets[0];
    expect(calendar.icalurl).toEqual({
      Calendar: {
        ics: 'https://calendar.test/single.ics',
        color: 'white',
      },
    });
    expect(calendar.maxitems).toBe(25);
    expect(calendar.width).toBe(8);
    expect(calendar.custom_fields).toMatchObject({
      holidayurl: 'https://calendar.test/holidays.ics',
      weeks: 4,
      lastweek: false,
      isoweek: true,
    });
  });

  test('calendar runtime fetches a named icalurl object containing one source', async ({ page }) => {
    const calendarUrls = [];
    const calendarRequests = [];
    page.on('request', (request) => {
      if (request.url().includes('ical')) calendarRequests.push(request.url());
    });
    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `
blocks['one_named_calendar'] = {
  type: 'calendar',
  icalurl: {
    Personal: {ics: 'https://calendar.test/one-object.ics', color: 'blue'}
  },
  grid: {x: 1, y: 1, w: 12, h: 6}
};
screens[1] = {
  layout: 'grid', gridColumns: 24, rowHeight: 20, gap: 5,
  mobileLayout: 'stack', blocks: ['one_named_calendar']
};
`,
      });
    });
    await page.route(/\/ical\/index\.php\?/, async (route) => {
      calendarUrls.push(new URL(route.request().url()).searchParams.get('url'));
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await page.evaluate(() => {
      window.prepareCalendar(
        {
          block: window.blocks.one_named_calendar,
          mountPoint: '[data-grid-block="one_named_calendar"]',
        },
        'one_named_calendar_runtime_test'
      );
    });
    await expect.poll(() => calendarRequests).not.toHaveLength(0);
    await expect.poll(() => calendarUrls).toContain(
      'https://calendar.test/one-object.ics'
    );
    await expect(page.locator('[data-grid-block="one_named_calendar"] .calendar')).toBeVisible();
  });

  test('Theme panel identifies the active custom stylesheet', async ({ page }) => {
    await page.route('**/tests/custom.pw.css*', (route) =>
      route.fulfill({ status: 404, body: '' })
    );
    await page.route('**/tests/custom.css*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/css',
        body: '/* existing custom stylesheet */\n.user-rule { color: red; }',
      })
    );

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await page.mouse.move(10, 10);
    await page.getByRole('button', { name: 'Open settings' }).first().click();
    await expect(page.locator('#settingspopup')).toBeVisible();
    await page.locator('[data-settings-category="theme"]').click();
    const notice = page.locator('[data-custom-css-notice]');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('tests/custom.css');
    await expect(notice).toHaveCSS('border-top-width', '2px');
  });

  test('Widget settings only show tiles with supported global settings', async ({
    page,
  }) => {
    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `\nconfig['config_mode'] = 'custom';\nconfig['security_panel_lock'] = 2;\n`,
      });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await page.mouse.move(10, 10);
    await page.getByRole('button', { name: 'Open settings' }).first().click();
    await expect(page.locator('#settingspopup')).toBeVisible();
    await expect(page.locator('.settings-back')).toBeHidden();
    await page.locator('[data-settings-category="widgets"]').click();
    const settingsBack = page.locator('.settings-back');
    const settingsClose = page.locator('.settings-footer-actions [data-bs-dismiss="modal"]').first();
    await expect(settingsBack).toBeVisible();
    await expect(settingsBack).toHaveClass(/btn-secondary/);
    await expect(settingsClose).toHaveClass(/btn-secondary/);
    const [backBox, closeBox] = await Promise.all([
      settingsBack.boundingBox(),
      settingsClose.boundingBox(),
    ]);
    expect(backBox.right).toBeLessThanOrEqual(closeBox.left);

    for (const widgetId of ['publictransport', 'alarmmeldingen', 'camera', 'moon']) {
      await expect(
        page.locator(`.settings-widget-tile[data-widget-id="${widgetId}"]`)
      ).toHaveCount(0);
    }
    await expect(
      page.locator('.settings-widget-tile[data-widget-id="secpanel"]')
    ).toBeVisible();
    await page.locator('.settings-widget-tile[data-widget-id="secpanel"]').click();
    await expect(page.locator('#setting-security_panel_lock')).toBeVisible();
    await expect(page.locator('#setting-security_panel_lock')).toHaveValue('2');
    await expect(page.locator('#setting-security_panel_lock option')).toHaveCount(3);
    await expect(page.locator('#setting-security_panel_lock option').nth(0)).toHaveValue('0');
    await expect(page.locator('#setting-security_panel_lock option').nth(1)).toHaveValue('1');
    await expect(page.locator('#setting-security_panel_lock option').nth(2)).toHaveValue('2');
    await expect(page.locator('#setting-security_button_icons')).toHaveCount(0);
    await settingsBack.click();
    await expect(
      page.locator('.settings-widget-tile[data-widget-id="map"]')
    ).toBeVisible();
    await page.locator('.settings-widget-tile[data-widget-id="map"]').click();
    for (const setting of ['gm_api', 'gm_zoomlevel', 'gm_latitude', 'gm_longitude']) {
      await expect(page.locator(`#setting-${setting}`)).toBeVisible();
    }
    await settingsBack.click();
    await expect(
      page.locator('.settings-widget-tile[data-widget-id="clock"]')
    ).toBeVisible();
    await page.locator('.settings-widget-tile[data-widget-id="clock"]').click();
    for (const setting of [
      'boss_stationclock',
      'hide_seconds',
      'hide_seconds_stationclock',
    ]) {
      await expect(page.locator(`#setting-${setting}`)).toHaveCount(1);
    }
    await settingsBack.click();
    await page.locator('.settings-widget-tile[data-widget-id="calendar"]').click();
    await expect(page.locator('label[for="setting-calendarurl"]')).toHaveText(
      'Full calendar link'
    );
    await expect(
      page.locator('#setting-calendarurl').locator('xpath=ancestor::div[contains(@class,"settings-row")]')
    ).toContainText('Calendar data is configured separately with an ICS source.');
    await settingsBack.click();
    await expect(
      page.locator('.settings-widget-tile[data-widget-id="calendar"]')
    ).toBeVisible();
    await settingsBack.click();
    await expect(page.locator('#settings-home')).toBeVisible();
    await expect(settingsBack).toBeHidden();
  });

  test('Custom devices accept empty objects and arrays as typed settings', async ({
    page,
  }) => {
    let blocksRequest = null;
    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `
screens[1] = {
  layout: 'grid', gridColumns: 24, rowHeight: 20, gap: 5,
  mobileLayout: 'stack', blocks: []
};
`,
      });
    });
    await page.route('**/info.php?get=csrf', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'custom-device-token' }),
      })
    );
    await page.route('**/js/saveblocks.php*', async (route) => {
      blocksRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, blockKeys: ['CustomObject'] }),
      });
    });
    await page.route('**/js/savewidgets.php*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, blockKeys: [] }),
      })
    );
    await page.route('**/js/savegridlayout.php*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    );

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await openScreenEditorAddMenu(page);
    await page.locator('.dt-screeneditor-add-tile[data-add-action="custom"]').click();
    await expect(page.locator('#customdevicepopup')).toBeVisible();
    await page.locator('#cd-device-name').fill('CustomObject');
    await page.locator('#cd-device-idx').fill('42');
    await page.locator('.cd-custom-field-setting').nth(2).fill('{}');
    await page.locator('.cd-custom-field-add').last().click();
    await page.locator('.cd-custom-field-name').last().fill('items');
    await page.locator('.cd-custom-field-setting').last().fill('[]');
    await page.locator('#cd-save-btn').click();

    await expect.poll(() => blocksRequest).not.toBeNull();
    const customDevice = blocksRequest.devices[0];
    expect(customDevice.kind).toBe('custom');
    expect(customDevice.key).toBe('CustomObject');
    expect(customDevice.custom_fields.values).toEqual({
      __dashticz_empty_object__: true,
    });
    expect(customDevice.custom_fields.items).toEqual([]);
  });

  test('Widget Editor updates widgets without replacing grid layout', async ({
    page,
  }) => {
    let gridRequest = null;
    let columnSaves = 0;
    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `
blocks['grid_weather'] = {
  type: 'weather',
  widget_provider: 'openweather',
  grid: {x: 3, y: 2, w: 8, h: 4}
};
blocks['grid_text'] = {
  type: 'blocktitle',
  title: 'Keep me',
  grid: {x: 12, y: 8, w: 6, h: 2}
};
screens[1] = {
  layout: 'grid',
  gridColumns: 24,
  rowHeight: 20,
  gap: 5,
  mobileLayout: 'stack',
  blocks: ['grid_weather', 'grid_text']
};
`,
      });
    });
    await page.route('**/info.php?get=csrf', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'widget-grid-token' }),
      })
    );
    await page.route('**/js/savewidgets.php*', async (route) => {
      const payload = route.request().postDataJSON();
      expect(payload.blocksOnly).toBe(true);
      expect(payload.widgets[0].key).toBe('grid_weather');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          blockKeys: ['grid_weather'],
        }),
      });
    });
    await page.route('**/js/savelayout.php*', async (route) => {
      columnSaves++;
      await route.fulfill({ status: 500, body: '{}' });
    });
    await page.route('**/js/savegridlayout.php*', async (route) => {
      gridRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await openWidgetEditorFromScreenEditor(page);

    // The Layout Editor toolbar must remain behind the Widget Editor. Besides
    // being visually wrong, a higher toolbar intercepts clicks on Save.
    const toolbarZ = await page.locator('.dle-toolbar').evaluate((element) =>
      parseInt(getComputedStyle(element).zIndex, 10)
    );
    const widgetModalZ = await page.locator('#widgeteditorpopup').evaluate((element) =>
      parseInt(getComputedStyle(element).zIndex, 10)
    );
    expect(toolbarZ).toBeLessThan(widgetModalZ);

    await page.locator('#we-save-btn').click();

    await expect.poll(() => gridRequest).not.toBeNull();
    expect(columnSaves).toBe(0);
    expect(gridRequest.items).toEqual([
      { ref: 'grid_weather', grid: { x: 3, y: 2, w: 8, h: 4 } },
      { ref: 'grid_text', grid: { x: 12, y: 8, w: 6, h: 2 } },
    ]);
  });

  test('Widget Editor saves configurable widgets while Layout Editor is active', async ({
    page,
  }) => {
    let widgetRequest = null;
    let gridSaveRequest = null;

    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `
blocks['tc1'].grid = {x: 1, y: 1, w: 6, h: 4};
screens[1] = {
  layout: 'grid', gridColumns: 24, rowHeight: 20, gap: 5,
  mobileLayout: 'stack', blocks: ['tc1']
};
`,
      });
    });

    await page.route('**/info.php?get=csrf', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'widget-config-save-token' }),
      })
    );
    await page.route('**/js/savewidgets.php*', async (route) => {
      widgetRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          blockKeys: ['widget_weather', 'widget_spotify', 'widget_clock'],
        }),
      });
    });
    await page.route('**/js/savelayout.php*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    );
    await page.route('**/js/savegridlayout.php*', async (route) => {
      gridSaveRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await openWidgetEditorFromScreenEditor(page);

    for (const widgetId of ['weather', 'spotify', 'clock']) {
      await page.locator(`.we-widget-card[data-widget-id="${widgetId}"]`).click();
    }

    // A real click is important here: it fails when the fixed Layout Editor
    // toolbar sits above the modal footer and intercepts pointer events.
    await page.locator('#we-save-btn').click();

    await expect.poll(() => widgetRequest).not.toBeNull();
    await expect.poll(() => gridSaveRequest).not.toBeNull();
    expect(widgetRequest.widgets.map((widget) => widget.id)).toEqual([
      'weather',
      'spotify',
      'clock',
    ]);
    expect(widgetRequest.widgets.find((widget) => widget.id === 'weather').provider).toBe(
      'openweather'
    );
    expect(widgetRequest.widgets.find((widget) => widget.id === 'clock').clockType).toBe(
      'basicclock'
    );
  });

  test('places blocks at explicit coordinates and stacks on mobile', async ({
    page,
  }) => {
    await page.route('**/tests/CONFIG.pw.js*', async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      await route.fulfill({
        response,
        body:
          source +
          `
blocks['tc1'].grid = {x: 1, y: 1, w: 6, h: 3};
blocks['tc2'].grid = {x: 10, y: 1, w: 5, h: 6};
blocks['tc4'].grid = {x: 3, y: 9, w: 8, h: 3};
blocks['grid_camera'] = {
  type: 'camera',
  cameras: [
    {title: 'Front', imageUrl: 'img/dashticz.png'},
    {title: 'Back', imageUrl: 'img/dashticz.png'}
  ],
  grid: {x: 17, y: 1, w: 8, h: 6}
};
blocks['grid_weather'] = {
  type: 'weather',
  widget_provider: 'openweather',
  apikey: '',
  layout: 2,
  grid: {x: 1, y: 13, w: 8, h: 4}
};
blocks['grid_calendar'] = {
  type: 'calendar',
  icalurl: 'data:text/calendar,BEGIN:VCALENDAR%0AEND:VCALENDAR',
  grid: {x: 1, y: 18, w: 7, h: 6}
};
blocks['grid_graph'] = {
  devices: [708],
  grid: {x: 9, y: 18, w: 7, h: 6}
};
blocks['grid_frame'] = {
  frameurl: 'about:blank',
  grid: {x: 17, y: 18, w: 8, h: 6}
};
blocks['grid_text'] = {
  type: 'blocktitle',
  title: 'Grid text',
  grid: {x: 1, y: 26, w: 8, h: 2}
};
screens[1] = {
  layout: 'grid',
  gridColumns: 24,
  rowHeight: 20,
  gap: 5,
  mobileLayout: 'stack',
  blocks: [
    'tc1',
    'tc2',
    'tc4',
    'grid_camera',
    'grid_weather',
    'grid_calendar',
    'grid_graph',
    'grid_frame',
    'grid_text'
  ]
};
`,
      });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);

    const grid = page.locator('.screen1 > .dt-grid-layout');
    const first = grid.locator('[data-grid-block="tc1"]');
    const second = grid.locator('[data-grid-block="tc2"]');
    const third = grid.locator('[data-grid-block="tc4"]');
    const camera = grid.locator('[data-grid-block="grid_camera"]');
    const weather = grid.locator('[data-grid-block="grid_weather"]');
    const calendar = grid.locator('[data-grid-block="grid_calendar"]');
    const graph = grid.locator('[data-grid-block="grid_graph"]');
    const frame = grid.locator('[data-grid-block="grid_frame"]');
    const text = grid.locator('[data-grid-block="grid_text"]');

    await expect(grid).toHaveCSS('display', 'grid');
    await expect(first).toHaveCSS('grid-column-start', '1');
    await expect(first).toHaveCSS('grid-row-start', '1');
    await expect(second).toHaveCSS('grid-column-start', '10');
    await expect(second).toHaveCSS('grid-row-end', 'span 6');
    await expect(third).toHaveCSS('grid-column-start', '3');
    await expect(third).toHaveCSS('grid-row-start', '9');

    const desktopBoxes = await Promise.all([
      first.boundingBox(),
      second.boundingBox(),
      third.boundingBox(),
    ]);
    expect(desktopBoxes.every(Boolean)).toBe(true);
    expect(desktopBoxes[0].x).toBeLessThan(desktopBoxes[1].x);
    expect(desktopBoxes[2].y).toBeGreaterThan(
      desktopBoxes[1].y + desktopBoxes[1].height
    );
    await expect(camera.locator(':scope > [id^="block_"]')).toHaveCount(2);

    const weatherWidth = await weather.evaluate(
      (element) => element.getBoundingClientRect().width
    );
    const weatherFontSize = await weather.locator('.dt_block').evaluate(
      (element) => parseFloat(getComputedStyle(element).fontSize)
    );
    expect(weatherFontSize).toBeGreaterThan(weatherWidth / 15);
    await expect(calendar.locator('.calendar.dt_block')).toBeVisible();
    await expect(graph.locator('canvas')).toBeAttached();
    await expect(frame.locator('iframe')).toBeAttached();
    await expect(text.locator('.dt_title')).toHaveText('Grid text');
    await expect(first.locator('.mh')).toBeVisible();

    for (const item of [calendar, graph, frame, text]) {
      await expect(item).toHaveCSS('overflow', 'auto');
    }

    await openDeviceEditorFromScreenEditor(page);
    await page
      .locator('#deviceeditorpopup [data-bs-dismiss="modal"]')
      .last()
      .click();
    await expect(page.locator('#deviceeditorpopup')).toHaveCount(0);
    await page.locator('.dle-cancel').click();
    await expect(page.locator('body')).not.toHaveClass(/dle-active/);

    await page.setViewportSize({ width: 500, height: 900 });
    await expect(grid).toHaveCSS('display', 'flex');

    const mobileBoxes = await Promise.all([
      first.boundingBox(),
      second.boundingBox(),
      third.boundingBox(),
    ]);
    expect(mobileBoxes.every(Boolean)).toBe(true);
    expect(Math.abs(mobileBoxes[0].width - mobileBoxes[1].width)).toBeLessThan(
      1
    );
    expect(mobileBoxes[0].y).toBeLessThan(mobileBoxes[1].y);
    expect(mobileBoxes[1].y).toBeLessThan(mobileBoxes[2].y);

    await page.setViewportSize({ width: 1280, height: 900 });
    let savedGridRequest = null;
    await page.route('**/info.php?get=csrf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'grid-test-token' }),
      });
    });
    await page.route('**/js/savegridlayout.php*', async (route) => {
      savedGridRequest = {
        headers: route.request().headers(),
        payload: route.request().postDataJSON(),
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.locator('.screen1 .layouteditoricon').click();
    await expect(page.locator('body')).toHaveClass(/dle-active/);
    await expect(grid).toHaveClass(/dle-grid-canvas/);

    const resizeHandle = first.locator('.dle-resize-handle').last();
    await resizeHandle.hover();
    const resizeBox = await resizeHandle.boundingBox();
    expect(resizeBox).not.toBeNull();
    await page.mouse.move(
      resizeBox.x + resizeBox.width / 2,
      resizeBox.y + resizeBox.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(resizeBox.x + 110, resizeBox.y + 65, { steps: 5 });
    await page.mouse.up();
    await expect
      .poll(() =>
        first.evaluate((element) =>
          element.style.getPropertyValue('--dt-grid-h')
        )
      )
      .toBe('6');

    const firstOverlay = first.locator('.dle-overlay').first();
    const dragBox = await firstOverlay.boundingBox();
    const editorGridBox = await grid.boundingBox();
    expect(dragBox).not.toBeNull();
    expect(editorGridBox).not.toBeNull();
    const targetX = 12;
    const columnStride = (editorGridBox.width + 5) / 24;
    const pointerOffsetX = dragBox.width / 2;
    await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + 25);
    await page.mouse.down();
    await page.mouse.move(
      editorGridBox.x + pointerOffsetX + (targetX - 1) * columnStride,
      885,
      { steps: 8 }
    );
    await expect
      .poll(
        () =>
          first.evaluate((element) =>
            parseInt(element.style.getPropertyValue('--dt-grid-y'), 10)
          ),
        { timeout: 5000 }
      )
      .toBeGreaterThan(28);
    await page.mouse.up();
    await expect(first).toHaveCSS('grid-column-start', String(targetX));
    const draggedY = await first.evaluate((element) =>
      parseInt(element.style.getPropertyValue('--dt-grid-y'), 10)
    );

    await page.locator('.dle-save').click();
    await expect.poll(() => savedGridRequest).not.toBeNull();
    expect(savedGridRequest.headers['x-dashticz-csrf']).toBe('grid-test-token');
    const savedFirst = savedGridRequest.payload.items.find(
      (item) => item.ref === 'tc1'
    );
    expect(savedFirst.grid.x).toBe(targetX);
    expect(savedFirst.grid.y).toBe(draggedY);
    expect(savedFirst.grid.h).toBe(6);
    expect(savedGridRequest.payload.gridColumns).toBe(24);
  });
});

async function openScreenEditorAddMenu(page) {
  if (!(await page.locator('body').evaluate((body) => body.classList.contains('dle-active')))) {
    await page.locator('.screen1 .layouteditoricon').click();
    await expect(page.locator('body')).toHaveClass(/dle-active/);
  }
  const addButton = page.locator('.screen1 .screeneditoraddicon');
  await expect(addButton).toBeVisible();
  await addButton.click();
  await expect(page.locator('#screeneditoraddpopup')).toBeVisible();
  await expect(page.locator('.dt-screeneditor-add-tile')).toHaveCount(4);
}

async function openDeviceEditorFromScreenEditor(page) {
  await openScreenEditorAddMenu(page);
  await page.locator('.dt-screeneditor-add-tile[data-add-action="device"]').click();
  await expect(page.locator('#deviceeditorpopup')).toBeVisible();
}

async function openWidgetEditorFromScreenEditor(page) {
  await openScreenEditorAddMenu(page);
  await page.locator('.dt-screeneditor-add-tile[data-add-action="widgets"]').click();
  await expect(page.locator('#widgeteditorpopup')).toBeVisible();
}

async function waitForDashboard(page) {
  await page.locator('#loaderHolder').waitFor({
    state: 'hidden',
    timeout: 15000,
  });
}
