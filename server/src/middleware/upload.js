const multer = require('multer');
const path = require('path');
const { UPLOADS_DIR } = require('../config');

function createUploadMiddleware() {
  return multer({
    storage: multer.diskStorage({
      destination: (_, __, cb) => cb(null, UPLOADS_DIR),
      filename: (_, file, cb) => {
        const sourceExt = path.extname(file.originalname || '').toLowerCase();
        const allowed = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
        const ext = allowed.has(sourceExt) ? sourceExt : '.jpg';
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
      },
    }),
    fileFilter: (_, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        cb(new Error('Можно загружать только изображения.'));
        return;
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });
}

module.exports = {
  createUploadMiddleware,
};
