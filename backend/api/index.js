import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from '../src/config/db.js';
import Admin from '../src/models/Admin.js';
import authRoutes from '../src/routes/auth.js';
import productRoutes from '../src/routes/products.js';
import customerRoutes from '../src/routes/customers.js';
import invoiceRoutes from '../src/routes/invoices.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

let isConnected = false;

async function ensureDB() {
  if (!isConnected) {
    await connectDB();
    isConnected = true;

    try {
      const adminExists = await Admin.findOne({ username: 'Admin' });
      if (!adminExists) {
        await Admin.create({
          username: 'Admin',
          password: 'admin123'
        });
      }
    } catch (err) {
      console.error("Seed error:", err.message);
    }
  }
}

app.use(async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({ error: "DB failed" });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default function handler(req, res) {
  return app(req, res);
}