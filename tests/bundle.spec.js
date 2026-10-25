// @ts-check
import { test, expect } from '@playwright/test';

test('optional Spotify chunk loads on demand', async ({ page }) => {
  await page.goto('/?cfg=CONFIG.pw.js&folder=tests');
  await expect(page).toHaveTitle(/Dashticz/);

  const loaded = await page.evaluate(async () => {
    const SpotifyWebApi = await window.loadSpotifyApi();
    return {
      spotifyType: typeof SpotifyWebApi,
      globalInstalled: window.SpotifyWebApi === SpotifyWebApi,
      // iCalendar data is parsed on the server (vendor/dashticz/ical);
      // the browser bundle no longer ships ical.js.
      icalLoader: typeof window.loadIcal,
    };
  });

  expect(loaded).toEqual({
    spotifyType: 'function',
    globalInstalled: true,
    icalLoader: 'undefined',
  });
});
