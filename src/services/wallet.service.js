const {Wallet, actions} = require('../models/wallet.model');
const {User} = require('../models/user.model');
const userService = require('./user.service');
const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');
const {Decimal128} = require('mongoose').Types;
const { Transaction } = require('../models/transaction.model');
const bcrypt = require("bcryptjs");

const select_options = ['-updatedAt -createdAt -__v'];
const populate_options = [
    {
        path: "user",
        select: "name username avatar email",
        model: User
    },
    {
        path: 'transactions',
        select: '-transaction_id -recipient -sender',
        model: Transaction
    }
];


module.exports = {
    create: async (userId) => {
        let wallet = await Wallet.findOne({user: userId});
        if (!wallet) {
            wallet = new Wallet({user: userId});
            const updatedUser = await userService.update({_id: userId}, {$set: {wallet_id: wallet._id}});
            if(!updatedUser) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'unable to update user wallet ids')
            await wallet.save();
        }
        return wallet;
    },

    delete: async (walletId) => {
        return await Wallet.deleteOne({_id: walletId});
    },

    updateTransactions: async (user, transactionId, session = {}) => {
        const count = await Wallet.countDocuments({user, transactions: {$in: [transactionId]}});
        if(!count) {
            const updated = await Wallet.updateOne({user}, { $push: { transactions: transactionId } }, {session});
            if(!updated.nModified) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `error updating transactions`)
            return updated.nModified;
        }
        return count;
    },

    getWallets: async function() {
        return await Wallet.find({})
            .sort({createdAt: -1})
            .select(...select_options)
            .populate(populate_options)
    },

    getUserWallet: async function(userId) {
        const userWallet = await Wallet.findOne({user: userId}).populate(populate_options).select(...select_options);
        if(!userWallet) throw new ApiError(httpStatus.NOT_FOUND, 'unable to retrieve user wallet')
        return userWallet;
    },

    /**
     * * updates wallet balance (must be used in ACID transaction)
     * @param {string} action 
     * @param {string} userId 
     * @param {number | string} amount 
     * @param {*} session 
     * @returns {number} 1 if successful, 0 if error
     */
    updateBalance: async function(action, userId, amount, session = {}) {
        if(!action || !actions[action]) throw new ApiError(httpStatus.BAD_REQUEST, `invalid action to update wallet: ${action}`);
        if(!amount || amount <= 0) throw new ApiError(httpStatus.BAD_REQUEST, `invalid transaction amount: ${amount}`);

        if(action == actions.credit) {
            const receiverWallet = await Wallet.updateOne({user: userId}, {$inc: {balance: +Decimal128.fromString(amount.toString())}}, {session, strict: false});
            if(!(receiverWallet?.nModified)) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "unable to credit user")
            return receiverWallet.nModified; 
        }
        
        if(action == actions.debit) {
            const senderWallet = await Wallet.findOne({user: userId}, {}, {session});
            if ( amount > senderWallet?.balance ) throw new ApiError(httpStatus.BAD_REQUEST, 'insufficient wallet balance');
            await Wallet.updateOne({user: userId}, {$inc: {balance: -Decimal128.fromString(amount.toString())}}, {session, strict: false});
            await senderWallet.save({session});
            return 1;
        }
    },

    setPin: async function(userId, newPin) {
        const hashedPin = await bcrypt.hash(newPin, 10);
        const updatedWallet = await Wallet.updateOne({user: userId}, {pin: hashedPin}, {strict: false});
        if (!updatedWallet.nModified) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'unable to update pin')
        return updatedWallet
    }
}