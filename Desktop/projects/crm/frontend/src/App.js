import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Tasks from './pages/Tasks';
import Employees from './pages/Employees';
import Settings from './pages/Settings';

// Reports placeholder - will be implemented in future phase
const Reports = () => (
  <div className="text-center py-8">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Reports & Analytics</h1>
    <p className="text-gray-600 mb-4">Comprehensive reporting dashboard coming soon...</p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      <div className="card">
        <h3 className="font-medium text-gray-900 mb-2">Task Reports</h3>
        <p className="text-sm text-gray-600">Employee productivity and task completion analytics</p>
      </div>
      <div className="card">
        <h3 className="font-medium text-gray-900 mb-2">Client Analytics</h3>
        <p className="text-sm text-gray-600">Client activity, revenue, and service tracking</p>
      </div>
      <div className="card">
        <h3 className="font-medium text-gray-900 mb-2">Business Insights</h3>
        <p className="text-sm text-gray-600">Growth metrics and practice performance</p>
      </div>
    </div>
  </div>
);

// Router component that uses auth context
const AppRouter = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
          } 
        />

        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/clients" 
          element={
            <ProtectedRoute>
              <Layout>
                <Clients />
              </Layout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/tasks" 
          element={
            <ProtectedRoute>
              <Layout>
                <Tasks />
              </Layout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/employees" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <Layout>
                <Employees />
              </Layout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/reports" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <Layout>
                <Reports />
              </Layout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* Default redirect */}
        <Route 
          path="/" 
          element={<Navigate to="/dashboard" replace />} 
        />

        {/* 404 page */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-gray-600 mb-4">Page not found</p>
                <button 
                  onClick={() => window.location.href = '/dashboard'}
                  className="btn-primary"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          } 
        />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AppRouter />
      </div>
    </AuthProvider>
  );
}

export default App;
