const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { toJSON, paginate } = require('./plugins');

const productSchema = new Schema({
    owner:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: String,
    description: String,
    url: String,
    images: [String],
    price: {
        type: mongoose.Types.Decimal128, 
        default: 0.00, 
    },
    quantity: Number,
    paymentLinkUrl: String
}, {
    timestamps: true,
    toJSON: { getters: true },
});

productSchema.plugin(toJSON);
productSchema.plugin(paginate);

const Product = mongoose.model("Products", productSchema);

module.exports = {
    Product
};
