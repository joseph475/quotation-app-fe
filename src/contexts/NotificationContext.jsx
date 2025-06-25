import { h, createContext } from 'preact';
import { useContext, useState, useCallback, useEffect, useRef } from 'preact/hooks';
import { useAuth } from './AuthContext';
import { useRealTimeSync } from '../utils/realTimeSync';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const realTimeSync = useRealTimeSync();
  
  // Use ref to track processed quotations to prevent duplicates
  const processedQuotations = useRef(new Set());

  // Get user role and ID with more comprehensive extraction
  const userRole = user?.role || user?.data?.role;
  const userId = user?._id || user?.data?._id || user?.id || user?.data?.id;

  // Add a new notification
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      read: false,
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Auto-remove notification after 30 seconds if not persistent
    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, 30000);
    }
  }, []);

  // Remove a notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== id);
    });
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(notification => {
      if (notification.id === id && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
        return { ...notification, read: true };
      }
      return notification;
    }));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
    setUnreadCount(0);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);


  // Setup real-time listeners for notifications
  useEffect(() => {
    if (!user) {
      console.log('No user found, skipping notification setup');
      return; // Only enable when user is logged in
    }

    // Clear processed quotations when user changes
    processedQuotations.current.clear();
    console.log('Setting up notification listeners for user:', userRole, 'userId:', userId);
    console.log('Full user object:', user);

    // Create stable event handlers that don't depend on changing callbacks
    const handleQuotationCreatedEvent = (data) => {
      console.log('Notification: Quotation created', data);
      
      // Get current user role at the time of event
      const currentUserRole = user?.role || user?.data?.role;
      
      // Notify admin when user creates quotation
      if (currentUserRole === 'admin') {
        // Better name resolution - handle different data structures
        let creatorName = 'Unknown User';
        
        if (data.createdBy) {
          if (typeof data.createdBy === 'string') {
            creatorName = data.createdBy;
          } else if (data.createdBy.name) {
            creatorName = data.createdBy.name;
          } else if (data.createdBy.email) {
            creatorName = data.createdBy.email;
          }
        } else if (data.customer) {
          if (typeof data.customer === 'string') {
            creatorName = data.customer;
          } else if (data.customer.name) {
            creatorName = data.customer.name;
          }
        }
        
        console.log('Creating notification for admin, creator name:', creatorName);
        
        // Check if we already processed this quotation to prevent duplicates
        const quotationId = data.quotationId || data._id || data.id;
        const processKey = `quotation_created_${quotationId}`;
        
        if (processedQuotations.current.has(processKey)) {
          console.log('Duplicate notification prevented for quotation:', quotationId);
          return;
        }
        
        // Mark this quotation as processed
        processedQuotations.current.add(processKey);
        
        const newNotification = {
          id: Date.now() + Math.random(),
          timestamp: new Date(),
          read: false,
          type: 'quotation_created',
          title: 'New Order Request',
          message: `New Order created by ${creatorName}`,
          data: data,
          persistent: true
        };

        setNotifications(prev => {
          console.log('Adding notification to list, current count:', prev.length);
          return [newNotification, ...prev];
        });
        setUnreadCount(prev => {
          console.log('Incrementing unread count from:', prev);
          return prev + 1;
        });
      }
    };

    const handleQuotationStatusChangedEvent = (data) => {
      console.log('Notification: Quotation status changed', data);
      console.log('Current user:', { currentUserRole: user?.role || user?.data?.role, currentUserId: user?._id || user?.data?._id || user?.id || user?.data?.id });
      
      const { quotation, previousStatus, newStatus } = data;
      const currentUserRole = user?.role || user?.data?.role;
      const currentUserId = user?._id || user?.data?._id || user?.id || user?.data?.id;
      
      console.log('Quotation data:', quotation);
      console.log('Status change:', { previousStatus, newStatus });
      
      // Notify user when their quotation status changes
      if (currentUserId && quotation && quotation.createdBy) {
        // Handle different data structures for createdBy
        let quotationCreatorId = null;
        if (typeof quotation.createdBy === 'string') {
          quotationCreatorId = quotation.createdBy;
        } else if (quotation.createdBy._id) {
          quotationCreatorId = quotation.createdBy._id;
        }
        
        console.log('Comparing user IDs:', { currentUserId, quotationCreatorId });
        
        if (currentUserId === quotationCreatorId) {
          console.log('User is the creator of this quotation');
          
          // Check for duplicate status change notifications
          const quotationId = quotation._id || quotation.id;
          const statusProcessKey = `quotation_status_${quotationId}_${newStatus}`;
          
          if (processedQuotations.current.has(statusProcessKey)) {
            console.log('Duplicate status notification prevented for quotation:', quotationId, 'status:', newStatus);
            return;
          }
          
          // Mark this status change as processed
          processedQuotations.current.add(statusProcessKey);
          
          const statusMessages = {
            'pending': 'Your order is pending review',
            'approved': 'Your order has been approved',
            'rejected': 'Your order has been rejected',
            'completed': 'Your order has been completed'
          };
          
          if (statusMessages[newStatus]) {
            console.log('Creating status notification for user:', statusMessages[newStatus]);
            
            const newNotification = {
              id: Date.now() + Math.random(),
              timestamp: new Date(),
              read: false,
              type: 'quotation_status_update',
              title: 'Quotation Status Update',
              message: statusMessages[newStatus],
              data: quotation,
              persistent: true
            };

            setNotifications(prev => {
              console.log('Adding status notification to list');
              return [newNotification, ...prev];
            });
            setUnreadCount(prev => prev + 1);
          }
        }
      }
      
      // Delivery notifications have been disabled per user request
    };

    // Add event listeners for quotation events
    const unsubscribeCreated = realTimeSync.addEventListener('quotation_created', handleQuotationCreatedEvent);
    const unsubscribeStatusChanged = realTimeSync.addEventListener('quotation_status_changed', handleQuotationStatusChangedEvent);

    // Cleanup function
    return () => {
      console.log('Cleaning up notification listeners...');
      unsubscribeCreated();
      unsubscribeStatusChanged();
    };
  }, [user, userRole, userId]); // Simplified dependencies

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (userId) {
      const savedNotifications = localStorage.getItem(`notifications_${userId}`);
      if (savedNotifications) {
        try {
          const parsed = JSON.parse(savedNotifications);
          setNotifications(parsed);
          setUnreadCount(parsed.filter(n => !n.read).length);
        } catch (error) {
          console.error('Error loading saved notifications:', error);
        }
      }
    }
  }, [userId]);

  // Save notifications to localStorage when they change
  useEffect(() => {
    if (userId && notifications.length > 0) {
      localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifications));
    }
  }, [userId, notifications]);

  const value = {
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
