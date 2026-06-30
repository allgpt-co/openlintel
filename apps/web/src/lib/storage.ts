import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type S3Config = {
  bucket: string;
  region: string;
};

let client: S3Client | null = null;

function resolveS3Config(
  env: NodeJS.ProcessEnv = process.env,
): S3Config {
  const bucket = env.AWS_S3_BUCKET?.trim();
  if (!bucket) {
    throw new Error('AWS_S3_BUCKET must be configured for S3 storage');
  }

  return {
    bucket,
    region: env.AWS_REGION || env.AWS_DEFAULT_REGION || 'us-east-1',
  };
}

function getClient(): S3Client {
  if (!client) {
    const { region } = resolveS3Config();
    client = new S3Client({ region });
  }
  return client;
}

function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const maybeAwsError = error as Error & {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    maybeAwsError.name === 'NoSuchKey' ||
    maybeAwsError.name === 'NotFound' ||
    maybeAwsError.$metadata?.httpStatusCode === 404
  );
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (typeof body === 'string') return Buffer.from(body);

  const maybeBlob = body as { transformToByteArray?: () => Promise<Uint8Array> };
  if (typeof maybeBlob.transformToByteArray === 'function') {
    return Buffer.from(await maybeBlob.transformToByteArray());
  }

  const chunks: Buffer[] = [];
  for await (const chunk of Readable.from(body as AsyncIterable<Uint8Array>)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function generateStorageKey(filename: string): string {
  const ext = filename.includes('.') ? '.' + filename.split('.').pop() : '';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  return `${date}/${randomUUID()}${ext}`;
}

export async function saveFile(
  buffer: Buffer,
  key: string,
  contentType = 'application/octet-stream',
): Promise<void> {
  const { bucket } = resolveS3Config();
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

export async function getFile(key: string): Promise<Buffer | null> {
  const { bucket } = resolveS3Config();
  try {
    const result = await getClient().send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    return bodyToBuffer(result.Body);
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

export async function deleteFile(key: string): Promise<void> {
  const { bucket } = resolveS3Config();
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function listFiles(prefix = ''): Promise<string[]> {
  const { bucket } = resolveS3Config();
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const result = await getClient().send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of result.Contents ?? []) {
      if (object.Key) keys.push(object.Key);
    }

    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const { bucket } = resolveS3Config();
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn },
  );
}
