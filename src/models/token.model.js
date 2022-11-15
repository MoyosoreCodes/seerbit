const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { tokenTypes } = require('../config/tokens');
const { toJSON } = require('./plugins');

const tokenSchema = new Schema({
    user:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    token: {
        type: String,
        required: true,
        index: true,
    },

    type: {
        type: String,
        enum: [tokenTypes.REFRESH, tokenTypes.RESET_PASSWORD, tokenTypes.VERIFY_EMAIL],
        required: true,
    },
    expires: {
        type: Date,
        required: true,
    },
    blacklisted: {
        type: Boolean,
        default: false,
    },

    youtube_api: {
        access_token: String,
        refresh_token: String,
        scope:String,
        token_type:String,
        expiry_date:String
    },
    apis: [{
        type: String, 
        enum: ['youtube']
    }]
}, {
    timestamps: true,
    toJSON: { getters: true },
});
// add plugin that converts mongoose to json
tokenSchema.plugin(toJSON);

const Token = mongoose.model("Tokens", tokenSchema);

module.exports = {
    Token
};
