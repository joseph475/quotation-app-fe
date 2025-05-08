import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Router from 'preact-router';
import { getCurrentUrl, route } from 'preact-router';
import useAuth from '../hooks/useAuth';

// Development mode flag - set to true to bypass authentication for testing
const DEV_MODE = true;

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
import BranchesPage from '../pages/branches/BranchesPage';
import LoginPage from '../pages/auth/LoginPage';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ component: Component, ...rest }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    // If authentication check is complete and user is not authenticated
    if (!isLoading && !isAuthenticated) {
      // Redirect to login
      route('/login', true);
    }
  }, [isAuthenticated, isLoading]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div class="flex items-center justify-center h-screen">
        <div class="text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="mt-2 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Render the component only if authenticated
  return isAuthenticated ? <Component {...rest} /> : null;
};

const App = () => {
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
            {/* In development mode, allow direct access to development pages for testing */}
            {DEV_MODE && <DevDashboardPage path="/dev-dashboard" />}
            {DEV_MODE && <InputComponentsExamplePage path="/examples/input-components" />}
            <ProtectedRoute component={DashboardPage} path="/" />
            <ProtectedRoute component={InventoryPage} path="/inventory" />
            <ProtectedRoute component={StockTransferPage} path="/stock-transfers" />
            <ProtectedRoute component={SalesPage} path="/sales" />
            <ProtectedRoute component={CustomersPage} path="/customers" />
            <ProtectedRoute component={QuotationsPage} path="/quotations" />
            <ProtectedRoute component={PurchaseOrdersPage} path="/purchase-orders" />
            <ProtectedRoute component={PurchaseReceivingPage} path="/purchase-receiving" />
            <ProtectedRoute component={ProfilePage} path="/profile" />
            <ProtectedRoute component={UserManagementPage} path="/user-management" />
            <ProtectedRoute component={SuppliersPage} path="/suppliers" />
            <ProtectedRoute component={BranchesPage} path="/branches" />
            <LoginPage path="/login" />
            {/* Redirect to dashboard if no route matches */}
            <ProtectedRoute component={DashboardPage} default />
          </Router>
        </main>
      </div>
      {!isAuthRoute && <Footer />}
    </div>
  );
};

export default App;
