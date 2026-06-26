import { describe, expect, it } from 'vitest';
import {
  BEDROCK_MODEL_ID,
  buildConverseInput,
  extractBedrockText,
} from './bedrock';

describe('Bedrock Converse adapter', () => {
  it('builds Kimi K2.5 Converse input from text messages', () => {
    const input = buildConverseInput({
      messages: [
        { role: 'system', content: 'Return only JSON.' },
        { role: 'user', content: 'Generate a cutlist.' },
        { role: 'assistant', content: 'Acknowledged.' },
      ],
      temperature: 0.2,
      maxTokens: 4096,
    });

    expect(input).toEqual({
      modelId: BEDROCK_MODEL_ID,
      system: [{ text: 'Return only JSON.' }],
      messages: [
        { role: 'user', content: [{ text: 'Generate a cutlist.' }] },
        { role: 'assistant', content: [{ text: 'Acknowledged.' }] },
      ],
      inferenceConfig: {
        temperature: 0.2,
        maxTokens: 4096,
      },
    });
    expect(input.modelId).toBe('moonshotai.kimi-k2.5');
  });

  it('converts image URL content blocks to Bedrock image blocks', () => {
    const imageBytes = Buffer.from('image-bytes');
    const input = buildConverseInput({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this floor plan.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${imageBytes.toString('base64')}`,
              },
            },
          ],
        },
      ],
    });

    expect(input.messages).toEqual([
      {
        role: 'user',
        content: [
          { text: 'Analyze this floor plan.' },
          {
            image: {
              format: 'png',
              source: { bytes: imageBytes },
            },
          },
        ],
      },
    ]);
  });

  it('extracts generated text from the Bedrock response shape', () => {
    expect(
      extractBedrockText({
        output: {
          message: {
            content: [{ text: '{"ok":true}' }],
          },
        },
      }),
    ).toBe('{"ok":true}');
  });
});
