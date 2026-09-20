import * as Y from 'yjs';
import type { Socket } from 'socket.io-client';
import { collaborationSocket } from './collaboration-socket';

export interface CollabSession {
  doc: Y.Doc;
  furnitureMap: Y.Map<unknown>;
  socket: Socket;
  destroy: () => void;
}

export function createCollabSession(projectId: string, _userId: string): CollabSession {
  const doc = new Y.Doc();
  const furnitureMap = doc.getMap('furniture');
  const socket = collaborationSocket(projectId);
  const updateHandler = (update: Uint8Array, origin: unknown) => {
    if (origin !== 'remote' && socket.connected) socket.emit('doc:update', { docId: projectId, update: Array.from(update) });
  };
  doc.on('update', updateHandler);
  socket.on('connect', () => {
    socket.emit('join:project', projectId);
    socket.emit('doc:join', projectId);
  });
  socket.on('doc:sync', (data: { docId: string; update: number[] }) => {
    if (data.docId !== projectId) return;
    Y.applyUpdate(doc, new Uint8Array(data.update), 'remote');
    socket.emit('doc:update', { docId: projectId, update: Array.from(Y.encodeStateAsUpdate(doc)) });
  });
  socket.on('doc:update', (data: { docId: string; update: number[] }) => {
    if (data.docId === projectId) Y.applyUpdate(doc, new Uint8Array(data.update), 'remote');
  });
  socket.connect();
  return { doc, furnitureMap, socket, destroy: () => {
    socket.removeAllListeners();
    socket.disconnect();
    doc.off('update', updateHandler);
    doc.destroy();
  } };
}
