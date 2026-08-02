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
    await page.route('**/js/savegridlayout.php', async (route) => {
      conversionRequest = route.request().postDataJSON();
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
    expect(dialog.message()).toContain('24-koloms grid');
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
    await page.route('**/js/savegridlayout.php', async (route) => {
      conversionRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    await page.route('**/js/saveconfigmode.php', async (route) => {
      separateModeWrites++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await expect(
      page
        .locator('.screen1 .config-mode-btn[data-mode="custom"]')
        .first()
    ).toHaveClass(/active/);
    let confirmationMessage = '';
    page.once('dialog', async (dialog) => {
      confirmationMessage = dialog.message();
      await dialog.accept();
    });
    await page
      .locator('.screen1 .config-mode-btn[data-mode="wizard"]')
      .first()
      .click();
    await expect.poll(() => confirmationMessage).toContain(
      'Wizard gebruikt altijd'
    );

    await expect.poll(() => conversionRequest).not.toBeNull();
    expect(conversionRequest.configMode).toBe('wizard');
    expect(separateModeWrites).toBe(0);
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
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page
      .locator('.screen1 .config-mode-btn[data-mode="wizard"]')
      .first()
      .click();

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
    await page.route('**/js/savegridlayout.php', async (route) => {
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
    expect(dialog.message()).toContain('24-koloms grid');
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
    await page.route('**/js/saveblocks.php', async (route) => {
      expect(route.request().postDataJSON().blocksOnly).toBe(true);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, blockKeys: ['tc1'] }),
      });
    });
    await page.route('**/js/savelayout.php', async (route) => {
      columnSaves++;
      await route.fulfill({ status: 500, body: '{}' });
    });
    await page.route('**/js/savegridlayout.php', async (route) => {
      gridRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await page.locator('.screen1 .deviceeditoricon').click();
    await expect(page.locator('#deviceeditorpopup')).toBeVisible();
    await page.locator('#de-save-btn').evaluate((button) => {
      button.disabled = false;
    });
    await page.locator('#de-save-btn').click();

    await expect.poll(() => gridRequest).not.toBeNull();
    expect(columnSaves).toBe(0);
    expect(gridRequest.items).toEqual([
      { ref: 'tc1', grid: { x: 2, y: 2, w: 6, h: 3 } },
      { ref: 'grid_text', grid: { x: 10, y: 5, w: 8, h: 2 } },
    ]);
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
    await page.route('**/js/savewidgets.php', async (route) => {
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
    await page.route('**/js/savelayout.php', async (route) => {
      columnSaves++;
      await route.fulfill({ status: 500, body: '{}' });
    });
    await page.route('**/js/savegridlayout.php', async (route) => {
      gridRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(dashboardUrl);
    await waitForDashboard(page);
    await page.locator('.screen1 .widgeteditoricon').click();
    await expect(page.locator('#widgeteditorpopup')).toBeVisible();
    await page.locator('#we-save-btn').click();

    await expect.poll(() => gridRequest).not.toBeNull();
    expect(columnSaves).toBe(0);
    expect(gridRequest.items).toEqual([
      { ref: 'grid_weather', grid: { x: 3, y: 2, w: 8, h: 4 } },
      { ref: 'grid_text', grid: { x: 12, y: 8, w: 6, h: 2 } },
    ]);
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

    await page.locator('.screen1 .deviceeditoricon').click();
    await expect(page.locator('#deviceeditorpopup')).toBeVisible();
    await page
      .locator('#deviceeditorpopup [data-bs-dismiss="modal"]')
      .last()
      .click();
    await expect(page.locator('#deviceeditorpopup')).toHaveCount(0);

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
    await page.route('**/js/savegridlayout.php', async (route) => {
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
      .toBe('4');

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
    expect(savedFirst.grid.h).toBe(4);
    expect(savedGridRequest.payload.gridColumns).toBe(24);
  });
});

async function waitForDashboard(page) {
  await page.locator('#loaderHolder').waitFor({
    state: 'hidden',
    timeout: 15000,
  });
}
