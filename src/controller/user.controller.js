const userService = require('../services/user.service');
const { ApiError } = require('../utils/ApiError');
const pick = require('../utils/pick');
const helpers = require('../utils/helpers');
const httpStatus = require('http-status');
const logger = require('../config/logger');
const { walletService } = require('../services');

const public_not_select_options = '-phone -is_verified -bookmarks -youtube -preferences -wallet_id -joined -address -dob -status -is_creator'

module.exports = {
    // not yet working
    list: async (req, res, next) => {
        try {
            const filter = pick(req.query, ['name', 'role']);
            const options = pick(req.query, ['sortBy', 'limit', 'page']);
            const result = await userService.getUsers(filter, options);

            res.status(httpStatus.OK).json({
                message:`successful request`,
                ...result
            })
        } catch (error) {
            logger.error(error.message)
            next(error)
        }
    },

    getUserProfile: async (req, res, next) => {
        try {
            const result = await userService.getUserProfile({_id:req.user.id})
 
            res.status(httpStatus.OK).json({
                message:`successful request`,
                data: result
            })
        } catch (error) {
            logger.error(error)
            next(error)
        }
    },

    getUserByUsername: async (req, res, next) => {
        try {
            const {user} = req
            const {username} = req.params
            let select_options = helpers.select.public_event_fields
            if (user && username == user.username ) {
                select_options = ''
            }
            const result = await userService.getUser({username: new RegExp(`^${username}$`, 'i')}, select_options)
 
            res.status(httpStatus.OK).json({
                message:`successful request`,
                data: result
            })
        } catch (error) {
            logger.error(error.message)
            next(error)
        }
    },

    update: async (req, res, next) => {
        try {
            //check if username param is same as logged in user

            const {username} = req.params

            if (req.user.username != username) {
                throw new ApiError(httpStatus.UNAUTHORIZED, 'username in params does not match authenticated user')
            }
            let params = req.body
            const user = await userService.update({ _id:req.user.id}, params)
            
        res.status(httpStatus.OK).json({
                message:`request successful`,
                data: user
            })
        } catch (error) {
            logger.error(error.message)
            next(error)
        }
    },

    toggleFollow: async(req, res, next) => {
        try {
            const username_to_follow = req.params.username
            const {id, username} = req.user
            if (username_to_follow == username) throw new ApiError(httpStatus.BAD_REQUEST, 'user cannot follow themselves')
            const {user, user_to_follow} = await userService.toggleFollow(id, username_to_follow)
           
            res.status(httpStatus.OK).json({
                message:`successful`,
                data: user
            })
        } catch (err) {
            logger.error(err.message)
            next(err)
        }
    },

    toggleBookmark: async(req, res, next) => {
        try {
            const {product} = req.query
            const {bookmarks} = await userService.toggleBookmark({ _id:req.user.id}, product)

            res.status(httpStatus.OK).json({
                message:`successful`,
                products: bookmarks.products
            })
        } catch (error) { 
            logger.error(error.message)
            next(error)
        }
    },

    savePin: async (req, res, next) => {
        try {
            // await userService.savePin({_id: req.user.id}, req.body.pin)
            const result = await walletService.setPin(req.user.id, req.body.pin)
            res.status(httpStatus.OK).json({
                message:`successfully saved pin`,
                data: result
            })
        } catch (error) { 
            logger.error(error.message)
            next(error)
        }
    },

	authorizeUser: async (req, res, next) => {
		try {
			const {user, token} = await userService.authenticate(req.body);

			res.status(200).json({
                message:`login successful`,
                data: user,
                token
            })
		} catch (error) {
            logger.error(error.message)
			next(error)           
		}
	},
    
    create: async (req, res, next) => {
        try {
            // const user = await userService.create(req.body);
            // const verificationSlug = await emailService.sendAccountVerificationEmail(user);

            // res.status(httpStatus.CREATED).json({
            //     message:`An Email was sent to ${user.email} please verify via the link`,
            //     email: user.email,
            //     url: verificationSlug
            // })

            res.status(httpStatus.OK).json({
                message:`use route instead for user login`,
                url: '/api/auth/register'
            })
        } catch (error) {
            logger.error(error.message)
            next(error)
        }
    },

	delete: async (req, res, next) => {
		try {
			await userService.remove(req.body);
			res.status(httpStatus.CREATED).json({message: 'successfully removed user'})
		} catch (error) {
            logger.error(error.message)
			next(error)
		}
	}
}