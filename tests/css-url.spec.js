// @ts-check
import { test, expect } from '@playwright/test';

/* A Google Fonts stylesheet got '?v=211' appended after its own query string
   ('css2?family=Montserrat?v=211'), which Chrome blocks (CORB). */
test('stylesheet URLs get a valid version parameter', async ({ page }) => {
  await page.goto('/?cfg=CONFIG.names.js&folder=tests');
  await page.locator('#loaderHolder').waitFor({
    state: 'hidden',
    timeout: 15000,
  });
  const urls = await page.evaluate(() => {
    // eslint-disable-next-line no-undef
    const f = DT_function.cssURL;
    return [
      f('js/components/x.css'),
      f('./js/components/x.css?a=1'),
      f('https://fonts.googleapis.com/css2?family=Montserrat'),
      f('//fonts.googleapis.com/css2?family=Montserrat'),
    ];
  });
  expect(urls[0]).toMatch(/^js\/components\/x\.css\?v=\d+/);
  expect(urls[1]).toMatch(/^\.\/js\/components\/x\.css\?a=1&v=\d+/);
  expect(urls[2]).toBe('https://fonts.googleapis.com/css2?family=Montserrat');
  expect(urls[3]).toBe('//fonts.googleapis.com/css2?family=Montserrat');
});
