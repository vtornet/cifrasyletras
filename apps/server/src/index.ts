import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { initDictionary } from './dictionary.js';
import { registerRoomHandlers, type AppServer, type AppSocket } from './rooms/index.js';

const wordCount = initDictionary();
console.log(`[dictionary] ${wordCount} palabras cargadas`);

const httpServer = createServer();
// CLIENT_ORIGIN restringe CORS al dominio real de apps/web en produccion (ver AGENTS.md #16);
// sin definir (desarrollo local) se admite cualquier origen.
const clientOrigin = process.env.CLIENT_ORIGIN;
const io: AppServer = new Server(httpServer, {
  cors: { origin: clientOrigin ?? '*' },
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
