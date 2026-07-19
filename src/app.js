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

// CORS configuration - HARUS BEFORE semua route lain
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Handle OPTIONS explicitly
app.options("*", cors(corsOptions));

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

// DEBUG endpoint - show all registered routes
app.get("/api/debug/routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === "router") {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: middleware.regexp.toString(),
            methods: Object.keys(handler.route.methods || {}),
          });
        }
      });
    }
  });
  res.json({ routes, total: routes.length });
});

app.post("/api/test-register", (req, res) => {
  console.log("=== TEST REGISTER ===");
  console.log("Body received:", req.body);
  res.json({ received: req.body, timestamp: new Date().toISOString() });
});

console.log("🚀 Registering routes...");
app.use("/api/auth", authRoutes);
console.log("✅ Auth routes loaded");
app.use("/api/kamar", kamarRoutes);
console.log("✅ Kamar routes loaded");
app.use("/api/penyewa", penyewaRoutes);
console.log("✅ Penyewa routes loaded");
app.use("/api/pembayaran", pembayaranRoutes);
console.log("✅ Pembayaran routes loaded");
app.use("/api/notifikasi", notifikasiRoutes);
console.log("✅ Notifikasi routes loaded");
app.use("/api/chat", chatRoutes);
console.log("✅ Chat routes loaded");
console.log("🎉 All routes registered successfully");

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
