const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const moment = require("moment");
const { toJSON, paginate } = require('./plugins');
const { ApiError } = require("../utils/ApiError");
const httpStatus = require("http-status");

const transaction_type = {
  EVENT: { name: "EVENT", prefix: "EV" },
  // RECEIVE : {name: "RECEIVE", prefix: "RC"},
  PURCHASE: { name: "PURCHASE", prefix: "PR" },
  SEND: { name: "SEND", prefix: "SN" },
  WITHDRAW: { name: "WITHDRAW", prefix: "WD" },
  FUND: { name: "FUND", prefix: "FN" },
};

const payment_method = {
  BANK: "bank",
  CARD: "card",
  NA: "na"
};

const generateTransactionId = function (type) {
  //validations
  if (!type || type == " ") {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "please provide the event type");
  }

  type = type.toUpperCase();
  //invalid transaction type
  if (!transaction_type[type]) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "invalid transaction type");
  }

  var length = 26;
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var charactersLength = characters.length;
  var result = transaction_type[type].prefix;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  this.transaction_id = result;
};

// status
const payment_status = {
  PENDING: "pending",
  SUCCESS: "success",
  CANCELLED: "cancelled",
  FAILED: "failed",
};

const transactionModel = {
  date: { type: String, default: moment().format("LLLL") }, //date of transaction
  type: { 
    type: String, 
    trim: true, 
    index: true, 
    enum: [...Object.keys(transaction_type)]
  }, // event, redeem, purchase, send
  // generated id (with prefixed tags like EV for event, RC for receiving RD for redeeming, PC for purchase and SN for send)
  transaction_id: {
    type: String,
    trim: true,
    match: [/^[WD|EV|RC|PR|SN|FN]+[A-Z0-9]{26}$/, "invalid transaction id"],
  },
  reference: String,
  amount: {
    type: mongoose.Types.Decimal128,
    required: true,  
    get: amount => +parseFloat(amount).toFixed(2)
  },
  description: { type: String, trim: true },
  event_id: { type: String, trim: true }, //if transaction is an event (event code)
  currency: { type: String, default: 'NGN' },
  payment_method: {
    type: String,
    enum: [...Object.values(payment_method)],
    default: payment_method.NA,
  },
  status: { 
    type: String, 
    trim: true, 
    default: payment_status.PENDING,
    enum: [...Object.values(payment_status)]
  },
  //sender information
  sender: [
    {
      type: Schema.Types.ObjectId,
      ref: "wallets",
    }
  ],
  recipient: {
    type: Schema.Types.ObjectId,
    ref: "wallets",
    required: true,
  },
  meta: { type: Object, default: {} },
};

const transactionSchema = new Schema(transactionModel, {
  timestamps: true,
  toJSON: { getters: true },
});

transactionSchema.plugin(toJSON);
transactionSchema.plugin(paginate);
transactionSchema.methods.generateTransactionId = generateTransactionId;
const Transaction = mongoose.model("Transactions", transactionSchema);

module.exports = {
  Transaction,
  transaction_type,
  payment_status,
  payment_method,
};
