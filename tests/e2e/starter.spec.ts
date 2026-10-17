import { test as base, expect } from '@playwright/test';

// Every test fails on an uncaught browser error, including hydration failures.
const test = base.extend<{ browserErrors: void }>({
  browserErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (/NG05\d+/.test(message.text())) errors.push(message.text());
    });
    await use();
    expect(errors, 'Uncaught browser/hydration errors').toEqual([]);
  }, { auto: true }],
});

async function ready(page: import('@playwright/test').Page) {
  // The counter is present in SSR too; a click proves that Angular is interactive.
  await page.goto('/');
  await page.getByRole('button', { name: 'Clicked 0 times', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Clicked 1 time', exact: true })).toBeVisible();
}

test('hydrates the existing SSR button and handles clicks', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/*.js', async route => { await gate; await route.continue(); });
  try {
    await page.goto('/', { waitUntil: 'commit' });
    const button = page.getByRole('button', { name: 'Clicked 0 times', exact: true });
    await expect(button).toBeVisible();
    const element = await button.elementHandle();
    release();
    // Auto-waiting assertions below allow hydration to finish without a fixed delay.
    await button.click();
    await expect(page.getByRole('button', { name: 'Clicked 1 time', exact: true })).toBeVisible();
    expect(await element!.evaluate(node => node.isConnected)).toBe(true);
  } finally { release(); }
});

test('navigates, updates resolved data and restores history without reloading', async ({ page }) => {
  await ready(page);
  const header = await page.locator('header').elementHandle();
  await page.getByRole('link', { name: 'SSR + API', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, world!');
  await page.getByRole('link', { name: 'Ada', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, Ada!');
  await page.getByRole('link', { name: 'Grace', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, Grace!');
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, Ada!');
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, Grace!');
  expect(await header!.evaluate(node => node.isConnected)).toBe(true);
});

test('reuses SSR API data during hydration', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/greet/')) apiRequests.push(request.url()); });
  const response = await page.goto('/greet/Ada');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, Ada!');
  // A subsequent client navigation proves bootstrap has finished.
  await page.getByRole('link', { name: 'Grace', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, Grace!');
  expect(apiRequests.map(url => new URL(url).pathname)).toEqual(['/api/greet/Grace']);
});

test('handles server and client guard redirects', async ({ page, request }) => {
  const response = await request.get('/greet/Ada?preview=blocked', { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  expect(response.headers()['location']).toBe('/about');
  expect(await response.text()).toBe('');
  await ready(page);
  await page.getByRole('link', { name: 'SSR + API', exact: true }).click();
  await page.getByRole('link', { name: 'Redirect', exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goto('/greet/Ada?preview=blocked');
  await expect(page).toHaveURL(/\/about$/);
});

test('renders API failures and can navigate away again', async ({ page }) => {
  const response = await page.goto('/greet/' + 'a'.repeat(81));
  expect(response?.status()).toBe(502);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Greeting unavailable.');
  await page.getByRole('link', { name: 'Ada', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, Ada!');
  await page.getByRole('link', { name: 'API failure', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Greeting unavailable.');
});

test('returns a real 404 and recovers after client-side missing routes', async ({ page }) => {
  const response = await page.goto('/missing');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  await page.getByRole('link', { name: 'Back home', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your next idea starts here.');
  await page.getByRole('link', { name: 'SSR + API', exact: true }).click();
  await page.getByRole('link', { name: 'Missing page', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  await page.getByRole('link', { name: 'Back home', exact: true }).click();
  await page.getByRole('button', { name: 'Clicked 0 times', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Clicked 1 time', exact: true })).toBeVisible();
});
