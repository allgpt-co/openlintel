/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI expects a function expression. */
/* global __EXPECTED_PROVIDERS__, __BASE_URL__, document, window */
async (page) => {
  const expected = __EXPECTED_PROVIDERS__;
  const base = __BASE_URL__;
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.context().route('**/*', (route) => {
    return route.request().url().startsWith(`${base}/`) ? route.continue() : route.abort();
  });
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const response = await page.request.get(`${base}/api/auth/providers`);
  assert(response.ok(), 'Providers endpoint failed');
  const providers = Object.keys(await response.json()).sort();
  assert(
    JSON.stringify(providers) === JSON.stringify([...expected].sort()),
    'Unexpected auth providers',
  );
  assert(
    (await page.locator('input[type=email], input[name=name]').count()) === 0,
    'Email-only sign-in is still exposed',
  );
  for (const id of ['google', 'github']) {
    const name = id === 'google' ? 'Google' : 'GitHub';
    assert(
      (await page.getByRole('button', { name: `Sign in with ${name}`, exact: true }).count()) ===
        (expected.includes(id) ? 1 : 0),
      `${name} availability mismatch`,
    );
  }
  if (!expected.length) {
    assert(
      await page
        .getByText('Sign-in is not available on this deployment yet.', { exact: false })
        .isVisible(),
      'Missing closed-state explanation',
    );
  }
  for (const size of [
    { width: 375, height: 812 },
    { width: 667, height: 375 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(size);
    assert(
      await page.getByRole('heading', { name: 'Sign in', exact: true }).isVisible(),
      'Sign-in heading missing',
    );
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `Horizontal overflow at ${size.width}`,
    );
    for (const button of await page.getByRole('button', { name: /Sign in with/ }).all()) {
      const bounds = await button.boundingBox();
      assert(bounds && bounds.height >= 44, 'Sign-in touch target is too small');
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    'Horizontal overflow at 200% text size',
  );
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
  await page.screenshot({
    path: `output/playwright/auth-${expected.length ? 'configured' : 'closed'}-mobile.png`,
    fullPage: true,
  });
  const protectedPage = await page.goto(`${base}/dashboard`);
  assert(page.url().includes('/auth/signin'), 'Anonymous user reached dashboard');
  assert(
    protectedPage && protectedPage.status() === 200,
    'Protected route did not redirect to functional sign-in',
  );
  if (expected.includes('github')) {
    await page.route('**/api/auth/signin/github*', (route) => route.abort());
    await page.getByRole('button', { name: 'Sign in with GitHub', exact: true }).click();
    await page.locator('p[role="alert"]').waitFor();
    assert(
      (await page.locator('p[role="alert"]').innerText()).includes('could not be started'),
      'Missing network-error feedback',
    );
    assert(
      await page.getByRole('button', { name: 'Sign in with GitHub', exact: true }).isEnabled(),
      'Retry stayed disabled',
    );
    await page.unroute('**/api/auth/signin/github*');
    // Only exercise client redirect handling. Never send the fake credentials
    // to an external OAuth provider or submit a real login.
    await page.route('**/api/auth/signin/github*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: `${base}/auth/signin?error=OAuthSignin` }),
      }),
    );
    await page.getByRole('button', { name: 'Sign in with GitHub', exact: true }).click();
    await page.waitForURL('**/auth/signin?error=OAuthSignin');
    assert(
      (await page.locator('p[role="alert"]').innerText()).includes('could not be completed'),
      'Missing returned OAuth-error feedback',
    );
    await page.goto(`${base}/auth/signin?error=OAuthAccountNotLinked`);
    assert(
      (await page.locator('p[role="alert"]').innerText()).includes('not linked'),
      'Missing safe account-recovery guidance',
    );
  }
  assert(errors.length === 0, `Browser runtime errors: ${errors.join('; ')}`);
  return JSON.stringify({
    fixture: expected.length ? 'configured' : 'closed',
    providers,
    viewports: 3,
    textZoom: '200%',
    reducedMotion: true,
    protectedRoute: true,
    runtimeErrors: errors.length,
  });
};
