import { eq } from 'drizzle-orm';
import { userApiKeys } from '@openlintel/db';
import { decryptApiKey } from './crypto';
import type { Database } from '@openlintel/db';
import { converseWithBedrock } from '../server/bedrock';

interface LLMResponse {
  content: string;
}

/**
 * Call an LLM using Bedrock default AWS credentials or the user's stored provider key.
 * Supports Bedrock, Anthropic, and Google providers.
 * Returns the parsed JSON from the model response.
 */
export async function callLLM(
  userId: string,
  db: Database,
  systemPrompt: string,
  userPrompt: string,
  preferredProvider?: string,
): Promise<Record<string, unknown>> {
  // Find the user's API key — prefer the specified provider, else use first available.
  // Bedrock uses the default AWS credentials chain and does not require a stored key.
  const keys = await db
    .select()
    .from(userApiKeys)
    .where(eq(userApiKeys.userId, userId));

  if (keys.length === 0 || preferredProvider === 'bedrock') {
    const result = await callBedrock(systemPrompt, userPrompt);
    try {
      return JSON.parse(result.content);
    } catch {
      return { raw: result.content };
    }
  }

  const apiKeyRow = preferredProvider
    ? keys.find((k) => k.provider === preferredProvider) ?? keys[0]
    : keys[0];

  // Update lastUsedAt
  await db
    .update(userApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(userApiKeys.id, apiKeyRow!.id));

  let result: LLMResponse;

  switch (apiKeyRow!.provider) {
    case 'anthropic':
      result = await callAnthropic(decryptStoredApiKey(apiKeyRow!), systemPrompt, userPrompt);
      break;
    case 'google':
      result = await callGoogle(decryptStoredApiKey(apiKeyRow!), systemPrompt, userPrompt);
      break;
    default:
      result = await callBedrock(systemPrompt, userPrompt);
  }

  // Try to parse JSON from response
  try {
    return JSON.parse(result.content);
  } catch {
    // If not valid JSON, wrap in an object
    return { raw: result.content };
  }
}

function decryptStoredApiKey(apiKeyRow: {
  encryptedKey: string;
  iv: string;
  authTag: string;
}): string {
  return decryptApiKey(
    apiKeyRow.encryptedKey,
    apiKeyRow.iv,
    apiKeyRow.authTag,
  );
}

async function callBedrock(
  systemPrompt: string,
  userPrompt: string,
): Promise<LLMResponse> {
  const { text } = await converseWithBedrock({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 4096,
  });
  return { content: text || '{}' };
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<LLMResponse> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt + '\n\nAlways respond with valid JSON.',
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${err}`);
  }

  const data = await res.json();
  const textBlock = data.content.find((b: { type: string }) => b.type === 'text');
  return { content: textBlock?.text ?? '{}' };
}

async function callGoogle(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<LLMResponse> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt + '\n\nAlways respond with valid JSON.' }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google AI API error: ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  return { content: text };
}
