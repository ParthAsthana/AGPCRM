const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../database/db');
const { authenticateToken, requireAdmin, validateRequired } = require('../middleware/auth');

const router = express.Router();

// Connect to database
database.connect();

// Get all tasks with pagination and filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      status = '', 
      priority = '', 
      assigned_to = '', 
      category = '',
      client_id = ''
    } = req.query;
    
    const offset = (page - 1) * limit;
    const isAdmin = req.user.role === 'admin';

    let query = `
      SELECT 
        t.*,
        c.name as client_name,
        c.company_name as client_company,
        u_assigned.name as assigned_to_name,
        u_assigned_by.name as assigned_by_name
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      LEFT JOIN users u_assigned_by ON t.assigned_by = u_assigned_by.id
      WHERE 1=1
    `;
    
    let countQuery = 'SELECT COUNT(*) as total FROM tasks t WHERE 1=1';
    let params = [];
    let countParams = [];

    // Non-admin users can only see tasks assigned to them or tasks they assigned
    if (!isAdmin) {
      query += ` AND (t.assigned_to = ? OR t.assigned_by = ?)`;
      countQuery += ` AND (t.assigned_to = ? OR t.assigned_by = ?)`;
      params.push(req.user.id, req.user.id);
      countParams.push(req.user.id, req.user.id);
    }

    // Add search filter
    if (search) {
      query += ` AND (t.title LIKE ? OR t.description LIKE ? OR c.name LIKE ?)`;
      countQuery += ` AND (t.title LIKE ? OR t.description LIKE ? OR c.name LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
      countParams.push(searchParam, searchParam, searchParam);
    }

    // Add status filter
    if (status) {
      query += ` AND t.status = ?`;
      countQuery += ` AND t.status = ?`;
      params.push(status);
      countParams.push(status);
    }

    // Add priority filter
    if (priority) {
      query += ` AND t.priority = ?`;
      countQuery += ` AND t.priority = ?`;
      params.push(priority);
      countParams.push(priority);
    }

    // Add assigned_to filter (admin only)
    if (assigned_to && isAdmin) {
      query += ` AND t.assigned_to = ?`;
      countQuery += ` AND t.assigned_to = ?`;
      params.push(assigned_to);
      countParams.push(assigned_to);
    }

    // Add category filter
    if (category) {
      query += ` AND t.category = ?`;
      countQuery += ` AND t.category = ?`;
      params.push(category);
      countParams.push(category);
    }

    // Add client filter
    if (client_id) {
      query += ` AND t.client_id = ?`;
      countQuery += ` AND t.client_id = ?`;
      params.push(client_id);
      countParams.push(client_id);
    }

    query += ` ORDER BY 
      CASE t.priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      t.due_date ASC,
      t.created_at DESC 
      LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [tasks, totalResult] = await Promise.all([
      database.all(query, params),
      database.get(countQuery, countParams)
    ]);

    const total = totalResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      tasks,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_count: total,
        per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Fetch tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get task by ID with comments
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const isAdmin = req.user.role === 'admin';

    let query = `
      SELECT 
        t.*,
        c.name as client_name,
        c.company_name as client_company,
        u_assigned.name as assigned_to_name,
        u_assigned_by.name as assigned_by_name
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
      LEFT JOIN users u_assigned_by ON t.assigned_by = u_assigned_by.id
      WHERE t.id = ?
    `;
    let params = [taskId];

    // Non-admin users can only access their assigned tasks or tasks they created
    if (!isAdmin) {
      query += ` AND (t.assigned_to = ? OR t.assigned_by = ?)`;
      params.push(req.user.id, req.user.id);
    }

    const task = await database.get(query, params);

    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    // Get task comments
    const comments = await database.all(
      `SELECT tc.*, u.name as user_name
       FROM task_comments tc
       LEFT JOIN users u ON tc.user_id = u.id
       WHERE tc.task_id = ?
       ORDER BY tc.created_at ASC`,
      [taskId]
    );

    res.json({ task: { ...task, comments } });

  } catch (error) {
    console.error('Fetch task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create new task
router.post('/', authenticateToken, validateRequired(['title', 'assigned_to']), async (req, res) => {
  try {
    const {
      title, description, client_id, assigned_to, priority,
      category, due_date, notes
    } = req.body;

    // Validate assigned_to user exists
    const assignedUser = await database.get('SELECT id, name FROM users WHERE id = ? AND is_active = true', [assigned_to]);
    if (!assignedUser) {
      return res.status(400).json({ error: 'Assigned user not found or inactive' });
    }

    // Validate client if provided
    if (client_id) {
      const client = await database.get('SELECT id FROM clients WHERE id = ?', [client_id]);
      if (!client) {
        return res.status(400).json({ error: 'Client not found' });
      }
    }

    const result = await database.run(
      `INSERT INTO tasks (
        title, description, client_id, assigned_to, assigned_by,
        priority, category, due_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, description || null, client_id || null, assigned_to,
        req.user.id, priority || 'medium', category || null,
        due_date || null, notes || null
      ]
    );

    const newTask = await database.get(
      `SELECT 
        t.*,
        c.name as client_name,
        c.company_name as client_company,
        u_assigned.name as assigned_to_name,
        u_assigned_by.name as assigned_by_name
       FROM tasks t
       LEFT JOIN clients c ON t.client_id = c.id
       LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
       LEFT JOIN users u_assigned_by ON t.assigned_by = u_assigned_by.id
       WHERE t.id = ?`,
      [result.id]
    );

    res.status(201).json({
      message: 'Task created successfully',
      task: newTask
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', authenticateToken, validateRequired(['title']), async (req, res) => {
  try {
    const taskId = req.params.id;
    const isAdmin = req.user.role === 'admin';

    // Check if task exists and user has access
    let checkQuery = 'SELECT id, assigned_to, assigned_by, status FROM tasks WHERE id = ?';
    let checkParams = [taskId];

    if (!isAdmin) {
      checkQuery += ' AND (assigned_to = ? OR assigned_by = ?)';
      checkParams.push(req.user.id, req.user.id);
    }

    const existingTask = await database.get(checkQuery, checkParams);
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    const {
      title, description, client_id, assigned_to, priority,
      status, category, due_date, notes
    } = req.body;

    // Only admin or task creator can change assigned_to
    let actualAssignedTo = existingTask.assigned_to;
    if (assigned_to && (isAdmin || req.user.id === existingTask.assigned_by)) {
      const assignedUser = await database.get('SELECT id FROM users WHERE id = ? AND is_active = true', [assigned_to]);
      if (!assignedUser) {
        return res.status(400).json({ error: 'Assigned user not found or inactive' });
      }
      actualAssignedTo = assigned_to;
    }

    // Set completed_at when status changes to completed
    let completedAt = null;
    if (status === 'completed' && existingTask.status !== 'completed') {
      completedAt = new Date().toISOString();
    } else if (status !== 'completed') {
      completedAt = null;
    }

    await database.run(
      `UPDATE tasks SET 
        title = ?, description = ?, client_id = ?, assigned_to = ?,
        priority = ?, status = ?, category = ?, due_date = ?, notes = ?,
        completed_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title, description || null, client_id || null, actualAssignedTo,
        priority || 'medium', status || 'pending', category || null,
        due_date || null, notes || null, completedAt, taskId
      ]
    );

    const updatedTask = await database.get(
      `SELECT 
        t.*,
        c.name as client_name,
        c.company_name as client_company,
        u_assigned.name as assigned_to_name,
        u_assigned_by.name as assigned_by_name
       FROM tasks t
       LEFT JOIN clients c ON t.client_id = c.id
       LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
       LEFT JOIN users u_assigned_by ON t.assigned_by = u_assigned_by.id
       WHERE t.id = ?`,
      [taskId]
    );

    res.json({
      message: 'Task updated successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Add comment to task
router.post('/:id/comments', authenticateToken, validateRequired(['comment']), async (req, res) => {
  try {
    const taskId = req.params.id;
    const { comment } = req.body;
    const isAdmin = req.user.role === 'admin';

    // Check if task exists and user has access
    let checkQuery = 'SELECT id FROM tasks WHERE id = ?';
    let checkParams = [taskId];

    if (!isAdmin) {
      checkQuery += ' AND (assigned_to = ? OR assigned_by = ?)';
      checkParams.push(req.user.id, req.user.id);
    }

    const task = await database.get(checkQuery, checkParams);
    if (!task) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    const result = await database.run(
      'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
      [taskId, req.user.id, comment]
    );

    const newComment = await database.get(
      `SELECT tc.*, u.name as user_name
       FROM task_comments tc
       LEFT JOIN users u ON tc.user_id = u.id
       WHERE tc.id = ?`,
      [result.id]
    );

    res.status(201).json({
      message: 'Comment added successfully',
      comment: newComment
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Update task status (quick endpoint for status changes)
router.patch('/:id/status', authenticateToken, validateRequired(['status']), async (req, res) => {
  try {
    const taskId = req.params.id;
    const { status } = req.body;
    const isAdmin = req.user.role === 'admin';

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'under_review', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check if task exists and user has access
    let checkQuery = 'SELECT id, status FROM tasks WHERE id = ?';
    let checkParams = [taskId];

    if (!isAdmin) {
      checkQuery += ' AND (assigned_to = ? OR assigned_by = ?)';
      checkParams.push(req.user.id, req.user.id);
    }

    const existingTask = await database.get(checkQuery, checkParams);
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    // Set completed_at when status changes to completed
    let completedAt = null;
    if (status === 'completed' && existingTask.status !== 'completed') {
      completedAt = new Date().toISOString();
    }

    await database.run(
      'UPDATE tasks SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, completedAt, taskId]
    );

    res.json({ message: 'Task status updated successfully' });

  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// Get task statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    let whereClause = '';
    let params = [];

    if (!isAdmin) {
      whereClause = 'WHERE (assigned_to = ? OR assigned_by = ?)';
      params.push(req.user.id, req.user.id);
    }

    const stats = await Promise.all([
      database.get(`SELECT COUNT(*) as total FROM tasks ${whereClause}`, params),
      database.get(`SELECT COUNT(*) as total FROM tasks ${whereClause ? whereClause + ' AND' : 'WHERE'} status = 'pending'`, [...params]),
      database.get(`SELECT COUNT(*) as total FROM tasks ${whereClause ? whereClause + ' AND' : 'WHERE'} status = 'in_progress'`, [...params]),
      database.get(`SELECT COUNT(*) as total FROM tasks ${whereClause ? whereClause + ' AND' : 'WHERE'} status = 'completed'`, [...params]),
      database.get(`SELECT COUNT(*) as total FROM tasks ${whereClause ? whereClause + ' AND' : 'WHERE'} priority = 'urgent'`, [...params]),
      database.get(`SELECT COUNT(*) as total FROM tasks ${whereClause ? whereClause + ' AND' : 'WHERE'} due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')`, [...params])
    ]);

    res.json({
      total_tasks: stats[0].total,
      pending_tasks: stats[1].total,
      in_progress_tasks: stats[2].total,
      completed_tasks: stats[3].total,
      urgent_tasks: stats[4].total,
      overdue_tasks: stats[5].total
    });

  } catch (error) {
    console.error('Fetch task stats error:', error);
    res.status(500).json({ error: 'Failed to fetch task statistics' });
  }
});

// Get employee workload (admin only)
router.get('/stats/workload', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const workload = await database.all(`
      SELECT 
        u.id,
        u.name,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN t.priority = 'urgent' THEN 1 END) as urgent_tasks
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to
      WHERE u.role = 'employee' AND u.is_active = true
      GROUP BY u.id, u.name
      ORDER BY total_tasks DESC
    `);

    res.json({ workload });

  } catch (error) {
    console.error('Fetch workload stats error:', error);
    res.status(500).json({ error: 'Failed to fetch workload statistics' });
  }
});

// Delete task (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const taskId = req.params.id;

    const task = await database.get('SELECT id, title FROM tasks WHERE id = ?', [taskId]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Delete comments first
    await database.run('DELETE FROM task_comments WHERE task_id = ?', [taskId]);
    
    // Delete task
    await database.run('DELETE FROM tasks WHERE id = ?', [taskId]);

    res.json({ message: `Task "${task.title}" and all related data deleted successfully` });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router; 