import { beforeEach, describe, expect, it, vi } from 'vitest';

const awsMocks = vi.hoisted(() => ({
  send: vi.fn(),
  getSignedUrl: vi.fn(),
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => {
  const command = (name: string) =>
    vi.fn((input) => ({
      name,
      input,
    }));

  awsMocks.S3Client.mockImplementation((config) => ({
    config,
    send: awsMocks.send,
  }));
  awsMocks.PutObjectCommand = command('PutObjectCommand');
  awsMocks.GetObjectCommand = command('GetObjectCommand');
  awsMocks.DeleteObjectCommand = command('DeleteObjectCommand');
  awsMocks.ListObjectsV2Command = command('ListObjectsV2Command');

  return {
    S3Client: awsMocks.S3Client,
    PutObjectCommand: awsMocks.PutObjectCommand,
    GetObjectCommand: awsMocks.GetObjectCommand,
    DeleteObjectCommand: awsMocks.DeleteObjectCommand,
    ListObjectsV2Command: awsMocks.ListObjectsV2Command,
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: awsMocks.getSignedUrl,
}));

async function loadStorage(env: Record<string, string | undefined> = {}) {
  vi.resetModules();
  process.env.AWS_S3_BUCKET = env.AWS_S3_BUCKET ?? 'openlintel-test-bucket';
  process.env.AWS_REGION = env.AWS_REGION ?? 'ap-south-1';
  return import('./storage');
}

describe('S3 storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AWS_S3_BUCKET;
    delete process.env.AWS_REGION;
  });

  it('uploads files to the configured S3 bucket with the provided content type', async () => {
    const { saveFile } = await loadStorage();
    const body = Buffer.from('floor plan');

    await saveFile(body, 'uploads/floor-plan.pdf', 'application/pdf');

    expect(awsMocks.S3Client).toHaveBeenCalledWith({ region: 'ap-south-1' });
    expect(awsMocks.PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'openlintel-test-bucket',
      Key: 'uploads/floor-plan.pdf',
      Body: body,
      ContentType: 'application/pdf',
    });
    expect(awsMocks.send).toHaveBeenCalledWith({
      name: 'PutObjectCommand',
      input: {
        Bucket: 'openlintel-test-bucket',
        Key: 'uploads/floor-plan.pdf',
        Body: body,
        ContentType: 'application/pdf',
      },
    });
  });

  it('downloads files from S3 as buffers', async () => {
    const { getFile } = await loadStorage();
    awsMocks.send.mockResolvedValueOnce({
      Body: {
        transformToByteArray: async () => new Uint8Array([104, 105]),
      },
    });

    await expect(getFile('uploads/photo.jpg')).resolves.toEqual(Buffer.from('hi'));

    expect(awsMocks.GetObjectCommand).toHaveBeenCalledWith({
      Bucket: 'openlintel-test-bucket',
      Key: 'uploads/photo.jpg',
    });
  });

  it('returns null when S3 reports a missing file', async () => {
    const { getFile } = await loadStorage();
    const error = new Error('not found') as Error & { name: string };
    error.name = 'NoSuchKey';
    awsMocks.send.mockRejectedValueOnce(error);

    await expect(getFile('uploads/missing.jpg')).resolves.toBeNull();
  });

  it('deletes files from S3 using the existing deleteFile API', async () => {
    const { deleteFile } = await loadStorage();

    await deleteFile('uploads/photo.jpg');

    expect(awsMocks.DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: 'openlintel-test-bucket',
      Key: 'uploads/photo.jpg',
    });
  });

  it('generates presigned S3 download URLs without changing callers', async () => {
    const { getPresignedUrl } = await loadStorage();
    awsMocks.getSignedUrl.mockResolvedValueOnce('https://signed.example/download');

    await expect(getPresignedUrl('uploads/photo.jpg', 600)).resolves.toBe(
      'https://signed.example/download',
    );

    expect(awsMocks.GetObjectCommand).toHaveBeenCalledWith({
      Bucket: 'openlintel-test-bucket',
      Key: 'uploads/photo.jpg',
    });
    expect(awsMocks.getSignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({ send: awsMocks.send }),
      {
        name: 'GetObjectCommand',
        input: {
          Bucket: 'openlintel-test-bucket',
          Key: 'uploads/photo.jpg',
        },
      },
      { expiresIn: 600 },
    );
  });

  it('lists S3 object keys across paginated responses', async () => {
    const { listFiles } = await loadStorage();
    awsMocks.send
      .mockResolvedValueOnce({
        Contents: [{ Key: 'uploads/a.jpg' }],
        IsTruncated: true,
        NextContinuationToken: 'next-page',
      })
      .mockResolvedValueOnce({
        Contents: [{ Key: 'uploads/b.jpg' }, {}],
        IsTruncated: false,
      });

    await expect(listFiles('uploads/')).resolves.toEqual(['uploads/a.jpg', 'uploads/b.jpg']);

    expect(awsMocks.ListObjectsV2Command).toHaveBeenNthCalledWith(1, {
      Bucket: 'openlintel-test-bucket',
      Prefix: 'uploads/',
      ContinuationToken: undefined,
    });
    expect(awsMocks.ListObjectsV2Command).toHaveBeenNthCalledWith(2, {
      Bucket: 'openlintel-test-bucket',
      Prefix: 'uploads/',
      ContinuationToken: 'next-page',
    });
  });

  it('fails clearly when the S3 bucket is not configured', async () => {
    const { saveFile } = await loadStorage({ AWS_S3_BUCKET: '' });

    await expect(saveFile(Buffer.from('x'), 'uploads/photo.jpg')).rejects.toThrow(
      'AWS_S3_BUCKET',
    );
  });
});
