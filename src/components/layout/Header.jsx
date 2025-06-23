import { h } from 'preact';
import { useState } from 'preact/hooks';
import { useAuth } from '../../contexts/AuthContext';

const Header = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
    if (isNotificationsOpen) setIsNotificationsOpen(false);
  };

  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    if (isProfileMenuOpen) setIsProfileMenuOpen(false);
  };

  return (
    <header class="bg-white shadow-sm z-10">
      <div class="container-fluid mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            {/* Mobile Menu Button */}
            <button
              onClick={onMenuToggle}
              class="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 mr-3"
            >
              <span class="sr-only">Open main menu</span>
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
            
            <div class="flex-shrink-0 flex items-center">
              <h1 class="text-xl font-bold text-primary-600">Quotation App</h1>
            </div>
          </div>
          
          <div class="flex items-center">
            {/* Notifications */}
            <div class="ml-4 relative">
              <button
                type="button"
                class="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                onClick={toggleNotifications}
              >
                <span class="sr-only">View notifications</span>
                <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              
              {/* Notifications dropdown */}
              {isNotificationsOpen && (
                <div class="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div class="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                    <div class="px-4 py-2 border-b border-gray-200">
                      <h3 class="text-sm font-medium text-gray-900">Notifications</h3>
                    </div>
                    <div class="max-h-60 overflow-y-auto">
                      <div class="px-4 py-3 hover:bg-gray-50 border-b border-gray-100">
                        <p class="text-sm font-medium text-gray-900">New quotation request</p>
                        <p class="text-xs text-gray-500">Customer: ABC Corp - 10 minutes ago</p>
                      </div>
                      <div class="px-4 py-3 hover:bg-gray-50 border-b border-gray-100">
                        <p class="text-sm font-medium text-gray-900">Low inventory alert</p>
                        <p class="text-xs text-gray-500">Item: Widget X - 1 hour ago</p>
                      </div>
                      <div class="px-4 py-3 hover:bg-gray-50">
                        <p class="text-sm font-medium text-gray-900">Sale completed</p>
                        <p class="text-xs text-gray-500">Customer: XYZ Ltd - 3 hours ago</p>
                      </div>
                    </div>
                    <div class="px-4 py-2 border-t border-gray-200 text-center">
                      <a href="#" class="text-sm text-primary-600 hover:text-primary-800">View all notifications</a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div class="ml-3 relative">
              <div>
                <button
                  type="button"
                  class="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  id="user-menu-button"
                  aria-expanded="false"
                  aria-haspopup="true"
                  onClick={toggleProfileMenu}
                >
                  <span class="sr-only">Open user menu</span>
                  <div class="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                    {user && user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                  </div>
                </button>
              </div>
              
              {/* Profile dropdown menu */}
              {isProfileMenuOpen && (
                <div
                  class="origin-top-right absolute right-0 mt-2 w-64 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                  tabindex="-1"
                >
                  {user && (
                    <div class="px-4 py-3 border-b border-gray-100">
                      <p class="text-sm font-medium text-gray-900">{user.name || 'User'}</p>
                      <p class="text-xs text-gray-500">{user.email || 'No email'}</p>
                      
                    </div>
                  )}
                  <a href="/profile" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem" tabindex="-1" id="user-menu-item-0">Your Profile</a>
                  <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem" tabindex="-1" id="user-menu-item-2">Sign out</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
