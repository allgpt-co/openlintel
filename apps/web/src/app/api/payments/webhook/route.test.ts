import { expect, it } from 'vitest';
import { POST } from './route';

it('rejects all payment events without parsing a payload or touching the database', async () => {
  const response = await POST();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: 'Billing is disabled for this release' });
});
