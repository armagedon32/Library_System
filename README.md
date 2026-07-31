# Library System - User-Centered Collection Decision Framework

A React + Express + MongoDB application for managing library user authentication and usage analytics.

## Tech Stack

- **Frontend**: React 18, Vite, React Router, Axios, Tailwind CSS
- **Backend**: Express.js, MongoDB, Mongoose, JWT, bcrypt

## Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)

## Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd Library_System
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/library-system
JWT_SECRET=your_jwt_secret_key_here_change_in_production
NODE_ENV=development
```

Start the backend server:

```bash
npm run dev
```

Server runs on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Start the frontend dev server:

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

## Project Structure

```
Library_System/
├── backend/
│   ├── server.js
│   ├── .env
│   ├── package.json
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   └── auth.js
│   └── middleware/
│       └── auth.js
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── pages/
        │   ├── Register.jsx
        │   ├── Login.jsx
        │   └── Dashboard.jsx
        ├── components/
        │   └── ProtectedRoute.jsx
        ├── context/
        │   └── AuthContext.jsx
        └── api/
            └── auth.js
```

## Features

- User Registration with department
- User Login with JWT authentication
- Protected Dashboard route
- Logout functionality
- Responsive Tailwind CSS styling

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/me | Get current user |

## Next Steps

- Add collection analytics models
- Implement unsupervised learning clustering
- Add usage tracking and dashboards
- Role-based access control (admin)
