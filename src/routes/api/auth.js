const express = require("express");
const router = express.Router();
const authController = require("../../controller/auth.controller");
const userController = require("../../controller/user.controller");
const auth = require("../../middleware/auth");
const { authValidator } = require("../../validators");
const validate = require("../../middleware/validator");

router.post("/register", validate(authValidator.register), authController.register);

router.post("/login", validate(authValidator.login), authController.login);
router.post('/logout', auth(), authController.logout);

router.post("/forgot-password", authController.sendResetPasswordLink);
router.get("/verify-email", authController.verifyEmail);
router.post("/reset-password", authController.changePassword);

router.post('/refresh-tokens', authController.refreshTokens);

router.post('/pin', auth(), userController.savePin)

// router.get('/youtube/consent', auth(), youtubeController.getAuthUrl)
// router.get('/youtube/callback', youtubeController.confirmToken)

router.post('/google/signin', authController.googleLogin)
router.post('/google/signup', authController.googleRegister)

module.exports = router;
