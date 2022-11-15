const cloudinary = require('cloudinary').v2
require('dotenv').config();

cloudinary.config({ 
    cloud_name: process.env.CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true 
});

const imageFormat = {
    resource_type: "image", 
    width: 40,
    height: 40
}

module.exports = {
    /**
     * * uploads a file to cloudinary
     * @param {string} image 
     * @returns 
     */
    uploadImage: async (image) => {
        try {
            if(!image || image == " ")  return { status: 404, message: 'image not provided' };
            const uploadedFileObject = await cloudinary.uploader.upload(image, {...imageFormat});
            const {secure_url} = uploadedFileObject;
            return {
                status: secure_url ? 200 : 404,
                message: secure_url ? 'file upload successful' : 'error uploading file',
                data: secure_url
            }
        } catch (error) {
            console.log(error);
            return { status: 500,  message: `server error: ${error.message}`}
        }
    }
}