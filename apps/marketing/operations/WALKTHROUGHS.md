# Educational website walkthroughs

Two silent, captioned recordings were captured from the actual locally built OpenLintel marketing website on September 19, 2026. They demonstrate navigation and ungated educational downloads—not a running OpenLintel application, a real client project, professional validation, or automatic end-to-end design generation.

## Deliverables

| Recording | Duration | Dimensions | What actually occurs |
| --- | --- | --- | --- |
| `window-room-walkthrough.mp4` | 50 seconds | 1280 × 920 | Navigate The Window Room brief, switch concept illustrations, switch authored plan/elevation views, inspect the sample material register, and reach handoff downloads. |
| `template-workflow-walkthrough.mp4` | 50 seconds | 1280 × 920 | Preview the specification sheet, download its real XLSX workbook, then inspect the FF&E and finish schedule web previews and download panel. |

Files live in `apps/marketing/assets/videos/` and are copied into the static build. Each MP4 has a same-basename `.vtt`, `-poster.webp`, and `-transcript.txt`. The captions are also burned into a separate bottom band; they never cover the recorded webpage. Both opening and closing captions identify the fictional educational scope and disclaim a live application/customer result.

The recordings contain no sound or simulated narration. Plain-language transcripts describe the visible steps and limitations. The template video does **not** demonstrate editing in Excel or prove automatic synchronization between separate files. Both retain pending-review disclosures. No invented customer data, success metrics, professional reviewer, or actual client material was introduced.

## Publication requirements

- Use native `<video controls preload="none" playsinline>` with explicit dimensions and a poster. No autoplay, external embed, or background download of the MP4.
- Include an English caption track and an adjacent plain-text transcript link. Burned captions remain available even if a browser does not display the track.
- Label the player as an educational website walkthrough, not a product demo.
- Re-record after material changes to these pages; do not use an outdated video as evidence of current software functionality.
- The site remains subject to separate deployment, accessibility, production playback, and domain checks. Creation of these assets does not complete professional review, outreach, a workshop, or months of SEO measurement.

## Reproduce

Prerequisites: Node.js, `npx`, Chromium, and FFmpeg built with libx264, libass, and libwebp support. The script uses the repository's pinned Playwright CLI version (`0.1.19`). It builds into an isolated temporary folder, disables form/analytics integrations, starts its own free-port preview, and blocks all external browser requests before visiting any page. It never builds canonical `docs/` or opens the application.

```bash
# Point to your installed tools; omit executable override if Playwright owns Chromium.
MARKETING_FFMPEG=/path/to/ffmpeg \
MARKETING_BROWSER_EXECUTABLE=/path/to/chromium \
node apps/marketing/capture-walkthroughs.mjs
```

Only use `MARKETING_BROWSER_NO_SANDBOX=1` in a disposable environment where Chromium cannot otherwise run; it is not the default.

The Playwright-bundled minimal FFmpeg may encode only WebM. For this capture, full encoding support came from pinned `imageio-ffmpeg==0.6.0`, installed into `/tmp/openlintel-video-tools` rather than application dependencies:

```bash
python3 -m pip install --target /tmp/openlintel-video-tools 'imageio-ffmpeg==0.6.0'
PYTHONPATH=/tmp/openlintel-video-tools python3 -c \
  'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'
```

Supply that printed binary path as `MARKETING_FFMPEG`. The script fails if the encoder is missing, a browser step fails, the downloaded workbook is not a ZIP-based Office file, or an MP4 reaches 3,000,000 bytes. It does not substitute synthetic frames or claim a failed interaction succeeded.

## Verification evidence

Temporary source WebM recordings, actual downloaded specification workbook, browser scripts/logs, six extracted inspection frames per recording, and machine-readable `capture-results.json` are stored under ignored `output/playwright/walkthroughs/`. The isolated preview folders are left under the operating system temporary directory for inspection; they can be deleted after review.

The delivered MP4s are H.264/yuv420p, 15 frames/second, 50 seconds, with fast-start metadata. Each complete file was decoded without errors, and extracted frames were visually checked across both sequences, including the opening and closing scope disclosures. Captures use real existing pages; only the subtitle band and video encoding were added afterward. Full-page screenshots or assembled slide images were not substituted for the recording.
