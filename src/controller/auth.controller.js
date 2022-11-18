const {emailService, tokenService, authService, walletService, userService } = require('../services');
const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');
const { url, client_url } = require('../config')
const logger = require('../config/logger');
const { default: axios } = require('axios');

module.exports = {
    register: async (req, res, next) => {
        try {
            const user = await userService.create(req.body);
            const verificationSlug = await emailService.sendAccountVerificationEmail(user);

            res.status(httpStatus.CREATED).json({
                message:`An Email was sent to ${user.email} please verify via the link`,
                email: user.email,
                url: verificationSlug
            })
        } catch (error) {
            logger.error(error.message)
            next(error)
        }
    },
    
    changePassword: async (req, res, next) => {
        try {
            const {password, confirmPassword} = req.body;
            const {token} = req.query;

            // @TODO validate password

            const result = await authService.changePassword({password, token});
            res.status(httpStatus.OK).json({ 
                message: 'Password change successful',
                redirectUrl: `${client_url}/login`
            })
        } catch (error) {
            logger.error(error.message)
            next(error)            
        }
    },

    login: async (req, res, next) => {
        try {
            const {user, token, hasPin} = await authService.login(req.body);
            const tokens = await tokenService.generateAuthTokens(user);

            res.status(httpStatus.OK).json({
                message:`login successful`,
                data: user,
                hasPin,
                ...tokens
            })
        } catch (error) {
            logger.error(error)
            next(error)           
        }
    },

    refreshTokens: async (req, res, next) => {
        try {
            const tokens = await authService.refreshAuth(req.body.refreshToken);
            res.status(httpStatus.OK).json({ ...tokens });
        } catch (error) {
            logger.error(error)
            next(error)           
        }
    },

    logout: async (req, res, next) => {
        try {
            await authService.logout(req.body.refreshToken);
            res.status(httpStatus.NO_CONTENT);
        } catch (error) {
            logger.error(error.message)
            next(error)     
        }
    },

    sendResetPasswordLink: async (req, res, next) => {
        try {
            const user = await userService.getUser(req.body);

            if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

            const confirmation_code = await userService.generateConfirmationCode(req.body);

            const resetPasswordSlug = await emailService.sendResetPasswordEmail({email: user.email, confirmation_code});   

            res.status(httpStatus.OK).json({
                message: `sent reset link to ${user.email}`,
                email: user.email,
                url: resetPasswordSlug
            })         
        } catch (error) {  
            logger.error(error.message)  
            next(error)
        }
    },

    verifyEmail: async (req, res, next) => {
        try {
            const {username, email, _id} = await userService.verifyConfirmationCode(req.query);
            // creating user wallet 
            await walletService.create(_id);
            await emailService.sendWelcomeEmail({username, email})

            res.redirect(`${client_url}`)
        } catch (error) {
            logger.error(error.message)
            next(error)     
        }
    },

    googleRegister: async (req, res, next) => {
        try {
            const {token} = req.body;
            const user = await authService.googleSignup(token);
            await walletService.create(user._id);
            
            return res.status(httpStatus.OK).json({
                message: `user successfully registered with google`, 
                email: user.email,
                url: `${client_url}/sign-in?provider=google&method=register&success=true`  
            })
        } catch (error) {
            logger.error(error.message)
            next(error);
        }
    },
    
    googleLogin: async (req, res, next) => {
        try {

            const {token} = req.body;
            const {user, hasPin, access, refresh} = await authService.googleLogin(token)

            return res.status(httpStatus.OK).json({
                message: 'login successful',
                user, hasPin, access, refresh, 
                url: `${client_url}/sign-in?provider=google&method=login&success=true`  
            })
        } catch (error) {
            logger.error(error.message)
            next(error);
        }
    }

}