// @ts-check
import { test, expect } from '@playwright/test';

/* The security panel's hidden device information (bottom left screw) is
   built without the former mobile-detect library. */
test('security panel screw shows device information', async ({ page }) => {
  await page.goto('/?cfg=CONFIG.pw.js&folder=tests');
  await page.locator('#loaderHolder').waitFor({
    state: 'hidden',
    timeout: 15000,
  });
  // js/components/secpanel.js registers the click handler when it loads.
  await page.waitForFunction(() => typeof window.DT_secpanel !== 'undefined');
  const message = new Promise((resolve) =>
    page.once('dialog', async (dialog) => {
      resolve(dialog.message());
      await dialog.dismiss();
    })
  );
  await page.evaluate(() => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div class="sec-frame"><div class="screw bl"></div></div>'
    );
    document.querySelector('.sec-frame .screw.bl').click();
  });
  const text = await message;
  expect(text).toMatch(
    /^Mobile: (true|false)\nPhone: (true|false)\nTablet: (true|false)\nOS: \w+\nUser Agent: .+\nResolution: \d+x\d+\nOrientation: \w*$/
  );
  expect(await page.evaluate(() => typeof window.MobileDetect)).toBe(
    'undefined'
  );
});
