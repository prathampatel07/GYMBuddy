import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');

// Ensure local uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let isCloudinaryConfigured = false;

if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  isCloudinaryConfigured = true;
  console.log('☁️  Cloudinary storage integration initialized successfully.');
} else {
  console.log('📁 Cloudinary credentials not fully set. File uploads will save to local disk (/public/uploads/).');
}

/**
 * Uploads a base64 image file
 * @param {string} base64String The base64 representation of the image
 * @param {string} folder Custom folder name in Cloudinary / sub-folder locally
 * @returns {Promise<string>} The uploaded image URL
 */
export const uploadImage = async (base64String, folder = 'gymbuddy') => {
  if (!base64String) return '';

  // Clean base64 string if it contains data prefix (e.g. data:image/png;base64,)
  const mimeMatch = base64String.match(/^data:([^;]+);base64,/);
  const isBase64Format = mimeMatch !== null;
  const cleanBase64 = isBase64Format ? base64String.replace(/^data:[^;]+;base64,/, '') : base64String;
  const mimeType = isBase64Format ? mimeMatch[1] : 'image/jpeg';
  const extension = mimeType.split('/')[1] || 'jpg';

  if (isCloudinaryConfigured) {
    try {
      // Direct base64 upload to Cloudinary
      const uploadRes = await cloudinary.uploader.upload(
        `data:${mimeType};base64,${cleanBase64}`,
        {
          folder: folder,
          resource_type: 'image',
        }
      );
      return uploadRes.secure_url;
    } catch (error) {
      console.error('❌ Cloudinary upload error:', error.message);
      console.log('⚠️ Falling back to local disk file storage upload.');
    }
  }

  // Local Disk Storage Fallback
  try {
    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    
    // Write base64 buffer to file
    fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));
    
    // Return relative url path accessible via the static route
    const port = process.env.PORT || 5000;
    return `http://localhost:${port}/public/uploads/${filename}`;
  } catch (error) {
    console.error('❌ Local file upload error:', error.message);
    throw new Error('Image upload failed: ' + error.message);
  }
};
export { isCloudinaryConfigured };
