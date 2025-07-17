const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const database = require('../database/db');
const auth = require('../middleware/auth');

// Simple multer setup
const upload = multer({
  dest: path.join(__dirname, '../uploads/documents'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'));
    }
  }
});

// Get documents for a client
router.get('/clients/:clientId', auth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const client = await database.get('SELECT id FROM clients WHERE id = ?', [clientId]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const sql = `
      SELECT 
        cd.*,
        u.name as uploaded_by_name
      FROM client_documents cd
      LEFT JOIN users u ON cd.uploaded_by = u.id
      WHERE cd.client_id = ?
      ORDER BY cd.uploaded_at DESC
    `;

    const documents = await database.all(sql, [clientId]);
    res.json({ documents: documents, count: documents.length });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Download document
router.get('/:documentId/download', auth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const document = await database.get('SELECT * FROM client_documents WHERE id = ?', [documentId]);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!fs.existsSync(document.file_path)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${document.original_name}"`);
    
    const fileStream = fs.createReadStream(document.file_path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

module.exports = router; 