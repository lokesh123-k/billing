# Enterprise Billing System - Setup Instructions

## Prerequisites

1. **Node.js** (v18 or higher)
2. **MongoDB** (running locally or a cloud instance)
3. **npm** or **yarn**

## Project Structure

```
Enterprise Billing Software/
├── backend/
│   ├── src/
│   │   ├── config/       # Database configuration
│   │   ├── controllers/ # Business logic
│   │   ├── middleware/  # Auth middleware
│   │   ├── models/      # Mongoose models
│   │   ├── routes/      # API routes
│   │   └── index.js     # Server entry point
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── stores/      # Zustand stores
│   │   ├── lib/         # API configuration
│   │   └── App.jsx      # Main app component
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
└── README.md
```

## Setup Steps

### 1. Backend Setup

```bash
cd backend
npm install
```

**Configure Environment (.env):**
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/billing_system
JWT_SECRET=billing_secret_key_2024
NODE_ENV=development
```

**Start Backend:**
```bash
npm start
# or for development
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

**Start Frontend:**
```bash
npm run dev
```

### 3. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Default Credentials

- **Username:** Admin
- **Password:** admin123

## Features

### Authentication
- JWT-based authentication
- Protected routes
- Auto logout on token expiry

### Product Management
- Add/Edit/Delete products
- Fields: Name, Serial Number, Retail Price, Wholesale Price, GST %, Stock
- Smart search by name or serial number

### Customer Management
- Add/Edit/Delete customers
- Fields: Name, Phone, Address

### Billing System
- Create invoices
- Select customer
- Add multiple products
- Search products by name or serial number
- Choose pricing (Retail/Wholesale)
- GST toggle (Enable/Disable)

### Invoice Generation
- Professional A4 PDF generation
- Company branding
- Detailed product breakdown
- GST calculations

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verify token

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Invoices
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id/pdf` - Generate PDF

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Zustand
- **Backend:** Node.js, Express, MongoDB, Mongoose
- **Authentication:** JWT, bcrypt
- **PDF:** Puppeteer

## Development Notes

1. MongoDB must be running before starting the backend
2. The default admin account is created automatically on first run
3. Frontend proxies API requests to backend (configured in vite.config.js)
4. PDF generation requires Chromium which is bundled with Puppeteer
