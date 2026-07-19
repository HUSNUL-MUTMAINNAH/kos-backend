const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const { generateToken } = require("../utils/jwt");

// Validation utility functions
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

// POST /api/auth/register  -> registrasi mandiri untuk PENYEWA
async function register(req, res) {
  try {
    console.log("=== REGISTER REQUEST ===");
    console.log("Body:", req.body);
    const { name, email, password, phone, tanggalMasuk, kamarId } = req.body;

    // Input validation
    if (!name || !email || !password) {
      console.log("❌ Validation failed: Missing required fields");
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
    if (existing) {
      console.log("❌ Email already exists:", email);
      return res.status(409).json({ message: "Email sudah terdaftar." });
    }

    console.log("✅ Email valid, creating user...");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Use Prisma transaction to ensure atomicity
    const user = await prisma.$transaction(async (tx) => {
      console.log("  → Creating user...");
      // Create user
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone: phone || null,
          role: "PENYEWA",
        },
      });
      console.log("  ✅ User created:", newUser.id);

      // Create penyewa
      console.log("  → Creating penyewa...");
      const penyewa = await tx.penyewa.create({
        data: {
          userId: newUser.id,
          tanggalMasuk: tanggalMasuk ? new Date(tanggalMasuk) : new Date(),
          kamarId: kamarId || null,
        },
      });
      console.log("  ✅ Penyewa created:", penyewa.id);

      // Update kamar status if kamarId provided
      if (kamarId) {
        console.log("  → Updating kamar status...");
        await tx.kamar.update({
          where: { id: kamarId },
          data: { status: "TERISI" },
        });
        console.log("  ✅ Kamar updated");
      }

      return { ...newUser, penyewa: [penyewa] };
    });

    console.log("✅ Registration successful! User ID:", user.id);
    const token = generateToken(user);
    const { password: _pw, ...userSafe } = user;

    res.status(201).json({ message: "Registrasi berhasil.", token, user: userSafe });
  } catch (err) {
    console.error("❌ REGISTER ERROR:", err);
    res.status(500).json({ message: "Terjadi kesalahan saat registrasi.", error: err.message });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email dan password wajib diisi." });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { penyewa: { include: { kamar: true } } },
    });

    if (!user) {
      return res.status(401).json({ message: "Email atau password salah." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Email atau password salah." });
    }

    const token = generateToken(user);
    const { password: _pw, ...userSafe } = user;

    res.json({ message: "Login berhasil.", token, user: userSafe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan saat login.", error: err.message });
  }
}

// GET /api/auth/me
async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { penyewa: { include: { kamar: true } } },
    });

    if (!user) return res.status(404).json({ message: "User tidak ditemukan." });

    const { password: _pw, ...userSafe } = user;
    res.json({ user: userSafe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil profil.", error: err.message });
  }
}

// PATCH /api/auth/me  -> update profil sendiri (nama, phone, avatar)
async function updateMe(req, res) {
  try {
    const { name, phone, avatarUrl } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, phone, avatarUrl },
    });

    const { password: _pw, ...userSafe } = user;
    res.json({ message: "Profil berhasil diperbarui.", user: userSafe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal memperbarui profil.", error: err.message });
  }
}

// POST /api/auth/upload-avatar -> upload foto profil
async function uploadAvatar(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "File gambar wajib diunggah." });

    const avatarUrl = `/uploads/${req.file.filename}`;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl },
    });

    const { password: _pw, ...userSafe } = user;
    res.json({ message: "Avatar berhasil diperbarui.", user: userSafe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengunggah avatar.", error: err.message });
  }
}

module.exports = { register, login, me, updateMe, uploadAvatar };
