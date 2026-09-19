import { esc, url } from './config.mjs';

export const walkthroughs = {
  'window-room': {
    file: 'window-room-walkthrough',
    title: 'Follow The Window Room.',
    description:
      'A recorded tour of the brief, design, drawings, materials, and handoff on this website.',
  },
  'template-workflow': {
    file: 'template-workflow-walkthrough',
    title: 'Preview, then adapt.',
    description:
      'See where to preview and download the specification sheet, FF&E schedule, and finish schedule.',
  },
};

export function walkthrough(id, { wrapped = false } = {}) {
  const item = walkthroughs[id];
  if (!item) throw new Error(`Unknown walkthrough: ${id}`);
  const asset = (suffix) => url(`assets/videos/${item.file}${suffix}`);
  return `<section class="walkthrough${wrapped ? ' wrap' : ''}" aria-labelledby="${id}-video-title"><div class="walkthrough-heading"><p class="eyebrow">A recorded website tour</p><h2 id="${id}-video-title">${esc(item.title)}</h2><p>${esc(item.description)}</p><p id="${id}-video-description" class="walkthrough-disclosure">Silent video with visible captions. Fictional educational examples—not a live application demonstration or a customer result.</p></div><figure class="walkthrough-player"><video controls preload="none" playsinline width="1280" height="920" poster="${asset('-poster.webp')}" aria-label="${esc(item.title)} Recorded website tour" aria-describedby="${id}-video-description"><source src="${asset('.mp4')}" type="video/mp4"><track kind="captions" src="${asset('.vtt')}" srclang="en" label="English">Your browser does not support embedded video. Use the video download or transcript below.</video><figcaption><a href="${asset('-transcript.txt')}">Read the transcript</a><a href="${asset('.mp4')}" download>Download video (MP4)</a><a href="${asset('.vtt')}" download>Download captions (VTT)</a></figcaption></figure></section>`;
}
