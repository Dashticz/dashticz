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

    await checkBlock(page,'tc1','fa-car', undefined, 'Tuin');
    await checkBlock(page,'tc2','fa-thermometer-half', undefined,'Buienradar - Temperature','10,7°C/ 49%/ dewpoint: 0,4°C');
    await checkBlock(page,'tc4','fa-bus', undefined, '2,3°C','Dew temperature of device 1247');
//    await checkBlock(page, 'tc5'); //multiple blocks
    await checkBlock(page, 'tc5_3', 'wi-barometer', undefined, 'TeHuBa','1.027hPa');
    await checkBlock(page, 'tc6', 'fa-plug', undefined, 'Actual: 700 Watt','Today: 23,9kWh');
    await checkBlock(page, 'tc7');
    await checkBlock(page, 'tc8');
    await checkBlock(page, 'tc9', 'fa-lightbulb', undefined, 'KeukenLampen');
    await checkBlock(page, 'tc10', 'fa-lightbulb', undefined, 'tc10');
    await checkBlock(page, 'tc11', undefined, 'img/heating.png', 'LMS', 'Dummy title playing');
//    await expect(page.locator('.block_tc11 .h4')).toHaveText('Dummy title playing');
    await checkBlock(page, 'tc12', 'fa-film', undefined, 'smoke', '15');
    await checkBlock(page, 'tc13', 'fa-film', undefined, 'smoke', 'Nothing is playing right now');
  });
  
});

async function checkBlock(page, key, icon, image, title, value) {
  var className = '.block_' + key;
  var fileName = 'bl_'+key+'.png';
  //const locator = page.locator(className);
  const locator = page.locator('css=[data-id="' + key + '"]');
  await expect.soft(locator).toHaveScreenshot(fileName);
  typeof value!=='undefined' && await expect.soft(locator.locator('.value')).toHaveText(value);
  typeof title!=='undefined' && await expect.soft(locator.locator('.title')).toHaveText(title);
  typeof icon!=='undefined' && await expect.soft(locator.locator('.'+icon)).toHaveText('');
  typeof image!=='undefined' && await expect.soft(locator.locator('.col-icon img')).toHaveAttribute('src',image);

}
