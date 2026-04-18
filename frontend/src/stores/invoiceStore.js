import { create } from 'zustand';
import api from '../lib/api.js';

export const useInvoiceStore = create((set) => ({
  invoices: [],
  loading: false,
  error: null,

  fetchInvoices: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/invoices');
      set({ invoices: response.data.invoices, loading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch invoices', loading: false });
    }
  },

  createInvoice: async (invoiceData) => {
    try {
      const response = await api.post('/invoices', invoiceData);
      set((state) => ({ invoices: [response.data.invoice, ...state.invoices] }));
      return { success: true, invoice: response.data.invoice };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to create invoice' };
    }
  },

  getInvoicePDF: async (id, invoiceNumber) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/invoices/${id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      return { success: true };
    } catch (error) {
      console.error('PDF Error:', error);
      return { success: false, message: 'Failed to generate PDF' };
    }
  },

  printInvoice: async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/invoices/${id}/print`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load invoice');
      }
      
      const html = await response.text();
      const printWindow = window.open('', '_blank');
      printWindow.document.write(html);
      printWindow.document.close();
      return { success: true };
    } catch (error) {
      console.error('Print Error:', error);
      return { success: false, message: 'Failed to print invoice' };
    }
  }
}));