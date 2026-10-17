import { test, expect } from '@playwright/test';

test('login, SSR session, request isolation and logout', async ({ page, browser, baseURL }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const unauthorized = await page.request.get('/account', { maxRedirects: 0 });
  expect(unauthorized.status()).toBe(302);
  expect(unauthorized.headers()['location']).toBe('/login');
  await page.goto('/login');
  await page.getByLabel('Password', { exact: true }).fill(process.env['AUTH_DEMO_PASSWORD']!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText('Welcome, Demo user.', { exact: true })).toBeVisible();
  const cookies = await page.context().cookies();
  const session = cookies.find(cookie => cookie.name === 'fastang-session');
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe('Lax');
  expect(session?.value).not.toContain('Demo user');
  const response = await page.reload();
  expect(response?.status()).toBe(200);
  await expect(page.getByText('Welcome, Demo user.', { exact: true })).toBeVisible();
  const html = await (await page.request.get('/account')).text();
  expect(html).not.toContain(process.env['AUTH_DEMO_PASSWORD']!);
  expect(html).not.toContain(session!.value);
  const stranger = await browser.newContext();
  try {
    const other = await stranger.request.get(baseURL + '/api/auth/session');
    expect(other.status()).toBe(401);
  } finally { await stranger.close(); }
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get('/api/auth/session')).status()).toBe(401);
  expect((await page.request.get('/account', { maxRedirects: 0 })).status()).toBe(302);
  expect(errors).toEqual([]);
});
