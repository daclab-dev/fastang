import type {} from '@vercel/analytics';
import { test, expect } from '@playwright/test';

test('local production server does not enable analytics', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('[data-hydrated]')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('script[src*="/_vercel/insights/"]')).toHaveCount(0);
});

test('public site records one view per Angular page and redacts URL details', async ({ page, baseURL }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://fastang.dev/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/_vercel/insights/')) {
      await route.fulfill({ contentType: 'application/javascript', body: '' });
      return;
    }
    const response = await route.fetch({ url: `${baseURL}${url.pathname}${url.search}` });
    await route.fulfill({ response });
  });
  const views = () => page.evaluate(() => (window.vaq ?? [])
    .filter(([event]) => event === 'pageview').map(([, properties]) => (properties as { path: string }).path));
  await page.goto('https://fastang.dev/en?token=secret#section');
  await expect(page.locator('[data-hydrated]')).toHaveAttribute('data-hydrated', 'true');
  await expect.poll(views).toEqual(['/en']);
  await expect(page.locator('script[data-disable-auto-track="1"]')).toHaveCount(1);
  await page.locator('header nav').getByRole('link', { name: 'Brand', exact: true }).click();
  await expect.poll(views).toEqual(['/en', '/en/brand']);
  await page.goBack();
  await expect.poll(views).toEqual(['/en', '/en/brand', '/en']);
  expect(await page.evaluate(() => {
    const beforeSend = window.vaq?.find(([event]) => event === 'beforeSend')?.[1] as
      ((event: { type: string; url: string }) => { url: string });
    return beforeSend({ type: 'pageview', url: 'https://fastang.dev/en?token=secret#section' }).url;
  })).toBe('https://fastang.dev/en');
  expect(errors).toEqual([]);
});
