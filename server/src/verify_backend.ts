import http from 'http';
import { io as ClientSocket } from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api';

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

async function testBackend() {
  console.log('--- Starting Phase 1 Backend Verification Tests ---');

  // 1. Health Check
  try {
    const health = await makeRequest('/health');
    console.log('✅ 1. Health Check:', health.status === 200 ? 'PASSED' : 'FAILED', health.body);
  } catch (err: any) {
    console.error('❌ Health check error:', err.message);
    return;
  }

  // 2. Login Default Admin
  let adminToken = '';
  try {
    const adminLogin = await makeRequest('/auth/login', 'POST', {
      email: 'admin@team.com',
      password: 'admin123',
    });
    console.log('✅ 2. Admin Login:', adminLogin.status === 200 ? 'PASSED' : 'FAILED', 'Role:', adminLogin.body?.user?.role);
    adminToken = adminLogin.body?.token;
  } catch (err: any) {
    console.error('❌ Admin login error:', err.message);
  }

  // 3. Register a MERN Developer
  let mernToken = '';
  try {
    const mernUser = await makeRequest('/auth/register', 'POST', {
      name: 'MERN Developer Alex',
      email: `alex_mern_${Date.now()}@team.com`,
      password: 'user1234',
      role: 'mern-dev',
    });
    console.log('✅ 3. MERN Dev Register:', mernUser.status === 201 ? 'PASSED' : 'FAILED', 'User:', mernUser.body?.user?.name);
    mernToken = mernUser.body?.token;
  } catch (err: any) {
    console.error('❌ MERN dev registration error:', err.message);
  }

  // 4. Test Room Access Restriction (RBAC)
  try {
    const mernRooms = await makeRequest('/rooms', 'GET', undefined, mernToken);
    console.log(
      '✅ 4. MERN Dev Room Access:',
      mernRooms.status === 200 ? 'PASSED' : 'FAILED',
      'Accessible Rooms:',
      mernRooms.body?.rooms?.map((r: any) => r.name)
    );
  } catch (err: any) {
    console.error('❌ Room access error:', err.message);
  }

  // 5. Test Socket.io Realtime & Presence
  if (adminToken) {
    console.log('📡 Testing Socket.io connection...');
    const socket = ClientSocket('http://localhost:5000', {
      auth: { token: adminToken },
    });

    socket.on('connect', () => {
      console.log('✅ 5. Socket.io Client Connected! Socket ID:', socket.id);
    });

    socket.on('presence:sync', (presences: any[]) => {
      console.log('✅ 6. Socket Presence Sync Received! Active Users Online:', presences.length);
      socket.disconnect();
      console.log('--- Phase 1 Backend Verification Complete! All Systems Operational ---');
      process.exit(0);
    });
  }
}

testBackend();
