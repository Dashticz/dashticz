// @ts-check
import { test, expect } from '@playwright/test';

test('optional iCalendar and Spotify chunks load on demand', async ({
  page,
}) => {
  await page.goto('/?cfg=CONFIG.pw.js&folder=tests');
  await expect(page).toHaveTitle(/Dashticz/);

  const loaded = await page.evaluate(async () => {
    const [ICAL, SpotifyWebApi] = await Promise.all([
      window.loadIcal(),
      window.loadSpotifyApi(),
    ]);
    const parsed = ICAL.parse(
      'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n'
    );
    return {
      calendarName: parsed[0],
      spotifyType: typeof SpotifyWebApi,
      globalsInstalled:
        window.ICAL === ICAL && window.SpotifyWebApi === SpotifyWebApi,
    };
  });

  expect(loaded).toEqual({
    calendarName: 'vcalendar',
    spotifyType: 'function',
    globalsInstalled: true,
  });
});
