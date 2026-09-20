import { Server as SocketIOServer, Socket } from 'socket.io';
import * as Y from 'yjs';
import { pool } from '../index';

// In-memory Y.js documents keyed by document ID
const documents = new Map<string, Y.Doc>();
const loading = new Map<string, Promise<Y.Doc>>();

async function getOrCreateDoc(docId: string): Promise<Y.Doc> {
  const existing = documents.get(docId);
  if (existing) return existing;
  let pending = loading.get(docId);
  if (!pending) {
    pending = loadDoc(docId).finally(() => loading.delete(docId));
    loading.set(docId, pending);
  }
  return pending;
}

async function loadDoc(docId: string): Promise<Y.Doc> {
  let doc = documents.get(docId);
  if (doc) return doc;

  doc = new Y.Doc();

  // Try to load persisted state from PostgreSQL
  try {
    const result = await pool.query(
      'SELECT state FROM yjs_documents WHERE doc_id = $1',
      [docId],
    );
    if (result.rows.length > 0 && result.rows[0].state) {
      Y.applyUpdate(doc, new Uint8Array(result.rows[0].state));
    }
  } catch (error) {
    doc.destroy();
    throw error;
  }

  // Persist on updates (debounced)
  let saveTimeout: NodeJS.Timeout | null = null;
  doc.on('update', () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        const state = Buffer.from(Y.encodeStateAsUpdate(doc!));
        await pool.query(
          `INSERT INTO yjs_documents (doc_id, state, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (doc_id) DO UPDATE SET state = $2, updated_at = NOW()`,
          [docId, state],
        );
      } catch (err) {
        console.error('Failed to persist Y.js document:', err);
      }
    }, 1000);
  });

  documents.set(docId, doc);
  return doc;
}

export function setupDocumentRooms(socket: Socket, io: SocketIOServer) {
  socket.on('doc:join', async (docId: string) => {
    try {
      const doc = await getOrCreateDoc(docId);
      await socket.join(`doc:${docId}`);
      socket.emit('doc:sync', { docId, update: Array.from(Y.encodeStateAsUpdate(doc)) });
    } catch { socket.emit('access:error', { error: 'Document unavailable' }); }
  });

  socket.on('doc:update', async (data: { docId: string; update: number[] }) => {
    if (!socket.rooms.has(`doc:${data.docId}`) || !Array.isArray(data.update) || data.update.length > 500000) return;
    const doc = await getOrCreateDoc(data.docId);
    const update = new Uint8Array(data.update);
    try { Y.applyUpdate(doc, update); } catch { socket.emit('access:error', { error: 'Invalid document update' }); return; }

    // Broadcast to others in the document room
    socket.to(`doc:${data.docId}`).emit('doc:update', {
      docId: data.docId,
      update: data.update,
    });
  });

  socket.on('doc:leave', (docId: string) => {
    socket.leave(`doc:${docId}`);
  });
}
