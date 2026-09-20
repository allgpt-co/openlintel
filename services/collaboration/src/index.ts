import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { setupWebSocket } from './ws/connection';
import { commentsRouter } from './routes/comments';
import { approvalsRouter } from './routes/approvals';
import { notificationsRouter } from './routes/notifications';
import { verifyToken } from './auth';

const PORT = parseInt(process.env.PORT || '8009', 10);
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://openlintel:openlintel_dev@localhost:5432/openlintel';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const app = express();
const httpServer = createServer(app);

// Database pool
export const pool = new Pool({ connectionString: DATABASE_URL });

// Redis client
export const redis = createClient({ url: REDIS_URL });

// Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.WEB_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: process.env.WEB_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Auth middleware for REST routes
app.use('/api', async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const user = verifyToken(authHeader.slice(7));
    (req as any).userId = user.id;
    if (!req.path.startsWith('/v1/notifications')) {
      const resource = req.path.startsWith('/v1/comments') ? 'comments' : req.path.startsWith('/v1/approvals') ? 'approvals' : null;
      const resourceId = req.path.split('/')[3];
      let projectId = req.body?.project_id || req.query.project_id;
      if (resourceId && resource) {
        const row = await pool.query(`SELECT project_id FROM ${resource} WHERE id=$1`, [resourceId]);
        projectId = row.rows[0]?.project_id;
      }
      if (!projectId || user.projectId !== projectId) { res.status(403).json({ error: 'Forbidden' }); return; }
      const owner = await pool.query('SELECT id FROM projects WHERE id=$1 AND user_id=$2', [projectId, user.id]);
      if (!owner.rowCount) { res.status(403).json({ error: 'Forbidden' }); return; }
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'collaboration' });
});

app.get('/health/ready', async (_req, res) => {
  try { await Promise.all([pool.query('SELECT 1'), redis.ping()]); res.json({ status: 'ok' }); }
  catch { res.status(503).json({ status: 'unavailable' }); }
});

// REST routes
app.use('/api/v1/comments', commentsRouter);
app.use('/api/v1/approvals', approvalsRouter);
app.use('/api/v1/notifications', notificationsRouter);

// WebSocket setup
setupWebSocket(io);

// Subscribe to Redis notification channels and push to websocket clients
async function setupNotificationRelay(subscriber: ReturnType<typeof createClient>) {
  await subscriber.pSubscribe('notification:*', (message, channel) => {
    // channel format: notification:{userId}
    const userId = channel.split(':')[1];
    if (!userId) return;
    try {
      const notification = JSON.parse(message);
      // Find connected sockets for this user and emit
      const sockets = io.sockets.sockets;
      for (const [, socket] of sockets) {
        if ((socket as any).userId === userId) {
          socket.emit('notification:new', notification);
        }
      }
    } catch {
      // Invalid JSON, ignore
    }
  });
  console.log('Notification relay subscribed to Redis pub/sub');
}

async function start() {
  for (const key of ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'WEB_URL']) {
    if (!process.env[key]) throw new Error(`${key} is required`);
  }
  if (Buffer.byteLength(process.env.JWT_SECRET!) < 32) throw new Error('JWT_SECRET is too short');
  await redis.connect();
  console.log('Redis connected');

  // Create a separate Redis client for pub/sub subscription
  const subscriber = redis.duplicate();
  await subscriber.connect();
  await setupNotificationRelay(subscriber);

  await pool.query('SELECT 1');
  console.log('PostgreSQL connected');

  httpServer.listen(PORT, () => {
    console.log(`Collaboration service running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
