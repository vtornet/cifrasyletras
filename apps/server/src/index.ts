import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { initDictionary } from './dictionary.js';
import { registerRoomHandlers, type AppServer, type AppSocket } from './rooms/index.js';

const wordCount = initDictionary();
console.log(`[dictionary] ${wordCount} palabras cargadas`);

const httpServer = createServer();
// TODO: restringir el origen CORS antes de desplegar a produccion (ver AGENTS.md #16).
const io: AppServer = new Server(httpServer, {
  cors: { origin: '*' },
});

io.on('connection', (socket: AppSocket) => {
  console.log(`[socket] cliente conectado: ${socket.id}`);
  registerRoomHandlers(io, socket);

  socket.on('disconnect', (reason) => {
    console.log(`[socket] cliente desconectado: ${socket.id} (${reason})`);
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
httpServer.listen(PORT, () => {
  console.log(`Servidor Socket.IO escuchando en http://localhost:${PORT}`);
});
