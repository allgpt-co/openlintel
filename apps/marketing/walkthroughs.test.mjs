import test from 'node:test';
import assert from 'node:assert/strict';
import { walkthrough, walkthroughs } from './walkthroughs.mjs';

test('Recorded tours have explicit playback, accessible alternatives and truthful context', () => {
  for (const id of Object.keys(walkthroughs)) {
    const html = walkthrough(id);
    assert.match(html, /<video controls preload="none" playsinline/);
    assert.doesNotMatch(html, /autoplay|<iframe|VideoObject/);
    assert.match(html, /width="1280" height="920"/);
    assert.match(html, /<track kind="captions"[^>]+srclang="en"/);
    assert.match(html, /Read the transcript/);
    assert.match(html, /Download video \(MP4\)/);
    assert.match(html, /Fictional educational examples/);
    assert.match(html, /not a live application demonstration or a customer result/);
    assert.match(html, /aria-describedby=/);
  }
  assert.match(walkthrough('window-room', { wrapped: true }), /class="walkthrough wrap"/);
  assert.throws(() => walkthrough('unknown'), /Unknown walkthrough/);
});
