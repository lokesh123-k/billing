import { create } from 'zustand';
import api from '../lib/api.js';

export const useProductStore = create((set, get) => ({
  products: [],
  loading: false,
  error: null,
  search: '',

  fetchProducts: async () => {
    set({ loading: true });
    try {
      const { search } = get();
      const response = await api.get(`/products?search=${search}`);
      set({ products: response.data.products, loading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch products', loading: false });
    }
  },

  setSearch: async (search) => {
    set({ search });
    await get().fetchProducts();
  },

  createProduct: async (productData) => {
    try {
      const response = await api.post('/products', productData);
      set((state) => ({ products: [response.data.product, ...state.products] }));
      return { success: true, product: response.data.product };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to create product' };
    }
  },

  updateProduct: async (id, productData) => {
    try {
      const response = await api.put(`/products/${id}`, productData);
      set((state) => ({
        products: state.products.map((p) => (p._id === id ? response.data.product : p))
      }));
      return { success: true, product: response.data.product };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to update product' };
    }
  },

  deleteProduct: async (id) => {
    try {
      await api.delete(`/products/${id}`);
      set((state) => ({ products: state.products.filter((p) => p._id !== id) }));
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to delete product' };
    }
  }
}));