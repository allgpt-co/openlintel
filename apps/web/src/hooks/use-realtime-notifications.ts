'use client';

import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { collaborationSocket } from '@/lib/collaboration-socket';
import { toast } from '@openlintel/ui';

const COLLAB_SERVICE_URL =
  process.env.NEXT_PUBLIC_COLLAB_SERVICE_URL || 'http://localhost:8010';

interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message?: string;
  link?: string;
}

/**
 * Connects to the collaboration service's websocket and listens for
 * real-time notification pushes from the Redis pub/sub relay.
 * Shows a toast for each incoming notification.
 */
export function useRealtimeNotifications(userId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    const socket = collaborationSocket();

    socket.on('notification:new', (notification: RealtimeNotification) => {
      toast({
        title: notification.title,
        description: notification.message,
      });
    });

    // Also listen for comment and approval real-time events
    socket.on('comment:created', (data: { content: string; userName?: string }) => {
      toast({
        title: 'New comment',
        description: data.userName
          ? `${data.userName}: ${data.content?.slice(0, 80)}`
          : data.content?.slice(0, 100),
      });
    });

    socket.on('approval:updated', (data: { status: string; targetType?: string }) => {
      toast({
        title: 'Approval updated',
        description: `${data.targetType || 'Item'} ${data.status}`,
      });
    });

    socket.connect();
    socketRef.current = socket;

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  return socketRef;
}
