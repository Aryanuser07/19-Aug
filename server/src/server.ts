import express, { Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import roomRoutes from './routes/roomRoutes';
import { seedDefaultRooms } from './controllers/roomController';
import { setupSocketHandlers } from './sockets/socketHandler';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim());

// Socket.io initialization with CORS & heartbeat config
const io = new SocketIOServer(server, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 10000, // 10s disconnect detection
  pingInterval: 5000, // 5s heartbeat ping
});

// Middleware
app.use(cors({ origin: CLIENT_ORIGINS, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Team Collaboration Platform API & Realtime Server',
  });
});

// Setup Socket.io Event Handlers
setupSocketHandlers(io);

// Start Server & Connect to DB
const startServer = async () => {
  await connectDB();
  await seedDefaultRooms();

  server.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`🚀 Team Collaboration Server is running on port ${PORT}`);
    console.log(`📡 Socket.io server listening for real-time events`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`===================================================`);
  });
};

startServer();
