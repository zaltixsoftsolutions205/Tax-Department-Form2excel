const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a local file to Cloudinary and return the secure URL.
 */
async function uploadToCloudinary(localFilePath) {
  const result = await cloudinary.uploader.upload(localFilePath, {
    folder: 'tcts-screenshots',
    resource_type: 'image',
  });
  return result.secure_url;
}

module.exports = { uploadToCloudinary };
