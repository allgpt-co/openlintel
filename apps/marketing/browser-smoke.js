async (page) => {
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const base = page.url();
  const at = (path) => base + path;
  const errors = [];
  const failedRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
  });
  const results = [];
  const manifest = await (await page.request.get(at('marketing-manifest.json'))).json();
  const routes = manifest.pages.map((item) => item.path);
  const resourceRoutes = manifest.pages.filter((item) =>
    ['guide', 'template', 'hub'].includes(item.kind),
  );
  const externalRequests = [];
  const origin = await page.evaluate(() => location.origin);
  page.on('request', (request) => {
    if (!request.url().startsWith(origin + '/')) externalRequests.push(request.url());
  });
  const captureRoutes = new Set([
    '',
    'sample-project/',
    'resources/',
    'templates/',
    'templates/interior-design-client-questionnaire/',
    'templates/interior-design-budget/',
    'resources/interior-design-mood-board-examples/',
    'resources/reflected-ceiling-plan/',
    'pilot/',
    'product-status/',
    'resources/interior-design-specification-change/',
  ]);
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const route of routes) {
      await page.goto(at(route));
      await page.evaluate(() => document.fonts.ready);
      await page.locator('h1').waitFor();
      const dimensions = await page.evaluate(() => ({
        viewport: innerWidth,
        content: document.documentElement.scrollWidth,
      }));
      check(
        dimensions.content <= dimensions.viewport + 1,
        `${route || 'home'} overflows at ${width}px: ${dimensions.content}`,
      );
      check((await page.locator('h1').count()) === 1, 'Exactly one page heading');
      if (route === 'sample-project/') {
        for (const chapter of ['brief', 'design', 'drawings', 'materials', 'handoff']) {
          await page.evaluate((id) => {
            location.hash = id;
          }, chapter);
          await page.locator(`#${chapter}`).waitFor({ state: 'visible' });
          check(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            `Sample ${chapter} overflows at ${width}px`,
          );
        }
        await page.evaluate(() => {
          location.hash = 'brief';
        });
        await page.locator('#brief').waitFor({ state: 'visible' });
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      if ((width === 390 || width === 1440) && captureRoutes.has(route)) {
        // Trigger native lazy loading before the full-page visual review.
        await page.evaluate(async () => {
          for (const image of document.images) image.loading = 'eager';
          await Promise.all(
            [...document.images]
              .filter((image) => image.getAttribute('src'))
              .map((image) => image.decode().catch(() => {})),
          );
        });
        const filename = route ? route.replaceAll('/', '-').replace(/-$/, '') : 'home';
        await page.screenshot({
          path: `output/playwright/${filename}-${width}.png`,
          fullPage: true,
        });
      }
    }
    results.push(
      `All ${routes.length} pages and all five sample chapters have no horizontal overflow at ${width}px`,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(at('sample-project/'));
  check(
    (await page.locator('[data-chapter]:visible').count()) === 1,
    'Only one enhanced chapter is visible',
  );
  await page.getByRole('link', { name: 'Next: the design' }).click();
  await page.locator('#design').waitFor({ state: 'visible' });
  check(page.url().endsWith('#design'), 'Chapter navigation updates the hash');
  await page.getByRole('button', { name: /Deep Olive/ }).click();
  check(
    await page.locator('[data-concept-panel="deep-olive"]').isVisible(),
    'Alternative concept is visible',
  );
  check(
    !(await page.locator('[data-concept-panel="quiet-oak"]').isVisible()),
    'Selected concept panel is hidden while comparing',
  );
  await page.getByRole('link', { name: 'Next: the drawings' }).click();
  await page.locator('#drawings').waitFor({ state: 'visible' });
  check(
    (await page.locator('#drawings .sample-notice').textContent()).includes('Quiet Oak'),
    'Downstream artifacts retain the selected sample direction',
  );
  await page.getByRole('button', { name: 'WR-02 / Joinery elevation' }).click();
  const expand = page.locator('[data-drawing-panel="elevation"] [data-expand-drawing]');
  await expand.click();
  check(await page.getByRole('dialog').isVisible(), 'Drawing dialog opens');
  await page.keyboard.press('Escape');
  check(!(await page.getByRole('dialog').isVisible()), 'Escape closes drawing dialog');
  check(
    await expand.evaluate((element) => element === document.activeElement),
    'Focus returns to drawing trigger',
  );
  await page.goBack();
  await page.locator('#design').waitFor({ state: 'visible' });
  await page.goForward();
  await page.locator('#drawings').waitFor({ state: 'visible' });
  await page.reload();
  await page.locator('#drawings').waitFor({ state: 'visible' });
  await page.getByRole('link', { name: 'Next: the materials' }).click();
  await page.locator('#materials').waitFor({ state: 'visible' });
  check(
    (await page.locator('#materials tbody tr').count()) === 6,
    'All six material references are present',
  );
  await page.getByRole('link', { name: 'Next: the handoff' }).click();
  await page.locator('#handoff').waitFor({ state: 'visible' });
  for (const link of await page.locator('#handoff a[download]').all()) {
    const pending = page.waitForEvent('download');
    await link.click();
    const download = await pending;
    check(!(await download.failure()), `Download completes: ${download.suggestedFilename()}`);
  }
  results.push(
    'Five-chapter journey, concept comparison, fixed selection, drawing dialog, focus restoration, history, refresh, and three downloads pass',
  );
  const popupEvent = page.waitForEvent('popup');
  await page.getByRole('link', { name: /Open the project summary/ }).click();
  const popup = await popupEvent;
  await popup.waitForLoadState();
  await popup.evaluate(() => {
    window.print = () => {
      window.__printInvoked = true;
    };
  });
  await popup.getByRole('button', { name: /Print this summary/ }).click();
  check(await popup.evaluate(() => window.__printInvoked), 'Print action invokes browser print');
  await popup.emulateMedia({ media: 'print' });
  check(!(await popup.locator('.site-header').isVisible()), 'Print layout excludes navigation');
  await popup.close();
  results.push('Printable summary opens and invokes print');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(at('sample-project/'));
  await page.getByLabel('Choose a chapter').selectOption('materials');
  await page.locator('#materials').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Menu' }).click();
  check(await page.locator('#main-nav').isVisible(), 'Mobile menu opens');
  await page.keyboard.press('Escape');
  check(!(await page.locator('#main-nav').isVisible()), 'Mobile menu closes with Escape');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.locator('.nav-disclosure summary').click();
  await page.getByRole('link', { name: 'Interior design studios', exact: true }).click();
  check(page.url().includes('for-design-studios'), 'Professional navigation works on mobile');
  results.push('Mobile chapter selector, navigation disclosure, and keyboard close pass');

  const browser = page.context().browser();
  const noJsContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const noJsPage = await noJsContext.newPage();
  await noJsPage.goto(at('sample-project/'));
  check(
    (await noJsPage.locator('[data-chapter]:visible').count()) === 5,
    'All chapters readable without JavaScript',
  );
  check(
    (await noJsPage.locator('[data-concept-panel]:visible').count()) === 2,
    'Both concepts readable without JavaScript',
  );
  check(await noJsPage.locator('#main-nav').isVisible(), 'Navigation available without JavaScript');
  check(
    (await noJsPage.locator('a[download]').count()) === 3,
    'Downloads available without JavaScript',
  );
  for (const record of resourceRoutes) {
    await noJsPage.goto(at(record.path));
    check(await noJsPage.locator('h1').isVisible(), `${record.path}: heading without JavaScript`);
    check(
      await noJsPage.locator('.breadcrumbs').isVisible(),
      `${record.path}: breadcrumb without JavaScript`,
    );
    if (record.kind === 'template') {
      check(
        (await noJsPage.locator('[data-resource-download]').count()) === record.downloads.length,
        'All Office downloads available without JavaScript',
      );
      const href = await noJsPage.locator('[data-resource-download]').first().getAttribute('href');
      check(
        (await noJsPage.request.get(origin + href)).ok(),
        'Office resource available without JavaScript',
      );
    }
  }
  await noJsContext.close();
  const reducedContext = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1280, height: 1000 },
  });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(at(''));
  check(
    (await reducedPage.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    )) === 'auto',
    'Reduced motion disables smooth scrolling',
  );
  await reducedPage.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  check(
    await reducedPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    'Homepage remains within a 1280px desktop viewport at 200% zoom',
  );
  for (const route of [
    'resources/',
    'templates/interior-design-budget/',
    'resources/interior-design-mood-board-examples/',
    'pilot/',
    'product-status/',
  ]) {
    await reducedPage.goto(at(route));
    await reducedPage.evaluate(() => {
      document.documentElement.style.zoom = '2';
    });
    check(
      await reducedPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `${route}: 200% zoom`,
    );
  }
  await reducedContext.close();
  results.push('No-JavaScript reading, reduced motion, and 200% zoom pass');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(at('templates/'));
  await page
    .locator('.resource-card')
    .getByRole('link', { name: 'Interior design client questionnaire', exact: true })
    .click();
  check(
    page.url().endsWith('/templates/interior-design-client-questionnaire/'),
    'Hub-to-template journey',
  );
  await page.getByRole('link', { name: 'Editable download', exact: true }).click();
  check(page.url().endsWith('#download'), 'Table of contents navigation');
  await page.locator('[data-sample-link]').click();
  check(page.url().endsWith('sample-project/#brief'), 'Resource-to-sample journey');
  await page.goBack();
  check(
    page.url().includes('interior-design-client-questionnaire'),
    'Browser history returns to resource',
  );
  for (const record of manifest.pages.filter((item) => item.kind === 'template')) {
    await page.goto(at(record.path));
    for (const metadata of record.downloads) {
      const anchor = page.locator(`[data-resource-download][href$="${metadata.path}"]`);
      const pending = page.waitForEvent('download');
      await anchor.click();
      const download = await pending;
      check(!(await download.failure()), `Office download: ${metadata.path}`);
      check(
        download.suggestedFilename() === metadata.path.split('/').pop(),
        'Correct Office filename',
      );
      const response = await page.request.get(at(metadata.path));
      check(
        (await response.body()).length === metadata.size && metadata.size > 1000,
        'Office bytes match manifest',
      );
    }
  }
  await page.goto(at('templates/interior-design-client-questionnaire/'));
  await page.keyboard.press('Tab');
  check(
    await page.locator('.skip-link').evaluate((el) => el === document.activeElement),
    'Keyboard starts at skip link',
  );
  await page.keyboard.press('Enter');
  await page.waitForURL('**#main');
  check(page.url().endsWith('#main'), 'Keyboard skip link targets content');
  await page.emulateMedia({ media: 'print' });
  check(!(await page.locator('.article-toc').isVisible()), 'Print excludes article navigation');
  check(await page.locator('.document-preview').isVisible(), 'Print retains the resource preview');
  await page.emulateMedia({ media: 'screen' });
  check(
    externalRequests.length === 0,
    `Unexpected external requests: ${externalRequests.join('; ')}`,
  );
  results.push(
    'Resource hubs, TOCs, sample links, history, 18 Office downloads, no-JavaScript resources, print, keyboard, and no tracking requests pass',
  );
  check(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  check(failedRequests.length === 0, `Failed requests: ${failedRequests.join('; ')}`);
  return { status: 'passed', results, browserErrors: errors, failedRequests };
};
