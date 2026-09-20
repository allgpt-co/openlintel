const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { io } = require('socket.io-client');
const Y = require('yjs');
const postgres = require('../../../packages/db/node_modules/postgres');
const sql = postgres(process.env.DATABASE_URL);
const sockets = [];
function token(sub, projectId, overrides = {}) {
  const now = Math.floor(Date.now()/1000);
  const head = Buffer.from(JSON.stringify({ alg:'HS256', typ:'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ sub, projectId, iss:'openlintel-web', aud:'openlintel-collaboration', iat:now, exp:now+300, ...overrides })).toString('base64url');
  return `${head}.${body}.${createHmac('sha256',process.env.JWT_SECRET).update(`${head}.${body}`).digest('base64url')}`;
}
function event(socket, name) {
  return new Promise((resolve,reject) => { const timeout=setTimeout(()=>reject(new Error(`Timeout: ${name}`)),5000); socket.once(name, value=>{clearTimeout(timeout);resolve(value);}); });
}
function client(t) { const s=io('http://127.0.0.1:8009',{auth:{token:t},autoConnect:false,reconnection:false});sockets.push(s);return s; }
async function connect(t) { const s=client(t);const ready=event(s,'connect');s.connect();await ready;return s; }
(async()=>{
  if (process.argv.includes('--restore')) {
    const socket = await connect(token('ci-owner','ci-project'));
    const synced = event(socket,'doc:sync');
    socket.emit('doc:join','ci-project');
    const restored = new Y.Doc();
    Y.applyUpdate(restored,new Uint8Array((await synced).update));
    assert.equal(restored.getMap('furniture').get('sofa').name,'Smoke sofa');
    console.log('Collaboration document restored after service restart');
    return;
  }
  await sql`insert into users(id,name,email) values('ci-owner','CI Owner','ci-owner@example.test'),('ci-other','CI Other','ci-other@example.test') on conflict do nothing`;
  await sql`insert into projects(id,user_id,name) values('ci-project','ci-owner','CI Project'),('ci-private','ci-other','CI Private') on conflict do nothing`;
  for(const t of ['',token('ci-owner','ci-project',{exp:1}),token('ci-owner','ci-project',{aud:'wrong'})]){
    const s=client(t);const denied=event(s,'connect_error');s.connect();await denied;s.disconnect();
  }
  const a=await connect(token('ci-owner','ci-project'));
  const b=await connect(token('ci-owner','ci-project'));
  const aSync=event(a,'doc:sync');a.emit('doc:join','ci-project');await aSync;
  const bSync=event(b,'doc:sync');b.emit('doc:join','ci-project');await bSync;
  const denied=event(a,'access:error');a.emit('doc:join','ci-private');await denied;
  const doc=new Y.Doc();doc.getMap('furniture').set('sofa',{name:'Smoke sofa'});
  const received=event(b,'doc:update');a.emit('doc:update',{docId:'ci-project',update:Array.from(Y.encodeStateAsUpdate(doc))});
  const remote=new Y.Doc();Y.applyUpdate(remote,new Uint8Array((await received).update));assert.equal(remote.getMap('furniture').get('sofa').name,'Smoke sofa');
  await new Promise(resolve=>setTimeout(resolve,1800));
  const rows=await sql`select state from yjs_documents where doc_id='ci-project'`;
  assert.equal(rows.length,1);const stored=new Y.Doc();Y.applyUpdate(stored,Buffer.from(rows[0].state,'base64'));assert.equal(stored.getMap('furniture').get('sofa').name,'Smoke sofa');
  // A correctly signed token still cannot grant access to somebody else's project.
  const c=await connect(token('ci-other','ci-project'));const ownerDenied=event(c,'access:error');c.emit('doc:join','ci-project');await ownerDenied;
  console.log('Collaboration identity, scope, sync and persistence passed');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{for(const s of sockets)s.disconnect();await sql.end();});
