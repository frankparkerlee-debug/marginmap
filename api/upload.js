const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { processUpload } = require('../services/ingestService');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'storage', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    cb(null, `${timestamp}-${sanitized}`);
  }
});

const upload = multer({ storage });

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }
    const mapping = req.body.mapping ? JSON.parse(req.body.mapping) : null;
    const result = await processUpload(req.file, mapping);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
