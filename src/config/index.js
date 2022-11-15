// const path = require('path');

// Set the NODE_ENV to 'development' if default NODE_ENV
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

if (process.env.NODE_ENV !== 'production') {
    // const env = require("dotenv").config({ path: path.resolve(__dirname, `../.env.${process.env.NODE_ENV}`)}); 
    const env = require("dotenv").config({ path: `.env` })
    if (env.error) {
        throw Error("⚠️  Couldn't find .env file  ⚠️");
    }
}

module.exports = {
    url: process.env.URL,
    /**
     * Your favorite port
     */
    port: parseInt(process.env.PORT, 10),

    NODE_ENV: process.env.NODE_ENV,
    /**
     * db stuff
     */
    dbURI: process.env.MONGODB_URI,
    dbURL: process.env.MONGODB_URL,
    dbHost: process.env.HOST_DB,

    /**
     * Your secret stuff
     */
    jwt: {
        algorithm: process.env.JWT_ALGO,
        accessExpirationMinutes: process.env.JWT_ACCESS_EXPIRATION_MINUTES,
        secret: process.env.JWT_SECRET,
        accessExpirationMinutes: process.env.JWT_ACCESS_EXPIRATION_MINUTES,
        refreshExpirationDays: process.env.JWT_REFRESH_EXPIRATION_DAYS,
        resetPasswordExpirationMinutes: process.env.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
        verifyEmailExpirationMinutes: process.env.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
    },

    /**
     * Used by winston logger
     */
    logs: {
        level: process.env.PINO_LOG_LEVEL || 'info',
    },

    smtpOptions: {
        host: "smtp.titan.email",
        port: 587,
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
        }
    },
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
        url: process.env.REDIS_URL
    },
    /**
     * API configs
     */
    api: {
        prefix: '/api',
    },
    client_url: process.env.CLIENT_URL,

    baseURL: process.env.BASE_URL,
    X_API_Key: process.env.X_API_KEY,
    eventURL: process.env.EVENT_URL,
    userURL: process.env.USER_URL,
    defaultAvatar: process.env.DEFAULT_AVATAR,
    parent: process.env.PARENT,
    /**
     * google auth configs
     */
    google_client_id: process.env.GOOGLE_CLIENT_ID,
    google_client_secret: process.env.GOOGLE_CLIENT_SECRET,
    google_signup_callback_url: process.env.GOOGLE_SIGNUP_CALLBACK_URI,
    google_login_callback_url: process.env.GOOGLE_LOGIN_CALLBACK_URI,
    google_login_url: process.env.GOOGLE_LOGIN_URI,
    google_signup_url: process.env.GOOGLE_SIGNUP_URI,
    /**
     * youtube auth config
     */
    youtube: {
        callback: process.env.YOUTUBE_AUTH_CALLBACK,
        api_key: process.env.YOUTUBE_API_KEY
    },
    /**
     * paystack configs
     */
    paystack_test_public_key: process.env.PAYSTACK_TEST_PUBLIC_KEY,
    paystack_test_secret_key: process.env.PAYSTACK_TEST_SECRET_KEY,
    paystack_live_public_key: process.env.PAYSTACK_LIVE_PUBLIC_KEY,
    paystack_live_secret_key: process.env.PAYSTACK_LIVE_SECRET_KEY,
    /**
     * videosdk configs
     */
    videosdk_api_key: process.env.VIDEOSDK_API_KEY,
    videosdk_secret_key: process.env.VIDEOSDK_SECRET_KEY,
    videosdk_api_endpoint: process.env.VIDEOSDK_API_ENDPOINT,
    videosdk_options: {
        expiresIn: '1d',
        algorithm: 'HS256'
    },

    /**
     * hms configs
     */
    hms: {
        app_secret: process.env.HMS_APP_SECRET, 
        app_access_key: process.env.HMS_APP_ACCESS_KEY, 
        api_url: process.env.HMS_API_URL,
        template_id: process.env.HMS_TEMPLATE_ID,
        token_options: {
            expiresIn: '24h',
            algorithm: 'HS256'
        } 
    },

    vapid_keys: {
        public: process.env.VAPID_PUBLIC_KEY,
        private: process.env.VAPID_PRIVATE_KEY
    },

    pusher: {
        appId: process.env.PUSHER_APPID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER
    }
};
