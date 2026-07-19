const express = require("express");
const router = express.Router();
const { register, login, me, updateMe, uploadAvatar } = require("../controllers/auth.controller");
const { verifyToken } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyToken, me);
router.patch("/me", verifyToken, updateMe);
router.post("/upload-avatar", verifyToken, upload.single("avatar"), uploadAvatar);

module.exports = router;
