const express = require("express");
const router = express.Router();
const { getKontak, getRiwayat, kirimPesan } = require("../controllers/chat.controller");
const { verifyToken } = require("../middleware/auth");

router.get("/kontak", verifyToken, getKontak);
router.get("/:userId", verifyToken, getRiwayat);
router.post("/:userId", verifyToken, kirimPesan);

module.exports = router;
