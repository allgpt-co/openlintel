"use client";
import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button, Input, Label, toast } from '@openlintel/ui';
export default function DrawingSetsPage() {
  const utils = trpc.useUtils();
  const { data: config, isLoading } = trpc.drawingSet.get.useQuery();
  const [firmName, setFirmName] = useState<string>();
  const [scale, setScale] = useState<string>();
  const save = trpc.drawingSet.save.useMutation({ onSuccess: () => {
    utils.drawingSet.get.invalidate(); toast({ title: 'Drawing set defaults saved' });
  }, onError: (error) => toast({ title: 'Unable to save', description: error.message, variant: 'destructive' }) });
  if (isLoading) return <p>Loading drawing settings…</p>;
  return <main className="max-w-xl space-y-4"><h1 className="text-2xl font-semibold">Drawing set defaults</h1>
    <p>These defaults apply to your drawings across projects.</p>
    <Label>Firm name<Input value={firmName ?? config?.firmName ?? ''} onChange={(e) => setFirmName(e.target.value)} /></Label>
    <Label>Default scale<Input value={scale ?? config?.defaultScale ?? ''} onChange={(e) => setScale(e.target.value)} /></Label>
    <Button disabled={save.isPending} onClick={() => save.mutate({ id: config?.id, firmName: firmName ?? config?.firmName ?? '', defaultScale: scale ?? config?.defaultScale ?? '' })}>Save defaults</Button>
  </main>;
}
