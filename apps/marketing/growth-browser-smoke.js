async (page) => {
  const check = (value, message) => {
    if (!value) throw new Error(message);
  };
  const base = page.url();
  const context = page.context();
  const errors = [];
  const requests = [];
  const events = [];
  const submissions = [];
  let formResult = 'accepted';
  let formDelay = 0;
  const tagConfigs = [];
  const pause = (ms = 100) => page.waitForTimeout(ms);
  context.on('page', (tab) => tab.on('pageerror', (e) => errors.push(e.message)));
  page.on('pageerror', (e) => errors.push(e.message));
  await context.route('https://**/*', async (route) => {
    const request = route.request();
    requests.push(request.url());
    if (request.url().startsWith('https://www.googletagmanager.com/gtag/js?')) {
      // Simulate a tag's asynchronous event transport and timer; never contact Google.
      await route.fulfill({
        contentType: 'application/javascript',
        body: `
        function consume(args) { if((args[0] === 'event' || args[0] === 'config') && !window['ga-disable-G-TEST123456']) fetch('https://www.google-analytics.com/g/collect',{method:'POST',body:JSON.stringify(Array.from(args))}); }
        dataLayer.forEach(consume); const original=dataLayer.push.bind(dataLayer); dataLayer.push=function(args){consume(args);return original(args)};
        window.tagTimer=setInterval(()=>{if(!window['ga-disable-G-TEST123456']) fetch('https://www.google-analytics.com/g/pulse')},80);
      `,
      });
    } else if (request.url().includes('google-analytics.com')) {
      if (request.postData()) {
        const data = JSON.parse(request.postData());
        if (data[0] === 'config') tagConfigs.push(data);
        else events.push(data);
      }
      await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
    } else if (request.url() === 'https://formspree.io/f/testform') {
      submissions.push({ body: request.postData(), headers: request.headers() });
      await pause(formDelay);
      if (formResult === 'network') await route.abort('failed');
      else
        await route.fulfill({
          status: ['accepted', 'false-success', 'malformed'].includes(formResult)
            ? 200
            : formResult === 'rate-limit'
              ? 429
              : 422,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body:
            formResult === 'malformed'
              ? 'not json'
              : JSON.stringify(
                  formResult === 'accepted'
                    ? { next: 'https://formspree.io/thanks' }
                    : { ok: false, errors: [{ field: 'email', message: 'not accepted' }] },
                ),
        });
    } else throw new Error(`Unexpected third-party request: ${request.url()}`);
  });

  await page.evaluate(() => localStorage.clear());
  await page.goto(
    `${base}pilot/?email=private-person@example.test&utm_source=private-person@example.test&utm_medium=organic`,
  );
  await pause();
  check(requests.length === 0, 'Fresh visitor must make no external requests');
  check(
    await page.evaluate(
      () =>
        localStorage.getItem('openlintel.acquisition.v1') === null && sessionStorage.length === 0,
    ),
    'No attribution or session storage before consent',
  );
  await page.locator('[data-consent="rejected"]').click();
  await page.locator('[data-pilot-form] [type=submit]').click();
  check(submissions.length === 0, 'Invalid input must not submit');
  check(
    (await page.locator('#pilot-name').getAttribute('aria-invalid')) === 'true',
    'Accessible required field error',
  );
  const fillForm = async (target) => {
    await target.locator('#pilot-name').fill('Test Practitioner');
    await target.locator('#pilot-email').fill('private-person@gmail.com');
    await target.locator('#pilot-studio').fill('Private Test Studio');
    await target.locator('#pilot-role').selectOption('interior-designer');
    await target.locator('#pilot-challenge').fill('Private test-only challenge; no real lead.');
    await target.locator('#pilot-discovery').selectOption('search');
  };
  await fillForm(page);

  check(errors.length === 0, errors.join('; '));
  formResult = 'invalid';
  await page.locator('[data-pilot-form] [type=submit]').click();
  await page
    .locator('.growth-form-status')
    .filter({ hasText: 'could not confirm acceptance' })
    .waitFor();
  check(
    (await page.locator('#pilot-email').inputValue()) === 'private-person@gmail.com',
    'Failure preserves personal email',
  );
  check(await page.locator('[data-pilot-success]').isHidden(), 'Failure never shows success');
  check(events.length === 0, 'Rejection means no analytics');
  for (const failure of ['false-success', 'malformed', 'network', 'rate-limit']) {
    formResult = failure;
    await page.locator('[data-pilot-form] [type=submit]').click();
    await page
      .locator('.growth-form-status')
      .filter({
        hasText: failure === 'rate-limit' ? 'Too many attempts' : 'could not confirm acceptance',
      })
      .waitFor();
    check(
      await page.locator('[data-pilot-success]').isHidden(),
      `${failure} never produces success`,
    );
    check(
      (await page.locator('#pilot-email').inputValue()) === 'private-person@gmail.com',
      `${failure} preserves input`,
    );
  }

  formResult = 'accepted';
  formDelay = 250;
  await page.locator('[data-pilot-form] [type=submit]').click();
  check(
    await page.locator('[data-pilot-form] [type=submit]').isDisabled(),
    'Disable during request',
  );
  await page.locator('[data-pilot-success]').waitFor();
  check(submissions.length === 6, 'Five failed and one accepted request only');
  check(submissions[5].body.includes('unknown'), 'Unconsented source remains unknown');
  check(events.length === 0, 'Accepted form works without analytics');
  check(!submissions[5].headers.referer, 'Form request does not leak source URL');

  await page.goto(`${base}pilot/thanks/`);
  check(
    (await page.locator('meta[name=robots]').getAttribute('content')).includes('noindex'),
    'Thanks excluded from search',
  );
  await page.locator('[data-analytics-preferences]').first().click();
  await page.locator('[data-consent="accepted"]').click();
  await pause(200);
  check(
    requests.some((url) => url.includes('googletagmanager.com')),
    'Accepted consent loads mocked tag',
  );
  check(
    events.some((e) => e[1] === 'page_view'),
    'Accepted consent produces page event',
  );
  check(!events.some((e) => e[1] === 'generate_lead'), 'Direct thanks visit is not a lead');
  await page.goto(
    `${base}pilot/?email=private-person@example.test&utm_medium=cpc&utm_campaign=private-person@example.test`,
  );

  await fillForm(page);
  await pause(100);
  formDelay = 150;
  await page.locator('[data-pilot-form] [type=submit]').click();
  await page.locator('[data-pilot-success]').waitFor();
  await pause(150);
  check(
    events.filter((e) => e[1] === 'generate_lead').length === 1,
    'Only provider-accepted submission creates a lead',
  );
  check(
    events.some((e) => e[1] === 'pilot_form_start'),
    'Form start recorded after consent',
  );
  const telemetry = JSON.stringify(events);
  check(
    !/private-person|Private Test Studio|test-only challenge|utm_|\?email=/.test(telemetry),
    'No PII, query, or raw campaign enters GA',
  );
  check(
    submissions.at(-1).body.includes('first_known_date'),
    'Consented form carries limited attribution',
  );

  const other = await context.newPage();
  const downloadCases = [
    ['interior-design-spec-sheet', 'spec-sheet', 'xlsx', 'workbook', ''],
    ['interior-design-presentation', 'presentation', 'pptx', 'blank', '-blank'],
    ['interior-design-presentation', 'presentation', 'pptx', 'example', '-example'],
    ['interior-design-presentation', 'presentation', 'pdf', 'preview', '-preview'],
    ['interior-design-client-questionnaire', 'client-questionnaire', 'pdf', 'blank', '-blank'],
  ];
  for (const [slug, resourceId, format, variant, suffix] of downloadCases) {
    await other.goto(`${base}templates/${slug}/`);
    const filename = `${slug}${suffix}.${format}`;
    const before = events.length;
    const downloaded = other.waitForEvent('download');
    const measured = context.waitForEvent('request', {
      timeout: 5000,
      predicate: (request) => {
        if (!request.url().startsWith('https://www.google-analytics.com/g/collect')) return false;
        const event = request.postDataJSON();
        return (
          event?.[1] === 'resource_download' &&
          event[2]?.resource_id === resourceId &&
          event[2]?.resource_format === format &&
          event[2]?.resource_variant === variant
        );
      },
    });
    await other.locator(`[data-resource-download][href$="/${filename}"]`).click();
    const [download] = await Promise.all([downloaded, measured]);
    check(!(await download.failure()), `Download succeeds: ${filename}`);
    check(download.suggestedFilename() === filename, `Download filename: ${filename}`);
    await pause(100);
    check(
      events.slice(before).filter((event) => event[1] === 'resource_download').length === 1,
      `Exactly one mocked download event with the correct format and variant: ${filename}`,
    );
  }
  await other.goto(`${base}sample-project/`);
  await pause(100);
  const pageViewsBeforeHash = events.filter((e) => e[1] === 'page_view').length;
  await other.evaluate(() => {
    location.hash = 'materials';
  });
  await pause(100);
  check(
    events.filter((e) => e[1] === 'page_view').length === pageViewsBeforeHash,
    'Hash navigation does not inflate page views',
  );
  check(
    events.some((e) => e[1] === 'sample_project_start'),
    'Sample start measured once on landing',
  );
  check(
    events.some((e) => e[1] === 'sample_chapter_view' && e[2].chapter_id === 'materials'),
    'Sample chapter measured',
  );
  await page.evaluate(() => {
    document.cookie = 'olmarketing_ga=mock;path=/';
    document.cookie = '_ga_OTHER_APP=retain;path=/';
  });
  await page.locator('[data-analytics-preferences]').first().click();
  await page.locator('[data-consent="rejected"]').click();
  await pause(200);
  check(
    (await page.locator('[data-analytics-frame]').count()) === 0,
    'Withdrawal destroys current tag context',
  );
  check(
    (await other.locator('[data-analytics-frame]').count()) === 0,
    'Withdrawal destroys another tab tag context',
  );
  check(
    await page.evaluate(() => localStorage.getItem('openlintel.acquisition.v1') === null),
    'Withdrawal clears attribution',
  );
  const remainingCookies = await page.evaluate(() => document.cookie);
  check(
    !remainingCookies.includes('olmarketing_ga='),
    'Withdrawal removes only marketing analytics cookies',
  );
  check(
    remainingCookies.includes('_ga_OTHER_APP=retain'),
    'Withdrawal does not delete another application’s analytics cookies',
  );
  const requestsAfterWithdrawal = requests.length;
  await pause(300);
  check(
    requests.length === requestsAfterWithdrawal,
    'No background analytics requests survive withdrawal',
  );
  await other.close();
  // Accept on search landing: only categorized referrer and 90-day bounded acquisition are stored.
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${base}pilot/`, {
    referer: 'https://www.google.com/search?q=confidential+project',
  });
  await page.locator('[data-consent="accepted"]').click();
  await pause(150);
  check(
    tagConfigs.at(-1)[2].campaign_source === 'google' &&
      tagConfigs.at(-1)[2].campaign_medium === 'organic',
    'GA4 standard organic source uses sanitized current acquisition',
  );
  const source = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('openlintel.acquisition.v1')),
  );
  check(
    source.channel === 'organic-search' && source.provider === 'google',
    'Search source classified after consent',
  );
  check(!JSON.stringify(source).includes('confidential'), 'Search terms never retained');
  await page.goto(`${base}pilot/`);
  await pause(100);
  check(
    tagConfigs.at(-1)[2].campaign_source === '(direct)' &&
      tagConfigs.at(-1)[2].campaign_medium === '(none)',
    'Direct visit does not reuse first-known organic as current campaign',
  );
  await page.evaluate(() => {
    const value = JSON.parse(localStorage.getItem('openlintel.acquisition.v1'));
    value.at = Date.now() - 91 * 86400000;
    localStorage.setItem('openlintel.acquisition.v1', JSON.stringify(value));
  });
  await page.goto(`${base}pilot/?utm_medium=email`);
  check(
    (await page.evaluate(
      () => JSON.parse(localStorage.getItem('openlintel.acquisition.v1')).channel,
    )) === 'email',
    'Expired acquisition starts a new 90-day window',
  );
  await page.locator('[data-analytics-preferences]').first().click();
  await page.locator('[data-consent="rejected"]').click();
  // Visual/responsive/accessibility checks of the enabled form and consent controls.
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(`${base}pilot/`);
    await page.evaluate(() => document.fonts.ready);
    check(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `Pilot overflow at ${width}px`,
    );
    check((await page.locator('h1').count()) === 1, 'One heading');
    for (const field of await page
      .locator(
        '[data-pilot-form] input:not([type=hidden]),[data-pilot-form] select,[data-pilot-form] textarea',
      )
      .all()) {
      const id = await field.getAttribute('id');
      check(
        (await page.locator(`label[for="${id}"]`).count()) === 1,
        'Each form control has a visible label',
      );
    }
    if (width === 390 || width === 1440) {
      await page.locator('[data-analytics-preferences]').first().click();
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({
        path: `output/playwright/growth-pilot-${width}.png`,
        fullPage: true,
      });
    }
  }

  // Revalidate at submit even if a suspended tab's expiry timer did not run.
  await page.goto(`${base}pilot/`);
  await page.locator('[data-analytics-preferences]').first().click();
  await page.locator('[data-consent="accepted"]').click();
  await fillForm(page);
  await page.evaluate(() => {
    const now = Date.now();
    Date.now = () => now + 181 * 86400000;
  });
  const leadsBeforeExpiry = events.filter((e) => e[1] === 'generate_lead').length;
  await page.locator('[data-pilot-form] [type=submit]').press('Enter');
  await page.locator('[data-pilot-success]').waitFor();
  await pause(150);
  check(
    submissions.at(-1).body.includes('unknown'),
    'Expired consent cannot contribute source evidence',
  );
  check(
    events.filter((e) => e[1] === 'generate_lead').length === leadsBeforeExpiry,
    'Expired consent cannot produce a conversion event',
  );
  check(
    (await page.locator('[data-analytics-frame]').count()) === 0,
    'Expired consent tears down tag before submission',
  );
  // Storage failure still permits an in-memory choice and never blocks the form.
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage unavailable');
      },
    }),
  );
  await page.goto(`${base}pilot/`);
  await page.locator('[data-consent="accepted"]').click();
  check(
    (await page.locator('[data-analytics-frame]').count()) === 1,
    'Memory-only opt-in works with blocked storage',
  );
  await fillForm(page);
  await page.locator('[data-analytics-preferences]').first().click();
  await page.locator('[data-consent="rejected"]').click();
  check(
    (await page.locator('#pilot-name').inputValue()) === 'Test Practitioner',
    'Withdrawal does not reload or erase form input',
  );
  await page.locator('[data-pilot-form] [type=submit]').press('Enter');
  await page.locator('[data-pilot-success]').waitFor();
  check(
    submissions.at(-1).body.includes('unknown'),
    'Blocked-storage form remains independent of analytics',
  );
  // No-JS progressive enhancement uses a real native POST; intercept before it leaves the browser.
  const noJs = await context.browser().newContext({ javaScriptEnabled: false });
  const noJsPage = await noJs.newPage();
  let nativeSubmission;
  await noJs.route('https://**/*', async (route) => {
    check(
      route.request().url() === 'https://formspree.io/f/testform',
      'No unexpected no-JS network',
    );
    nativeSubmission = route.request();
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Mock result</title><h1>Mock accepted</h1>',
    });
  });
  await noJsPage.goto(`${base}pilot/`);
  await fillForm(noJsPage);
  await noJsPage.locator('[data-pilot-form] [type=submit]').press('Enter');
  await noJsPage.locator('h1').filter({ hasText: 'Mock accepted' }).waitFor();
  check(nativeSubmission.method() === 'POST', 'No-JS form uses native POST');
  check(
    nativeSubmission.postData().includes('source_evidence=unknown'),
    'No-JS form source remains unknown',
  );
  await noJs.close();
  check(errors.length === 0, `Browser errors: ${errors.join(', ')}`);
  return {
    result: 'passed',
    checks: [
      'release fixture',
      'fresh/reject/accept/withdraw',
      'cross-tab shutdown',
      'PII-free telemetry',
      'source expiry and suspended consent expiry',
      'blocked storage',
      'accepted-only conversions',
      'provider failure',
      'native no-JS',
      `${downloadCases.length} XLSX/PPTX/PDF download format and variant checks`,
      'sample/hash',
      'five viewports',
    ],
    mockSubmissions: submissions.length,
    events: events.map((e) => e[1]),
  };
};
