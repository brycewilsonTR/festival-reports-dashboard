# Authentication System Setup

## Overview
The Festival Reports Dashboard now includes a secure authentication system with user management capabilities.

## Default Admin Account
- **Email**: bryce.wilson@ticketrescue.com
- **Password**: bryce
- **Role**: Administrator

## Features

### Authentication
- Secure login with email and password
- JWT-based token authentication (using user ID as token for simplicity)
- Password hashing using bcrypt
- Session persistence using localStorage

### User Management (Admin Only)
- Create new users
- Edit existing users
- Delete users
- Toggle admin privileges
- View all users in the system

### Security Features
- Passwords are hashed using bcrypt with salt rounds of 10
- Admin-only access to user management
- Secure token-based authentication
- No hardcoded credentials in the UI (only visible to admins)

## How to Use

### First Time Setup
1. Start the backend server: `npm run server`
2. Start the frontend: `npm run dev`
3. Navigate to the application
4. Login with the default admin credentials
5. Access the "User Management" tab to manage users

### Creating New Users
1. Login as an admin user
2. Navigate to the "User Management" tab
3. Click "Add User"
4. Fill in the email, password, and admin status
5. Click "Create User"

### Managing Users
- **Edit**: Click the "Edit" button to modify user details
- **Change Password**: Click the "Change Password" button to set a new password for any user
- **Toggle Admin**: Use the "Make Admin" / "Remove Admin" button
- **Delete**: Click the "Delete" button to remove users

## Technical Details

### Backend Endpoints
- `POST /api/auth/login` - User authentication
- `GET /api/admin/users` - Get all users (admin only)
- `POST /api/admin/users` - Create new user (admin only)
- `PUT /api/admin/users/:id` - Update user (admin only)
- `DELETE /api/admin/users/:id` - Delete user (admin only)
- `PATCH /api/admin/users/:id/admin` - Toggle admin status (admin only)
- `PATCH /api/admin/users/:id/password` - Change user password (admin only)

### Database Schema
The users table includes:
- `id` - Primary key
- `email` - Unique email address
- `password_hash` - Bcrypt hashed password
- `is_admin` - Boolean admin flag
- `created_at` - Account creation timestamp
- `last_login` - Last login timestamp

### Frontend Components
- `Login` - Authentication form
- `Header` - User info and logout
- `UserManagement` - Admin user management interface
- `AdminCredentials` - Secure credential display for admins

## Security Notes
- Change the default admin password after first login
- Use strong passwords for all user accounts
- Regularly review and audit user access
- Consider implementing password complexity requirements
- In production, use proper JWT tokens with expiration

## Troubleshooting

### Database Issues
If you encounter database schema errors, the system will automatically migrate the database on startup.

### Authentication Issues
- Ensure the backend server is running on port 3001
- Check that the database file exists and is writable
- Verify that bcrypt is properly installed

### User Management Issues
- Ensure you're logged in as an admin user
- Check that the user management tab is visible
- Verify backend endpoints are accessible 