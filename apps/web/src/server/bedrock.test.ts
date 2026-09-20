import { describe, expect, it } from 'vitest';
import {
  BEDROCK_MODEL_ID,
  bedrockClientConfig,
  buildConverseInput,
  extractBedrockText,
} from './bedrock';

describe('Bedrock Converse adapter', () => {
  it('uses dedicated Bedrock credentials without selecting the S3 principal', () => {
    const config = bedrockClientConfig({
      AWS_REGION: 'us-east-1', AWS_ACCESS_KEY_ID: 's3-access', AWS_SECRET_ACCESS_KEY: 's3-secret',
      BEDROCK_REGION: 'us-west-2', BEDROCK_AWS_ACCESS_KEY_ID: 'bedrock-access',
      BEDROCK_AWS_SECRET_ACCESS_KEY: 'bedrock-secret', BEDROCK_AWS_SESSION_TOKEN: 'temporary-token',
    });
    expect(config.region).toBe('us-west-2');
    expect(config.credentials).toEqual({ accessKeyId: 'bedrock-access', secretAccessKey: 'bedrock-secret', sessionToken: 'temporary-token' });
  });

  it('retains the AWS default credential chain when no dedicated pair is configured', () => {
    expect(bedrockClientConfig({ AWS_REGION: 'us-east-1' })).toEqual({ region: 'us-east-1' });
  });

  it('rejects incomplete dedicated credentials instead of silently using S3 credentials', () => {
    expect(() => bedrockClientConfig({ BEDROCK_AWS_ACCESS_KEY_ID: 'partial' })).toThrow('Configure both');
    expect(() => bedrockClientConfig({ BEDROCK_AWS_SESSION_TOKEN: 'orphan-token' })).toThrow('Configure both');
  });

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
