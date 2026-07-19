const cron = require("node-cron");
const prisma = require("../config/db");
const { buatNotifikasi } = require("../controllers/notifikasi.controller");

// Membuat tagihan bulan berjalan jika belum ada, untuk semua penyewa aktif
async function pastikanTagihanBulanIni() {
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  const penyewaAktif = await prisma.penyewa.findMany({
    where: { aktif: true },
    include: { kamar: true },
  });

  for (const p of penyewaAktif) {
    if (!p.kamar) continue;

    const sudahAda = await prisma.pembayaran.findUnique({
      where: { penyewaId_bulan_tahun: { penyewaId: p.id, bulan, tahun } },
    });

    if (!sudahAda) {
      await prisma.pembayaran.create({
        data: { penyewaId: p.id, bulan, tahun, jumlah: p.kamar.harga, status: "BELUM_BAYAR" },
      });
    }
  }
}

// Cek setiap penyewa: kirim reminder H-3, hari-H, dan overdue
async function cekJatuhTempo() {
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();
  const tanggalHariIni = now.getDate();

  const tagihanBulanIni = await prisma.pembayaran.findMany({
    where: {
      bulan,
      tahun,
      status: { in: ["BELUM_BAYAR", "REJECTED"] },
    },
    include: { penyewa: { include: { user: true } } },
  });

  for (const tagihan of tagihanBulanIni) {
    const jatuhTempo = tagihan.penyewa.tanggalJatuhTempo || 1;
    const selisih = jatuhTempo - tanggalHariIni;

    if (selisih === 3) {
      await buatNotifikasi({
        userId: tagihan.penyewa.userId,
        judul: "Pengingat Pembayaran",
        pesan: `Jangan lupa, pembayaran kos bulan ${bulan}/${tahun} jatuh tempo dalam 3 hari lagi (tanggal ${jatuhTempo}).`,
        tipe: "REMINDER_3_HARI",
      });
    } else if (selisih === 0) {
      await buatNotifikasi({
        userId: tagihan.penyewa.userId,
        judul: "Jatuh Tempo Hari Ini",
        pesan: `Pembayaran kos bulan ${bulan}/${tahun} jatuh tempo hari ini. Segera lakukan pembayaran ya!`,
        tipe: "JATUH_TEMPO",
      });
    } else if (selisih < 0) {
      await buatNotifikasi({
        userId: tagihan.penyewa.userId,
        judul: "Pembayaran Terlambat",
        pesan: `Pembayaran kos bulan ${bulan}/${tahun} sudah melewati tanggal jatuh tempo. Mohon segera melakukan pembayaran.`,
        tipe: "TERLAMBAT",
      });
    }
  }
}

// Dijalankan setiap hari jam 08:00
function startCronJobs() {
  cron.schedule("0 8 * * *", async () => {
    try {
      console.log("[CRON] Menjalankan pengecekan tagihan & notifikasi harian...");
      await pastikanTagihanBulanIni();
      await cekJatuhTempo();
      console.log("[CRON] Selesai.");
    } catch (err) {
      console.error("[CRON] Gagal menjalankan job:", err);
    }
  });

  console.log("Cron job notifikasi aktif (berjalan setiap hari jam 08:00).");
}

module.exports = { startCronJobs, pastikanTagihanBulanIni, cekJatuhTempo };
