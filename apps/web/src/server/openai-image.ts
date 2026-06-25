import { generateStorageKey, saveFile as saveFileToStorage } from '../lib/storage';

type ImageSize = '1024x1024' | '1792x1024' | '1024x1792' | '1536x1024' | '1024x1536' | 'auto';
type ImageQuality = 'standard' | 'hd' | 'low' | 'medium' | 'high' | 'auto';

type ImageResult = {
  b64_json?: string;
  revised_prompt?: string;
  url?: string;
};

type ImageResponse = {
  data?: ImageResult[];
};

type OpenAIImagesClient = {
  images: {
    generate: (params: any) => Promise<ImageResponse>;
  };
};

type SaveFile = (buffer: Buffer, key: string, contentType?: string) => Promise<void>;
type GenerateStorageKey = (filename: string) => string;

function getImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
}

function isGptImageModel(model: string): boolean {
  return model.startsWith('gpt-image-');
}

function normalizeGptImageSize(size: ImageSize): '1024x1024' | '1536x1024' | '1024x1536' | 'auto' {
  if (size === '1792x1024') return '1536x1024';
  if (size === '1024x1792') return '1024x1536';
  if (size === '1536x1024' || size === '1024x1536' || size === 'auto') return size;
  return '1024x1024';
}

function normalizeGptImageQuality(quality: ImageQuality): 'low' | 'medium' | 'high' | 'auto' {
  if (quality === 'hd' || quality === 'high') return 'high';
  if (quality === 'standard' || quality === 'medium') return 'medium';
  if (quality === 'low' || quality === 'auto') return quality;
  return 'auto';
}

export function buildOpenAIImageRequest(input: {
  prompt: string;
  size?: ImageSize;
  quality?: ImageQuality;
  model?: string;
}): Record<string, unknown> {
  const model = input.model || getImageModel();
  const size = input.size || '1024x1024';
  const quality = input.quality || 'high';

  if (isGptImageModel(model)) {
    return {
      model,
      prompt: input.prompt,
      n: 1,
      size: normalizeGptImageSize(size),
      quality: normalizeGptImageQuality(quality),
      output_format: 'png',
    };
  }

  return {
    model,
    prompt: input.prompt,
    n: 1,
    size,
    quality,
    response_format: 'url',
  };
}

export async function imageResultToAppUrl(input: {
  image: ImageResult | undefined;
  filename: string;
  saveFile?: SaveFile;
  generateStorageKey?: GenerateStorageKey;
}): Promise<string> {
  const { image, filename } = input;
  if (!image) throw new Error('No image returned from OpenAI');
  if (image.url) return image.url;
  if (!image.b64_json) throw new Error('No image data returned from OpenAI');

  const storageKey = (input.generateStorageKey || generateStorageKey)(filename);
  const buffer = Buffer.from(image.b64_json, 'base64');
  await (input.saveFile || saveFileToStorage)(buffer, storageKey, 'image/png');
  return `/api/uploads/${encodeURIComponent(storageKey)}`;
}

export async function generateAndStoreOpenAIImage(input: {
  openai: OpenAIImagesClient;
  prompt: string;
  filename: string;
  size?: ImageSize;
  quality?: ImageQuality;
  model?: string;
}): Promise<{ imageUrl: string; revisedPrompt: string | null }> {
  const response = await input.openai.images.generate(buildOpenAIImageRequest(input));
  const image = response.data?.[0];
  const imageUrl = await imageResultToAppUrl({ image, filename: input.filename });

  return {
    imageUrl,
    revisedPrompt: image?.revised_prompt ?? null,
  };
}
