import { io } from 'socket.io-client';

export function collaborationSocket(projectId?: string) {
  const socket = io(process.env.NEXT_PUBLIC_COLLAB_SERVICE_URL || 'http://localhost:8009', {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: (callback) => {
      fetch('/api/collaboration/token', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId }) })
        .then(async (response) => {
          if (!response.ok) throw new Error('Collaboration authentication failed');
          return response.json();
        }).then(({ token }) => callback({ token })).catch(() => callback({ token: '' }));
    },
  });
  // A fresh token and ownership check on every reconnect, including expiry.
  socket.on('disconnect', (reason) => { if (reason === 'io server disconnect') socket.connect(); });
  return socket;
}
