const prisma = require("../config/db");

let ioInstance = null;
// Dipanggil sekali dari server.js supaya controller ini bisa emit event socket
function setSocketIO(io) {
  ioInstance = io;
}

// Helper internal: dipakai oleh controller lain (pembayaran, chat, cron) untuk membuat notifikasi
async function buatNotifikasi({ userId, judul, pesan, tipe }) {
  const notif = await prisma.notifikasi.create({
    data: { userId, judul, pesan, tipe },
  });

  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit("notifikasi:baru", notif);
  }

  return notif;
}

// GET /api/notifikasi  (milik user yang sedang login)
async function getMyNotifikasi(req, res) {
  try {
    const notifikasi = await prisma.notifikasi.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const jumlahBelumDibaca = await prisma.notifikasi.count({
      where: { userId: req.user.id, dibaca: false },
    });

    res.json({ data: notifikasi, jumlahBelumDibaca });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil notifikasi.", error: err.message });
  }
}

// PATCH /api/notifikasi/:id/baca
async function tandaiDibaca(req, res) {
  try {
    const notif = await prisma.notifikasi.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { dibaca: true },
    });
    res.json({ message: "Notifikasi ditandai sudah dibaca.", count: notif.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal memperbarui notifikasi.", error: err.message });
  }
}

// PATCH /api/notifikasi/baca-semua
async function tandaiSemuaDibaca(req, res) {
  try {
    await prisma.notifikasi.updateMany({
      where: { userId: req.user.id, dibaca: false },
      data: { dibaca: true },
    });
    res.json({ message: "Semua notifikasi ditandai sudah dibaca." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal memperbarui notifikasi.", error: err.message });
  }
}

module.exports = { setSocketIO, buatNotifikasi, getMyNotifikasi, tandaiDibaca, tandaiSemuaDibaca };
