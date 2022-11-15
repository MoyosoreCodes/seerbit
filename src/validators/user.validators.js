const Joi = require('joi')
const { password } = require('./custom.validators');


const getUsers = {
	query: Joi.object().keys({
		role: Joi.string(),
		sortBy: Joi.string(),
		limit: Joi.number().integer(),
		page: Joi.number().integer(),
	}),
};

const getUserByUsername = {
	params: Joi.object().keys({
		username: Joi.string().max(15),
	}),
};

const updateUser = {
	params: Joi.object().keys({
		username: Joi.string().max(15),
	}),
	body: Joi.object()
		.keys({
			password: Joi.string().custom(password),
			name: Joi.string(),
			display_name: Joi.string(),
			phone: Joi.string(),
			address: Joi.string(),
			country: Joi.string(),
			dob: Joi.date(),
			avatar: Joi.string()
		})
		.min(1),
};

const deleteUser = {
	params: Joi.object().keys({
		username: Joi.string(),
	}),
};

module.exports = {
	getUsers,
	getUserByUsername,
	updateUser,
	deleteUser,
};