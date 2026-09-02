// @ts-check
import { test, expect } from '@playwright/test';

const compareScreenshots =
  process.platform === 'linux' &&
  (process.env.DASHTICZ_BROWSER || 'chromium') === 'chromium';

// Font rasterisation and headless browser updates can move a small number of
// antialiased pixels without changing the actual Dashticz layout. Keep visual
// regression testing enabled, but tolerate up to 1.5% pixel difference so
// tiny renderer-only changes do not make an otherwise correct PR fail.
const screenshotOptions = { maxDiffPixelRatio: 0.015 };

// Element screenshots are component tests. Hiding the other .mh blocks with
// visibility keeps every float in its original place, but prevents content
// painted outside a neighbouring block from contaminating the target image.
// The separate geometry test below continues to validate the full layout.
const isolatedScreenshotCss = `
  body.dt-isolate-block-screenshot .mh:not(.dt-screenshot-target) {
    visibility: hidden !important;
  }
`;

test.describe('Basic testing', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the starting url before each test.
    await page.goto('/?cfg=CONFIG.pw.js&folder=tests');
    await page.addStyleTag({ content: isolatedScreenshotCss });
  });

  test('block tests', async ({ page }) => {
    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Dashticz/);
    await page.waitForTimeout(1000);
    if (compareScreenshots) {
      await expectIsolatedScreenshot(
        page,
        page.locator('.block_43_1'),
        'bl_43_1.png'
      );
    }
    await expect(page.locator('.block_43_1 .value')).toHaveText('700W');

    await checkBlock(page, 'tc1', 'fa-car', undefined, 'Tuin');
    await checkBlock(
      page,
      'tc2',
      'fa-thermometer-half',
      undefined,
      'Buienradar - Temperature',
      '10,7°C/ 49%/ dewpoint: 0,4°C'
    );
    await checkBlock(
      page,
      'tc4',
      'fa-bus',
      undefined,
      '2,3°C',
      'Dew temperature of device 1247'
    );
    //    await checkBlock(page, 'tc5'); //multiple blocks
    await checkBlock(
      page,
      'tc5_3',
      'wi-barometer',
      undefined,
      'TeHuBa',
      '1.027hPa'
    );
    await checkBlock(
      page,
      'tc6',
      'fa-plug',
      undefined,
      'Actual: 700 Watt',
      'Today: 23,9kWh'
    );
    await checkBlock(page, 'tc7');
    await checkBlock(page, 'tc8');
    await checkBlock(page, 'tc9', 'fa-lightbulb', undefined, 'KeukenLampen');
    await checkBlock(page, 'tc10', 'fa-lightbulb', undefined, 'tc10');
    await checkBlock(
      page,
      'tc11',
      undefined,
      'img/heating.png',
      'LMS',
      'Dummy title playing'
    );
    await checkBlock(page, 'tc12', 'fa-film', undefined, 'smoke', '15');
    await checkBlock(
      page,
      'tc13',
      'fa-film',
      undefined,
      'smoke',
      'Nothing is playing right now'
    );
    await checkBlock(
      page,
      'tc16',
      undefined,
      'img/blinds_closed.png',
      'blinds test 100%'
    );
    await expect.soft(page.locator('.block_tc16 .slider')).toBeVisible();
    await checkBlock(
      page,
      'tc17 test',
      'fa-film',
      undefined,
      'VLC test',
      'Nothing is playing right now'
    );
    await checkBlock(
      page,
      'blinds_nostop',
      undefined,
      'img/blinds_closed.png',
      'blinds no stop 100%'
    );
    await expect
      .soft(page.locator('.block_blinds_nostop .col-button1'))
      .toBeVisible();
    await checkBlock(
      page,
      'thermostat',
      undefined,
      'img/heating.png',
      'OTGW_Thermostat',
      '19,0°C'
    );
  });

  test('device title typography is independent from data and heading text', async ({
    page,
  }) => {
    await page.waitForTimeout(1000);

    const title = page.locator('[data-id="tc2"] .title');
    const value = page.locator('[data-id="tc2"] .value');

    await expect(title).toHaveCSS('font-size', '12px');
    await expect(value).toHaveCSS('font-size', '12px');

    // Header/title-bar and data controls must not resize a device title.
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--font-large', '40px');
      document.documentElement.style.setProperty('--font-small', '30px');
    });
    await expect(title).toHaveCSS('font-size', '12px');
    await expect(value).toHaveCSS('font-size', '30px');

    // The dedicated variable remains available for a theme/custom override.
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--font-device-title', '14px');
    });
    await expect(title).toHaveCSS('font-size', '14px');
  });

  test('legacy column block boxes do not overlap', async ({ page }) => {
    await page.waitForTimeout(1000);

    const overlaps = await page
      .locator('.screen .row [data-colindex] .mh[data-id]')
      .evaluateAll((elements) => {
        const columns = new Map();

        for (const element of elements) {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            rect.width <= 0 ||
            rect.height <= 0
          ) {
            continue;
          }

          const column = element.closest('[data-colindex]');
          const columnKey = column
            ? column.getAttribute('data-colindex') || ''
            : '';
          const entries = columns.get(columnKey) || [];
          entries.push({
            id: element.getAttribute('data-id') || element.className,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
          });
          columns.set(columnKey, entries);
        }

        const result = [];
        for (const entries of columns.values()) {
          for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
            for (
              let rightIndex = leftIndex + 1;
              rightIndex < entries.length;
              rightIndex += 1
            ) {
              const left = entries[leftIndex];
              const right = entries[rightIndex];
              const overlapWidth =
                Math.min(left.right, right.right) -
                Math.max(left.left, right.left);
              const overlapHeight =
                Math.min(left.bottom, right.bottom) -
                Math.max(left.top, right.top);

              // Ignore sub-pixel rounding at a shared edge; a real tile
              // overlap is larger than one CSS pixel in both directions.
              if (overlapWidth > 1 && overlapHeight > 1) {
                result.push(
                  `${left.id} overlaps ${right.id} ` +
                    `(${Math.round(overlapWidth)}x${Math.round(overlapHeight)}px)`
                );
              }
            }
          }
        }
        return result;
      });

    expect(overlaps).toEqual([]);
  });

  test('hideimageonempty block option', async ({ page }) => {
    await page.waitForTimeout(1000);

    // 1. hideimageonempty absent: image stays visible even with empty Data.
    await expect(imageOf(page, 'hi_missing')).toHaveAttribute(
      'src',
      'img/heating.png'
    );
    await expect(imageOf(page, 'hi_missing')).toBeVisible();

    // 2. hideimageonempty: false: image stays visible even with empty Data.
    await expect(imageOf(page, 'hi_false')).toHaveAttribute(
      'src',
      'img/heating.png'
    );
    await expect(imageOf(page, 'hi_false')).toBeVisible();

    // 3. hideimageonempty: true + Data filled: image visible.
    await expect(imageOf(page, 'hi_true_filled')).toHaveAttribute(
      'src',
      'img/heating.png'
    );
    await expect(imageOf(page, 'hi_true_filled')).toBeVisible();

    // 4. hideimageonempty: true + Data empty: image hidden, .col-icon kept.
    await expect(imageOf(page, 'hi_true_empty')).toBeHidden();
    await expect(
      page.locator('[data-id="hi_true_empty"] .col-icon')
    ).toBeVisible();

    // 5. Live update: Data empty -> filled makes the image reappear.
    await expect(imageOf(page, 'hi_live_show')).toBeHidden();
    await setDeviceData(page, '9105', 'Dutch GP');
    await expect(imageOf(page, 'hi_live_show')).toBeVisible();

    // 6. Live update: Data filled -> empty hides the image again.
    await expect(imageOf(page, 'hi_live_hide')).toBeVisible();
    await setDeviceData(page, '9106', '');
    await expect(imageOf(page, 'hi_live_hide')).toBeHidden();

    // 7. Whitespace/<br>/&nbsp;/&#160;/NBSP (and combinations) count as empty.
    const emptyVariants = [
      ' ',
      '\t',
      '\n',
      '<br>',
      '<br/>',
      '<br />',
      '&nbsp;',
      '&#160;',
      ' ',
      '  \n<br>\t&nbsp;&#160; <br />  ',
    ];
    for (const variant of emptyVariants) {
      await setDeviceData(page, '9107', variant);
      await expect(imageOf(page, 'hi_variants')).toBeHidden();
    }
    await setDeviceData(page, '9107', 'Spa-Francorchamps');
    await expect(imageOf(page, 'hi_variants')).toBeVisible();

    // 8. hideimageonempty accepts the string 'true' as well as the boolean.
    await expect(imageOf(page, 'hi_string_true')).toBeHidden();

    // 9. hideimageonempty accepts the number 1 as well as the boolean.
    await expect(imageOf(page, 'hi_number_one')).toBeHidden();

    // 10. Falls back to sValue when Data is unset.
    await expect(imageOf(page, 'hi_svalue_fallback')).toBeVisible();
  });

  test('automation indicator block option', async ({ page }) => {
    await page.waitForTimeout(1000);

    // 1. A block with an enabled Automation rule (see tests/custom.js) shows
    // the indicator dot.
    await expect(
      automationIndicatorOf(page, 'automation_with_rule')
    ).toBeVisible();

    // 2. A block with no configured Automation rule shows nothing.
    await expect(
      automationIndicatorOf(page, 'automation_without_rule')
    ).toHaveCount(0);

    // 3. automation_indicator: false opts a block out even though a rule
    // exists for it.
    await expect(
      automationIndicatorOf(page, 'automation_opted_out')
    ).toHaveCount(0);

    // 4. Live: a rule added after page load shows up on the next device
    // update, no reload needed - and disappears again once removed.
    await setDeviceRules(page, 'automation_without_rule', {
      schemaVersion: 2,
      rules: [{ id: 'r1', enabled: true, trigger: {}, actions: {} }],
      customJsHandler: '',
    });
    await setDeviceData(page, '9112', 'Automation test 2');
    await expect(
      automationIndicatorOf(page, 'automation_without_rule')
    ).toBeVisible();

    await setDeviceRules(page, 'automation_without_rule', null);
    await setDeviceData(page, '9112', 'Automation test 3');
    await expect(
      automationIndicatorOf(page, 'automation_without_rule')
    ).toHaveCount(0);
  });
});

async function expectIsolatedScreenshot(page, locator, fileName) {
  await locator.evaluate((element) => {
    element.classList.add('dt-screenshot-target');
  });
  await page.evaluate(() => {
    document.body.classList.add('dt-isolate-block-screenshot');
  });

  try {
    await expect.soft(locator).toHaveScreenshot(fileName, screenshotOptions);
  } finally {
    await page.evaluate(() => {
      document.body.classList.remove('dt-isolate-block-screenshot');
      document
        .querySelectorAll('.dt-screenshot-target')
        .forEach((element) => element.classList.remove('dt-screenshot-target'));
    });
  }
}

async function checkBlock(page, key, icon, image, title, value) {
  var fileName = 'bl_' + key + '.png';
  const locator = page.locator('css=[data-id="' + key + '"]');
  if (compareScreenshots) {
    await expectIsolatedScreenshot(page, locator, fileName);
  }
  typeof value !== 'undefined' &&
    (await expect.soft(locator.locator('.value')).toHaveText(value));
  typeof title !== 'undefined' &&
    (await expect.soft(locator.locator('.title')).toHaveText(title));
  typeof icon !== 'undefined' &&
    (await expect.soft(locator.locator('.' + icon)).toHaveText(''));
  typeof image !== 'undefined' &&
    (await expect
      .soft(locator.locator('.col-icon img'))
      .toHaveAttribute('src', image));
}

function imageOf(page, key) {
  return page.locator('[data-id="' + key + '"] .col-icon img');
}

function automationIndicatorOf(page, key) {
  return page.locator('[data-id="' + key + '"] .automation-indicator');
}

// Adds/replaces (or, with entry=null, removes) a Device Rules entry the same
// way custom.js does, without touching the file - so a test can exercise a
// live rule change without a page reload.
async function setDeviceRules(page, source, entry) {
  await page.evaluate(
    ({ source, entry }) => {
      window.DashticzDeviceRulesConfig = window.DashticzDeviceRulesConfig || {};
      if (entry === null) delete window.DashticzDeviceRulesConfig[source];
      else window.DashticzDeviceRulesConfig[source] = entry;
    },
    { source, entry }
  );
}

// Pushes a live Domoticz device update through the fake_domoticz test hook,
// the same path a real websocket/poll update takes (Domoticz.setDevice ->
// deviceObservable -> deviceUpdateHandler), without a page reload.
async function setDeviceData(page, idx, data) {
  await page.evaluate(
    ({ idx, data }) => {
      var device = window.Domoticz.getAllDevices(idx);
      device.Data = data;
      window.Domoticz.setDevice(idx, device);
    },
    { idx, data }
  );
}
