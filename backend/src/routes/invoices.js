import express from 'express';
import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  generatePDF,
  generatePrintHTML,
  getSalesReport
} from '../controllers/invoiceController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authMiddleware, createInvoice);
router.get('/', authMiddleware, getAllInvoices);
router.get('/sales-report', authMiddleware, getSalesReport);
router.get('/:id', authMiddleware, getInvoiceById);
router.get('/:id/pdf', authMiddleware, generatePDF);
router.get('/:id/print', authMiddleware, generatePrintHTML);

export default router;