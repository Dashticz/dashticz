// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Basic testing', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the starting url before each test.
    await page.goto('http://build:8082/?cfg=CONFIG.pw.js&folder=tests');
  });
  test('has title', async ({ page }) => {

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Dashticz/);
  });
  
});

