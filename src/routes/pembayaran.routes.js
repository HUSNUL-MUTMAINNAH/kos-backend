const express = require("express");
const router = express.Router();
const {
  getAllPembayaran,
  getPembayaranById,
  createPembayaran,
  uploadBukti,
  reviewPembayaran,
  deletePembayaran,
} = require("../controllers/pembayaran.controller");
const { verifyToken, requireRole } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.get("/", verifyToken, getAllPembayaran);
router.get("/:id", verifyToken, getPembayaranById);
router.post("/", verifyToken, requireRole("ADMIN"), createPembayaran);
router.post("/:id/upload-bukti", verifyToken, requireRole("PENYEWA"), upload.single("bukti"), uploadBukti);
router.patch("/:id/review", verifyToken, requireRole("ADMIN"), reviewPembayaran);
router.delete("/:id", verifyToken, requireRole("ADMIN"), deletePembayaran);

module.exports = router;
