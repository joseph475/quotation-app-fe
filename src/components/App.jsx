import { h, Fragment } from 'preact';
import { useState } from 'preact/hooks';
import Router from 'preact-router';
import { getCurrentUrl } from 'preact-router';
import useAuth from '../hooks/useAuth';
import { RoleProtectedRoute } from '../utils/pageHelpers';
import { ModalProvider } from '../contexts/ModalContext';
import { ApiErrorHandler } from '../services/api';

// Development mode flag - set to false for production
const DEV_MODE = false;

// Layout Components
import Header from './layout/Header';
import Sidebar from './layout/Sidebar';
import Footer from './layout/Footer';

// Pages
import DashboardPage from '../pages/dashboard/DashboardPage';
import DevDashboardPage from '../pages/dashboard/DevDashboardPage';
import InputComponentsExamplePage from '../pages/examples/InputComponentsExamplePage';
import InventoryPage from '../pages/inventory/InventoryPage';
import StockTransferPage from '../pages/inventory/StockTransferPage';
import SalesPage from '../pages/sales/SalesPage';
import CustomersPage from '../pages/customers/CustomersPage';
import QuotationsPage from '../pages/quotations/QuotationsPage';
import PurchaseOrdersPage from '../pages/purchases/PurchaseOrdersPage';
import PurchaseReceivingPage from '../pages/purchases/PurchaseReceivingPage';
import ProfilePage from '../pages/profile/ProfilePage';
import UserManagementPage from '../pages/users/UserManagementPage';
import SuppliersPage from '../pages/suppliers/SuppliersPage';
import SupplierPricesPage from '../pages/suppliers/SupplierPricesPage';
import BranchesPage from '../pages/branches/BranchesPage';
import ReportsPage from '../pages/reports/ReportsPage';
import LoginPage from '../pages/auth/LoginPage';


const AppContent = () => {
  const [currentUrl, setCurrentUrl] = useState(getCurrentUrl());
  const { isAuthenticated } = useAuth();
  
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
            <RoleProtectedRoute component={DashboardPage} path="/" allowedRoles={['admin', 'user']} />
            <RoleProtectedRoute component={InventoryPage} path="/inventory" allowedRoles={['admin', 'user']} />
            <RoleProtectedRoute component={StockTransferPage} path="/stock-transfers" allowedRoles={['admin', 'user']} />
            <RoleProtectedRoute component={SalesPage} path="/sales" allowedRoles={['admin', 'user']} />
            <RoleProtectedRoute component={CustomersPage} path="/customers" allowedRoles={['admin', 'user']} />
            <RoleProtectedRoute component={QuotationsPage} path="/quotations" allowedRoles={['admin', 'user']} />
            <RoleProtectedRoute component={PurchaseOrdersPage} path="/purchase-orders" allowedRoles={['admin', 'user']} />
            <RoleProtectedRoute component={PurchaseReceivingPage} path="/purchase-receiving" allowedRoles={['admin', 'user']} />
            <RoleProtectedRoute component={ProfilePage} path="/profile" allowedRoles={['admin', 'user']} />
            <RoleProtectedRoute component={UserManagementPage} path="/user-management" allowedRoles={['admin']} />
            <RoleProtectedRoute component={SuppliersPage} path="/suppliers" allowedRoles={['admin', 'user']} />
            <RoleProtectedRoute component={SupplierPricesPage} path="/suppliers/:id/prices" allowedRoles={['admin', 'user']} />
            <RoleProtectedRoute component={BranchesPage} path="/branches" allowedRoles={['admin', 'user']} />
            <RoleProtectedRoute component={ReportsPage} path="/reports" allowedRoles={['admin', 'user']} />
            <LoginPage path="/login" />
            {/* Redirect to dashboard if no route matches */}
            <RoleProtectedRoute component={DashboardPage} default allowedRoles={['admin', 'user']} />
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
