const express = require("express");
const authController = require("../controller/authController");

const router = express.Router();

router.route("/isLoggedIn").get(authController.isLoggedIn);

router.route("/login").post(authController.login);

router.route("/register").post(authController.register);

router.route("/changeData").patch(authController.changeData);

router.route("/changePassword").patch(authController.changePassword);

router.route("/logout").get(authController.logout);

module.exports = router;
