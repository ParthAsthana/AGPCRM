import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  CheckSquare,
  Clock,
  AlertCircle,
  User,
  Building,
  Calendar,
  MessageSquare,
  Edit,
  Eye,
  X,
  Filter,
  MoreVertical
} from 'lucide-react';
import axios from 'axios';

const TaskModal = ({ task, isOpen, onClose, onSave, clients = [], employees = [] }) => {
  const { isAdmin, user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_id: '',
    assigned_to: '',
    priority: 'medium',
    category: '',
    due_date: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        client_id: task.client_id || '',
        assigned_to: task.assigned_to || '',
        priority: task.priority || 'medium',
        category: task.category || '',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        notes: task.notes || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        client_id: '',
        assigned_to: '',
        priority: 'medium',
        category: '',
        due_date: '',
        notes: ''
      });
    }
  }, [task]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (task) {
        await axios.put(`/tasks/${task.id}`, formData);
      } else {
        await axios.post('/tasks', formData);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Error saving task: ' + (error.response?.data?.error || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-field"
              placeholder="Enter task title..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              rows="3"
              placeholder="Describe the task..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign To *
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client (Optional)
              </label>
              <select
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="input-field"
              >
                <option value="">Select Client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.company_name && `(${client.company_name})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="input-field"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field"
              >
                <option value="">Select Category</option>
                <option value="tax_filing">Tax Filing</option>
                <option value="audit">Audit</option>
                <option value="consultation">Consultation</option>
                <option value="compliance">Compliance</option>
                <option value="bookkeeping">Bookkeeping</option>
                <option value="documentation">Documentation</option>
                <option value="follow_up">Follow Up</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field"
              rows="3"
              placeholder="Additional notes or instructions..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TaskViewModal = ({ task, isOpen, onClose, onStatusUpdate, onAddComment }) => {
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStatusUpdate = async (newStatus) => {
    setLoading(true);
    try {
      await axios.patch(`/tasks/${task.id}/status`, { status: newStatus });
      onStatusUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      await axios.post(`/tasks/${task.id}/comments`, { comment: newComment });
      setNewComment('');
      onAddComment();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{task.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Task Details */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Task Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                      {task.status?.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority?.toUpperCase()} PRIORITY
                    </span>
                  </div>

                  {task.description && (
                    <div>
                      <span className="text-sm text-gray-500">Description:</span>
                      <p className="text-gray-700 mt-1">{task.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Assigned to:</span>
                      <p className="font-medium">{task.assigned_to_name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Created by:</span>
                      <p className="font-medium">{task.assigned_by_name}</p>
                    </div>
                    {task.client_name && (
                      <div>
                        <span className="text-sm text-gray-500">Client:</span>
                        <p className="font-medium">{task.client_name}</p>
                      </div>
                    )}
                    {task.category && (
                      <div>
                        <span className="text-sm text-gray-500">Category:</span>
                        <p className="font-medium capitalize">{task.category.replace('_', ' ')}</p>
                      </div>
                    )}
                    {task.due_date && (
                      <div>
                        <span className="text-sm text-gray-500">Due Date:</span>
                        <p className="font-medium">{new Date(task.due_date).toLocaleDateString()}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-gray-500">Created:</span>
                      <p className="font-medium">{new Date(task.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {task.notes && (
                    <div>
                      <span className="text-sm text-gray-500">Notes:</span>
                      <p className="text-gray-700 mt-1 whitespace-pre-wrap">{task.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Comments */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Comments & Updates</h3>
                <div className="space-y-4">
                  {task.comments && task.comments.length > 0 ? (
                    task.comments.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{comment.user_name}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No comments yet</p>
                  )}

                  {/* Add Comment Form */}
                  <form onSubmit={handleAddComment} className="space-y-3">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="input-field"
                      rows="3"
                      placeholder="Add a comment..."
                    />
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={loading || !newComment.trim()}
                    >
                      {loading ? 'Adding...' : 'Add Comment'}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Status Actions */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Update Status</h3>
              <div className="space-y-2">
                {['pending', 'in_progress', 'under_review', 'completed', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusUpdate(status)}
                    disabled={loading || task.status === status}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      task.status === status
                        ? getStatusColor(status)
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {status.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TaskCard = ({ task, onEdit, onView, onStatusUpdate, user }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'under_review': return 'text-yellow-600';
      case 'pending': return 'text-gray-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && 
                   !['completed', 'cancelled'].includes(task.status);

  return (
    <div className={`card hover:shadow-md transition-shadow ${isOverdue ? 'border-l-4 border-red-500' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <CheckSquare className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">{task.title}</h3>
          </div>

          {task.description && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
          )}

          <div className="space-y-1 mb-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>Assigned to: {task.assigned_to_name}</span>
            </div>
            {task.client_name && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Building className="h-4 w-4" />
                <span>{task.client_name}</span>
              </div>
            )}
            {task.due_date && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                  Due: {new Date(task.due_date).toLocaleDateString()}
                  {isOverdue && ' (Overdue)'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <span className={`text-xs font-medium ${getPriorityColor(task.priority)} capitalize`}>
              {task.priority} Priority
            </span>
            <span className={`text-xs font-medium ${getStatusColor(task.status)} capitalize`}>
              {task.status?.replace('_', ' ')}
            </span>
            {task.category && (
              <span className="text-xs font-medium text-gray-500 capitalize">
                {task.category.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => onView(task)}
            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(task)}
            className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
            title="Edit Task"
          >
            <Edit className="h-4 w-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
              title="Update Status"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                <div className="py-1">
                  {['pending', 'in_progress', 'under_review', 'completed', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        onStatusUpdate(task.id, status);
                        setShowStatusMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 capitalize"
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Tasks = () => {
  const { user, isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTaskView, setSelectedTaskView] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchTasks();
    fetchClients();
    if (isAdmin) {
      fetchEmployees();
    }
  }, [searchTerm, filterStatus, filterPriority, filterAssigned]);

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);
      if (filterAssigned) params.append('assigned_to', filterAssigned);
      
      const response = await axios.get(`/tasks?${params}`);
      setTasks(response.data.tasks);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get('/clients');
      setClients(response.data.clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/users');
      setEmployees(response.data.users.filter(u => (u.role === 'employee' || u.role === 'admin') && u.is_active));
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchTaskDetails = async (taskId) => {
    try {
      const response = await axios.get(`/tasks/${taskId}`);
      return response.data.task;
    } catch (error) {
      console.error('Error fetching task details:', error);
      return null;
    }
  };

  const handleAddTask = () => {
    setSelectedTask(null);
    setShowModal(true);
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  const handleViewTask = async (task) => {
    const taskDetails = await fetchTaskDetails(task.id);
    if (taskDetails) {
      setSelectedTaskView(taskDetails);
      setShowViewModal(true);
    }
  };

  const handleSaveTask = () => {
    fetchTasks();
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await axios.patch(`/tasks/${taskId}/status`, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Error updating task status');
    }
  };

  const handleViewModalStatusUpdate = () => {
    fetchTasks();
    if (selectedTaskView) {
      fetchTaskDetails(selectedTaskView.id).then(updatedTask => {
        if (updatedTask) {
          setSelectedTaskView(updatedTask);
        }
      });
    }
  };

  const handleAddComment = () => {
    if (selectedTaskView) {
      fetchTaskDetails(selectedTaskView.id).then(updatedTask => {
        if (updatedTask) {
          setSelectedTaskView(updatedTask);
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600">Manage and track task assignments</p>
        </div>
        <button
          onClick={handleAddTask}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Create Task</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="under_review">Under Review</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="input-field"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {isAdmin && (
            <select
              value={filterAssigned}
              onChange={(e) => setFilterAssigned(e.target.value)}
              className="input-field"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center text-sm text-gray-600">
            {pagination.total_count} tasks found
          </div>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : tasks.length > 0 ? (
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={handleEditTask}
              onView={handleViewTask}
              onStatusUpdate={handleStatusUpdate}
              user={user}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-600 mb-4">Create your first task to get started</p>
          <button onClick={handleAddTask} className="btn-primary">
            Create Your First Task
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      <TaskModal
        task={selectedTask}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveTask}
        clients={clients}
        employees={employees}
      />

      {/* View Task Modal */}
      <TaskViewModal
        task={selectedTaskView}
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        onStatusUpdate={handleViewModalStatusUpdate}
        onAddComment={handleAddComment}
      />
    </div>
  );
};

export default Tasks; 