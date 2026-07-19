const { PrismaClient } = require("@prisma/client");

// Singleton Prisma Client supaya tidak membuat koneksi baru berulang-ulang
const prisma = new PrismaClient();

module.exports = prisma;
