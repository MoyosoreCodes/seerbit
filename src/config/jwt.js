const httpStatus = require('http-status');
const jwt = require('jsonwebtoken');
const {TokenExpiredError} = require('jsonwebtoken');
const { ApiError } = require('../utils/ApiError');

module.exports = {
    createToken: (payload, secret, options) => {
        return jwt.sign(payload, secret, options)
    },

    validateToken: (token, secret) => {
        try {
            const decodedData = jwt.verify(token, secret)
            return decodedData;
        } catch (error) {
            console.log(error.message)
            if (error instanceof TokenExpiredError) return httpStatus.UNAUTHORIZED
            return 
        }
    }
}