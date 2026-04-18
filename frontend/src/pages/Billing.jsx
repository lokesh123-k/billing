import { useEffect, useState, useMemo } from 'react';
import { useCustomerStore } from '../stores/customerStore.js';
import { useProductStore } from '../stores/productStore.js';
import { useInvoiceStore } from '../stores/invoiceStore.js';

export default function Billing() {
  const { customers, fetchCustomers } = useCustomerStore();
  const { products, fetchProducts } = useProductStore();
  const { invoices, fetchInvoices, createInvoice, getInvoicePDF, printInvoice } = useInvoiceStore();
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [pricingType, setPricingType] = useState('retail');
  const [gstEnabled, setGstEnabled] = useState(true);
  const [cartItems, setCartItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', address: '' });
  const { createCustomer } = useCustomerStore();

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchInvoices();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 10);
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.serialNumber.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 10);
  }, [products, productSearch]);

  useEffect(() => {
    if (products.length > 0) {
      setCartItems(prevCartItems => prevCartItems.map(item => {
        const product = products.find(p => p._id === item.productId);
        if (product) {
          return {
            ...item,
            price: pricingType === 'retail' ? product.retailPrice : product.wholesalePrice,
            gstPercentage: product.gstPercentage
          };
        }
        return item;
      }));
    }
  }, [pricingType, products]);

  const addToCart = (product) => {
    const existingItem = cartItems.find(item => item.productId === product._id);
    const price = pricingType === 'retail' ? product.retailPrice : product.wholesalePrice;
    const gstPercentage = product.gstPercentage;
    
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.productId === product._id
          ? { ...item, quantity: item.quantity + 1, price, gstPercentage }
          : item
      ));
    } else {
      setCartItems([...cartItems, {
        productId: product._id,
        name: product.name,
        serialNumber: product.serialNumber,
        price,
        gstPercentage,
        quantity: 1
      }]);
    }
    setProductSearch('');
    setShowProductSearch(false);
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) return;
    setCartItems(cartItems.map(item =>
      item.productId === productId ? { ...item, quantity } : item
    ));
  };

  const removeItem = (productId) => {
    setCartItems(cartItems.filter(item => item.productId !== productId));
  };

  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalGst = 0;
    
    cartItems.forEach(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      if (gstEnabled) {
        totalGst += (item.price * item.quantity * item.gstPercentage) / 100;
      }
    });
    
    return {
      subtotal,
      totalGst,
      grandTotal: subtotal + totalGst
    };
  }, [cartItems, gstEnabled]);

  const handleCreateInvoice = async () => {
    if (!selectedCustomer || cartItems.length === 0) return;
    
    setLoading(true);
    const result = await createInvoice({
      customerId: selectedCustomer._id,
      items: cartItems,
      pricingType,
      gstEnabled
    });
    setLoading(false);
    
    if (result.success) {
      setCreatedInvoice(result.invoice);
      setShowInvoiceModal(true);
      setCartItems([]);
      setSelectedCustomer(null);
      fetchInvoices();
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    const result = await createCustomer(customerForm);
    if (result.success) {
      await fetchCustomers();
      setSelectedCustomer(result.customer);
      setShowCustomerModal(false);
      setCustomerForm({ name: '', phone: '', address: '' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="card p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Customer Selection</h3>
          <div className="flex gap-4">
            <select
              value={selectedCustomer?._id || ''}
              onChange={(e) => {
                const customer = customers.find(c => c._id === e.target.value);
                setSelectedCustomer(customer || null);
              }}
              className="input flex-1"
            >
              <option value="">Select a customer</option>
              {customers.map(customer => (
                <option key={customer._id} value={customer._id}>{customer.name} - {customer.phone}</option>
              ))}
            </select>
            <button onClick={() => setShowCustomerModal(true)} className="btn-secondary">
              + Add New
            </button>
          </div>
          
          {selectedCustomer && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-800">{selectedCustomer.name}</h4>
              <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
              <p className="text-sm text-gray-500">{selectedCustomer.address}</p>
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">Pricing & GST</h3>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Pricing Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPricingType('retail')}
                  className={`px-4 py-2 rounded-lg font-medium ${pricingType === 'retail' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  Retail
                </button>
                <button
                  onClick={() => setPricingType('wholesale')}
                  className={`px-4 py-2 rounded-lg font-medium ${pricingType === 'wholesale' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  Wholesale
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">GST</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setGstEnabled(true)}
                  className={`px-4 py-2 rounded-lg font-medium ${gstEnabled ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  Enabled
                </button>
                <button
                  onClick={() => setGstEnabled(false)}
                  className={`px-4 py-2 rounded-lg font-medium ${!gstEnabled ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  Disabled
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Add Products</h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or serial number..."
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setShowProductSearch(true);
              }}
              onFocus={() => setShowProductSearch(true)}
              className="input"
            />
            {showProductSearch && filteredProducts.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredProducts.map(product => (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex justify-between items-center border-b border-gray-100 last:border-b-0"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{product.name}</p>
                      <p className="text-sm text-gray-500">SN: {product.serialNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary-600">
                        ₹{pricingType === 'retail' ? product.retailPrice : product.wholesalePrice}
                      </p>
                      <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Invoice Items</h3>
          </div>
          {cartItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">GST</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cartItems.map(item => (
                    <tr key={item.productId}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.serialNumber}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center">-</button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center">+</button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">₹{item.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">{item.gstPercentage}%</td>
                      <td className="px-6 py-4 text-right font-semibold">
                        ₹{((item.price * item.quantity) + (gstEnabled ? (item.price * item.quantity * item.gstPercentage) / 100 : 0)).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => removeItem(item.productId)} className="text-red-600 hover:bg-red-50 p-2 rounded">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p>No items added yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="card p-6 sticky top-8">
          <h3 className="font-semibold text-gray-800 mb-4">Invoice Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Items</span>
              <span>{cartItems.length}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Pricing</span>
              <span className="capitalize">{pricingType}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST</span>
              <span>{gstEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            <hr className="my-4" />
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{calculations.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Total GST</span>
              <span>₹{calculations.totalGst.toFixed(2)}</span>
            </div>
            <hr className="my-4" />
            <div className="flex justify-between text-xl font-bold text-gray-800">
              <span>Grand Total</span>
              <span>₹{calculations.grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={handleCreateInvoice}
            disabled={!selectedCustomer || cartItems.length === 0 || loading}
            className="w-full btn-primary mt-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>

        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Recent Invoices</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-auto">
            {invoices.slice(0, 10).map(invoice => (
              <div key={invoice._id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-500">{invoice.customerName}</p>
                    <p className="text-xs text-gray-400">{new Date(invoice.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">₹{invoice.grandTotal.toFixed(2)}</p>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => printInvoice(invoice._id)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Print
                      </button>
                      <button
                        onClick={() => getInvoicePDF(invoice._id, invoice.invoiceNumber)}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Add Customer</h3>
              <button onClick={() => setShowCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} className="input" rows="3" required />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCustomerModal(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInvoiceModal && createdInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-md text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Invoice Created!</h3>
            <p className="text-gray-600 mb-2">Invoice Number: <span className="font-mono font-semibold">{createdInvoice.invoiceNumber}</span></p>
            <p className="text-2xl font-bold text-gray-800 mb-6">₹{createdInvoice.grandTotal.toFixed(2)}</p>
            <div className="flex gap-3">
              <button onClick={() => printInvoice(createdInvoice._id)} className="flex-1 btn-primary">
                Print
              </button>
              <button onClick={() => getInvoicePDF(createdInvoice._id, createdInvoice.invoiceNumber)} className="flex-1 btn-secondary">
                PDF
              </button>
              <button onClick={() => setShowInvoiceModal(false)} className="flex-1 btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}