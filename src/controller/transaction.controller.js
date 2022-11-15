const {transaction_type, payment_status} = require('../models/transaction.model');
const transactionService = require('../services/transaction.service');
const userService = require('../services/user.service');
const walletService = require('../services/wallet.service');
const { actions } = require('../models/wallet.model');
const mongoose = require('mongoose');
const _ = require('lodash');
const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');
const logger = require('../config/logger');

module.exports = {

    handleWebhook: async function (req, res, next) {
        try {

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