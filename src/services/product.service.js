const {Product} = require('../models/product.model');
const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');
const logger = require('../config/logger')

const select_options = ['']
// done
module.exports = {
    create: async (params, { id }) => {
        const product = new Product(params);
        product.owner = id

        return await product.save();
    },

    get: async (params) => {
        const product = await Product.findOne(params).populate('owner', 'username avatar _id')
        return product
    },

    queryProduct: async(filter, options) => {
        const products = await Product.paginate(filter, options);
        return products
    },

    update: async(query, params) => {
        const product = await Product.findOneAndUpdate(query, params, { new: true })
        return product
    },

    delete: async(productID) => {
        await Product.deleteOne({_id: productID});
    }
}