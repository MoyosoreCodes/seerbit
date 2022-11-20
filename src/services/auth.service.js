const {User, auth_providers, accountStatus} = require('../models/user.model');
const { Token } = require('../models/token.model');
const tokenService = require('./token.service')
const userService = require('./user.service')
const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');
const {OAuth2Client} = require('google-auth-library');
const {google_client_id, NODE_ENV} = require('../config');
const {tokenTypes} = require('../config/tokens');
const { Wallet } = require('../models/wallet.model');
const oauthClient = new OAuth2Client(google_client_id)

const select_options = ['-pin -google_id -facebook_id -twitter_id -confirmation_code -amount -is_subAccount -last_login_ime']

module.exports = {
    /**
     * @param {object} body 
     * @returns 
     */
    login: async ({email, username, password}) => {
        let filter = {
                '$or' : [
                    {'username': username},
                    {'email': email }
                ]
            }
        const user = await User.findOne(filter).select(select_options);
        if (!user) throw new ApiError(httpStatus.BAD_REQUEST, 'user does not exist');
        if (!user.is_verified && NODE_ENV != 'development') throw new ApiError(httpStatus.UNAUTHORIZED, `${email} not verified, please verify to continue`)
        if (!user.password || user.registered_with !== auth_providers.local) throw new ApiError(httpStatus.BAD_REQUEST, `user account is registered with ${user.registered_with}`);
        if (!await user.comparePassword(password)) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Credentials');
        const userWallet = await Wallet.findOne({user: user._id, _id: user.wallet_id})
        // if(user.status !== accountStatus.ACTIVE ) throw new ApiError(httpStatus.BAD_REQUEST, "cannot authenticate");

        const hasPin = userWallet.pin ? true : false
        user.last_login_time = Date.now()
        await user.save()

        return {user, hasPin}
    },

    refreshAuth: async (refreshToken) => {
        const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
        const user = await userService.getUser({_id:refreshTokenDoc.user});
        if (!user) throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
        await refreshTokenDoc.remove();
        return tokenService.generateAuthTokens(user);
    },

    generateConfirmationCode: async ({email}) => {
        const user = await User.findOne({ email })
            .select(select_options);
        if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
        const confirmationCode = user.generateConfirmationCode()

        await user.save()
        return confirmationCode
    },
    
    verifyConfirmationCode: async ({ token }) => {
        const user = await User.findOne({confirmation_code: token});

        if (!user) throw new ApiError(httpStatus.BAD_REQUEST, 'Confirmation token not found');

        user.verified = Date.now();
        user.confirmationCode = "";
        await user.save();
    },

    changePassword: async ({password, token}) => {
        const user = await User.findOne({confirmation_code: token});

        if (!user) throw new ApiError(httpStatus.BAD_REQUEST, 'Confirmation token not found');

        user.password = password;
        user.confirmation_code = ""
        return await user.save();
    },

    googleLogin: async (token) => {
        if(!token) throw new ApiError(httpStatus.BAD_REQUEST, `token id not provided for ${auth_providers.google} authentication`)
        const tokenPayload = (await oauthClient.verifyIdToken({
            idToken: token, 
            audience: google_client_id
        })).getPayload();

        if(!tokenPayload) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `unable to retrieve user details from google`);

        const {name, email} = tokenPayload;
        const query = {
            $or: [
                {email}, 
                {username: name.replace(/ /g, "")}
            ]
        }
        const user = await User.findOne(query);
        if(!user) throw new ApiError(httpStatus.NOT_FOUND, `${email}'s account does not exist, sign up `);
        if ( user.registered_with !== auth_providers.google ) throw new ApiError(httpStatus.NOT_FOUND, `This email address (${email}) isn't associated with a Google Account. If you already have an account, please try logging in with your email or username.`);

        // create token
        const hasPin = user.pin ? true : false
        const {access, refresh} = await tokenService.generateAuthTokens(user);
        user.last_login_time = Date.now()
        await user.save()

        return {user, access, refresh, hasPin}
    },
    
    googleSignup: async (token) => {
        if(!token) throw new ApiError(httpStatus.BAD_REQUEST, `token id not provided for ${auth_providers.google} authentication`)
        const tokenPayload = (await oauthClient.verifyIdToken({
            idToken: token, 
            audience: google_client_id
        })).getPayload();

        if(!tokenPayload) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Unable to retrieve user details from google`);

        const {name, email, sub, picture, email_verified } = tokenPayload;
    
        const existingUser = await User.findOne({ email });
        if(existingUser) throw new ApiError(httpStatus.BAD_REQUEST,`${email}'s account already exists, sign in`)
    
        const [first, last] = name.split(' ');
        const username = name.replace(/ /g, "");

        const newUserData = {
            email,
            registered_with: auth_providers.google,
            username, 
            name: {
                last: last,
                first: first,
            }, 
            avatar: picture,
            status: accountStatus.ACTIVE,
            is_verified: email_verified
        }

        const newUser = new User(newUserData);
        newUser.generateUserId();
        // no need to generate confirmation code because it'd be a valid email
        return await newUser.save();
    },

    logout: async (refreshToken) => {
        const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
        if (!refreshTokenDoc) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
        }
        await refreshTokenDoc.remove();
    }
}