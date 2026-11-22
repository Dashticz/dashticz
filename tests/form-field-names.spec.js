// @ts-check
import { test, expect } from '@playwright/test';

/* Chrome's Issues panel flags every form control without an id or name.
   The editor popups generate their controls dynamically, so open each quick
   add popup and check that no control is left without both. */
test('editor popups have no form controls without id or name', async ({
  page,
}) => {
  await page.goto('/?cfg=CONFIG.names.js&folder=tests');
  await page.locator('#loaderHolder').waitFor({
    state: 'hidden',
    timeout: 15000,
  });
  await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    await DT_function.loadDTScript('js/deviceeditor.js');
  });
  const unnamed = await page.evaluate(async () => {
    const bad = [];
    // eslint-disable-next-line no-undef
    const editor = DashticzDeviceEditor;
    for (const key of Object.keys(editor).filter((k) =>
      /^open(Custom|MultiDevice|Group|Cluster|Calendar|Camera)?$/.test(k)
    )) {
      editor[key]();
      await new Promise((r) => setTimeout(r, 600));
      document.querySelectorAll('input,select,textarea').forEach((e) => {
        const el = /** @type {HTMLInputElement} */ (e);
        if (!el.id && !el.name)
          bad.push(key + ': ' + el.outerHTML.slice(0, 120));
      });
      // eslint-disable-next-line no-undef
      $('.modal').modal('hide');
    }
    return bad;
  });
  expect(unnamed).toEqual([]);
});
