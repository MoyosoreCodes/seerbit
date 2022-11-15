const Joi = require('joi')

const getEvents = {
    query: Joi.object().keys({
        name: Joi.string(),
        category: Joi.string(),
        sortBy: Joi.string(),
        limit: Joi.number().integer(),
        page: Joi.number().integer(),
    }),
};
module.exports = {
  getEvents
};
