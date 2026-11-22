'use strict';
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const server = createApp();

server.listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({ level: 'info', message: `tienda-api escuchando en el puerto ${PORT}` }));
});

// Apagado ordenado: importante para que un despliegue no corte peticiones en curso.
function shutdown(signal) {
  console.log(JSON.stringify({ level: 'info', message: `${signal} recibido, cerrando` }));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
