import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from '../src/config/db.js';
import Admin from '../src/models/Admin.js';
import authRoutes from '../src/routes/auth.js';
import productRoutes from '../src/routes/products.js';
import customerRoutes from '../src/routes/customers.js';
import invoiceRoutes from '../src/routes/invoices.js';
import path from 'path';
import fs from 'fs';

dotenv.config();

// Validate critical environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Static files
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use(express.static(publicDir));

// Favicon handler
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(publicDir, 'favicon.ico');
  fs.access(faviconPath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(204).send();
    }
    res.sendFile(faviconPath);
  });
});

// Database connection with proper error handling
let dbConnected = false;
try {
  await connectDB();
  dbConnected = true;
} catch (dbError) {
  console.error('Database connection failed:', dbError.message);
  // Don't throw - allow app to start for health checks
}

// Seed admin user (only if DB is connected)
if (dbConnected) {
  try {
    const adminExists = await Admin.findOne({ username: 'Admin' });
    if (!adminExists) {
      await Admin.create({
        username: 'Admin',
        password: 'admin123'
      });
      console.log('Default admin created: Admin / admin123');
    }
  } catch (error) {
    console.error('Admin seeding error:', error.message);
    // Non-critical, continue
  }
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    message: 'Billing System API Running',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  };
  res.status(dbConnected ? 200 : 503).json(health);
});

// Global error handler - prevents crashes
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Catch-all for undefined routes (must be after error handler in Express 4)
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// Export for Vercel serverless
export default app;

// For Vercel Edge Runtime compatibility
export const config = {
  api: {
    bodyParser: true,
    externalResolver: true
  }
};
