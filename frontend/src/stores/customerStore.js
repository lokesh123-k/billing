import { create } from 'zustand';
import api from '../lib/api.js';

export const useCustomerStore = create((set) => ({
  customers: [],
  loading: false,
  error: null,

  fetchCustomers: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/customers');
      set({ customers: response.data.customers, loading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch customers', loading: false });
    }
  },

  createCustomer: async (customerData) => {
    try {
      const response = await api.post('/customers', customerData);
      set((state) => ({ customers: [response.data.customer, ...state.customers] }));
      return { success: true, customer: response.data.customer };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to create customer' };
    }
  },

  updateCustomer: async (id, customerData) => {
    try {
      const response = await api.put(`/customers/${id}`, customerData);
      set((state) => ({
        customers: state.customers.map((c) => (c._id === id ? response.data.customer : c))
      }));
      return { success: true, customer: response.data.customer };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to update customer' };
    }
  },

  deleteCustomer: async (id) => {
    try {
      await api.delete(`/customers/${id}`);
      set((state) => ({ customers: state.customers.filter((c) => c._id !== id) }));
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to delete customer' };
    }
  }
}));