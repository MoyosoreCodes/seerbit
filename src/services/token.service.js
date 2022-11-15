const {Token} = require('../models/token.model');
const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');
const logger = require('../config/logger')
const jwt = require('jsonwebtoken');
const { tokenTypes } = require('../config/tokens');
const moment = require('moment');
const config = require('../config');
const userService = require('./user.service');

const getUserToken = async (query, select=[]) => {
    const token = await Token.findOne(query).select(...select)
    return token
}

const store = async (params, {_id}) => {
    const youtube_api = {
        access_token: params.access_token,
        refresh_token: params.refresh_token,
        scope: params.scope,
        token_type: params.token_type,
        expiry_date: params.expiry_date
    }

    const token = await Token.findOneAndUpdate (
        _id, 
        { 
            $set: { youtube_api:youtube_api, owner: _id },
            $push: { apis: 'youtube' }
        },
        { upsert: true, new:true }
    )

    return await token.save();
}

const generateToken = ({id, username}, expires, type, secret = config.jwt.secret) => {
    const payload = {
        id,
        username: username,
        iat: moment().unix(),
        exp: expires.unix(),
        type,
    }
    return jwt.sign(payload, secret);
}

const saveToken = async (token, {id}, expires, type, blacklisted = false) => {
    const tokenDoc = await Token.create({
        token,
        user: id,
        expires: expires.toDate(),
        type,
        blacklisted,
    });
    return tokenDoc;
}

const generateAuthTokens = async (user) => {
    const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
    const accessToken = generateToken(user, accessTokenExpires, tokenTypes.ACCESS);

    const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
    const refreshToken = generateToken(user, refreshTokenExpires, tokenTypes.REFRESH);

    await saveToken(refreshToken, user, refreshTokenExpires, tokenTypes.REFRESH);

    return {
        access: {
            token: accessToken,
            expires: accessTokenExpires.toDate(),
        },
        refresh: {
            token: refreshToken,
            expires: refreshTokenExpires.toDate(),
        },
    };
}

const verifyToken = async (token, type) => {
    const payload = jwt.verify(token, config.jwt.secret);
    const tokenDoc = await Token.findOne({ token, type, user: payload.id, blacklisted: false });
    if (!tokenDoc) throw new Error('Token not found');
    return tokenDoc;
}

 /* Generate reset password token
* @param {string} email
* @returns {Promise<string>}
*/
const generateResetPasswordToken = async (email) => {
    const user = await userService.getUserByEmail(email);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'No users found with this email');
    }
    const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
    const resetPasswordToken = generateToken(user.id, expires, tokenTypes.RESET_PASSWORD);
    await saveToken(resetPasswordToken, user.id, expires, tokenTypes.RESET_PASSWORD);
    return resetPasswordToken;
}

/**
* Generate verify email token
* @param {User} user
* @returns {Promise<string>}
*/
const generateVerifyEmailToken = async (user) => {
    const expires = moment().add(config.jwt.verifyEmailExpirationMinutes, 'minutes');
    const verifyEmailToken = generateToken(user.id, expires, tokenTypes.VERIFY_EMAIL);
    await saveToken(verifyEmailToken, user.id, expires, tokenTypes.VERIFY_EMAIL);
    return verifyEmailToken;
}

module.exports = {
    getUserToken,
    store,
    generateToken,
    saveToken,
    generateAuthTokens,
    verifyToken,
    generateResetPasswordToken,
    generateVerifyEmailToken
}
