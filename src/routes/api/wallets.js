const express = require('express');
const router = express.Router();
const walletController = require('../../controller/wallet.controller');
const auth = require('../../middleware/auth');
const pin = require('../../middleware/pin');


router.post('/', auth(), walletController.createWallet)
router.get('/', walletController.getAll)
router.get('/user', auth(), walletController.getUserWallet);
router.post('/fund', auth(), walletController.fundWallet);
router.post('/withdraw', walletController.withdraw)
router.post('/send', auth(), pin, walletController.send);
router.post('/validate-pin', auth(), walletController.validatePin)

module.exports = router