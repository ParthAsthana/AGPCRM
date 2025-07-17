const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const database = require('../database/db');
const { authenticateToken, requireAdmin, validateRequired } = require('../middleware/auth');

const router = express.Router();

// Connect to database
database.connect();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/clients');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF, Word docs, Excel, and images
    const allowedTypes = /\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, Excel, and image files are allowed.'));
    }
  }
});

// Get all clients with pagination and search
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '', assigned_to = '' } = req.query;
    const offset = (page - 1) * limit;
    const isAdmin = req.user.role === 'admin';

    let query = `
      SELECT c.*, u.name as assigned_user_name
      FROM clients c
      LEFT JOIN users u ON c.assigned_to = u.id
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM clients c WHERE 1=1';
    let params = [];
    let countParams = [];

    // Non-admin users can only see clients assigned to them
    if (!isAdmin) {
      query += ` AND c.assigned_to = ?`;
      countQuery += ` AND c.assigned_to = ?`;
      params.push(req.user.id);
      countParams.push(req.user.id);
    }

    // Add search filter
    if (search) {
      query += ` AND (c.name LIKE ? OR c.company_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)`;
      countQuery += ` AND (c.name LIKE ? OR c.company_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
      countParams.push(searchParam, searchParam, searchParam, searchParam);
    }

    // Add status filter
    if (status) {
      query += ` AND c.status = ?`;
      countQuery += ` AND c.status = ?`;
      params.push(status);
      countParams.push(status);
    }

    // Add assigned_to filter (admin only)
    if (assigned_to && isAdmin) {
      query += ` AND c.assigned_to = ?`;
      countQuery += ` AND c.assigned_to = ?`;
      params.push(assigned_to);
      countParams.push(assigned_to);
    }

    query += ` ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [clients, totalResult] = await Promise.all([
      database.all(query, params),
      database.get(countQuery, countParams)
    ]);

    const total = totalResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      clients,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_count: total,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Fetch clients error:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Get client by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const clientId = req.params.id;
    const isAdmin = req.user.role === 'admin';

    let query = `
      SELECT c.*, u.name as assigned_user_name
      FROM clients c
      LEFT JOIN users u ON c.assigned_to = u.id
      WHERE c.id = ?
    `;
    let params = [clientId];

    // Non-admin users can only access their assigned clients
    if (!isAdmin) {
      query += ` AND c.assigned_to = ?`;
      params.push(req.user.id);
    }

    const client = await database.get(query, params);

    if (!client) {
      return res.status(404).json({ error: 'Client not found or access denied' });
    }

    // Get client documents
    const documents = await database.all(
      `SELECT id, original_name, category, description, file_size, uploaded_at, u.name as uploaded_by_name
       FROM client_documents cd
       LEFT JOIN users u ON cd.uploaded_by = u.id
       WHERE cd.client_id = ?
       ORDER BY cd.uploaded_at DESC`,
      [clientId]
    );

    res.json({ client: { ...client, documents } });

  } catch (error) {
    console.error('Fetch client error:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// Create new client
router.post('/', authenticateToken, validateRequired(['name']), async (req, res) => {
  try {
    const {
      name, company_name, email, phone, business_type, pan_number,
      gstin, tan_number, address, city, state, pincode,
      financial_year_end, assigned_to, notes
    } = req.body;

    const isAdmin = req.user.role === 'admin';
    const actualAssignedTo = isAdmin ? (assigned_to || req.user.id) : req.user.id;

    // Validate assigned_to user exists if provided
    if (assigned_to && isAdmin) {
      const assignedUser = await database.get('SELECT id FROM users WHERE id = ? AND is_active = true', [assigned_to]);
      if (!assignedUser) {
        return res.status(400).json({ error: 'Assigned user not found or inactive' });
      }
    }

    const result = await database.run(
      `INSERT INTO clients (
        name, company_name, email, phone, business_type, pan_number,
        gstin, tan_number, address, city, state, pincode,
        financial_year_end, assigned_to, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, company_name || null, email || null, phone || null,
        business_type || null, pan_number || null, gstin || null,
        tan_number || null, address || null, city || null,
        state || null, pincode || null, financial_year_end || '31-03',
        actualAssignedTo, notes || null
      ]
    );

    const newClient = await database.get(
      `SELECT c.*, u.name as assigned_user_name
       FROM clients c
       LEFT JOIN users u ON c.assigned_to = u.id
       WHERE c.id = ?`,
      [result.id]
    );

    res.status(201).json({
      message: 'Client created successfully',
      client: newClient
    });

  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Update client
router.put('/:id', authenticateToken, validateRequired(['name']), async (req, res) => {
  try {
    const clientId = req.params.id;
    const isAdmin = req.user.role === 'admin';

    // Check if client exists and user has access
    let checkQuery = 'SELECT id, assigned_to FROM clients WHERE id = ?';
    let checkParams = [clientId];

    if (!isAdmin) {
      checkQuery += ' AND assigned_to = ?';
      checkParams.push(req.user.id);
    }

    const existingClient = await database.get(checkQuery, checkParams);
    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found or access denied' });
    }

    const {
      name, company_name, email, phone, business_type, pan_number,
      gstin, tan_number, address, city, state, pincode,
      financial_year_end, status, assigned_to, notes, last_conversation
    } = req.body;

    // Only admin can change assigned_to
    const actualAssignedTo = isAdmin ? (assigned_to || existingClient.assigned_to) : existingClient.assigned_to;

    await database.run(
      `UPDATE clients SET 
        name = ?, company_name = ?, email = ?, phone = ?, business_type = ?,
        pan_number = ?, gstin = ?, tan_number = ?, address = ?, city = ?,
        state = ?, pincode = ?, financial_year_end = ?, status = ?,
        assigned_to = ?, notes = ?, last_conversation = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name, company_name || null, email || null, phone || null,
        business_type || null, pan_number || null, gstin || null,
        tan_number || null, address || null, city || null,
        state || null, pincode || null, financial_year_end || '31-03',
        status || 'active', actualAssignedTo, notes || null,
        last_conversation || null, clientId
      ]
    );

    const updatedClient = await database.get(
      `SELECT c.*, u.name as assigned_user_name
       FROM clients c
       LEFT JOIN users u ON c.assigned_to = u.id
       WHERE c.id = ?`,
      [clientId]
    );

    res.json({
      message: 'Client updated successfully',
      client: updatedClient
    });

  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// Upload document for client
router.post('/:id/documents', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    const clientId = req.params.id;
    const isAdmin = req.user.role === 'admin';

    // Check if client exists and user has access
    let checkQuery = 'SELECT id FROM clients WHERE id = ?';
    let checkParams = [clientId];

    if (!isAdmin) {
      checkQuery += ' AND assigned_to = ?';
      checkParams.push(req.user.id);
    }

    const client = await database.get(checkQuery, checkParams);
    if (!client) {
      return res.status(404).json({ error: 'Client not found or access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { category, description } = req.body;

    const result = await database.run(
      `INSERT INTO client_documents (
        client_id, filename, original_name, file_path, file_size,
        mime_type, category, description, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId, req.file.filename, req.file.originalname,
        req.file.path, req.file.size, req.file.mimetype,
        category || 'general', description || null, req.user.id
      ]
    );

    const document = await database.get(
      `SELECT cd.*, u.name as uploaded_by_name
       FROM client_documents cd
       LEFT JOIN users u ON cd.uploaded_by = u.id
       WHERE cd.id = ?`,
      [result.id]
    );

    res.status(201).json({
      message: 'Document uploaded successfully',
      document
    });

  } catch (error) {
    console.error('Upload document error:', error);
    if (req.file) {
      // Clean up uploaded file on error
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Delete client document
router.delete('/:id/documents/:docId', authenticateToken, async (req, res) => {
  try {
    const { id: clientId, docId } = req.params;
    const isAdmin = req.user.role === 'admin';

    // Check if document exists and user has access
    let query = `
      SELECT cd.*, c.assigned_to
      FROM client_documents cd
      JOIN clients c ON cd.client_id = c.id
      WHERE cd.id = ? AND cd.client_id = ?
    `;
    let params = [docId, clientId];

    if (!isAdmin) {
      query += ' AND c.assigned_to = ?';
      params.push(req.user.id);
    }

    const document = await database.get(query, params);
    if (!document) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    // Delete file from filesystem
    if (fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }

    // Delete from database
    await database.run('DELETE FROM client_documents WHERE id = ?', [docId]);

    res.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Get client statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    let whereClause = '';
    let params = [];
    let documentsWhereClause = '';
    let documentsParams = [];

    if (!isAdmin) {
      whereClause = 'WHERE assigned_to = ?';
      documentsWhereClause = 'WHERE c.assigned_to = ?';
      params.push(req.user.id);
      documentsParams.push(req.user.id);
    }

    const stats = await Promise.all([
      database.get(`SELECT COUNT(*) as total FROM clients ${whereClause}`, params),
      database.get(`SELECT COUNT(*) as total FROM clients ${whereClause ? whereClause + ' AND' : 'WHERE'} status = ?`, [...params, 'active']),
      database.get(`SELECT COUNT(*) as total FROM clients ${whereClause ? whereClause + ' AND' : 'WHERE'} status = ?`, [...params, 'inactive']),
      database.get(`SELECT COUNT(*) as total FROM client_documents cd JOIN clients c ON cd.client_id = c.id ${documentsWhereClause}`, documentsParams)
    ]);

    res.json({
      total_clients: parseInt(stats[0].total),
      active_clients: parseInt(stats[1].total),
      inactive_clients: parseInt(stats[2].total),
      total_documents: parseInt(stats[3].total)
    });

  } catch (error) {
    console.error('Fetch client stats error:', error);
    res.status(500).json({ error: 'Failed to fetch client statistics' });
  }
});

// Delete client (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const clientId = req.params.id;

    const client = await database.get('SELECT id, name FROM clients WHERE id = ?', [clientId]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get all documents for cleanup
    const documents = await database.all('SELECT file_path FROM client_documents WHERE client_id = ?', [clientId]);

    // Delete files from filesystem
    documents.forEach(doc => {
      if (fs.existsSync(doc.file_path)) {
        fs.unlinkSync(doc.file_path);
      }
    });

    // Delete from database (cascading will handle related records)
    await database.run('DELETE FROM client_documents WHERE client_id = ?', [clientId]);
    await database.run('DELETE FROM clients WHERE id = ?', [clientId]);

    res.json({ message: `Client ${client.name} and all related data deleted successfully` });

  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

module.exports = router; 