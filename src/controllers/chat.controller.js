const prisma = require("../config/db");

// GET /api/chat/kontak
// Admin: daftar semua penyewa aktif untuk dipilih chat
// Penyewa: daftar admin (biasanya cuma 1, tapi mendukung banyak admin)
async function getKontak(req, res) {
  try {
    let kontak;
    if (req.user.role === "ADMIN") {
      const penyewa = await prisma.penyewa.findMany({
        where: { aktif: true },
        include: { user: true, kamar: true },
      });
      kontak = penyewa.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        avatarUrl: p.user.avatarUrl,
        subtitle: p.kamar ? `Kamar ${p.kamar.nomorKamar}` : "Belum ada kamar",
      }));
    } else {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
      kontak = admins.map((a) => ({ id: a.id, name: a.name, avatarUrl: a.avatarUrl, subtitle: "Admin Kos" }));
    }

    // Tambahkan info pesan terakhir & jumlah belum dibaca per kontak
    const kontakLengkap = await Promise.all(
      kontak.map(async (k) => {
        const pesanTerakhir = await prisma.chatMessage.findFirst({
          where: {
            OR: [
              { senderId: req.user.id, receiverId: k.id },
              { senderId: k.id, receiverId: req.user.id },
            ],
          },
          orderBy: { createdAt: "desc" },
        });
        const belumDibaca = await prisma.chatMessage.count({
          where: { senderId: k.id, receiverId: req.user.id, dibaca: false },
        });
        return { ...k, pesanTerakhir, belumDibaca };
      })
    );

    res.json({ data: kontakLengkap });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil daftar kontak.", error: err.message });
  }
}

// GET /api/chat/:userId  -> riwayat percakapan dengan user tertentu
async function getRiwayat(req, res) {
  try {
    const { userId } = req.params;

    const pesan = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: req.user.id, receiverId: userId },
          { senderId: userId, receiverId: req.user.id },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    // Tandai pesan masuk sebagai sudah dibaca
    await prisma.chatMessage.updateMany({
      where: { senderId: userId, receiverId: req.user.id, dibaca: false },
      data: { dibaca: true },
    });

    res.json({ data: pesan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil riwayat chat.", error: err.message });
  }
}

// POST /api/chat/:userId  -> kirim pesan lewat REST (fallback jika socket gagal)
async function kirimPesan(req, res) {
  try {
    const { userId } = req.params;
    const { pesan } = req.body;

    if (!pesan || !pesan.trim()) {
      return res.status(400).json({ message: "Isi pesan tidak boleh kosong." });
    }

    const chat = await prisma.chatMessage.create({
      data: { senderId: req.user.id, receiverId: userId, pesan },
    });

    res.status(201).json({ data: chat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengirim pesan.", error: err.message });
  }
}

module.exports = { getKontak, getRiwayat, kirimPesan };
