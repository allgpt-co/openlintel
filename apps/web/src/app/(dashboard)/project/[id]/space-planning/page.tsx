"use client";
import { use, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
export default function SpacePlanningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [roomId, setRoomId] = useState('');
  const { data: rooms = [] } = trpc.room.list.useQuery({ projectId: id });
  const { data: plans = [], isLoading } = trpc.spacePlanning.list.useQuery({ roomId }, { enabled: !!roomId });
  return <main className="space-y-4"><h1 className="text-2xl font-semibold">Space planning</h1>
    <p>Review saved room layouts. Automatic space-plan generation is not available in this release.</p>
    <label className="block">Room <select className="ml-2 rounded border p-2" value={roomId} onChange={(event) => setRoomId(event.target.value)}>
      <option value="">Choose a room</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
    </select></label>
    {roomId && (isLoading ? <p>Loading plans…</p> : plans.length ? plans.map((plan) => <article className="rounded border p-4" key={plan.id}>
      <h2>Layout {plan.layoutVariant}</h2><p>Circulation score: {plan.circulationScore ?? 'Not assessed'}</p>
    </article>) : <p>No saved plans for this room.</p>)}
  </main>;
}
