# Employee Data Management System

A comprehensive employee management system for Sri Suriya Group with 5 sectors and role-based access control.

## Features

- **Authentication System**: Login with User ID and Password
- **Two User Roles**:
  - **User 1 (Admin)**: Full CRUD operations on employee data
  - **User 2 (Employee)**: Mark attendance, add advances, view/edit attendance and advance details
- **5 Sectors**:
  - SSBM - Sri Suriya Blue Metals
  - SSC - Sri Suriyaa's Cafe
  - SSBP - Sri Surya Bharath Pertroleum
  - SSR - Sri Surya RiceMill
  - SSACF - Sri Surya Agro and Cattle Farm

## Employee Data Fields

- Name
- Phone Number
- Address
- Bank Details (Account, IFSC, Bank Name)
- Monthly/Weekly Wages
- Salary
- Advance Amount
- Weekly and Monthly Present/Absent Days

## Installation

1. Navigate to the project directory:
```bash
cd F:\employee-management-system
```

2. Install all dependencies:
```bash
npm run install-all
```

3. Start the development server:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend server on `http://localhost:3000`

## Default Login Credentials

- **User 1 (Admin)**:
  - User ID: `admin`
  - Password: `admin123`

- **User 2 (Employee)**:
  - User ID: `employee`
  - Password: `employee123`

## Technology Stack

- **Frontend**: React, React Router, Tailwind CSS, Axios
- **Backend**: Node.js, Express
- **Database**: SQLite
- **Authentication**: JWT

## Project Structure

```
├── client/          # React frontend
├── server/          # Express backend
│   ├── routes/      # API routes
│   ├── database/    # Database setup
│   └── middleware/  # Auth middleware
└── package.json
```

## Usage

1. Login with your credentials
2. Select a sector
3. Based on your role:
   - **User 1**: Manage employees (Add, Edit, Delete), view all data
   - **User 2**: Mark attendance, add advances, view/edit attendance and advance records

All changes made by User 2 are immediately reflected in User 1's view.

