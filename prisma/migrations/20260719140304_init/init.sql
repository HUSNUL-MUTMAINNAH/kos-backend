-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PENYEWA');

-- CreateEnum
CREATE TYPE "StatusKamar" AS ENUM ('KOSONG', 'TERISI');

-- CreateEnum
CREATE TYPE "StatusPembayaran" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'BELUM_BAYAR');

-- CreateEnum
CREATE TYPE "TipeNotifikasi" AS ENUM ('REMINDER_3_HARI', 'JATUH_TEMPO', 'TERLAMBAT', 'PEMBAYARAN_DIACC', 'PEMBAYARAN_DITOLAK', 'PESAN_BARU', 'INFO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'PENYEWA',
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kamar" (
    "id" TEXT NOT NULL,
    "nomor_kamar" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "harga" DECIMAL(12,2) NOT NULL,
    "fasilitas" TEXT,
    "deskripsi" TEXT,
    "foto_url" TEXT,
    "status" "StatusKamar" NOT NULL DEFAULT 'KOSONG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kamar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penyewa" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kamar_id" TEXT,
    "tanggal_masuk" TIMESTAMP(3) NOT NULL,
    "tanggal_keluar" TIMESTAMP(3),
    "tanggal_jatuh_tempo" INTEGER NOT NULL DEFAULT 1,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "penyewa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pembayaran" (
    "id" TEXT NOT NULL,
    "penyewa_id" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jumlah" DECIMAL(12,2) NOT NULL,
    "status" "StatusPembayaran" NOT NULL DEFAULT 'BELUM_BAYAR',
    "bukti_url" TEXT,
    "tanggal_bayar" TIMESTAMP(3),
    "tanggal_review" TIMESTAMP(3),
    "catatan_admin" TEXT,
    "input_manual" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifikasi" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "pesan" TEXT NOT NULL,
    "tipe" "TipeNotifikasi" NOT NULL DEFAULT 'INFO',
    "dibaca" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "pesan" TEXT NOT NULL,
    "dibaca" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "kamar_nomor_kamar_key" ON "kamar"("nomor_kamar");

-- CreateIndex
CREATE UNIQUE INDEX "penyewa_user_id_key" ON "penyewa"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pembayaran_penyewa_id_bulan_tahun_key" ON "pembayaran"("penyewa_id", "bulan", "tahun");

-- AddForeignKey
ALTER TABLE "penyewa" ADD CONSTRAINT "penyewa_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penyewa" ADD CONSTRAINT "penyewa_kamar_id_fkey" FOREIGN KEY ("kamar_id") REFERENCES "kamar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran" ADD CONSTRAINT "pembayaran_penyewa_id_fkey" FOREIGN KEY ("penyewa_id") REFERENCES "penyewa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
