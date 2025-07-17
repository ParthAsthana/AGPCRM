import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  Building,
  Phone,
  Mail,
  FileText,
  Edit,
  Trash2,
  Upload,
  Eye,
  Filter,
  X,
  Save,
  User
} from 'lucide-react';
import axios from 'axios';

const ClientModal = ({ client, isOpen, onClose, onSave, employees = [] }) => {
  const { isAdmin } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    business_type: '',
    pan_number: '',
    gstin: '',
    tan_number: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    financial_year_end: '31-03',
    assigned_to: '',
    notes: '',
    last_conversation: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData({ ...client });
    } else {
      setFormData({
        name: '',
        company_name: '',
        email: '',
        phone: '',
        business_type: '',
        pan_number: '',
        gstin: '',
        tan_number: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        financial_year_end: '31-03',
        assigned_to: '',
        notes: '',
        last_conversation: ''
      });
    }
  }, [client]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (client) {
        await axios.put(`/clients/${client.id}`, formData);
      } else {
        await axios.post('/clients', formData);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Error saving client: ' + (error.response?.data?.error || 'Unknown error'));
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
            {client ? 'Edit Client' : 'Add New Client'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
              </label>
              <select
                value={formData.business_type}
                onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                className="input-field"
              >
                <option value="">Select Type</option>
                <option value="proprietorship">Proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="private_limited">Private Limited</option>
                <option value="public_limited">Public Limited</option>
                <option value="llp">LLP</option>
                <option value="individual">Individual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Financial Year End
              </label>
              <select
                value={formData.financial_year_end}
                onChange={(e) => setFormData({ ...formData, financial_year_end: e.target.value })}
                className="input-field"
              >
                <option value="31-03">31st March</option>
                <option value="31-12">31st December</option>
                <option value="30-09">30th September</option>
                <option value="30-06">30th June</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PAN Number
              </label>
              <input
                type="text"
                value={formData.pan_number}
                onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                className="input-field"
                placeholder="ABCDE1234F"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GSTIN
              </label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                className="input-field"
                placeholder="22ABCDE1234F1Z5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                TAN Number
              </label>
              <input
                type="text"
                value={formData.tan_number}
                onChange={(e) => setFormData({ ...formData, tan_number: e.target.value.toUpperCase() })}
                className="input-field"
                placeholder="ABCD12345E"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input-field"
              rows="2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pincode
              </label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned To
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="input-field"
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field"
              rows="3"
              placeholder="Additional notes about the client..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Conversation Summary
            </label>
            <textarea
              value={formData.last_conversation}
              onChange={(e) => setFormData({ ...formData, last_conversation: e.target.value })}
              className="input-field"
              rows="3"
              placeholder="Summary of last conversation..."
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
              {loading ? 'Saving...' : 'Save Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ClientCard = ({ client, onEdit, onView, isAdmin }) => {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Building className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">{client.name}</h3>
          </div>
          
          {client.company_name && (
            <p className="text-sm text-gray-600 mb-1">{client.company_name}</p>
          )}
          
          <div className="space-y-1">
            {client.email && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{client.email}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.assigned_user_name && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>Assigned to: {client.assigned_user_name}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4 mt-3">
            {client.business_type && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                {client.business_type.replace('_', ' ')}
              </span>
            )}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              client.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {client.status}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-2 ml-4">
          <button
            onClick={() => onView(client)}
            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(client)}
            className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
            title="Edit Client"
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const Clients = () => {
  const { isAdmin } = useAuth();
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedClientView, setSelectedClientView] = useState(null);
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchClients();
    if (isAdmin) {
      fetchEmployees();
    }
  }, [searchTerm, filterStatus, filterAssigned]);

  const fetchClients = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus) params.append('status', filterStatus);
      if (filterAssigned) params.append('assigned_to', filterAssigned);
      
      const response = await axios.get(`/clients?${params}`);
      setClients(response.data.clients);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
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

  const handleAddClient = () => {
    setSelectedClient(null);
    setShowModal(true);
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setShowModal(true);
  };

  const handleViewClient = (client) => {
    setSelectedClientView(client);
  };

  const handleSaveClient = () => {
    fetchClients();
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedClient(null);
  };

  const handleCloseView = () => {
    setSelectedClientView(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Manage your client database</p>
        </div>
        <button
          onClick={handleAddClient}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add Client</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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
            {pagination.total_count} clients found
          </div>
        </div>
      </div>

      {/* Client List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : clients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onEdit={handleEditClient}
              onView={handleViewClient}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
          <p className="text-gray-600 mb-4">Get started by adding your first client</p>
          <button onClick={handleAddClient} className="btn-primary">
            Add Your First Client
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <ClientModal
        client={selectedClient}
        isOpen={showModal}
        onClose={handleCloseModal}
        onSave={handleSaveClient}
        employees={employees}
      />

      {/* View Client Modal */}
      {selectedClientView && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">{selectedClientView.name}</h2>
              <button
                onClick={handleCloseView}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-500">Company:</span>
                      <p className="font-medium">{selectedClientView.company_name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Email:</span>
                      <p className="font-medium">{selectedClientView.email || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Phone:</span>
                      <p className="font-medium">{selectedClientView.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Business Type:</span>
                      <p className="font-medium capitalize">{selectedClientView.business_type?.replace('_', ' ') || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Tax Information</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-500">PAN:</span>
                      <p className="font-medium">{selectedClientView.pan_number || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">GSTIN:</span>
                      <p className="font-medium">{selectedClientView.gstin || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">TAN:</span>
                      <p className="font-medium">{selectedClientView.tan_number || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Financial Year End:</span>
                      <p className="font-medium">{selectedClientView.financial_year_end}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedClientView.address && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 mb-2">Address</h3>
                  <p className="text-gray-700">{selectedClientView.address}</p>
                  {(selectedClientView.city || selectedClientView.state || selectedClientView.pincode) && (
                    <p className="text-gray-700">
                      {[selectedClientView.city, selectedClientView.state, selectedClientView.pincode].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              )}
              
              {selectedClientView.notes && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedClientView.notes}</p>
                </div>
              )}
              
              {selectedClientView.last_conversation && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 mb-2">Last Conversation</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedClientView.last_conversation}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients; 