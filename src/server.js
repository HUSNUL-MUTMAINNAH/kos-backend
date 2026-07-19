require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const { initChatSocket } = require("./sockets/chatSocket");
const { setSocketIO } = require("./controllers/notifikasi.controller");
const { startCronJobs } = require("./jobs/notifikasiCron");

const PORT = process.env.PORT || 5000;

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
  console.log(`Server backend berjalan di http://localhost:${PORT}`);
});
