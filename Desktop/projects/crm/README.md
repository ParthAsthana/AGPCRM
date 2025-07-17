# AGP CRM - Chartered Accountant Practice Management System

A comprehensive CRM system designed specifically for chartered accountant practices to manage clients, assign tasks to employees, and track progress efficiently.

## 🚀 Features

### ✅ **MVP Features (Currently Available)**
- **Authentication System**: Secure login with JWT tokens
- **Role-based Access Control**: Admin and Employee roles
- **Dashboard**: Overview statistics and recent activity
- **User Management**: Add, edit, and manage employees (Admin only)
- **Client Management**: Store client data, notes, and documents
- **Task Assignment**: Create and assign tasks to employees
- **Task Tracking**: Monitor progress with status updates and comments
- **Document Upload**: Secure file storage for client documents
- **Responsive Design**: Works on desktop and mobile devices

### 🔄 **Coming Soon**
- Advanced reporting and analytics
- Email notifications
- Calendar integration
- Bulk operations
- Data export capabilities
- Client portal (optional)

## 🏗️ Architecture

**Frontend**: React.js + Tailwind CSS  
**Backend**: Node.js + Express.js  
**Database**: SQLite (easily upgradeable to PostgreSQL)  
**Authentication**: JWT tokens  
**File Storage**: Local storage (cloud-ready)

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Git

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd crm
npm run install:all
```

### 2. Initialize Database
```bash
cd backend
npm run init-db
```

### 3. Start Development Servers
```bash
# From project root
npm run dev
```

This will start:
- Backend API on `http://localhost:5000`
- Frontend on `http://localhost:3000`

### 4. Login to the System
Open `http://localhost:3000` and use:
- **Email**: `admin@agpcrm.com`
- **Password**: `admin123`

⚠️ **Important**: Change the admin password after first login!

## 📁 Project Structure

```
crm/
├── backend/                 # Node.js API server
│   ├── database/           # Database connection and models
│   ├── middleware/         # Authentication and validation
│   ├── routes/            # API endpoints
│   ├── scripts/           # Database initialization
│   └── uploads/           # File storage
├── frontend/               # React.js application
│   ├── public/            # Static assets
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── context/       # React context (Auth)
│       ├── pages/         # Main page components
│       └── utils/         # Helper functions
└── package.json           # Project configuration
```

## 🔧 Configuration

### Backend Environment Variables
Create `backend/.env` (optional):
```
PORT=5000
JWT_SECRET=your_secure_secret_key
DB_PATH=./database/agp_crm.db
ADMIN_EMAIL=admin@agpcrm.com
ADMIN_PASSWORD=admin123
```

### Frontend Environment Variables  
Default API URL: `http://localhost:5000/api`

## 📖 Usage Guide

### For Administrators

1. **Employee Management**
   - Add new employees with email and role
   - Deactivate/reactivate employee accounts
   - Reset passwords for employees

2. **Client Management**
   - Add clients with complete business information
   - Upload and organize client documents
   - Add notes and conversation summaries
   - Assign clients to specific employees

3. **Task Management**
   - Create tasks and assign to employees
   - Set priorities and due dates
   - Monitor progress across all tasks
   - View employee workload distribution

### For Employees

1. **Dashboard Overview**
   - View assigned tasks and deadlines
   - Check recent client activity
   - Quick access to common actions

2. **Task Management**
   - Update task status and progress
   - Add comments and notes
   - View task history and details

3. **Client Access**
   - View assigned client information
   - Upload client documents
   - Update client notes and conversations

## 🗃️ Database Schema

### Users Table
- Employee and admin information
- Authentication credentials
- Role-based permissions

### Clients Table
- Complete client business information
- PAN, GSTIN, TAN numbers
- Contact details and addresses
- Notes and conversation history

### Tasks Table
- Task assignments and tracking
- Priority levels and due dates
- Status progression and completion

### Documents Table
- Secure file storage metadata
- Client-specific document organization
- Upload tracking and permissions

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

### Clients
- `GET /api/clients` - List clients (with access control)
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `POST /api/clients/:id/documents` - Upload document

### Tasks
- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `POST /api/tasks/:id/comments` - Add comment

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- File upload restrictions
- Rate limiting
- CORS protection

## 🚀 Deployment

### Development
```bash
npm run dev  # Both frontend and backend
```

### Production Build
```bash
cd frontend
npm run build

cd ../backend
npm start
```

### Deployment Options
- **Frontend**: Vercel, Netlify, GitHub Pages
- **Backend**: Railway, Heroku, AWS EC2
- **Database**: Upgrade to PostgreSQL for production

## 📈 Scalability

The system is designed to grow with your practice:

- **SQLite to PostgreSQL**: Easy database migration
- **Local to Cloud Storage**: Simple file storage upgrade
- **Single to Multi-tenant**: Architecture supports expansion
- **Additional Features**: Modular design for new capabilities

## 🐛 Troubleshooting

### Common Issues

1. **Backend won't start**
   ```bash
   cd backend
   npm install
   npm run init-db
   ```

2. **Frontend won't connect to backend**
   - Check if backend is running on port 5000
   - Verify API URL in frontend configuration

3. **Database issues**
   ```bash
   cd backend
   rm database/agp_crm.db
   npm run init-db
   ```

4. **Permission errors**
   - Ensure proper file permissions for uploads directory
   - Check JWT token validity

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**AGP CRM v1.0** - Built for efficiency, designed for growth. 