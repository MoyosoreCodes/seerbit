const userService = require('../services/user.service');
const walletService = require('../services/wallet.service');
const { transaction_type, payment_status } = require('../models/transaction.model');
const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');
const logger = require('../config/logger');
const mongoose = require('mongoose');
const transactionService = require('../services/transaction.service');
const { actions } = require('../models/wallet.model');

const sessionSettings = {
    "readConcern": { "level": "snapshot" },
    "writeConcern": { "w": "majority" }
}

module.exports = {
    // ! in progress
    send: async function(req, res, next) {
        let {amount, to, description} = req.body;
        try {
            const session = await mongoose.startSession();
            
            let result;
            try {
                session.startTransaction(sessionSettings);
                const [sender, recipient] = await Promise.all([
                    userService.getUser({_id: req.user.id}),
                    userService.getUser({username: to})
                ])
    
                if(sender?.wallet_id.toString() == recipient?.wallet_id.toString()) {
                    throw new ApiError(httpStatus.BAD_REQUEST, 'transaction invalid: sender and recipient are the same')
                }
                
                await Promise.all([
                    walletService.updateBalance( actions.debit, sender?._id, amount, session ), 
                    walletService.updateBalance( actions.credit, recipient?._id, amount, session )
                ]);
    
                // log the transaction to the db
                const transactionDetails = {
                    type: transaction_type.SEND.name,
                    sender: sender?.wallet_id,
                    recipient: recipient?.wallet_id,
                    amount,
                    description: description || `${amount} sent to ${recipient?.username}`
                }
    
                const newTransaction = await transactionService.create(transactionDetails, payment_status.SUCCESS);
    
                await Promise.all([
                    walletService.updateTransactions(sender?._id, newTransaction._id, session),
                    walletService.updateTransactions(recipient?._id, newTransaction._id, session)
                ])
    
                await session.commitTransaction();
                session.endSession();
                result = newTransaction
            } catch (error) {
                await session.abortTransaction();
                session.endSession();
                throw error
            }
            res.status(httpStatus.OK).json({
                message: 'successful',
                data: result
            });
        } catch (error) {
            logger.error(error.message);
            next(error)
        }
    },

    createWallet: async (req, res, next) => {
        try {
            const wallet = await walletService.create(req.user.id);
            res.status(httpStatus.OK).json({
                message: 'successful',
                data: wallet
            })
        } catch(error) {
            logger.error(error);
            next(error)
        }
    },

    getAll: async (req, res, next) => {
        try{
            const wallets = await walletService.getWallets();
            res.status(httpStatus.OK).json({
                message: 'successful',
                data: wallets
            })
        } catch(error) {
            logger.error(error);
            next(error)
        }
    },

    getUserWallet: async (req, res, next) => {
        try{
            const userWallet = await walletService.getUserWallet(req.user.id);
            res.status(httpStatus.OK).json({
                message: 'successful',
                data: userWallet
            })
        } catch(error) {
            logger.error(error);
            next(error)
        }
    },

    fundWallet: async (req, res, next) => {
        try{
            
        } catch(error) {
            logger.error(error);
            next(error)
        }
    },
    withdraw: async (req, res, next) => {
        try {
            
        } catch (error) {
            logger.error(error.message);
            next(error);
        }
    },
}