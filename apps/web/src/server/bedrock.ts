import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type ConverseCommandInput,
  type ConverseCommandOutput,
  type ImageFormat,
  type Message,
  type SystemContentBlock,
} from '@aws-sdk/client-bedrock-runtime';

export const BEDROCK_MODEL_ID = 'moonshotai.kimi-k2.5';

type ChatTextBlock = {
  type: 'text';
  text: string;
};

type ChatImageUrlBlock = {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: string;
  };
};

type ChatContentBlock = ChatTextBlock | ChatImageUrlBlock;

export type ChatInputMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatContentBlock[];
};

export type BedrockConverseOptions = {
  messages: ChatInputMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
};

let bedrockClient: BedrockRuntimeClient | null = null;

function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION,
    });
  }
  return bedrockClient;
}

function textFromMessageContent(content: ChatInputMessage['content']): string {
  if (typeof content === 'string') return content;
  return content
    .filter((block): block is ChatTextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

function imageFormatFromMimeSubtype(subtype: string): ImageFormat {
  const normalized = subtype.toLowerCase() === 'jpg' ? 'jpeg' : subtype.toLowerCase();
  if (normalized === 'png' || normalized === 'jpeg' || normalized === 'gif' || normalized === 'webp') {
    return normalized;
  }
  throw new Error(`Unsupported Bedrock image format: ${subtype}`);
}

function contentBlockFromImageUrl(url: string): ContentBlock {
  const match = url.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Bedrock Converse image inputs must use data:image/*;base64 URLs.');
  }

  return {
    image: {
      format: imageFormatFromMimeSubtype(match[1]!),
      source: {
        bytes: Buffer.from(match[2]!, 'base64'),
      },
    },
  };
}

function contentBlocksFromMessageContent(content: ChatInputMessage['content']): ContentBlock[] {
  if (typeof content === 'string') {
    return [{ text: content }];
  }

  return content.map((block) => {
    if (block.type === 'text') {
      return { text: block.text };
    }
    return contentBlockFromImageUrl(block.image_url.url);
  });
}

export function buildConverseInput(options: BedrockConverseOptions): ConverseCommandInput {
  const system: SystemContentBlock[] = [];
  const messages: Message[] = [];

  for (const message of options.messages) {
    if (message.role === 'system') {
      const text = textFromMessageContent(message.content);
      if (text.trim()) system.push({ text });
      continue;
    }

    messages.push({
      role: message.role,
      content: contentBlocksFromMessageContent(message.content),
    });
  }

  const inferenceConfig: ConverseCommandInput['inferenceConfig'] = {};
  if (options.temperature !== undefined) inferenceConfig.temperature = options.temperature;
  if (options.maxTokens !== undefined) inferenceConfig.maxTokens = options.maxTokens;
  if (options.topP !== undefined) inferenceConfig.topP = options.topP;
  if (options.stopSequences !== undefined) inferenceConfig.stopSequences = options.stopSequences;

  return {
    modelId: BEDROCK_MODEL_ID,
    ...(system.length > 0 ? { system } : {}),
    ...(messages.length > 0 ? { messages } : {}),
    ...(Object.keys(inferenceConfig).length > 0 ? { inferenceConfig } : {}),
  };
}

export function extractBedrockText(response: {
  output?: {
    message?: {
      content?: Array<{ text?: string }>;
    };
  };
}): string {
  return response.output?.message?.content?.[0]?.text ?? '';
}

export async function converseWithBedrock(
  options: BedrockConverseOptions,
): Promise<{ response: ConverseCommandOutput; text: string; stopReason?: string }> {
  const response = await getBedrockClient().send(new ConverseCommand(buildConverseInput(options)));
  return {
    response,
    text: extractBedrockText(response),
    stopReason: response.stopReason,
  };
}
