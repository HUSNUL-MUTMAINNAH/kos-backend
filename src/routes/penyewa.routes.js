const express = require("express");
const router = express.Router();
const {
  getAllPenyewa,
  getPenyewaById,
  createPenyewa,
  updatePenyewa,
  deletePenyewa,
} = require("../controllers/penyewa.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

router.get("/", verifyToken, requireRole("ADMIN"), getAllPenyewa);
router.get("/:id", verifyToken, getPenyewaById);
router.post("/", verifyToken, requireRole("ADMIN"), createPenyewa);
router.put("/:id", verifyToken, requireRole("ADMIN"), updatePenyewa);
router.delete("/:id", verifyToken, requireRole("ADMIN"), deletePenyewa);

module.exports = router;
