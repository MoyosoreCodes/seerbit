const createHttpError = require('http-errors')
const Joi = require('joi')
const _ = require('lodash');

module.exports = (schema) => {
    // Joi validation options

    const _validationOptions = {
        abortEarly: false,  // abort after the last validation error
        allowUnknown: true, // allow unknown keys that will be ignored
        stripUnknown: true  // remove unknown keys from the validated data
    };

    return async (req, res, next) => {
        // console.log(schema)
        if (schema) {
            try {
                await schema.validateAsync(req.body, _validationOptions);
                next()
            } catch (e) { 
                if(e.isJoi) {
                    next(createHttpError(422, {message: e.message}))
                }
                next(e)
            }
        }
    }
}
