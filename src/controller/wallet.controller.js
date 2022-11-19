const {userService, walletService, transactionService, seerbitService} = require('../services');
const { transaction_type, payment_status } = require('../models/transaction.model');
const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');
const logger = require('../config/logger');
const mongoose = require('mongoose');
const { actions } = require('../models/wallet.model');

const sessionSettings = {
    "readConcern": { "level": "snapshot" },
    "writeConcern": { "w": "majority" }
}

module.exports = {
    validatePin: async function(req, res, next) {
        try {
            const {user, body} = req
            const {pin} = body;

            if(!pin) throw new ApiError(httpStatus.BAD_REQUEST, 'pin not provided')
            const userWallet = await walletService.getUserWallet({user: user.id});

            if(!userWallet.pin) throw new ApiError(httpStatus.BAD_REQUEST, 'user does not have pin');

            const result = await userWallet.validatePin(pin)

            res.status(httpStatus.OK).json({
                message: 'success',
                result
            })
        } catch (error) {
            logger.error(error.message);
            next(error)
        }
    },
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
            // create a new transaction
            const {user, body} = req;
            let result;
            const session = await mongoose.startSession();
            try {
                session.startTransaction(sessionSettings);
                const recipient = await walletService.getUserWallet(user.id);

                const transactionDetails = {
                    type: transaction_type.FUND.name,
                    recipient: recipient?.id,
                    amount: body.amount,
                    status: payment_status.PENDING,
                    description: body.description || `funding ${recipient?.username}`
                }
    
                const newTransaction = await transactionService.create(transactionDetails, payment_status.PENDING);
    
                const paymentData = {
                    email: recipient.user.email,
                    amount: body.amount,
                    paymentReference: newTransaction._id
                }
    
                result = await seerbitService.initializePayment(paymentData);
                await session.commitTransaction();
                session.endSession();

            } catch (error) {
                await session.abortTransaction();
                session.endSession();
                throw error
            }

            res.status(httpStatus.OK).json({
                message: 'successful',
                data: result
            })

        } catch(error) {
            logger.error(error);
            next(error)
        }
    },
    
    withdraw: async (req, res, next) => {
        try {
            const {body: {amount, accountNumber, bankCode}} = req
            const withdrawData = {
                reference: "TEST_TRAuoiiuyN23w_22aaa", 
                amount, 
                accountNumber, 
                bankCode
            }
            const payload = await seerbitService.withdraw(withdrawData);
            res.status(httpStatus.OK).json({
                message: payload.status,
                data: payload
            })
            // const {user, body} = req;

            // let {amount} = body;
            // amount = +amount;
            // const session = await mongoose.startSession();
            // const sessionSettings = {
            //     "readConcern": { "level": "snapshot" },
            //     "writeConcern": { "w": "majority" }
            // }

            // try {
            //     session.startTransaction(sessionSettings);
            //     const {wallet_id, username, _id: userId} = await userService.getUser({_id: user.id});



                
            // } catch (error) {
            //     await session.abortTransaction();
            //     console.log(error.message)
            //     logger.error(error.message);
            //     next(error);
            // } finally {
            //     session.endSession();
            // }


        } catch (error) {
            logger.error(error.message)
            next(error)
        }
    }
}