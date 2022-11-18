const {User} = require('../models/user.model');
const {Event} = require('../models/event.model');
const bcrypt = require('bcryptjs');
const { ApiError } = require('../utils/ApiError');
const helpers = require('../utils/helpers');
const httpStatus = require('http-status');
const { Wallet } = require('../models/wallet.model');
const emailValidator = require('deep-email-validator')

const sensitive_fields = ['-password -pin -google_id -facebook_id -registered_with -twitter_id -confirmation_code -amount -is_subAccount -last_login_ime']


/**
 * 
 * @param {object} body 
 * @returns 
 */
const create = async (params) => {
    params['username'] = params['username'].toLowerCase()
    let filter = {
        '$or' : [
            {'username': params.username},
            {'email': params.email }
        ]
    }

    let existingUser = await User.findOne(filter);
    if (existingUser) throw new ApiError(httpStatus.BAD_REQUEST, 'Email/Username already taken');

    // validating email
    const {valid, reason, validators} = await emailValidator.validate(params['email'])
    if(!valid) throw new ApiError(httpStatus.BAD_REQUEST, 'detected invalid email',`email is invalid, flag: ${validators[reason].reason}`)
    const user = new User(params);

    user.generateUserId();
    user.generateConfirmationCode();
    
    return await user.save();
}

const savePin = async ({_id}, pin) => {
    const user = await User.findOne({_id});
    user.pin = pin
    return await user.save()
}

const update = async (query, params) => {
    const user = await User.findOneAndUpdate(query, params, {new: true});
    if(params.pin) {
        await savePin(query, params.pin)
    }
    return user
}

const search = async ({query}) => {
    const users = await User.find({$text: {$search: query}}).select('followingCount status name avatar username followersCount').exec();
    return users ? users : [];
}

const getUser = async (query, select='', populate=true) => {
    let populate_options = []
    if (populate) populate_options = helpers.populate.public_user_fields
    const user = await User.findOne(query).select(select)
        .populate(populate_options);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    return user
}

const getUsers = async (filter, options) => {
    const users = await User.paginate(filter, options);
    return users;
}

const getFollowerData = async (userId) => {
    const user = await User.findOne({_id: userId}).select('followers followersCount _id username')
    if(!user) throw new ApiError(httpStatus.NOT_FOUND, 'user not found')
    return {
        followers: user.followers, 
        followerCount: user.followersCount, 
        user_id: user._id,
        username: user.username
    }
}

const toggleBookmark = async ({_id}, productId) => {
    const user = await User.findOne({ _id}).select('bookmarks.products')
    if (user.bookmarks.products.includes(productId)) {
        user.bookmarks.products = user.bookmarks.products.filter(product => product != productId)
    } else {
        user.bookmarks.products.push(productId)
    }
    return await user.save()
}

const  toggleFollow = async (userId, username_to_follow) => {
    const user = await User.findOne({_id: userId}).select('username following followingCount')
    if (!user) throw new ApiError(httpStatus.BAD_REQUEST, `logged in user does not exist`)

    const user_to_follow = await User.findOne({username: username_to_follow}).select('followers')
    if (!user_to_follow) throw new ApiError(httpStatus.BAD_REQUEST, `user @${username_to_follow} does not exist`)

    if (user.following.includes(user_to_follow.id)){
        // unfollow
        user.following = user.following.filter((x) => x != user_to_follow.id)
        user_to_follow.followers = user_to_follow.followers.filter((x) => x != user.id)
    } else {
        // follow
        user.following.push(user_to_follow.id)
        user_to_follow.followers.push(user.id)
    }

    await user_to_follow.save()
    await user.save()

    return {user, user_to_follow}
}

const verifyConfirmationCode = async ({ token }) => {
    const user = await User.findOne({confirmation_code: token});

    if (!user) throw new ApiError(httpStatus.BAD_REQUEST, 'Confirmation token not found');

    user.joined = Date.now();
    user.is_verified = true
    user.confirmationCode = undefined;
    await user.save();
    const { email, username, _id } = user
    return { email, username, _id }
}

const changePassword = async ({password, token}) => {
    const user = await User.findOne({confirmation_code: token});

    if (!user) throw new ApiError(httpStatus.BAD_REQUEST, 'Confirmation token not found');

    user.password = password;
    user.confirmationCode = undefined
    await user.save();
}

const generateConfirmationCode = async ({email}) => {
    const user = await User.findOne({ email })
        .select('-password -__v -createdAt -updatedAt');
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    const confirmationCode = user.generateConfirmationCode()

    await user.save()
    return confirmationCode
}

// this is called during email verification
const activate = async  (email, hashedConfirmationCode) => {
    try {
        let user = await User.findOne({email}).select('id username confirmation_code is_verified joined');
        const match = await bcrypt.compare(user.confirmation_code, hashedConfirmationCode);
        if (!match) {
            response.status = 500;
            response.message = `confirmation code did not match`;
            // throw new Error(`confirmation code did not match`);
        }
        user.is_verified = true
        user.joined = new Date.now()
        await user.save()
    } catch (error) {
        response.status = 500;
        response.message = `server error:  ${error.message}`;
        console.error(error.message);
    } finally {
        await user.save();
        return { status: response.status, message: response.message }          
    }
}

const remove = async (user) => {
    if (!user._id) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    await Event.deleteMany({owner: user._id});
    await Wallet.deleteOne({user: user._id})
    await User.deleteOne(user);
}

const toggleSubscribe = async ({_id}, event_id) => {
    const user = await User.findOne({ _id}).select('subscribed_events');
    const event = await Event.findOne({_id: event_id}).select('subscribers');
    let isSubcribed = false;
    if (user.subscribed_events && user.subscribed_events.includes(event_id)) {
        user.subscribed_events = user.subscribed_events.filter(id => id != event_id)
        event.subscribers = event.subscribers.filter( user_id => user_id != user._id.toString() );
    } else {
        user['subscribed_events'].push(event_id);
        event['subscribers'].push(user._id);
        isSubcribed = true;
    }
    await event.save();
    await user.save()
    return {user, event, isSubcribed};
}

const getUserProfile = async (query) => {
    const user = await User.findOne(query)
        .populate(helpers.populate.private_user_fields);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    return user
}

module.exports = {
    create,
    savePin,
    update,
    search,
    getUser,
    getUsers,
    toggleBookmark,
    toggleSubscribe,
    toggleFollow,
    verifyConfirmationCode,
    changePassword,
    generateConfirmationCode,
    activate,
    remove,
    getUserProfile,
    getFollowerData
}