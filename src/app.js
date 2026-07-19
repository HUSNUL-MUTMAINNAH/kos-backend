const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const kamarRoutes = require("./routes/kamar.routes");
const penyewaRoutes = require("./routes/penyewa.routes");
const pembayaranRoutes = require("./routes/pembayaran.routes");
const notifikasiRoutes = require("./routes/notifikasi.routes");
const chatRoutes = require("./routes/chat.routes");

const app = express();

// CORS configuration - accept all origins for Vercel deployments
app.use(
  cors({
    origin: "*",
    credentials: false,
  })
);

// Log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Folder statis untuk melayani file upload (bukti pembayaran, foto kamar, avatar)
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Kos API berjalan dengan baik." });
});

app.post("/api/test-register", (req, res) => {
  console.log("=== TEST REGISTER ===");
  console.log("Body received:", req.body);
  res.json({ received: req.body, timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/kamar", kamarRoutes);
app.use("/api/penyewa", penyewaRoutes);
app.use("/api/pembayaran", pembayaranRoutes);
app.use("/api/notifikasi", notifikasiRoutes);
app.use("/api/chat", chatRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint tidak ditemukan." });
});

// Error handler global (termasuk error dari multer)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Terjadi kesalahan pada server." });
});

module.exports = app;
