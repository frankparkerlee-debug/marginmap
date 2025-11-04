import express from 'express';
import multer from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { processUpload } from '../services/ingestService.js';
import { saveRecommendations } from '../services/recommendationService.js';
import db from '../db/index.js';

const router = express.Router();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './storage/uploads';

if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype) ||
        file.originalname.match(/\.(csv|xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

// Upload and process data file
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.session.userId;
    const result = processUpload(req.file.path, req.file.originalname, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Auto-generate recommendations after successful upload
    saveRecommendations();

    res.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

// Get upload history
router.get('/history', (req, res) => {
  try {
    const uploads = db.prepare(`
      SELECT
        u.id,
        u.original_filename,
        u.uploaded_at,
        u.row_count,
        u.processing_status,
        usr.email as uploaded_by_email
      FROM uploads u
      LEFT JOIN users usr ON u.uploaded_by = usr.id
      ORDER BY u.uploaded_at DESC
      LIMIT 20
    `).all();

    res.json({ uploads });
  } catch (error) {
    console.error('Upload history error:', error);
    res.status(500).json({ error: 'Failed to fetch upload history' });
  }
});

export default router;
