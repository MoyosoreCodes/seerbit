const express = require('express');
const router = express.Router();
const transactionController = require('../../controller/transaction.controller');
const transactionService = require('../../services/transaction.service');
const auth = require('../../middleware/auth');

//get methods

//retrieves transactions for currently logged in users
router.get('/me', auth(), async (req, res) => {
    try {
        const { status, message, data } = await transactionController.listUserTransactions(req);
        return res.status(status).json({ status, message, data });   
    }catch(error) {
        console.log(error);
        return res.status(500).json({ message: `error at route: ${error.message}` });
    }
})
router.get('/', async (req, res) => {
    try {
        const { status, message, data } = await transactionController.list(req);
        return res.status(status).json({ status, message, data });   
    }catch(error) {
        console.log(error);
        return res.status(500).json({ message: `error at route: ${error.message}` });
    }
})

// bank-info?countryCode=NG?name=Access Bank
//funding main account with paystack
// https://spray-dev.herokuapp.com/api/transactions/payment-webhook?gateway=paystack
router.post('/payment-webhook', transactionController.handleWebhook);
router.post('/pocket', auth(), transactionController.createPocket);
router.get('/bank-info', transactionController.getBankInfo)



module.exports = router