const httpStatus = require('http-status');
const {User} = require('../models/user.model');
const {Wallet} = require('../models/wallet.model');
const { ApiError } = require('../utils/ApiError');

module.exports = async (req, res, next) => {
    try {
        const {pin} = req.body;
        if(!pin) throw new ApiError(httpStatus.BAD_REQUEST, 'pin not provided')
        const userWallet = await Wallet.findOne({user: req.user.id});
        if(!userWallet.pin) throw new ApiError(httpStatus.BAD_REQUEST, 'user does not have pin');

        await userWallet.validatePin(pin)
        next()
    } catch (error) {
        return res.status(error.statusCode || httpStatus.INTERNAL_SERVER_ERROR).json({
			message: error.message,
		});
    }
}