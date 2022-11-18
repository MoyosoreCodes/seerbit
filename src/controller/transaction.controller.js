const {transaction_type, payment_status} = require('../models/transaction.model');
const {transactionService, userService, walletService, seerbitService} = require('../services');
const { actions } = require('../models/wallet.model');
const mongoose = require('mongoose');
const _ = require('lodash');
const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');
const logger = require('../config/logger');

module.exports = {
    getBankInfo: async (req, res, next) => {
        try {
            const {name} = req.query
            const banks = await seerbitService.getBankInfo();

            let bank
            if(name) {
                bank = banks.find( ({bank_name}) => bank_name == name)
            }
            res.status(httpStatus.OK).json({
                message: 'success',
                data: bank || banks
            })

        } catch (error) {
            logger.error(error.message)
            next(error)
        }
    },

    createPocket: async (req, res, next) => {
        try {
            
            const {user, body} = req;

            const foundUser = await userService.getUser({_id: user.id});

            const {bankVerificationNumber, phoneNumber} = body;

            const config = {
                wallet_id: foundUser.wallet_id, 
                bankVerificationNumber, phoneNumber, 
                email: foundUser.email, 
                firstName: foundUser.name.first,
                lastName: foundUser.name.first,
            }

            const result = await seerbitService.createSubPocket(config);

            res.status(httpStatus.OK).json({
                message: 'success',
                data: result
            })

        } catch (error) {
            logger.error(error.message)
            next(error)
        }
    },

    handleWebhook: async function (req, res, next) {
        try {
            const [notificationRequestItem] = req.body.notificationItems;
            console.log({notificationRequestItem});
   
            if(notificationRequestItem.eventType == "transaction") {
                let {amount, email, status} = notificationRequestItem.data
                console.log({amount, email, status})

                amount = +amount;
                const session = await mongoose.startSession();
                const sessionSettings = {
                    "readConcern": { "level": "snapshot" },
                    "writeConcern": { "w": "majority" }
                }

                try {
                    session.startTransaction(sessionSettings);
                    const {wallet_id, username, _id: userId} = await userService.getUser({email});
    
                    const transactionDetails = {
                        type: transaction_type.FUND.name,
                        recipient: wallet_id,
                        amount,
                        status: payment_status.SUCCESS,
                        description: `${username} top up with ${amount}`
                    }
    
                    const [ credited, newTransaction ] = await Promise.all([
                        walletService.updateBalance( actions.credit, userId, fundAmount, session ),
                        transactionService.create(transactionDetails, payment_status.SUCCESS)
                    ]);
    
                    const fnTxnCount = await walletService.updateTransactions( userId, newTransaction._id, session );
                    if(!fnTxnCount) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "unable to update wallet transactions");
    
                    await session.commitTransaction();            
                    res.send(200);
                } catch (error) {
                    await session.abortTransaction();
                    console.log(error.message)
                    logger.error(error.message);
                    next(error);
                } finally {
                    session.endSession();
                }
            }
        } catch (error) {
            logger.error(error.message);
            next(error);
        }
    },
    /**
     * * lists all transaction
     * * admin service
     * @param {object} req 
     * @returns 
    */
    list: async req => {
        try {
            let {limit = 5, page = 1 } = req.query;
    
            limit = parseInt(limit);
            const skip = (parseInt(page) - 1) * limit;
            const options = {skip, limit};
            return await transactionService.retrieve(options);    
        } catch (error) {
            console.error(error);
            return { status: 500, message: `${error.message}` } 
        }
    },

    /**
     * * lists all users transactions
     * @param {object} req 
     */
    listUserTransactions: async req => {
        try {
            console.log(req.query);
            const {data: foundUser} = await userService.getUser({_id:req.user.id});
            if (!foundUser) return {status: 404, message: 'User not found'};
            let {limit = 5, page = 1, ...rest } = req.query;
    
            limit = parseInt(limit);
            const skip = (parseInt(page) - 1) * limit;
            const options = {skip, limit};
            const transactionQuery = transactionService.setTransactionQuery(foundUser._id, rest);
            return await transactionService.userTransactions(foundUser, transactionQuery, options);
        } catch (error) {
            console.error(error);
            return { status: 500, message: `${error.message}` } 
        }
    }
}