const userService = require('../services/user.service');
const productService = require('../services/product.service')
const { ApiError } = require('../utils/ApiError');
const pick = require('../utils/pick');
const httpStatus = require('http-status');
const logger = require('../config/logger')

module.exports = {
    create: async (req, res, next) => {
        try {
            const product = await productService.create(req.body, req.user)
            await userService.update({ _id:req.user.id }, { $push: { products: product.id } })

            res.status(httpStatus.CREATED).json({
                message:`product created`,
                data: product
            })
        } catch (error) {
            logger.error(error)
            next(error)
        }
    },

    get: async (req, res, next) => {
        try {
            const product = await productService.get({ _id: req.params.productID })
            res.status(httpStatus.OK).json({
                message:`successful`,
                data: product
            })
        } catch (error) {
            logger.error(error.message)
            next(error)
        }
    },

    list: async (req, res, next) => {
        try {
            const filter = pick(req.query, ['name', 'tags']);
            let options = pick(req.query, ['sortBy', 'limit', 'page']);
            options['populate'] = [{path: 'owner', select: 'username name avatar'}]

            const product = await productService.queryProduct(filter, options);

            res.status(httpStatus.OK).json({
                message:`successful`,
                ...product
            })
        } catch (error) {
            logger.error(error.message)
            next(error)
        }
    },

    update: async (req, res, next) => {
        try {
            product = await productService.update({ _id: req.params.productID }, params = req.body);
            res.status(httpStatus.OK).json({
                message: 'successfully updated product',
                data: product
            })
        } catch (error) {
            logger.error(error.message)
            next(error)
        }
    },

    delete: async (req, res, next) => {
        try {
            const product = productService.get({_id: req.params.productID, owner: req.user.id})
            if (!product) throw new ApiError(httpStatus.NOT_FOUND, "product not found");

            await productService.delete(req.params.productID);
            res.status(httpStatus.ACCEPTED).json({message: 'successfully removed product'})
        } catch (error) {
            logger.error(error.message)
            next(error)
        }
    }
}