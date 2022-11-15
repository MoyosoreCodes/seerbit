const jwt = require('jsonwebtoken');
const {TokenExpiredError} = require('jsonwebtoken');
const config = require('../config');
const httpStatus = require('http-status');

function getTokenFromHeader (headers) {
    if ((headers.authorization && headers.authorization.split(' ')[0] === 'Token') ||
        (headers.authorization && headers.authorization.split(' ')[0] === 'Bearer')
    ) {
        return headers.authorization.split(' ')[1];
    } else {
        return headers.authorization;
    }
};

module.exports = (isRequired = true) => async (req, res, next) => {
	try {
        const token = getTokenFromHeader(req.headers)

        if (token) {
            // if there is a token and token is required
            const decodedData = jwt.verify(token, config.jwt.secret);
            // todo check if the user account is active
            req.user = decodedData;            
        } else if (!token && isRequired === false) {
            // if there is no token and token is not required
            req.user = null
        } else {
            res.status(httpStatus.UNAUTHORIZED).json({ msg: 'no bearer token provided' });
        }
        next();
	} catch(err){
        if(err instanceof jwt.TokenExpiredError) {
            res.status(httpStatus.FORBIDDEN).json({message: 'invalid token'})
        } else {
            res.status(httpStatus.UNAUTHORIZED).json({message: 'auth error'})
        }
        
	}
}