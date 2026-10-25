// @ts-check
import { test, expect } from '@playwright/test';

/* The Chart.js time axis uses Day.js (src/chart-date-adapter.js), the same
   date library and language as the rest of Dashticz. Formats in the former
   date-fns notation keep working. */
test('graph time axis follows the Dashticz language and accepts both notations', async ({
  page,
}) => {
  await page.goto('/?cfg=CONFIG.pw.js&folder=tests');
  await expect(page).toHaveTitle(/Dashticz/);

  const labels = await page.evaluate(() => {
    window.moment.locale('nl');
    function ticks(displayFormats) {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 200;
      document.body.appendChild(canvas);
      const chart = new window.Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
          datasets: [
            {
              data: [
                { x: '2026-10-05 00:00', y: 1 },
                { x: '2026-10-07 00:00', y: 2 },
              ],
            },
          ],
        },
        options: {
          animation: false,
          responsive: false,
          scales: {
            xAxes: [
              {
                type: 'time',
                time: { unit: 'day', displayFormats: displayFormats },
              },
            ],
          },
        },
      });
      const result = chart.scales.x.ticks.map((tick) => tick.label);
      chart.destroy();
      canvas.remove();
      return result;
    }
    return {
      dayjs: ticks({ day: 'ddd D MMM' }),
      dateFns: ticks({ day: 'EEE d MMM yyyy' }),
    };
  });

  expect(labels.dayjs[0]).toBe('ma. 5 okt');
  expect(labels.dateFns[0]).toBe('ma. 5 okt 2026');
});
