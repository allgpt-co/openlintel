import { describe, expect, it, vi } from 'vitest';
import {
  buildOpenAIImageRequest,
  imageResultToAppUrl,
} from './openai-image';

describe('OpenAI image helpers', () => {
  it('builds GPT Image generation params instead of legacy DALL-E params', () => {
    const request = buildOpenAIImageRequest({
      prompt: 'Render a floor plan',
      size: '1792x1024',
      quality: 'hd',
    });

    expect(request).toEqual({
      model: 'gpt-image-1',
      prompt: 'Render a floor plan',
      n: 1,
      size: '1536x1024',
      quality: 'high',
      output_format: 'png',
    });
  });

  it('stores GPT Image base64 output and returns an app-served URL', async () => {
    const saveFile = vi.fn(async () => undefined);
    const generateStorageKey = vi.fn(() => '2026/06/25/generated.png');

    const imageUrl = await imageResultToAppUrl({
      image: { b64_json: Buffer.from('png bytes').toString('base64') },
      filename: 'floor-plan-render.png',
      saveFile,
      generateStorageKey,
    });

    expect(generateStorageKey).toHaveBeenCalledWith('floor-plan-render.png');
    expect(saveFile).toHaveBeenCalledWith(
      Buffer.from('png bytes'),
      '2026/06/25/generated.png',
      'image/png',
    );
    expect(imageUrl).toBe('/api/uploads/2026%2F06%2F25%2Fgenerated.png');
  });
});
