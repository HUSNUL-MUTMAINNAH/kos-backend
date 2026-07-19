const { PrismaClient } = require("@prisma/client");

// Singleton Prisma Client supaya tidak membuat koneksi baru berulang-ulang
let prisma;

try {
  prisma = new PrismaClient();
} catch (error) {
  console.error("Prisma initialization error:", error);
  prisma = null;
}

module.exports = prisma;
