# Vercel Deployment Guide

## Prerequisites
- Vercel account
- MongoDB Atlas connection string
- JWT secret key

## Environment Variables
Set these in Vercel project settings:
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT token signing
- `NODE_ENV` - Set to `production`

## Deployment Steps
1. Connect your GitHub repository to Vercel
2. Select the `backend` folder as the project root (or deploy as monorepo)
3. Configure build settings:
   - Build Command: `npm install`
   - Output Directory: `api` (if using monorepo, set root to backend/)
4. Add environment variables from above
5. Deploy

## Local Testing
```bash
cd backend
npm install
npm run dev    # For local Express server on port 5000
```

## API Endpoints
- `POST /api/auth/login`
- `GET /api/auth/verify`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` (auth required)
- `PUT /api/products/:id` (auth required)
- `DELETE /api/products/:id` (auth required)
- `GET /api/customers`
- `GET /api/customers/:id`
- `POST /api/customers` (auth required)
- `PUT /api/customers/:id` (auth required)
- `DELETE /api/customers/:id` (auth required)
- `POST /api/invoices` (auth required)
- `GET /api/invoices` (auth required)
- `GET /api/invoices/:id` (auth required)
- `GET /api/invoices/:id/pdf` (auth required)
- `GET /api/invoices/:id/print` (auth required)
- `GET /api/invoices/sales-report` (auth required)
- `GET /api/health`

## Notes
- The serverless version (`api/index.js`) is optimized for Vercel
- Local development uses `src/index.js` with hot reload
- Favicon is handled gracefully (204 if missing, serves file if present)
- Database connection errors don't crash the function (returns 503 on health check)
