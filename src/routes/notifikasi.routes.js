const express = require("express");
const router = express.Router();
const {
  getMyNotifikasi,
  tandaiDibaca,
  tandaiSemuaDibaca,
} = require("../controllers/notifikasi.controller");
const { verifyToken } = require("../middleware/auth");

router.get("/", verifyToken, getMyNotifikasi);
router.patch("/baca-semua", verifyToken, tandaiSemuaDibaca);
router.patch("/:id/baca", verifyToken, tandaiDibaca);

module.exports = router;
