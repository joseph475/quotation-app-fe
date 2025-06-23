import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Router from 'preact-router';
import { getCurrentUrl } from 'preact-router';
import { useAuth, AuthProvider } from '../contexts/AuthContext';
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
  
  console.log('AppContent render - User:', { 
    id: user?._id || user?.id, 
    role: user?.role, 
    email: user?.email,
    isAuthenticated
  });
  
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
            {/* For users with 'user' or 'delivery' role, redirect to quotations page */}
            <RoleProtectedRoute 
              component={({ user }) => {
                if (user?.role === 'user' || user?.role === 'delivery') return <QuotationsPage />;
                if (user?.role === 'superadmin') return <InventoryPage />;
                return <DashboardPage />;
              }} 
              path="/" 
              allowedRoles={['admin', 'user', 'delivery', 'superadmin']} 
            />
            <RoleProtectedRoute component={InventoryPage} path="/inventory" allowedRoles={['admin', 'superadmin']} />
            <RoleProtectedRoute component={SalesPage} path="/sales" allowedRoles={['admin']} />
            <RoleProtectedRoute component={CustomersPage} path="/customers" allowedRoles={['admin']} />
            <RoleProtectedRoute component={QuotationsPage} path="/quotations" allowedRoles={['admin', 'user', 'delivery']} />
            <RoleProtectedRoute component={ProfilePage} path="/profile" allowedRoles={['admin', 'user', 'delivery', 'superadmin']} />
            <RoleProtectedRoute component={UserManagementPage} path="/user-management" allowedRoles={['admin']} />
            <RoleProtectedRoute component={ReportsPage} path="/reports" allowedRoles={['admin', 'superadmin']} />
            <RoleProtectedRoute component={DeviceManagementPage} path="/device-management" allowedRoles={['admin', 'user']} />
            <LoginPage path="/login" />
            {/* Redirect to quotations for user/delivery role, dashboard for admin */}
            <RoleProtectedRoute 
              component={({ user }) => (user?.role === 'user' || user?.role === 'delivery') ? <QuotationsPage /> : <DashboardPage />} 
              default 
              allowedRoles={['admin', 'user', 'delivery']} 
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
        <ApiErrorHandler />
        <AppContent />
      </ModalProvider>
    </AuthProvider>
  );
};

export default App;
