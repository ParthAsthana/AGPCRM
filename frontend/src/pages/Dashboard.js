import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Briefcase,
  CheckSquare,
  Clock,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import axios from 'axios';

const StatCard = ({ title, value, icon: Icon, color = 'primary', loading = false }) => {
  return (
    <div className="card">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [recentTasks, setRecentTasks] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [clientsStats, tasksStats, usersStats] = await Promise.all([
          axios.get('/clients/stats/summary'),
          axios.get('/tasks/stats/summary'),
          isAdmin ? axios.get('/users/stats/summary') : Promise.resolve({ data: {} })
        ]);

        setStats({
          clients: clientsStats.data,
          tasks: tasksStats.data,
          users: usersStats.data
        });

        // Fetch recent tasks
        const tasksResponse = await axios.get('/tasks?limit=5');
        setRecentTasks(tasksResponse.data.tasks || []);

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAdmin]);

  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'under_review': return 'text-yellow-600';
      case 'pending': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getTaskPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your {isAdmin ? 'practice' : 'tasks'} today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Clients"
          value={stats.clients?.total_clients || 0}
          icon={Briefcase}
          color="blue"
          loading={loading}
        />
        <StatCard
          title="Active Tasks"
          value={stats.tasks?.pending_tasks + stats.tasks?.in_progress_tasks || 0}
          icon={CheckSquare}
          color="green"
          loading={loading}
        />
        <StatCard
          title="Urgent Tasks"
          value={stats.tasks?.urgent_tasks || 0}
          icon={AlertCircle}
          color="red"
          loading={loading}
        />
        {isAdmin && (
          <StatCard
            title="Active Employees"
            value={stats.users?.total_employees || 0}
            icon={Users}
            color="purple"
            loading={loading}
          />
        )}
      </div>

      {/* Additional Stats for Admin */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Completed Tasks"
            value={stats.tasks?.completed_tasks || 0}
            icon={TrendingUp}
            color="green"
            loading={loading}
          />
          <StatCard
            title="Overdue Tasks"
            value={stats.tasks?.overdue_tasks || 0}
            icon={Clock}
            color="red"
            loading={loading}
          />
          <StatCard
            title="Total Tasks"
            value={stats.tasks?.total_tasks || 0}
            icon={CheckSquare}
            color="blue"
            loading={loading}
          />
        </div>
      )}

      {/* Recent Tasks */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
          <button
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            onClick={() => window.location.href = '/tasks'}
          >
            View all
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : recentTasks.length > 0 ? (
          <div className="space-y-4">
            {recentTasks.map((task) => (
              <div key={task.id} className="border-l-4 border-primary-200 pl-4 py-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">{task.title}</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-medium ${getTaskPriorityColor(task.priority)} capitalize`}>
                      {task.priority}
                    </span>
                    <span className={`text-xs font-medium ${getTaskStatusColor(task.status)} capitalize`}>
                      {task.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {task.client_name ? `Client: ${task.client_name}` : 'No client assigned'}
                  {task.assigned_to_name && ` • Assigned to: ${task.assigned_to_name}`}
                </p>
                {task.due_date && (
                  <p className="text-xs text-gray-500 mt-1">
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No recent tasks found</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.href = '/clients/new'}
            className="btn-primary text-left p-4 rounded-lg"
          >
            <Briefcase className="h-5 w-5 mb-2" />
            <span className="block font-medium">Add New Client</span>
            <span className="block text-xs opacity-75">Create a new client profile</span>
          </button>
          <button
            onClick={() => window.location.href = '/tasks/new'}
            className="btn-secondary text-left p-4 rounded-lg"
          >
            <CheckSquare className="h-5 w-5 mb-2" />
            <span className="block font-medium">Create Task</span>
            <span className="block text-xs opacity-75">Assign a new task</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => window.location.href = '/employees/new'}
              className="btn-secondary text-left p-4 rounded-lg"
            >
              <Users className="h-5 w-5 mb-2" />
              <span className="block font-medium">Add Employee</span>
              <span className="block text-xs opacity-75">Register new team member</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 