// @ts-check
import { test, expect } from '@playwright/test';

/* playsound uses the browser's audio element (js/blocks.js playAudio()):
   the configured file is used when it exists, otherwise the same name in
   another format from the sounds folder. */
test('playsound plays the configured file and falls back to another format', async ({
  page,
}) => {
  await page.goto('/?cfg=CONFIG.pw.js&folder=tests');
  await page.locator('#loaderHolder').waitFor({
    state: 'hidden',
    timeout: 15000,
  });

  await page.evaluate(() => {
    window.playAudio('sounds/ping.ogg');
    window.playAudio('sounds/ping.wav'); // no wav in sounds/: next format
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.keys(window.audioPlayers).map((base) =>
          window.audioPlayers[base].audio.src.replace(/^.*\//, '')
        )
      )
    )
    .toEqual(['ping.ogg', 'ping.mp3']);
  expect(await page.evaluate(() => typeof window.ion)).toBe('undefined');
});
