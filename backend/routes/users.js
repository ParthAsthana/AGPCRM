const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const database = require('../database/db');
const { authenticateToken, requireAdmin, validateRequired } = require('../middleware/auth');

const router = express.Router();

// Connect to database
database.connect();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, name, email, role, phone, department, is_active, created_at, updated_at
      FROM users 
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    let params = [];
    let countParams = [];

    // Add search filter
    if (search) {
      query += ` AND (name LIKE ? OR email LIKE ?)`;
      countQuery += ` AND (name LIKE ? OR email LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam);
      countParams.push(searchParam, searchParam);
    }

    // Add role filter
    if (role) {
      query += ` AND role = ?`;
      countQuery += ` AND role = ?`;
      params.push(role);
      countParams.push(role);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [users, totalResult] = await Promise.all([
      database.all(query, params),
      database.get(countQuery, countParams)
    ]);

    const total = totalResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      users,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_count: total,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await database.get(
      'SELECT id, name, email, role, phone, department, is_active, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Fetch user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('name').isLength({ min: 2 }).trim(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['admin', 'employee'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { name, email, password, role, phone, department } = req.body;

    // Check if email already exists
    const existingUser = await database.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await database.run(
      `INSERT INTO users (name, email, password, role, phone, department) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, role, phone || null, department || null]
    );

    // Get created user (without password)
    const newUser = await database.get(
      'SELECT id, name, email, role, phone, department, is_active, created_at FROM users WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, validateRequired(['name', 'email']), async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, role, phone, department, is_active } = req.body;

    // Check if user exists
    const existingUser = await database.get('SELECT id FROM users WHERE id = ?', [userId]);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is taken by another user
    const emailTaken = await database.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (emailTaken) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Update user
    await database.run(
      `UPDATE users 
       SET name = ?, email = ?, role = ?, phone = ?, department = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [name, email, role || 'employee', phone || null, department || null, is_active !== false, userId]
    );

    // Get updated user
    const updatedUser = await database.get(
      'SELECT id, name, email, role, phone, department, is_active, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Reset user password (admin only)
router.put('/:id/reset-password', authenticateToken, requireAdmin, [
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const userId = req.params.id;
    const { newPassword } = req.body;

    // Check if user exists
    const user = await database.get('SELECT id, name FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await database.run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, userId]
    );

    res.json({ message: `Password reset successfully for ${user.name}` });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Delete user (admin only) - Soft delete by deactivating
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists
    const user = await database.get('SELECT id, name FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft delete by deactivating
    await database.run(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );

    res.json({ message: `User ${user.name} has been deactivated` });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get user statistics (admin only)
router.get('/stats/summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await Promise.all([
      database.get('SELECT COUNT(*) as total FROM users WHERE is_active = true'),
      database.get('SELECT COUNT(*) as total FROM users WHERE role = ? AND is_active = true', ['admin']),
      database.get('SELECT COUNT(*) as total FROM users WHERE role = ? AND is_active = true', ['employee']),
      database.get('SELECT COUNT(*) as total FROM users WHERE is_active = false')
    ]);

    res.json({
      total_active: stats[0].total,
      total_admins: stats[1].total,
      total_employees: stats[2].total,
      total_inactive: stats[3].total
    });

  } catch (error) {
    console.error('Fetch user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

module.exports = router; 