import http from 'node:http';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@showup/shared';
import { RoomManager } from './room/RoomManager.js';
import { setupSocketHandlers } from './socket/setupSocketHandlers.js';

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const server = http.createServer((req, res) => {
  // Simple health check endpoint
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'Showup Multiplayer Server' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: [CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const roomManager = new RoomManager();
setupSocketHandlers(io, roomManager);

server.listen(PORT, () => {
  console.log(`[Showup Server] Running on http://localhost:${PORT}`);
  console.log(`[Showup Server] Accepting client connections from ${CLIENT_URL}`);
});
