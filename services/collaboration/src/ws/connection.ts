import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken, TokenPayload } from '../auth';
import { setupDocumentRooms } from './rooms';
import { pool } from '../index';
import { setupAwareness } from './awareness';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

export function setupWebSocket(io: SocketIOServer) {
  // Auth middleware for WebSocket
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const user = verifyToken(token);
      socket.data.claims = user;
      socket.userId = user.id;
      socket.userName = user.name || 'Anonymous';
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const expires = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.claims.exp * 1000 - Date.now()));
    socket.once('disconnect', () => clearTimeout(expires));
    // Reject every project/document event outside this short-lived token's scope.
    socket.use(async ([event, payload], next) => {
      const projectId = typeof payload === 'string' ? payload : payload?.projectId ?? payload?.docId;
      if (!projectId || projectId !== socket.data.claims.projectId) return next(new Error('Forbidden'));
      try {
        const result = await pool.query('SELECT id FROM projects WHERE id=$1 AND user_id=$2', [projectId, socket.userId]);
        if (!result.rowCount) return next(new Error('Forbidden'));
        next();
      } catch { next(new Error('Project access unavailable')); }
    });
    socket.on('error', () => { socket.emit('access:error', { error: 'Project access denied' }); });

    // Join project rooms
    socket.on('join:project', (projectId: string) => {
      socket.join(`project:${projectId}`);
      io.to(`project:${projectId}`).emit('user:joined', {
        userId: socket.userId,
        userName: socket.userName,
      });
    });

    socket.on('leave:project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
      io.to(`project:${projectId}`).emit('user:left', {
        userId: socket.userId,
      });
    });

    // Comment events
    socket.on('comment:new', (data: { projectId: string; comment: any }) => {
      io.to(`project:${data.projectId}`).emit('comment:created', data.comment);
    });

    // Approval events
    socket.on('approval:update', (data: { projectId: string; approval: any }) => {
      io.to(`project:${data.projectId}`).emit('approval:updated', data.approval);
    });

    // Cursor/selection awareness
    setupAwareness(socket, io);

    // Y.js document sync
    setupDocumentRooms(socket, io);

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
      // Broadcast to all rooms the user was in
      for (const room of socket.rooms) {
        if (room.startsWith('project:')) {
          io.to(room).emit('user:left', { userId: socket.userId });
        }
      }
    });
  });
}
