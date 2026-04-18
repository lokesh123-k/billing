import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import Admin from './models/Admin.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import customerRoutes from './routes/customers.js';
import invoiceRoutes from './routes/invoices.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ FIX: Lazy DB connection (NO top-level await)
let isConnected = false;

async function ensureDB() {
  if (!isConnected) {
    await connectDB();
    isConnected = true;

    // Seed admin once
    const adminExists = await Admin.findOne({ username: 'Admin' });
    if (!adminExists) {
      await Admin.create({
        username: 'Admin',
        password: 'admin123'
      });
      console.log('Default admin created');
    }
  }
}

// Apply DB middleware
app.use(async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (err) {
    console.error('DB Error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API running',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;