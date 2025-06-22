import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Router from 'preact-router';
import { getCurrentUrl } from 'preact-router';
import useAuth from '../hooks/useAuth';
import { RoleProtectedRoute } from '../utils/pageHelpers';
import { ModalProvider } from '../contexts/ModalContext';
import { ApiErrorHandler } from '../services/api';
import api from '../services/api';
import { storeInStorage } from '../utils/localStorageHelpers';

// Development mode flag - set to false for production
const DEV_MODE = false;

// Layout Components
import Header from './layout/Header';
import Sidebar from './layout/Sidebar';
import Footer from './layout/Footer';

// Pages
import DashboardPage from '../pages/dashboard/DashboardPage';
import InventoryPage from '../pages/inventory/InventoryPage';
import SalesPage from '../pages/sales/SalesPage';
import CustomersPage from '../pages/customers/CustomersPage';
import QuotationsPage from '../pages/quotations/QuotationsPage';
import ProfilePage from '../pages/profile/ProfilePage';
import UserManagementPage from '../pages/users/UserManagementPage';
import ReportsPage from '../pages/reports/ReportsPage';
import LoginPage from '../pages/auth/LoginPage';
import DeviceManagementPage from '../pages/security/DeviceManagementPage';


const AppContent = () => {
  const [currentUrl, setCurrentUrl] = useState(getCurrentUrl());
  const { isAuthenticated, user } = useAuth();
  const [dataInitialized, setDataInitialized] = useState(false);
  
  // Initialize data in local storage when the app loads
  useEffect(() => {
    const initializeData = async () => {
      if (isAuthenticated && !dataInitialized) {
        try {
          console.log('Initializing app data...');
          
          // Fetch suppliers
          const suppliersResponse = await api.suppliers.getAll();
          if (suppliersResponse && suppliersResponse.success) {
            storeInStorage('suppliers', suppliersResponse.data || []);
          }
          
          // Fetch customers
          const customersResponse = await api.customers.getAll();
          if (customersResponse && customersResponse.success) {
            storeInStorage('customers', customersResponse.data || []);
          }
          
          // Fetch stock transfers
          const stockTransfersResponse = await api.stockTransfers.getAll();
          if (stockTransfersResponse && stockTransfersResponse.success) {
            storeInStorage('stockTransfers', stockTransfersResponse.data || []);
          }
          
          // Fetch inventory
          const inventoryResponse = await api.inventory.getAll();
          if (inventoryResponse && inventoryResponse.success) {
            storeInStorage('inventory', inventoryResponse.data || []);
          }
          
          // Fetch purchase orders
          const purchaseOrdersResponse = await api.purchaseOrders.getAll();
          if (purchaseOrdersResponse && purchaseOrdersResponse.success) {
            storeInStorage('purchaseOrders', purchaseOrdersResponse.data || []);
          }
          
          setDataInitialized(true);
          console.log('App data initialization complete');
        } catch (error) {
          console.error('Error initializing app data:', error);
        }
      }
    };
    
    initializeData();
  }, [isAuthenticated]);
  
  // Check if the current route is an auth route (login, register, etc.)
  const isAuthRoute = currentUrl === '/login';
  
  // Handler for route changes
  const handleRouteChange = (e) => {
    // Scroll to top when route changes
    window.scrollTo(0, 0);
    setCurrentUrl(e.url);
  };

  return (
    <div class="flex flex-col min-h-screen">
      {!isAuthRoute && <Header />}
      <div class={`flex flex-1 overflow-hidden ${isAuthRoute ? '' : ''}`}>
        {!isAuthRoute && <Sidebar />}
        <main class={`flex-1 overflow-auto ${isAuthRoute ? '' : 'p-4 bg-gray-50'}`}>
          <Router onChange={handleRouteChange}>
            {/* For users with 'user' role, redirect to quotations page */}
            <RoleProtectedRoute 
              component={({ user }) => user?.role === 'user' ? <QuotationsPage /> : <DashboardPage />} 
              path="/" 
              allowedRoles={['admin', 'user']} 
            />
            <RoleProtectedRoute component={InventoryPage} path="/inventory" allowedRoles={['admin']} />
            <RoleProtectedRoute component={SalesPage} path="/sales" allowedRoles={['admin']} />
            <RoleProtectedRoute component={CustomersPage} path="/customers" allowedRoles={['admin']} />
            <RoleProtectedRoute component={QuotationsPage} path="/quotations" allowedRoles={['admin', 'user']} />
            <RoleProtectedRoute component={ProfilePage} path="/profile" allowedRoles={['admin', 'user']} />
            <RoleProtectedRoute component={UserManagementPage} path="/user-management" allowedRoles={['admin']} />
            <RoleProtectedRoute component={ReportsPage} path="/reports" allowedRoles={['admin']} />
            <RoleProtectedRoute component={DeviceManagementPage} path="/device-management" allowedRoles={['admin', 'user']} />
            <LoginPage path="/login" />
            {/* Redirect to quotations for user role, dashboard for admin */}
            <RoleProtectedRoute 
              component={({ user }) => user?.role === 'user' ? <QuotationsPage /> : <DashboardPage />} 
              default 
              allowedRoles={['admin', 'user']} 
            />
          </Router>
        </main>
      </div>
      {!isAuthRoute && <Footer />}
    </div>
  );
};

// Wrap the app with the modal provider
const App = () => {
  return (
    <ModalProvider>
      <ApiErrorHandler />
      <AppContent />
    </ModalProvider>
  );
};

export default App;
