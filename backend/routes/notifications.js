const express = require('express');
const router = express.Router();
const database = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Connect to database
database.connect();

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unread_only = 'false' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        n.*,
        CASE 
          WHEN n.related_type = 'task' THEN t.title
          WHEN n.related_type = 'client' THEN c.name
          ELSE NULL
        END as related_title
      FROM notifications n
      LEFT JOIN tasks t ON n.related_type = 'task' AND n.related_id = t.id
      LEFT JOIN clients c ON n.related_type = 'client' AND n.related_id = c.id
      WHERE n.user_id = ?
    `;
    
    let countQuery = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
    let params = [req.user.id];
    let countParams = [req.user.id];
    
    // Filter by unread only
    if (unread_only === 'true') {
      query += ' AND n.is_read = false';
      countQuery += ' AND is_read = false';
    }
    
    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const [notifications, totalResult] = await Promise.all([
      database.all(query, params),
      database.get(countQuery, countParams)
    ]);
    
    res.json({
      notifications,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(totalResult.total / limit),
        total_count: totalResult.total,
        per_page: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread notification count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const result = await database.get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = false',
      [req.user.id]
    );
    
    res.json({ unread_count: parseInt(result.count) });
    
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify notification belongs to user
    const notification = await database.get(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await database.run(
      'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Notification marked as read' });
    
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await database.run(
      'UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = false',
      [req.user.id]
    );
    
    res.json({ message: 'All notifications marked as read' });
    
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify notification belongs to user
    const notification = await database.get(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await database.run('DELETE FROM notifications WHERE id = ?', [id]);
    
    res.json({ message: 'Notification deleted successfully' });
    
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// DEBUG: Create test notification
router.post('/debug-create', authenticateToken, async (req, res) => {
  try {
    const { user_id, title, message } = req.body;
    
    const result = await database.run(
      `INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id || req.user.id, title || 'Debug Test', message || 'Testing notification creation', 'debug', null, null]
    );
    
    res.json({ 
      message: 'Debug notification created',
      notification_id: result.id
    });
    
  } catch (error) {
    console.error('Debug notification creation error:', error);
    res.status(500).json({ error: 'Failed to create debug notification' });
  }
});

module.exports = router; 