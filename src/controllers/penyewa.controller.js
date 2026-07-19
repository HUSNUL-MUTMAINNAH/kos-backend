const bcrypt = require("bcryptjs");
const prisma = require("../config/db");

// Validation utility functions for penyewa controller
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  if (!password || password.length < 6 || password.length > 50) {
    return "Password harus memiliki minimal 6 karakter dan maksimal 50 karakter.";
  }
  return null;
}

function validateName(name) {
  if (!name || name.length < 3 || name.length > 100) {
    return "Nama harus memiliki minimal 3 karakter dan maksimal 100 karakter.";
  }
  return null;
}

function validatePhone(phone) {
  if (phone && (phone.length < 10 || phone.length > 12 || !/^\d+$/.test(phone))) {
    return "Nomor telepon harus berupa angka 10-12 digit.";
  }
  return null;
}

// GET /api/penyewa  (admin only)
async function getAllPenyewa(req, res) {
  try {
    const penyewa = await prisma.penyewa.findMany({
      include: { user: true, kamar: true },
      orderBy: { createdAt: "desc" },
    });

    const data = penyewa.map(({ user, ...rest }) => {
      const { password, ...userSafe } = user;
      return { ...rest, user: userSafe };
    });

    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data penyewa.", error: err.message });
  }
}

// GET /api/penyewa/:id
async function getPenyewaById(req, res) {
  try {
    const penyewa = await prisma.penyewa.findUnique({
      where: { id: req.params.id },
      include: { user: true, kamar: true, pembayaran: { orderBy: [{ tahun: "desc" }, { bulan: "desc" }] } },
    });
    if (!penyewa) return res.status(404).json({ message: "Penyewa tidak ditemukan." });

    // Ownership check: PENYEWA can only view their own data, ADMIN can view all
    if (req.user.role === "PENYEWA" && penyewa.userId !== req.user.id) {
      return res.status(403).json({ message: "Anda tidak memiliki akses ke data penyewa ini." });
    }

    const { password, ...userSafe } = penyewa.user;
    res.json({ data: { ...penyewa, user: userSafe } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data penyewa.", error: err.message });
  }
}

// POST /api/penyewa  (admin menambahkan penyewa baru)
async function createPenyewa(req, res) {
  try {
    const { name, email, password, phone, kamarId, tanggalMasuk, tanggalJatuhTempo } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Nama, email, dan password wajib diisi." });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Format email tidak valid." });
    }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    // Validate name
    const nameError = validateName(name);
    if (nameError) {
      return res.status(400).json({ message: nameError });
    }

    // Validate phone if provided
    if (phone) {
      const phoneError = validatePhone(phone);
      if (phoneError) {
        return res.status(400).json({ message: phoneError });
      }
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: "Email sudah terdaftar." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: hashedPassword,
        role: "PENYEWA",
        penyewa: {
          create: {
            kamarId: kamarId || null,
            tanggalMasuk: tanggalMasuk ? new Date(tanggalMasuk) : new Date(),
            tanggalJatuhTempo: tanggalJatuhTempo || 1,
          },
        },
      },
      include: { penyewa: true },
    });

    if (kamarId) {
      await prisma.kamar.update({ where: { id: kamarId }, data: { status: "TERISI" } });
    }

    const { password: _pw, ...userSafe } = user;
    res.status(201).json({ message: "Penyewa berhasil ditambahkan.", data: userSafe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menambahkan penyewa.", error: err.message });
  }
}

// PUT /api/penyewa/:id  (admin only)
async function updatePenyewa(req, res) {
  try {
    const { name, phone, kamarId, tanggalMasuk, tanggalKeluar, tanggalJatuhTempo, aktif } = req.body;

    // Validate name if provided
    if (name) {
      const nameError = validateName(name);
      if (nameError) {
        return res.status(400).json({ message: nameError });
      }
    }

    // Validate phone if provided
    if (phone) {
      const phoneError = validatePhone(phone);
      if (phoneError) {
        return res.status(400).json({ message: phoneError });
      }
    }

    const current = await prisma.penyewa.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: "Penyewa tidak ditemukan." });

    // Jika pindah kamar, kosongkan kamar lama & isi kamar baru
    if (kamarId && kamarId !== current.kamarId) {
      if (current.kamarId) {
        await prisma.kamar.update({ where: { id: current.kamarId }, data: { status: "KOSONG" } });
      }
      await prisma.kamar.update({ where: { id: kamarId }, data: { status: "TERISI" } });
    }

    const penyewa = await prisma.penyewa.update({
      where: { id: req.params.id },
      data: {
        kamarId,
        tanggalMasuk: tanggalMasuk ? new Date(tanggalMasuk) : undefined,
        tanggalKeluar: tanggalKeluar ? new Date(tanggalKeluar) : undefined,
        tanggalJatuhTempo,
        aktif,
      },
    });

    if (name || phone) {
      await prisma.user.update({ where: { id: current.userId }, data: { name, phone } });
    }

    res.json({ message: "Data penyewa berhasil diperbarui.", data: penyewa });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal memperbarui penyewa.", error: err.message });
  }
}

// DELETE /api/penyewa/:id  (admin only)
async function deletePenyewa(req, res) {
  try {
    const penyewa = await prisma.penyewa.findUnique({ where: { id: req.params.id } });
    if (!penyewa) return res.status(404).json({ message: "Penyewa tidak ditemukan." });

    if (penyewa.kamarId) {
      await prisma.kamar.update({ where: { id: penyewa.kamarId }, data: { status: "KOSONG" } });
    }

    // Menghapus user akan cascade menghapus data penyewa terkait
    await prisma.user.delete({ where: { id: penyewa.userId } });

    res.json({ message: "Penyewa berhasil dihapus." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menghapus penyewa.", error: err.message });
  }
}

module.exports = { getAllPenyewa, getPenyewaById, createPenyewa, updatePenyewa, deletePenyewa };
