const prisma = require("../config/db");
const { buatNotifikasi } = require("./notifikasi.controller");

// Validation utility functions for pembayaran
function validateBulan(bulan) {
  const bulanNum = parseInt(bulan);
  if (isNaN(bulanNum) || bulanNum < 1 || bulanNum > 12) {
    return "Bulan harus berupa angka 1-12.";
  }
  return null;
}

function validateTahun(tahun) {
  const tahunNum = parseInt(tahun);
  const currentYear = new Date().getFullYear();
  if (isNaN(tahunNum) || tahunNum < 2000 || tahunNum > currentYear + 1) {
    return "Tahun harus berupa angka yang valid (2000 atau lebih besar dan tidak lebih dari tahun depan).";
  }
  return null;
}

function validateJumlah(jumlah) {
  const jumlahNum = Number(jumlah);
  if (isNaN(jumlahNum) || jumlahNum <= 0) {
    return "Jumlah harus berupa angka positif.";
  }
  return null;
}

// GET /api/pembayaran  (admin: semua data, penyewa: hanya miliknya)
async function getAllPembayaran(req, res) {
  try {
    let where = {};

    if (req.user.role === "PENYEWA") {
      const penyewa = await prisma.penyewa.findUnique({ where: { userId: req.user.id } });
      if (!penyewa) return res.status(404).json({ message: "Data penyewa tidak ditemukan." });
      where.penyewaId = penyewa.id;
    } else if (req.query.status) {
      where.status = req.query.status;
    }

    const pembayaran = await prisma.pembayaran.findMany({
      where,
      include: { penyewa: { include: { user: true, kamar: true } } },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
    });

    res.json({ data: pembayaran });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data pembayaran.", error: err.message });
  }
}

// GET /api/pembayaran/:id
async function getPembayaranById(req, res) {
  try {
    const pembayaran = await prisma.pembayaran.findUnique({
      where: { id: req.params.id },
      include: { penyewa: { include: { user: true, kamar: true } } },
    });
    if (!pembayaran) return res.status(404).json({ message: "Data pembayaran tidak ditemukan." });
    res.json({ data: pembayaran });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data pembayaran.", error: err.message });
  }
}

// POST /api/pembayaran  (admin: buat tagihan bulanan / input manual pembayaran lunas)
async function createPembayaran(req, res) {
  try {
    const { penyewaId, bulan, tahun, jumlah, inputManual, status } = req.body;

    if (!penyewaId || !bulan || !tahun || !jumlah) {
      return res.status(400).json({ message: "Penyewa, bulan, tahun, dan jumlah wajib diisi." });
    }

    // Validate bulan
    const bulanError = validateBulan(bulan);
    if (bulanError) {
      return res.status(400).json({ message: bulanError });
    }

    // Validate tahun
    const tahunError = validateTahun(tahun);
    if (tahunError) {
      return res.status(400).json({ message: tahunError });
    }

    // Validate jumlah
    const jumlahError = validateJumlah(jumlah);
    if (jumlahError) {
      return res.status(400).json({ message: jumlahError });
    }

    // Validate that penyewaId exists
    const penyewa = await prisma.penyewa.findUnique({ where: { id: penyewaId } });
    if (!penyewa) {
      return res.status(404).json({ message: "Penyewa dengan ID tersebut tidak ditemukan." });
    }

    const pembayaran = await prisma.pembayaran.create({
      data: {
        penyewaId,
        bulan: parseInt(bulan),
        tahun: parseInt(tahun),
        jumlah: Number(jumlah),
        inputManual: !!inputManual,
        // Jika inputManual true = langsung APPROVED (lunas)
        // Jika inputManual false = BELUM_BAYAR (penyewa harus upload bukti)
        status: inputManual ? "APPROVED" : "BELUM_BAYAR",
        tanggalBayar: inputManual ? new Date() : null,
        tanggalReview: inputManual ? new Date() : null,
      },
    });

    if (inputManual) {
      await buatNotifikasi({
        userId: penyewa.userId,
        judul: "Pembayaran Dicatat Lunas",
        pesan: `Pembayaran bulan ${bulan}/${tahun} sebesar Rp${Number(jumlah).toLocaleString("id-ID")} telah dicatat oleh admin sebagai lunas.`,
        tipe: "PEMBAYARAN_DIACC",
      });
    }

    res.status(201).json({ message: "Data pembayaran berhasil dibuat.", data: pembayaran });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Tagihan untuk bulan/tahun tersebut sudah ada." });
    }
    console.error(err);
    res.status(500).json({ message: "Gagal membuat data pembayaran.", error: err.message });
  }
}

// POST /api/pembayaran/:id/upload-bukti  (penyewa upload / reupload bukti bayar)
async function uploadBukti(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "File bukti pembayaran wajib diunggah." });

    const pembayaran = await prisma.pembayaran.findUnique({ where: { id: req.params.id } });
    if (!pembayaran) return res.status(404).json({ message: "Data pembayaran tidak ditemukan." });

    const buktiUrl = `/uploads/${req.file.filename}`;

    const updated = await prisma.pembayaran.update({
      where: { id: req.params.id },
      data: {
        buktiUrl,
        status: "PENDING",
        tanggalBayar: new Date(),
        catatanAdmin: null,
      },
    });

    // Beri tahu semua admin ada bukti baru untuk direview
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    await Promise.all(
      admins.map((admin) =>
        buatNotifikasi({
          userId: admin.id,
          judul: "Bukti Pembayaran Baru",
          pesan: `Ada bukti pembayaran baru untuk bulan ${pembayaran.bulan}/${pembayaran.tahun} yang menunggu review.`,
          tipe: "INFO",
        })
      )
    );

    res.json({ message: "Bukti pembayaran berhasil diunggah, menunggu review admin.", data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengunggah bukti pembayaran.", error: err.message });
  }
}

// PATCH /api/pembayaran/:id/review  (admin ACC atau tolak)
async function reviewPembayaran(req, res) {
  try {
    const { status, catatanAdmin } = req.body; // status: APPROVED | REJECTED

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Status review harus APPROVED atau REJECTED." });
    }

    const pembayaran = await prisma.pembayaran.update({
      where: { id: req.params.id },
      data: { status, catatanAdmin, tanggalReview: new Date() },
      include: { penyewa: true },
    });

    await buatNotifikasi({
      userId: pembayaran.penyewa.userId,
      judul: status === "APPROVED" ? "Pembayaran Disetujui" : "Pembayaran Ditolak",
      pesan:
        status === "APPROVED"
          ? `Pembayaran bulan ${pembayaran.bulan}/${pembayaran.tahun} telah disetujui. Terima kasih!`
          : `Pembayaran bulan ${pembayaran.bulan}/${pembayaran.tahun} ditolak. Alasan: ${catatanAdmin || "-"}. Silakan unggah ulang bukti pembayaran.`,
      tipe: status === "APPROVED" ? "PEMBAYARAN_DIACC" : "PEMBAYARAN_DITOLAK",
    });

    res.json({ message: `Pembayaran berhasil di-${status === "APPROVED" ? "ACC" : "tolak"}.`, data: pembayaran });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mereview pembayaran.", error: err.message });
  }
}

// DELETE /api/pembayaran/:id  (admin only)
async function deletePembayaran(req, res) {
  try {
    await prisma.pembayaran.delete({ where: { id: req.params.id } });
    res.json({ message: "Data pembayaran berhasil dihapus." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menghapus data pembayaran.", error: err.message });
  }
}

module.exports = {
  getAllPembayaran,
  getPembayaranById,
  createPembayaran,
  uploadBukti,
  reviewPembayaran,
  deletePembayaran,
};
