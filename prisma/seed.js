// Jalankan dengan: npm run seed
// Membuat akun admin default + beberapa contoh kamar + pembayaran

require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@kost.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        name: "Admin Kos",
        email: adminEmail,
        password: hashedPassword,
        role: "ADMIN",
        phone: "081234567890",
      },
    });
    console.log(`Akun admin dibuat -> email: ${adminEmail} | password: admin123`);
  } else {
    console.log("Akun admin sudah ada, dilewati.");
  }

  const jumlahKamar = await prisma.kamar.count();
  if (jumlahKamar === 0) {
    await prisma.kamar.createMany({
      data: [
        { nomorKamar: "A1", tipe: "Standard", harga: 1000000, fasilitas: "Kasur, Lemari, Kipas Angin", status: "KOSONG" },
        { nomorKamar: "A2", tipe: "Standard", harga: 1000000, fasilitas: "Kasur, Lemari, Kipas Angin", status: "KOSONG" },
        { nomorKamar: "B1", tipe: "Deluxe", harga: 1500000, fasilitas: "Kasur, Lemari, AC, Kamar Mandi Dalam", status: "KOSONG" },
        { nomorKamar: "B2", tipe: "Deluxe", harga: 1500000, fasilitas: "Kasur, Lemari, AC, Kamar Mandi Dalam", status: "KOSONG" },
      ],
    });
    console.log("4 contoh kamar berhasil dibuat.");
  }

  // Create pembayaran untuk semua penyewa
  const penyewas = await prisma.penyewa.findMany({
    include: { kamar: true },
  });

  const now = new Date();
  const bulanIni = now.getMonth() + 1;
  const tahunIni = now.getFullYear();

  for (const penyewa of penyewas) {
    if (!penyewa.kamar) continue;

    // Buat pembayaran untuk bulan ini jika belum ada
    const existing = await prisma.pembayaran.findUnique({
      where: { penyewaId_bulan_tahun: { penyewaId: penyewa.id, bulan: bulanIni, tahun: tahunIni } },
    });

    if (!existing) {
      await prisma.pembayaran.create({
        data: {
          penyewaId: penyewa.id,
          bulan: bulanIni,
          tahun: tahunIni,
          jumlah: penyewa.kamar.harga,
          status: "BELUM_BAYAR",
        },
      });
      console.log(`Pembayaran bulan ${bulanIni}/${tahunIni} dibuat untuk penyewa ${penyewa.id}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

