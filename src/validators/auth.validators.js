const Joi = require('joi')

const register = Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(6).required(),
    username: Joi.string().min(1).required().max(15),
    pin: Joi.number()
});

const login = Joi.object().keys({
    username: Joi.string(),
    email: Joi.string().email(),
    password: Joi.string().min(6).max(200).required()
}).xor('username', 'email')

const pin = Joi.object().keys({
    pin: Joi.number().min(4),
})

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
}
const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
}
module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  pin
};
  // forgotPassword,
  // resetPassword,
  // verifyEmail,
