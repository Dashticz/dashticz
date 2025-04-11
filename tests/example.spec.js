// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Basic testing', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the starting url before each test.
    await page.goto('http://build:8082/?cfg=CONFIG.pw.js&folder=tests');
  });
  test('block tests', async ({ page }) => {

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Dashticz/);
    await page.waitForTimeout(1000)
    await expect(page.locator('.block_43_1')).toHaveScreenshot('bl_43_1.png');
    await expect(page.locator('.block_43_1 .value')).toHaveText('700W');

    await checkBlock(page,'tc1','fa-lightbulb','Tuin');
    await checkBlock(page,'tc2','fa-thermometer-half','Buienradar - Temperature','10,7°C/ 49%/ dewpoint: 0,4°C');
    await checkBlock(page,'tc4','fa-bus','2,3°C','Dew temperature of device 1247');
//    await checkBlock(page, 'tc5'); //multiple blocks
    await checkBlock(page, 'tc5_3', 'wi-barometer','TeHuBa','1.027hPa');
    await checkBlock(page, 'tc6', 'fa-plug','Actual: 700 Watt','Today: 23,9W');
    await checkBlock(page, 'tc7');
    await checkBlock(page, 'tc8');
  });
  
});

async function checkBlock(page, key, icon, title, value) {
  var className = '.block_' + key;
  var fileName = 'bl_'+key+'.png';
  const locator = page.locator(className);
  await expect(locator).toHaveScreenshot(fileName);
  typeof value!=='undefined' && await expect(locator.locator('.value')).toHaveText(value);
  typeof title!=='undefined' && await expect(locator.locator('.title')).toHaveText(title);
  typeof icon!=='undefined' && await expect(locator.locator('.'+icon)).toHaveText('');

}
