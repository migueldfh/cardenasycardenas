import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder_key';

// Main client (queries core public schema)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Orders client (queries orders schema)
export const supabaseOrders = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'orders' }
});

// Inventory client (queries inventory schema)
export const supabaseInventory = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'inventory' }
});

// Finances client (queries finances schema)
export const supabaseFinances = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'finances' }
});
