import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import Customers from './pages/Customers.jsx';
import Billing from './pages/Billing.jsx';
import SalesReport from './pages/SalesReport.jsx';
import Layout from './components/Layout.jsx';
import { useEffect } from 'react';

function ProtectedRoute({ children }) {
  const { user, token } = useAuthStore();
  
  useEffect(() => {
    if (!token) {
      window.location.href = '/login';
    }
  }, [token]);

  return token ? children : null;
}

function App() {
  const { token } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="customers" element={<Customers />} />
          <Route path="billing" element={<Billing />} />
          <Route path="sales-report" element={<SalesReport />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;