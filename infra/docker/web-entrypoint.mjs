const required = ['DATABASE_URL', 'AUTH_SECRET', 'JWT_SECRET', 'API_KEY_ENCRYPTION_SECRET',
  'AUTH_URL', 'AWS_REGION', 'AWS_S3_BUCKET'];
for (const key of required) {
  if (!process.env[key]?.trim()) throw new Error(`Missing production configuration: ${key}`);
}
for (const key of ['AUTH_SECRET', 'JWT_SECRET', 'API_KEY_ENCRYPTION_SECRET']) {
  if (Buffer.byteLength(process.env[key]) < 32 || /^(dev-|replace-|openlintel_dev)/.test(process.env[key])) {
    throw new Error(`Production ${key} must contain at least 32 bytes of random secret material`);
  }
}
if (process.env.AUTH_SECRET === process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be separate from AUTH_SECRET');
}
if (!['GOOGLE', 'GITHUB'].some((p) => process.env[`${p}_CLIENT_ID`] && process.env[`${p}_CLIENT_SECRET`])) {
  throw new Error('At least one complete OAuth provider configuration is required');
}
if (new URL(process.env.AUTH_URL).protocol !== 'https:') throw new Error('AUTH_URL must use HTTPS');
await import('../apps/web/server.js');
