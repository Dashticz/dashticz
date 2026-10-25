// @ts-check
import { test, expect } from '@playwright/test';

/* Weather Underground is gone: its former block types are mounted by the
   regular weather component (js/components/weather.js). Without a valid
   OpenWeather/KNMI key that component shows its own API key error. */
test('former Weather Underground blocks use the weather component', async ({
  page,
}) => {
  await page.route('**/tests/CONFIG.pw.js*', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body:
        (await response.text()) +
        `
config['owm_api'] = '';
blocks['legacy_wu'] = { type: 'wunderground', grid: {x: 1, y: 1, w: 8, h: 6} };
blocks['legacy_now'] = { type: 'currentweather', grid: {x: 9, y: 1, w: 8, h: 6} };
blocks['legacy_big'] = { type: 'currentweather_big', grid: {x: 17, y: 1, w: 8, h: 6} };
screens[1] = {
  layout: 'grid', gridColumns: 24, rowHeight: 20, gap: 5,
  mobileLayout: 'stack', blocks: ['legacy_wu', 'legacy_now', 'legacy_big']
};
`,
    });
  });
  await page.goto('/?cfg=CONFIG.pw.js&folder=tests');
  await page.locator('#loaderHolder').waitFor({
    state: 'hidden',
    timeout: 15000,
  });
  const layouts = { legacy_wu: 0, legacy_now: 2, legacy_big: 2 };
  for (const [key, layout] of Object.entries(layouts)) {
    const tile = page.locator(`[data-grid-block="${key}"]`);
    // The weather component's own container class and API key message
    // (the Weather Underground renderer had neither).
    await expect(tile.locator(`.weather_${layout}`)).toHaveCount(1);
    await expect(tile.locator('.dt_state')).toContainText(/API key/i);
  }
  expect(await page.evaluate(() => typeof window.loadWeatherFull)).toBe(
    'undefined'
  );
});
