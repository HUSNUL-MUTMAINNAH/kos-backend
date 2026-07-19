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

// CORS configuration
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  optionsSuccessStatus: 200,
};

// CORS middleware MUST be first
app.use(cors(corsOptions));

// Explicit OPTIONS handler for all routes
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "false");
  res.sendStatus(200);
});

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// === HEALTH & DIAGNOSTIC ENDPOINTS ===
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Kos API berjalan dengan baik." });
});

app.get("/api/diagnostics", (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT || 5000,
    database: {
      url_set: !!process.env.DATABASE_URL,
      url_preview: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + '...' : 'MISSING'
    },
    jwt: {
      secret_set: !!process.env.JWT_SECRET
    },
    frontend: {
      url: process.env.FRONTEND_URL || 'MISSING'
    },
    app_ready: true
  };
  res.json(diagnostics);
});

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

// === ROUTES ===
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

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Terjadi kesalahan pada server." });
});

module.exports = app;
