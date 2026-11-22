/* global $, createSlider, log */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

/* createSlider() of js/switches.js (the dimmer and blinds sliders) is loaded
   into an empty page, so no Domoticz or Dashticz server is needed. */
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/switches.js'), 'utf8');
const start = source.indexOf('function createSlider(');
const end = source.indexOf('function addSlider(');
const createSliderSource = source.slice(start, end);

test.describe('createSlider', () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(`
      <div id="v" style="position:absolute;left:100px;top:50px;width:20px;height:200px"></div>
      <div id="h" style="position:absolute;left:200px;top:100px;width:300px;height:12px"></div>`);
    await page.addScriptTag({
      path: path.join(root, 'node_modules/jquery/dist/jquery.min.js'),
    });
    await page.addScriptTag({ content: createSliderSource });
    await page.evaluate(() => {
      window.log = [];
      window.sv = createSlider($('#v'), {
        value: 100,
        step: 5,
        min: 0,
        max: 100,
        orientation: 'vertical',
        range: 'max',
        start: () => log.push('start'),
        slide: (e, ui) => log.push('slide ' + ui.value),
        change: (e, ui) => log.push('change ' + ui.value),
        stop: () => log.push('stop'),
      });
      window.sh = createSlider($('#h'), {
        value: 30,
        step: 1,
        min: 0,
        max: 100,
        orientation: 'horizontal',
        change: (e, ui) => log.push('hchange ' + ui.value),
      });
    });
  });

  const state = (page) =>
    page.evaluate(() => ({
      handle: $('#v .ui-slider-handle').attr('style'),
      range: $('#v .ui-slider-range').attr('style'),
      hHandle: $('#h .ui-slider-handle').attr('style'),
      log: window.log.splice(0),
    }));

  test('builds the markup of the former jQuery UI slider', async ({ page }) => {
    expect(await state(page)).toEqual({
      handle: 'bottom: 100%;',
      range: 'height: 0%;',
      hHandle: 'left: 30%;',
      log: [],
    });
    await expect(page.locator('#v')).toHaveClass(
      /ui-slider ui-slider-vertical ui-widget ui-widget-content/
    );
    await expect(page.locator('#h')).toHaveClass(/ui-slider-horizontal/);
    await expect(page.locator('#v .ui-slider-range')).toHaveClass(
      /ui-slider-range-max/
    );
  });

  test('a drag starts on the track, slides in steps and changes once at the end', async ({
    page,
  }) => {
    await page.mouse.move(110, 100);
    await page.mouse.down();
    await page.mouse.move(110, 150, { steps: 5 });
    await page.mouse.up();
    const result = await state(page);
    expect(result.handle).toBe('bottom: 50%;');
    expect(result.range).toBe('height: 50%;');
    expect(result.log[0]).toBe('start');
    expect(result.log[1]).toBe('slide 75');
    expect(result.log.slice(-2)).toEqual(['stop', 'change 50']);
    expect(result.log.filter((entry) => entry.startsWith('change'))).toEqual([
      'change 50',
    ]);
  });

  test('a click on a horizontal slider changes the value', async ({ page }) => {
    await page.mouse.click(350, 106);
    const result = await state(page);
    expect(result.hHandle).toBe('left: 50%;');
    expect(result.log).toEqual(['hchange 50']);
  });

  test('the arrow, Home keys and value() work', async ({ page }) => {
    await page.focus('#v .ui-slider-handle');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Home');
    expect((await state(page)).log).toEqual([
      'start',
      'slide 95',
      'stop',
      'change 95',
      'start',
      'slide 0',
      'stop',
      'change 0',
    ]);
    await page.evaluate(() => window.sv.value(42));
    const result = await state(page);
    expect(result.handle).toBe('bottom: 40%;');
    expect(result.log).toEqual(['change 40']);
  });
});
