import { h } from 'preact';
import { useState } from 'preact/hooks';
import Router from 'preact-router';
import { getCurrentUrl } from 'preact-router';
import { useAuth, AuthProvider } from '../contexts/AuthContext';
import { RoleProtectedRoute } from '../utils/pageHelpers';
import { ModalProvider } from '../contexts/ModalContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { ApiErrorHandler } from '../services/api';
import useDeliveryUsersPreloader from '../hooks/useDeliveryUsersPreloader';

// Layout Components
import Header from './layout/Header';
import Sidebar from './layout/Sidebar';
import Footer from './layout/Footer';

// Pages
import DashboardPage from '../pages/dashboard/DashboardPage';
import InventoryPage from '../pages/inventory/InventoryPage';
import SalesPage from '../pages/sales/SalesPage';
import QuotationsPage from '../pages/quotations/QuotationsPage';
import ProfilePage from '../pages/profile/ProfilePage';
import UserManagementPage from '../pages/users/UserManagementPage';
import ReportsPage from '../pages/reports/ReportsPage';
import LoginPage from '../pages/auth/LoginPage';
import DeviceManagementPage from '../pages/security/DeviceManagementPage';


const AppContent = () => {
  const [currentUrl, setCurrentUrl] = useState(getCurrentUrl());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  
  // Preload delivery users cache for admin users
  const { 
    isPreloading: isDeliveryUsersPreloading, 
    preloadError: deliveryUsersPreloadError, 
    cacheStats: deliveryUsersCacheStats 
  } = useDeliveryUsersPreloader();
  
  console.log('AppContent render - User:', { 
    id: user?._id || user?.id, 
    role: user?.role, 
    email: user?.email,
    isAuthenticated
  });
  
  if (deliveryUsersCacheStats) {
    console.log('Delivery users cache stats:', deliveryUsersCacheStats);
  }
  
  if (deliveryUsersPreloadError) {
    console.warn('Delivery users cache preload error:', deliveryUsersPreloadError);
  }
  
  // Check if the current route is an auth route (login, register, etc.)
  const isAuthRoute = currentUrl === '/login';
  
  // Handler for route changes
  const handleRouteChange = (e) => {
    // Scroll to top when route changes
    window.scrollTo(0, 0);
    setCurrentUrl(e.url);
    // Close sidebar on route change (mobile)
    setIsSidebarOpen(false);
  };

  // Handler for menu toggle
  const handleMenuToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div class="flex flex-col min-h-screen">
      {!isAuthRoute && <Header onMenuToggle={handleMenuToggle} />}
      <div class={`flex flex-1 overflow-hidden ${isAuthRoute ? '' : ''}`}>
        {!isAuthRoute && <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />}
        <main class={`flex-1 overflow-auto ${isAuthRoute ? '' : 'p-4 bg-gray-50'}`}>
          <Router onChange={handleRouteChange}>
            {/* For users with 'customer' or 'delivery' role, redirect to quotations page */}
            <RoleProtectedRoute 
              component={({ user }) => {
                if (user?.role === 'customer' || user?.role === 'delivery') return <QuotationsPage />;
                if (user?.role === 'superadmin') return <InventoryPage />;
                return <DashboardPage />;
              }} 
              path="/" 
              allowedRoles={['admin', 'customer', 'delivery', 'superadmin']} 
            />
            <RoleProtectedRoute component={InventoryPage} path="/inventory" allowedRoles={['admin', 'superadmin']} />
            <RoleProtectedRoute component={SalesPage} path="/sales" allowedRoles={['admin']} />
            <RoleProtectedRoute component={QuotationsPage} path="/orders" allowedRoles={['admin', 'customer', 'delivery']} />
            <RoleProtectedRoute component={ProfilePage} path="/profile" allowedRoles={['admin', 'customer', 'delivery', 'superadmin']} />
            <RoleProtectedRoute component={UserManagementPage} path="/user-management" allowedRoles={['admin']} />
            <RoleProtectedRoute component={ReportsPage} path="/reports" allowedRoles={['admin', 'superadmin']} />
            <RoleProtectedRoute component={DeviceManagementPage} path="/device-management" allowedRoles={['admin', 'customer']} />
            <LoginPage path="/login" />
            {/* Redirect to quotations for customer/delivery role, dashboard for admin */}
            <RoleProtectedRoute 
              component={({ user }) => (user?.role === 'customer' || user?.role === 'delivery') ? <QuotationsPage /> : <DashboardPage />} 
              default 
              allowedRoles={['admin', 'customer', 'delivery']} 
            />
          </Router>
        </main>
      </div>
      {!isAuthRoute && <Footer />}
    </div>
  );
};

// Wrap the app with the auth provider and modal provider
const App = () => {
  return (
    <AuthProvider>
      <ModalProvider>
        <NotificationProvider>
          <ApiErrorHandler />
          <AppContent />
        </NotificationProvider>
      </ModalProvider>
    </AuthProvider>
  );
};

export default App;
