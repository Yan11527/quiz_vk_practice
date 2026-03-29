const { Router } = require('express');
const { requireRole } = require('../middleware/auth');

function createUploadsRouter({ auth, upload }) {
  const router = Router();

  router.post('/api/uploads/image', auth, requireRole('organizer'), (req, res) => {
    upload.single('image')(req, res, (error) => {
      if (error) {
        return res.status(400).json({ error: error.message || 'Ошибка загрузки изображения.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Файл изображения не передан.' });
      }

      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      return res.status(201).json({
        url: fileUrl,
        fileName: req.file.filename,
      });
    });
  });

  return router;
}

module.exports = {
  createUploadsRouter,
};
