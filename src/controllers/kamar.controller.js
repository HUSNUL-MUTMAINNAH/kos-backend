const prisma = require("../config/db");

// GET /api/kamar
async function getAllKamar(req, res) {
  try {
    const kamar = await prisma.kamar.findMany({
      orderBy: { nomorKamar: "asc" },
      include: { penyewa: { include: { user: true }, where: { aktif: true } } },
    });
    res.json({ data: kamar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data kamar.", error: err.message });
  }
}

// GET /api/kamar/:id
async function getKamarById(req, res) {
  try {
    const kamar = await prisma.kamar.findUnique({
      where: { id: req.params.id },
      include: { penyewa: { include: { user: true } } },
    });
    if (!kamar) return res.status(404).json({ message: "Kamar tidak ditemukan." });
    res.json({ data: kamar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data kamar.", error: err.message });
  }
}

// POST /api/kamar  (admin only)
async function createKamar(req, res) {
  try {
    const { nomorKamar, tipe, harga, fasilitas, deskripsi, fotoUrl, status } = req.body;

    if (!nomorKamar || !tipe || !harga) {
      return res.status(400).json({ message: "Nomor kamar, tipe, dan harga wajib diisi." });
    }

    const kamar = await prisma.kamar.create({
      data: { nomorKamar, tipe, harga, fasilitas, deskripsi, fotoUrl, status: status || "KOSONG" },
    });

    res.status(201).json({ message: "Kamar berhasil ditambahkan.", data: kamar });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Nomor kamar sudah digunakan." });
    }
    console.error(err);
    res.status(500).json({ message: "Gagal menambahkan kamar.", error: err.message });
  }
}

// PUT /api/kamar/:id  (admin only)
async function updateKamar(req, res) {
  try {
    const { nomorKamar, tipe, harga, fasilitas, deskripsi, fotoUrl, status } = req.body;

    const kamar = await prisma.kamar.update({
      where: { id: req.params.id },
      data: { nomorKamar, tipe, harga, fasilitas, deskripsi, fotoUrl, status },
    });

    res.json({ message: "Kamar berhasil diperbarui.", data: kamar });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Kamar tidak ditemukan." });
    }
    console.error(err);
    res.status(500).json({ message: "Gagal memperbarui kamar.", error: err.message });
  }
}

// DELETE /api/kamar/:id  (admin only)
async function deleteKamar(req, res) {
  try {
    await prisma.kamar.delete({ where: { id: req.params.id } });
    res.json({ message: "Kamar berhasil dihapus." });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Kamar tidak ditemukan." });
    }
    console.error(err);
    res.status(500).json({ message: "Gagal menghapus kamar. Pastikan kamar tidak sedang ditempati.", error: err.message });
  }
}

module.exports = { getAllKamar, getKamarById, createKamar, updateKamar, deleteKamar };
