import { test, expect } from '@playwright/test';
test('current-only selector preserves language, guide links and history', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let release!: () => void;
  const scripts = new Promise<void>(resolve => { release = resolve; });
  await page.route(/\.js(?:\?|$)/, async route => { await scripts; await route.continue(); });
  try {
    await page.goto('/en/docs/api', { waitUntil: 'commit' });
    await expect(page.getByLabel('Documentation version', { exact: true })).toBeDisabled();
  } finally { release(); }
  await expect(page.getByLabel('Documentation version', { exact: true })).toBeEnabled();
  await expect(page.locator('[data-hydrated]')).toHaveAttribute('data-hydrated', 'true');
  const selector = page.getByLabel('Documentation version', { exact: true });
  await expect(selector).toHaveValue('0-1-0-alpha-4');
  await expect(page.getByRole('heading', { name: 'Native route options', exact: true })).toBeVisible();
  await selector.scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('version-selector.png') });
  await expect(selector.locator('option')).toHaveCount(1);
  await selector.selectOption('0-1-0-alpha-4');
  await expect(page).toHaveURL(/\/en\/docs\/v\/0-1-0-alpha-4\/api$/);
  await page.getByRole('link', { name: 'Italiano', exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/v\/0-1-0-alpha-4\/api$/);
  await page.locator('.docs-article').getByRole('link', { name: 'resolver e SSR', exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/v\/0-1-0-alpha-4\/rendering$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/docs\/v\/0-1-0-alpha-4\/api$/);
  await page.reload();
  await expect(page.getByLabel('Versione della documentazione')).toHaveValue('0-1-0-alpha-4');
  expect(errors).toEqual([]);
});
