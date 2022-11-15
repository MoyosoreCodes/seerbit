const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { authValidator } = require("../../validators");
const validate = require("../../middleware/validator");
const productController = require('../../controller/product.controller')

router.get("/", productController.list);
router.post("/", auth(), productController.create);

router.get("/:productID", productController.get);
router.post("/:productID", auth(), productController.update);
router.delete("/:productID", auth(), productController.delete);

module.exports = router;
