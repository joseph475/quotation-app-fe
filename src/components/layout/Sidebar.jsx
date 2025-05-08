import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import useAuth from '../../hooks/useAuth';

// Development mode flag - import from App.jsx or set here
const DEV_MODE = true;

const Sidebar = () => {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin';
  
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };
  
  // Close settings dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navItems = [
    {
      name: 'Dashboard',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      path: '/',
    },
    {
      name: 'Inventory',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      path: '/inventory',
    },
    {
      name: 'Stock Transfers',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      path: '/stock-transfers',
    },
    {
      name: 'Purchase Orders',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      path: '/purchase-orders',
    },
    {
      name: 'Receiving',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l-4-4m4 4l4-4" />
        </svg>
      ),
      path: '/purchase-receiving',
    },
    {
      name: 'Sales',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      path: '/sales',
    },
    {
      name: 'Customers',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      path: '/customers',
    },
    {
      name: 'Quotations',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      path: '/quotations',
    },
    {
      name: 'Reports',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      path: '/reports',
    },
    // Settings dropdown
    {
      name: 'Settings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      hasDropdown: true,
          children: [
            {
              name: 'Branches',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              ),
              path: '/branches',
            },
            {
              name: 'Suppliers',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              ),
              path: '/suppliers',
            },
            // Only show User Management for admin users
            ...(isAdmin ? [{
              name: 'User Management',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ),
              path: '/user-management',
            }] : []),
          ],
    },
  ];

  return (
    <aside class={`bg-white shadow-sm border-r border-gray-200 ${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 ease-in-out`}>
      <div class="h-full flex flex-col">
        <div class="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {!isCollapsed && (
            <div class="text-lg font-semibold text-gray-800">
              Menu
            </div>
          )}
          <button
            onClick={toggleSidebar}
            class="p-1 rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {isCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            )}
          </button>
        </div>
        
        <nav class="flex-1 overflow-y-auto py-4">
          <ul class="space-y-1">
            {navItems.map((item) => (
              <li key={item.name}>
                {item.hasDropdown ? (
                  <div ref={settingsRef}>
                    <button
                      onClick={toggleSettings}
                      class="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-primary-600"
                    >
                      <span class="text-gray-500">{item.icon}</span>
                      {!isCollapsed && (
                        <div class="ml-3 flex items-center justify-between w-full">
                          <span>{item.name}</span>
                          <svg 
                            class={`h-4 w-4 transition-transform ${settingsOpen ? 'transform rotate-180' : ''}`} 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                          >
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                    
                    {/* Dropdown menu */}
                    {settingsOpen && (
                      <div class={`${isCollapsed ? 'absolute left-full ml-2 w-48 z-10' : ''} bg-white shadow-lg rounded-md overflow-hidden`}>
                        <ul>
                          {item.children.map((child) => (
                            <li key={child.name}>
                              <a
                                href={child.path}
                                class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600"
                              >
                                <span class="text-gray-500 mr-2">{child.icon}</span>
                                <span>{child.name}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <a
                    href={item.path}
                    class="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-primary-600"
                  >
                    <span class="text-gray-500">{item.icon}</span>
                    {!isCollapsed && <span class="ml-3">{item.name}</span>}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Development Links - only visible in DEV_MODE */}
        {DEV_MODE && (
          <div class="px-4 py-2">
            <div class="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Development</div>
            <ul class="space-y-1">
              <li>
                <a
                  href="/examples/input-components"
                  class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>Input Components</span>
                </a>
              </li>
              <li>
                <a
                  href="/dev-dashboard"
                  class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>Dev Dashboard</span>
                </a>
              </li>
            </ul>
          </div>
        )}
        
        <div class="p-4 border-t border-gray-200">
          <a
            href="/help"
            class="flex items-center text-gray-700 hover:text-primary-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {!isCollapsed && <span class="ml-3">Help & Support</span>}
          </a>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
