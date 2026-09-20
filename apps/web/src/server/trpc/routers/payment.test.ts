import { describe, expect, it, vi } from 'vitest';
import { initTRPC } from '@trpc/server';

vi.mock('../init', () => {
  const t = initTRPC.context<{ userId: string; db: unknown }>().create();
  return { router: t.router, protectedProcedure: t.procedure };
});
vi.mock('@openlintel/db', () => ({ payments: {}, invoices: {}, purchaseOrders: {}, projects: {}, eq: vi.fn(), and: vi.fn() }));
import { paymentRouter } from './payment';

describe('disabled billing mutations', () => {
  it('rejects creation, manual completion and checkout before database access', async () => {
    const db = new Proxy({}, { get: () => { throw new Error('Billing accessed database'); } });
    const caller = paymentRouter.createCaller({ userId: 'owner', db } as never);
    await expect(caller.create({ projectId: 'project', amount: 10 })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(caller.updateStatus({ id: 'foreign-payment', status: 'completed' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(caller.createCheckoutSession({ projectId: 'project', paymentId: 'payment' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
