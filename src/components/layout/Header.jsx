import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';

const Header = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  // Handle clicking outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };

    if (isProfileMenuOpen || isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isProfileMenuOpen, isNotificationsOpen]);

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
    if (isNotificationsOpen) setIsNotificationsOpen(false);
  };

  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    if (isProfileMenuOpen) setIsProfileMenuOpen(false);
  };

  const handleProfileLinkClick = () => {
    setIsProfileMenuOpen(false);
  };

  const handleLogoutClick = (e) => {
    e.preventDefault();
    setIsProfileMenuOpen(false);
    logout();
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
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
              <h1 class="text-xl font-bold text-primary-600">Ordering App</h1>
            </div>
          </div>
          
          <div class="flex items-center">
            {/* Notifications - Hidden for delivery users */}
            {user && user.role !== 'delivery' && (
              <div class="ml-4 relative" ref={notificationsRef}>
                <button
                  type="button"
                  class="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 relative"
                  onClick={toggleNotifications}
                >
                  <span class="sr-only">View notifications</span>
                  <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {/* Notification badge */}
                  {unreadCount > 0 && (
                    <span class="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notifications dropdown */}
                {isNotificationsOpen && (
                  <div class="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div class="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                      <div class="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                        <h3 class="text-sm font-medium text-gray-900">Notifications</h3>
                        {notifications.length > 0 && (
                          <button
                            onClick={markAllAsRead}
                            class="text-xs text-primary-600 hover:text-primary-800"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div class="max-h-60 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div class="px-4 py-8 text-center">
                            <p class="text-sm text-gray-500">No notifications</p>
                          </div>
                        ) : (
                          notifications.slice(0, 10).map((notification, index) => (
                            <div
                              key={notification.id}
                              class={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                                index < notifications.length - 1 ? 'border-b border-gray-100' : ''
                              } ${!notification.read ? 'bg-blue-50' : ''}`}
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div class="flex justify-between items-start">
                                <div class="flex-1">
                                  <p class={`text-sm ${!notification.read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                                    {notification.title}
                                  </p>
                                  <p class="text-xs text-gray-500 mt-1">
                                    {notification.message}
                                  </p>
                                  <p class="text-xs text-gray-400 mt-1">
                                    {formatTimeAgo(notification.timestamp)}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <div class="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <div class="px-4 py-2 border-t border-gray-200 text-center">
                          <button
                            onClick={() => {
                              clearAll();
                              setIsNotificationsOpen(false);
                            }}
                            class="text-sm text-red-600 hover:text-red-800"
                          >
                            Clear all notifications
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile dropdown */}
            <div class="ml-3 relative" ref={profileMenuRef}>
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
                  <a href="/profile" onClick={handleProfileLinkClick} class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem" tabindex="-1" id="user-menu-item-0">Your Profile</a>
                  <a href="#" onClick={handleLogoutClick} class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem" tabindex="-1" id="user-menu-item-2">Sign out</a>
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
