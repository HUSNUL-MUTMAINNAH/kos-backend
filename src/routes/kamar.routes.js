const express = require("express");
const router = express.Router();
const {
  getAllKamar,
  getKamarById,
  createKamar,
  updateKamar,
  deleteKamar,
} = require("../controllers/kamar.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

router.get("/", verifyToken, getAllKamar);
router.get("/:id", verifyToken, getKamarById);
router.post("/", verifyToken, requireRole("ADMIN"), createKamar);
router.put("/:id", verifyToken, requireRole("ADMIN"), updateKamar);
router.delete("/:id", verifyToken, requireRole("ADMIN"), deleteKamar);

module.exports = router;
