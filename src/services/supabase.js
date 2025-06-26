import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication helpers
export const auth = {
  // Sign in with email and password
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  // Sign up with email and password
  signUp: async (email, password, userData = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });
    return { data, error };
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get current user
  getCurrentUser: () => {
    return supabase.auth.getUser();
  },

  // Get current session
  getSession: () => {
    return supabase.auth.getSession();
  },

  // Listen to auth changes
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Database helpers
export const db = {
  // Generic CRUD operations
  select: (table, columns = '*') => {
    return supabase.from(table).select(columns);
  },

  insert: (table, data) => {
    return supabase.from(table).insert(data);
  },

  update: (table, data) => {
    return supabase.from(table).update(data);
  },

  delete: (table) => {
    return supabase.from(table).delete();
  },

  // Users (now with customer as default role)
  users: {
    getAll: (filters = {}) => {
      let query = supabase.from('users').select(`
        id, name, email, phone, department, address, 
        is_active, role, created_at, updated_at
      `);
      
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%, email.ilike.%${filters.search}%`);
      }
      
      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      
      return query.order('created_at', { ascending: false });
    },

    getById: (id) => {
      return supabase.from('users').select(`
        id, name, email, phone, department, address, 
        is_active, role, created_at, updated_at
      `).eq('id', id).single();
    },

    create: (userData) => {
      // Default role is now 'customer' instead of 'user'
      const userWithDefaults = {
        role: 'customer',
        ...userData
      };
      return supabase.from('users').insert(userWithDefaults).select().single();
    },

    update: (id, userData) => {
      return supabase.from('users').update(userData).eq('id', id).select().single();
    },

    delete: (id) => {
      return supabase.from('users').delete().eq('id', id);
    },

    // Get customers only (users with role 'customer')
    getCustomers: (filters = {}) => {
      let query = supabase.from('users').select(`
        id, name, email, phone, department, address, 
        is_active, created_at, updated_at
      `).eq('role', 'customer');
      
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%, email.ilike.%${filters.search}%`);
      }
      
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      
      return query.order('created_at', { ascending: false });
    },

    // Get staff only (users with admin, superadmin, delivery roles)
    getStaff: (filters = {}) => {
      let query = supabase.from('users').select(`
        id, name, email, phone, department, address, 
        is_active, role, created_at, updated_at
      `).in('role', ['admin', 'superadmin', 'delivery']);
      
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%, email.ilike.%${filters.search}%`);
      }
      
      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      
      return query.order('created_at', { ascending: false });
    }
  },

  // Inventory
  inventory: {
    getAll: (filters = {}) => {
      let query = supabase.from('inventory').select('*');
      
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%, barcode.ilike.%${filters.search}%`);
      }
      
      return query.order('created_at', { ascending: false });
    },

    getById: (id) => {
      return supabase.from('inventory').select('*').eq('id', id).single();
    },

    create: (inventoryData) => {
      return supabase.from('inventory').insert(inventoryData).select().single();
    },

    update: (id, inventoryData) => {
      return supabase.from('inventory').update(inventoryData).eq('id', id).select().single();
    },

    delete: (id) => {
      return supabase.from('inventory').delete().eq('id', id);
    }
  },

  // Quotations
  quotations: {
    getAll: (filters = {}) => {
      let query = supabase.from('quotations').select(`
        *,
        customer:customer_id(id, name, email, phone),
        created_by_user:created_by(id, name, email),
        assigned_delivery_user:assigned_delivery(id, name, email),
        quotation_items(
          id, description, quantity, unit_price, discount, tax, total, notes,
          inventory:inventory_id(id, name, itemcode)
        )
      `);
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      
      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
      }
      
      return query.order('created_at', { ascending: false });
    },

    getById: (id) => {
      return supabase.from('quotations').select(`
        *,
        customer:customer_id(id, name, email, phone),
        created_by_user:created_by(id, name, email),
        assigned_delivery_user:assigned_delivery(id, name, email),
        quotation_items(
          id, description, quantity, unit_price, discount, tax, total, notes,
          inventory:inventory_id(id, name, itemcode)
        )
      `).eq('id', id).single();
    },

    create: async (quotationData) => {
      const { items, ...quotation } = quotationData;
      
      // Insert quotation first
      const { data: quotationResult, error: quotationError } = await supabase
        .from('quotations')
        .insert(quotation)
        .select()
        .single();
      
      if (quotationError) {
        return { data: null, error: quotationError };
      }
      
      // Insert quotation items
      if (items && items.length > 0) {
        const itemsWithQuotationId = items.map(item => ({
          ...item,
          quotation_id: quotationResult.id
        }));
        
        const { error: itemsError } = await supabase
          .from('quotation_items')
          .insert(itemsWithQuotationId);
        
        if (itemsError) {
          return { data: null, error: itemsError };
        }
      }
      
      return { data: quotationResult, error: null };
    },

    update: async (id, quotationData) => {
      const { items, ...quotation } = quotationData;
      
      // Update quotation
      const { data: quotationResult, error: quotationError } = await supabase
        .from('quotations')
        .update(quotation)
        .eq('id', id)
        .select()
        .single();
      
      if (quotationError) {
        return { data: null, error: quotationError };
      }
      
      // Update items if provided
      if (items) {
        // Delete existing items
        await supabase.from('quotation_items').delete().eq('quotation_id', id);
        
        // Insert new items
        if (items.length > 0) {
          const itemsWithQuotationId = items.map(item => ({
            ...item,
            quotation_id: id
          }));
          
          const { error: itemsError } = await supabase
            .from('quotation_items')
            .insert(itemsWithQuotationId);
          
          if (itemsError) {
            return { data: null, error: itemsError };
          }
        }
      }
      
      return { data: quotationResult, error: null };
    },

    delete: (id) => {
      return supabase.from('quotations').delete().eq('id', id);
    }
  }
};

// Real-time subscriptions
export const realtime = {
  // Subscribe to table changes
  subscribe: (table, callback, filter = null) => {
    let subscription = supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: table,
          filter: filter 
        }, 
        callback
      );
    
    return subscription.subscribe();
  },

  // Subscribe to quotations changes
  subscribeToQuotations: (callback, userId = null) => {
    const filter = userId ? `created_by=eq.${userId}` : null;
    return realtime.subscribe('quotations', callback, filter);
  },

  // Subscribe to inventory changes
  subscribeToInventory: (callback) => {
    return realtime.subscribe('inventory', callback);
  },

  // Unsubscribe from channel
  unsubscribe: (subscription) => {
    return supabase.removeChannel(subscription);
  }
};

// Storage helpers (if you need file uploads)
export const storage = {
  upload: (bucket, path, file) => {
    return supabase.storage.from(bucket).upload(path, file);
  },

  download: (bucket, path) => {
    return supabase.storage.from(bucket).download(path);
  },

  getPublicUrl: (bucket, path) => {
    return supabase.storage.from(bucket).getPublicUrl(path);
  },

  delete: (bucket, paths) => {
    return supabase.storage.from(bucket).remove(paths);
  }
};

export default supabase;
