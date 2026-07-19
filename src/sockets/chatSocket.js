const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

// Menyimpan pemetaan userId -> socketId untuk status online (opsional dipakai frontend)
const onlineUsers = new Map();

function initChatSocket(io) {
  // Middleware autentikasi socket menggunakan JWT yang sama dengan REST API
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Token tidak ditemukan."));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Token tidak valid."));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;
    onlineUsers.set(userId, socket.id);

    // Room pribadi per user, dipakai juga untuk push notifikasi
    socket.join(`user:${userId}`);

    // Broadcast status online ke lawan bicara yang sedang terhubung
    socket.broadcast.emit("user:online", { userId });

    // Client mengirim pesan chat
    socket.on("chat:kirim", async ({ receiverId, pesan }, callback) => {
      try {
        if (!pesan || !pesan.trim()) {
          return callback?.({ success: false, message: "Pesan tidak boleh kosong." });
        }

        const chat = await prisma.chatMessage.create({
          data: { senderId: userId, receiverId, pesan },
        });

        // Kirim ke penerima jika sedang online
        io.to(`user:${receiverId}`).emit("chat:masuk", chat);
        // Konfirmasi ke pengirim (untuk sinkronisasi multi-device)
        io.to(`user:${userId}`).emit("chat:terkirim", chat);

        callback?.({ success: true, data: chat });
      } catch (err) {
        console.error(err);
        callback?.({ success: false, message: "Gagal mengirim pesan." });
      }
    });

    // Indikator sedang mengetik
    socket.on("chat:mengetik", ({ receiverId }) => {
      io.to(`user:${receiverId}`).emit("chat:mengetik", { userId });
    });

    // Tandai pesan sudah dibaca
    socket.on("chat:dibaca", async ({ lawanBicaraId }) => {
      try {
        await prisma.chatMessage.updateMany({
          where: { senderId: lawanBicaraId, receiverId: userId, dibaca: false },
          data: { dibaca: true },
        });
        io.to(`user:${lawanBicaraId}`).emit("chat:sudah-dibaca", { oleh: userId });
      } catch (err) {
        console.error(err);
      }
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      socket.broadcast.emit("user:offline", { userId });
    });
  });
}

module.exports = { initChatSocket, onlineUsers };
