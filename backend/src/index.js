import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import Admin from './models/Admin.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import customerRoutes from './routes/customers.js';
import invoiceRoutes from './routes/invoices.js';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from 'public' directory
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use(express.static(publicDir));

// Favicon handler - serve if exists, return 204 if not
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(publicDir, 'favicon.ico');
  fs.access(faviconPath, fs.constants.F_OK, (err) => {
    if (err) {
      // No favicon found - return 204 No Content
      return res.status(204).send();
    }
    res.sendFile(faviconPath);
  });
});

connectDB();

const seedAdmin = async () => {
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
    console.log('Error creating admin:', error.message);
  }
};
seedAdmin();

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Billing System API Running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
