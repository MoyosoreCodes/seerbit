//* validators/index.js
const userValidator = require('./user.validators')
const authValidator = require('./auth.validators')
const eventValidator = require('./event.validators')
// const post = require('./post.validator')

module.exports = {
    userValidator,
    authValidator,
    eventValidator 
}