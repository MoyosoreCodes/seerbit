const mongoose = require('mongoose');
const {Schema} = mongoose;
const bcrypt = require("bcryptjs");
const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');

const providers = {
    paystack: "paystack",
}

const actions = {
    credit: "credit",
    debit: "debit"
}

const walletObject = {
    user: {type: Schema.Types.ObjectId, ref: 'users', required: true},
    pin: {type: String, trim: true, immutable: true},
    currency: {type: String, required: true, default: "NGN"},
    balance: {
        immutable: true, // prevents (userWallet.balance = newAmount), can only be updated with update methods with strict option on false
        type: mongoose.Types.Decimal128, 
        default: 0,
        get: balance => +parseFloat(balance).toFixed(2)
    },
    transactions: [
        {
            type: Schema.Types.ObjectId,
            ref: "transactions",
        }
    ]
}

const walletSchema = new Schema(walletObject, {timestamps: true, toJSON: { getters: true }});

walletSchema.methods.validatePin = async function (pin) {
    const match = await bcrypt.compare(pin.toString(), this.pin);
    if(!match) throw new ApiError(httpStatus.BAD_REQUEST, 'invalid transaction pin');
    return match;
}

const Wallet = mongoose.model('wallets', walletSchema);

module.exports = {Wallet, providers, actions};