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

app.use(cors());
app.use(express.json());

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