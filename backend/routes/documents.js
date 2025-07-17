const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const database = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Test route to ensure basic routing works
router.get('/test', (req, res) => {
  res.json({ message: 'Documents route is working' });
});

// Upload document for a client
router.post('/clients/:clientId/upload', authenticateToken, (req, res) => {
  upload.single('document')(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: err.message });
    }

    try {
      const { clientId } = req.params;
      const { category = 'general', description = '' } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Check if client exists
      const client = await database.get('SELECT id FROM clients WHERE id = ?', [clientId]);
      if (!client) {
        // Clean up uploaded file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ error: 'Client not found' });
      }

      // Save document record to database
      const sql = database.type === 'postgresql' 
        ? `INSERT INTO client_documents (client_id, filename, original_name, file_path, file_size, mime_type, category, description, uploaded_by) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`
        : `INSERT INTO client_documents (client_id, filename, original_name, file_path, file_size, mime_type, category, description, uploaded_by) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const params = [
        clientId,
        req.file.filename,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        category,
        description,
        req.user.id
      ];

      const result = database.type === 'postgresql' 
        ? await database.get(sql, params)
        : await database.run(sql, params);

      const documentId = database.type === 'postgresql' ? result.id : result.lastID;

      // Get the created document
      const document = await database.get(
        'SELECT * FROM client_documents WHERE id = ?', 
        [documentId]
      );

      res.status(201).json({
        message: 'Document uploaded successfully',
        document: document
      });

    } catch (error) {
      console.error('Database error:', error);
      // Clean up uploaded file if database save fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Failed to save document' });
    }
  });
});

// Get documents for a client (without multer dependency)
router.get('/clients/:clientId', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Check if client exists
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

    res.json({
      documents: documents,
      count: documents.length
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Download document
router.get('/:documentId/download', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await database.get(
      'SELECT * FROM client_documents WHERE id = ?',
      [documentId]
    );

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!fs.existsSync(document.file_path)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Set appropriate headers for PDF viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${document.original_name}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(document.file_path);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// Delete document
router.delete('/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await database.get(
      'SELECT * FROM client_documents WHERE id = ?',
      [documentId]
    );

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from filesystem
    if (fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }

    // Delete record from database
    await database.run('DELETE FROM client_documents WHERE id = ?', [documentId]);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router; 