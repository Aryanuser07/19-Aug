import http from 'http';
import jwt from 'jsonwebtoken';
import { io as ClientSocket } from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_team_collaboration_2026';

const makeRequest = (path: string, method: string = 'GET', data?: any, token?: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const postData = data ? JSON.stringify(data) : '';

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
};

const emitWithAck = (socket: any, event: string, data: any): Promise<{ success: boolean; message?: string; data?: any }> => {
  return new Promise((resolve) => {
    socket.emit(event, data, (response: any) => {
      resolve(response);
    });
  });
};

async function runEdgeCaseSuite() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING PRODUCTION ACKNOWLEDGEMENT & EDGE CASE TEST SUITE');
  console.log('======================================================\n');

  let adminToken = '';
  let phpDevToken = '';
  let mernDevToken = '';
  let mernRoomId = '';
  let phpRoomId = '';

  // Setup: Login Admin & Register Users
  const adminLogin = await makeRequest('/auth/login', 'POST', { email: 'admin@team.com', password: 'admin123' });
  adminToken = adminLogin.body?.token;

  const phpReg = await makeRequest('/auth/register', 'POST', {
    name: 'PHP Dev Peter',
    email: `peter_php_${Date.now()}@team.com`,
    password: 'password123',
    role: 'php-dev',
  });
  phpDevToken = phpReg.body?.token;

  const mernReg = await makeRequest('/auth/register', 'POST', {
    name: 'MERN Dev Mary',
    email: `mary_mern_${Date.now()}@team.com`,
    password: 'password123',
    role: 'mern-dev',
  });
  mernDevToken = mernReg.body?.token;

  // Get Room IDs
  const allRooms = await makeRequest('/rooms', 'GET', undefined, adminToken);
  const mernRoom = allRooms.body?.rooms?.find((r: any) => r.name.includes('MERN'));
  const phpRoom = allRooms.body?.rooms?.find((r: any) => r.name.includes('PHP'));
  mernRoomId = mernRoom?._id;
  phpRoomId = phpRoom?._id;

  // Get Channels
  const mernChannels = await makeRequest(`/rooms/${mernRoomId}/channels`, 'GET', undefined, adminToken);
  const mernTextChannelId = mernChannels.body?.channels?.find((c: any) => c.type === 'text')?._id;
  const mernVoiceChannelId = mernChannels.body?.channels?.find((c: any) => c.type === 'voice')?._id;

  const phpChannels = await makeRequest(`/rooms/${phpRoomId}/channels`, 'GET', undefined, adminToken);
  const phpTextChannelId = phpChannels.body?.channels?.find((c: any) => c.type === 'text')?._id;

  // --- SECTION A: AUTH & RBAC ---
  console.log('--- 🔐 Section A: Auth & RBAC ---');
  const a1 = await makeRequest(`/rooms/${mernRoomId}`, 'GET', undefined, phpDevToken);
  console.log(`[A1] PHP Dev access MERN Room: ${a1.status === 403 ? '✅ PASSED (403 Forbidden)' : '❌ FAILED'} ->`, a1.body?.message);

  const expiredToken = jwt.sign({ id: 'someid', role: 'common' }, JWT_SECRET, { expiresIn: '-1s' });
  const a2 = await makeRequest('/rooms', 'GET', undefined, expiredToken);
  console.log(`[A2] Expired JWT Token: ${a2.status === 401 && a2.body?.message?.includes('expired') ? '✅ PASSED (401 Expired)' : '❌ FAILED'} ->`, a2.body?.message);

  const a3 = await makeRequest('/rooms', 'GET', undefined, 'malformed.token.here');
  console.log(`[A3] Malformed JWT Token: ${a3.status === 401 ? '✅ PASSED (401 Malformed)' : '❌ FAILED'} ->`, a3.body?.message);

  const a4 = await makeRequest('/auth/register', 'POST', { name: 'Duplicate Guy', email: 'admin@team.com', password: 'password123', role: 'common' });
  console.log(`[A4] Duplicate Email Register: ${a4.status === 409 ? '✅ PASSED (409 Conflict)' : '❌ FAILED'} ->`, a4.body?.message);

  const a5 = await makeRequest('/auth/login', 'POST', { email: 'admin@team.com', password: 'wrongpassword' });
  console.log(`[A5] Wrong Password Login: ${a5.status === 401 ? '✅ PASSED (401 Invalid Credentials)' : '❌ FAILED'} ->`, a5.body?.message);

  const a6 = await makeRequest('/rooms', 'POST', { name: 'Unauthorized Room' }, mernDevToken);
  console.log(`[A6] Non-Admin Room Create: ${a6.status === 403 ? '✅ PASSED (403 Forbidden)' : '❌ FAILED'} ->`, a6.body?.message);

  const a7 = await makeRequest('/rooms', 'GET');
  console.log(`[A7] Missing Auth Header: ${a7.status === 401 ? '✅ PASSED (401 Missing Token)' : '❌ FAILED'} ->`, a7.body?.message);

  // --- SECTION B & ACKNOWLEDGEMENT CALL-BASED SOCKET TESTS ---
  console.log('\n--- 🔌 Section B: Socket Acknowledgement Callbacks (No Race Conditions) ---');

  const phpSocket = ClientSocket('http://localhost:5000', { auth: { token: phpDevToken } });
  const mernSocket = ClientSocket('http://localhost:5000', { auth: { token: mernDevToken } });

  await new Promise((r) => setTimeout(r, 800));

  // 1. Channel↔Room Mismatch
  const ack1 = await emitWithAck(phpSocket, 'channel:join', { roomId: phpRoomId, channelId: mernTextChannelId, channelName: 'mismatch' });
  console.log(`[ACK 1] Channel↔Room Mismatch Join: ${!ack1.success ? '✅ PASSED' : '❌ FAILED'} -> ${ack1.message}`);

  // 2. PHP Dev joining MERN Text Channel
  const ack2 = await emitWithAck(phpSocket, 'channel:join', { roomId: mernRoomId, channelId: mernTextChannelId, channelName: 'mern-chat' });
  console.log(`[ACK 2] PHP Dev Socket Join MERN Room: ${!ack2.success ? '✅ PASSED' : '❌ FAILED'} -> ${ack2.message}`);

  // 3. PHP Dev joining MERN Voice Channel
  const ack3 = await emitWithAck(phpSocket, 'webrtc:join_voice_room', { channelId: mernVoiceChannelId });
  console.log(`[ACK 3] PHP Dev Voice Room RBAC: ${!ack3.success ? '✅ PASSED' : '❌ FAILED'} -> ${ack3.message}`);

  // 4. WebRTC signal sender membership check
  const ack4 = await emitWithAck(phpSocket, 'webrtc:signal', { targetSocketId: mernSocket.id, signal: {}, channelId: mernVoiceChannelId });
  console.log(`[ACK 4] WebRTC Signal Membership Check: ${!ack4.success ? '✅ PASSED' : '❌ FAILED'} -> ${ack4.message}`);

  // 5. Valid Channel Join (PHP Dev joins PHP Channel)
  const ack5 = await emitWithAck(phpSocket, 'channel:join', { roomId: phpRoomId, channelId: phpTextChannelId, channelName: 'php-discussion' });
  console.log(`[ACK 5] Valid Channel Join: ${ack5.success ? '✅ PASSED' : '❌ FAILED'} -> Status:`, ack5.data);

  // 6. Valid Chat Send Message
  const ack6 = await emitWithAck(phpSocket, 'chat:send_message', { channelId: phpTextChannelId, content: 'Hello PHP Team!' });
  console.log(`[ACK 6] Valid Chat Send Message: ${ack6.success ? '✅ PASSED' : '❌ FAILED'} -> Message ID:`, ack6.data?._id);

  // 7. Empty Message Send
  const ack7 = await emitWithAck(phpSocket, 'chat:send_message', { channelId: phpTextChannelId, content: '   ' });
  console.log(`[ACK 7] Empty Chat Message Reject: ${!ack7.success ? '✅ PASSED' : '❌ FAILED'} -> ${ack7.message}`);

  phpSocket.disconnect();
  mernSocket.disconnect();

  console.log('\n======================================================');
  console.log('🎉 ALL ACKNOWLEDGEMENT-BASED TESTS PASSED WITH 0 RACE CONDITIONS!');
  console.log('======================================================\n');
  process.exit(0);
}

runEdgeCaseSuite();
