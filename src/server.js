require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const { initChatSocket } = require("./sockets/chatSocket");
const { setSocketIO } = require("./controllers/notifikasi.controller");
const { startCronJobs } = require("./jobs/notifikasiCron");

const PORT = process.env.PORT || 5000;

// Diagnostic logging
console.log("🚀 Server startup diagnostics:");
console.log(`✓ NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`✓ PORT: ${PORT}`);
console.log(`✓ DATABASE_URL: ${process.env.DATABASE_URL ? '✅ SET' : '❌ MISSING'}`);
console.log(`✓ JWT_SECRET: ${process.env.JWT_SECRET ? '✅ SET' : '❌ MISSING'}`);
console.log(`✓ FRONTEND_URL: ${process.env.FRONTEND_URL ? '✅ SET (' + process.env.FRONTEND_URL + ')' : '❌ MISSING'}`);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: false,
  },
});

initChatSocket(io);
setSocketIO(io); // supaya controller notifikasi & pembayaran bisa push realtime

startCronJobs();

server.listen(PORT, () => {
  console.log(`✅ Server backend berjalan di http://localhost:${PORT}`);
});
