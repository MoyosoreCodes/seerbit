const mongoose = require('mongoose');
const {Schema} = mongoose;

const categoryObject = {
    name: {type: String, trim:true, required: true, index:true},
    description: {type:String, trim: true},
}

const categorySchema = new Schema(categoryObject, {timestamps: true});

const Category = mongoose.model('category', categorySchema);

module.exports = {Category}