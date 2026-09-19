/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI requires a function expression. */
async (page) => {
  const base = page.url();
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const errors = [];
  const failed = [];
  const results = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });
  for (const [route, file] of [
    ['how-it-works/', 'window-room-walkthrough'],
    ['templates/', 'template-workflow-walkthrough'],
  ]) {
    const requestedVideo = [];
    const onRequest = (request) => {
      if (request.url().includes('.mp4')) requestedVideo.push(request.url());
    };
    page.on('request', onRequest);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + route);
    const video = page.locator('video');
    check((await video.count()) === 1, `${route}: missing native player`);
    await video.scrollIntoViewIfNeeded();
    // Allow paint/resource scheduling, without using a time-sensitive sleep.
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    check(requestedVideo.length === 0, `${route}: MP4 downloaded before playback`);
    check((await video.getAttribute('preload')) === 'none', `${route}: preload is not none`);
    check((await video.getAttribute('autoplay')) === null, `${route}: autoplay is enabled`);
    check((await video.getAttribute('controls')) !== null, `${route}: native controls missing`);
    check(
      (await video.locator('track[kind="captions"][srclang="en"]').count()) === 1,
      `${route}: captions track missing`,
    );
    check(
      await page
        .locator('.walkthrough-disclosure')
        .innerText()
        .then((text) => text.includes('Fictional educational examples')),
      `${route}: disclosure missing`,
    );
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      check(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `${route}: overflow at ${width}`,
      );
      for (const link of await page.locator('.walkthrough figcaption a').all()) {
        const target = await link.boundingBox();
        check(
          target && target.height >= 44,
          `${route}: small video alternative target at ${width}`,
        );
        check(
          await link.evaluate((element) => parseFloat(getComputedStyle(element).fontSize) >= 14),
          `${route}: video alternative text is too small`,
        );
      }
      const bounds = await video.boundingBox();
      check(
        bounds && bounds.width <= width && bounds.height > 150,
        `${route}: player dimensions at ${width}`,
      );
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    check(
      await video.evaluate((element) => element.paused && element.currentTime === 0),
      `${route}: unexpected playback under reduced motion`,
    );
    await video.scrollIntoViewIfNeeded();
    await video.focus();
    check(
      await video.evaluate((element) => document.activeElement === element),
      `${route}: player cannot receive keyboard focus`,
    );
    await video.press('Space');
    await page
      .waitForFunction(
        () => {
          const video = document.querySelector('video');
          return video && !video.paused && video.currentTime > 0.15 && video.videoWidth > 0;
        },
        undefined,
        { timeout: 10000 },
      )
      .catch(async () => {
        throw new Error(
          `${route}: playback did not start ${JSON.stringify(await video.evaluate((element) => ({ paused: element.paused, time: element.currentTime, error: element.error?.message })))}`,
        );
      });
    const state = await video.evaluate((element) => ({
      duration: element.duration,
      width: element.videoWidth,
      height: element.videoHeight,
      error: element.error?.message,
    }));
    check(
      state.duration >= 49 && state.duration <= 51,
      `${route}: unexpected duration ${state.duration}`,
    );
    check(
      state.width === 1280 && state.height === 920 && !state.error,
      `${route}: invalid decoded video`,
    );
    check(requestedVideo.length > 0, `${route}: no actual MP4 playback request`);
    await video.evaluate((element) => {
      element.textTracks[0].mode = 'showing';
    });
    await page.waitForFunction(
      () => document.querySelector('video').textTracks[0].cues?.length > 0,
    );
    const cues = await video.evaluate((element) =>
      [...element.textTracks[0].cues].map((cue) => ({
        start: cue.startTime,
        end: cue.endTime,
        text: cue.text,
      })),
    );
    check(
      cues.every(
        (cue) => cue.end > cue.start && cue.end <= state.duration + 0.1 && cue.text.trim(),
      ),
      `${route}: invalid timed captions`,
    );
    await video.press('Space');
    check(await video.evaluate((element) => element.paused), `${route}: keyboard pause failed`);
    await video.evaluate((element) => {
      element.currentTime = 26;
    });
    await page.waitForFunction(() => {
      const video = document.querySelector('video');
      return !video.seeking && video.currentTime >= 26;
    });
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page
        .locator('.walkthrough')
        .screenshot({ path: `output/playwright/video-${file}-${width}.png` });
    }
    const transcript = page.getByRole('link', { name: 'Read the transcript', exact: true });
    const transcriptUrl = await transcript.getAttribute('href');
    check(transcriptUrl.includes(`${file}-transcript.txt`), `${route}: wrong transcript link`);
    const transcriptResponse = await page.request.get(
      await transcript.evaluate((element) => element.href),
    );
    check(
      transcriptResponse.ok() && (await transcriptResponse.text()).length > 500,
      `${route}: transcript unavailable`,
    );
    const captionLink = page.getByRole('link', { name: 'Download captions (VTT)', exact: true });
    check(
      (await captionLink.getAttribute('href')).endsWith(`${file}.vtt`),
      `${route}: wrong VTT download`,
    );
    const captionDownload = page.waitForEvent('download');
    await captionLink.click();
    check(
      (await captionDownload).suggestedFilename() === `${file}.vtt`,
      `${route}: caption filename`,
    );
    const videoDownload = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download video (MP4)', exact: true }).click();
    check((await videoDownload).suggestedFilename() === `${file}.mp4`, `${route}: video filename`);
    await video.evaluate((element) => {
      element.currentTime = element.duration - 0.5;
    });
    await video.scrollIntoViewIfNeeded();
    await video.focus();
    await video.press('Space');
    await page.waitForFunction(() => document.querySelector('video').ended);
    results.push({
      route,
      ...state,
      cues: cues.length,
      prePlaybackRequests: 0,
      keyboardPlayback: true,
      ended: true,
    });
    page.off('request', onRequest);
  }
  check(!errors.length, `Browser errors: ${errors.join('; ')}`);
  check(!failed.length, `HTTP failures: ${failed.join('; ')}`);
  return JSON.stringify({ base, results, errors, failed });
};
