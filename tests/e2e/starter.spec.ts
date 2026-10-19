import { test as base, expect } from '@playwright/test';
import { hydrated } from '../browser-ready';

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
  await hydrated(page);
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
    await expect(page.locator('html')).not.toHaveAttribute('data-fastang-test-ready', 'true');
    release();
    await hydrated(page);
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
  await hydrated(page);
  // Client navigation must request only the new API data.
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
  await hydrated(page);
  await page.getByRole('link', { name: 'Ada', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, Ada!');
  await page.getByRole('link', { name: 'API failure', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Greeting unavailable.');
});

test('returns a real 404 and recovers after client-side missing routes', async ({ page }) => {
  const response = await page.goto('/missing');
  expect(response?.status()).toBe(404);
  await hydrated(page);
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

test('starter artwork loads and respects reduced motion', async ({ page }) => {
  await page.goto('/');
  await hydrated(page);
  const logo = page.getByRole('img', { name: 'FastAng shield' });
  await expect(logo).toBeVisible();
  expect(await logo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(await page.locator('.logo-float').evaluate(element => getComputedStyle(element).animationName)).toBe('levitation');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.logo-float').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.locator('.orbit-front').evaluate(element => getComputedStyle(element, '::after').animationName)).toBe('none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('route resources hydrate without refetching and react to parameters and query inputs', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/api/greet/')) requests.push(request.url());
  });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/*.js', async route => { await gate; await route.continue(); });
  try {
    await page.goto('/resources/Ada', { waitUntil: 'commit' });
    const heading = page.getByRole('heading', { name: 'Hello, Ada!', exact: true });
    await expect(heading).toBeVisible();
    const element = await heading.elementHandle();
    release();
    await hydrated(page);
    expect(await element!.evaluate(node => node.isConnected)).toBe(true);
    expect(requests).toEqual([]);
    await page.getByRole('link', { name: 'Grace', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Hello, Grace!', exact: true })).toBeVisible();
    expect(requests).toHaveLength(1);
    await page.getByRole('link', { name: 'Details', exact: true }).click();
    await expect(page.getByTestId('resource-details')).toBeVisible();
    expect(requests).toHaveLength(1);
    await page.getByRole('link', { name: 'Grace', exact: true }).click();
    await expect(page.getByTestId('resource-details')).toHaveCount(0);
    expect(requests).toHaveLength(1);
    await page.goBack();
    await expect(page.getByTestId('resource-details')).toBeVisible();
    expect(requests).toHaveLength(1);
  } finally { release(); }
});

test('route resources recover from API errors and apply guard redirects', async ({ page }) => {
  await page.goto('/resources/Ada');
  await hydrated(page);
  await page.getByRole('link', { name: 'API failure', exact: true }).click();
  await expect(page).toHaveURL(/\/resource-error$/);
  await expect(page.getByRole('heading', { name: 'Greeting unavailable.' })).toBeVisible();
  await page.getByRole('link', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hello, Ada!', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Redirect', exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
});

test('credentialed resource requests are excluded from hydration transfer cache', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'session', value: 'resource-cache-test', url: baseURL! }]);
  const requests: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/api/greet/')) requests.push(request.url());
  });
  const response = await page.goto('/resources/Ada');
  expect(response!.headers()['cache-control']).toBe('private, no-store');
  await hydrated(page);
  await expect(page.getByRole('heading', { name: 'Hello, Ada!', exact: true })).toBeVisible();
  await expect.poll(() => requests.length).toBe(1);
});

test('route resources isolate concurrent server renders and redirect failed initial navigation', async ({ request }) => {
  const names = Array.from({ length: 10 }, (_, index) => `Visitor${index}`);
  const responses = await Promise.all(names.map(name => request.get(`/resources/${name}`, {
    headers: { cookie: `session=${name}` },
  })));
  for (let index = 0; index < responses.length; index++) {
    expect(responses[index].status()).toBe(200);
    const html = await responses[index].text();
    expect(html).toContain(`Hello, ${names[index]}!`);
    for (const other of names.filter(name => name !== names[index])) expect(html).not.toContain(`Hello, ${other}!`);
  }
  const failure = await request.get('/resources/' + 'a'.repeat(81), { maxRedirects: 0 });
  expect(failure.status()).toBe(302);
  expect(failure.headers()['location']).toBe('/resource-error');
  const guard = await request.get('/resources/Ada?preview=blocked', { maxRedirects: 0 });
  expect(guard.status()).toBe(302);
  expect(guard.headers()['location']).toBe('/about');
});
