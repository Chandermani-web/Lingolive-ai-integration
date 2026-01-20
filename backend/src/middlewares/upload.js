import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../utils/cloudinary.js';
import e from 'express';

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = 'posts';
    let resource_type = 'auto'; // auto-detects image/video
    let format;

    if (file.mimetype.startsWith('video')) {
      resource_type = 'video';
      folder += '/videos';
    } else if (file.mimetype.startsWith('image')) {
      resource_type = 'image';
      folder += '/images';
    } else if (file.mimetype === 'application/pdf') {
      resource_type = 'raw';
      folder += '/documents';
      format = 'pdf';
    } else if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
      resource_type = 'raw';
      folder += '/archives';
      format = 'zip';
    } else if(file.mimetype.startsWith('audio')) {
      resource_type = 'audio';
      folder += '/audio';
    } else {
      resource_type = 'raw';  
      folder += '/others';
    }

    return {
      folder,
      resource_type,
    };
  },
});

const upload = multer({ storage , limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

export default upload;
