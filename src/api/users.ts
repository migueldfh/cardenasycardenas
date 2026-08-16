import { supabase } from '@/lib/supabase';
import type { IUser, UserRole } from '@/types/models';
import { logActivity } from './logs';

const LOCAL_STORAGE_KEY = 'decreto_users_mock';

// Seed initial mock users for demo and testing purposes
const MOCK_USERS: IUser[] = [
  {
    id: 'f8d7b322-2a54-47f2-95df-3a3ef9461234',
    email: 'admin@decreto.com',
    full_name: 'Administrador Principal',
    role: 'admin',
    department: 'Dirección',
    created_at: new Date().toISOString(),
  },
  {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    email: 'operator.ctp@decreto.com',
    full_name: 'Juan Pérez (CTP)',
    role: 'operator',
    department: 'CTP',
    created_at: new Date().toISOString(),
  },
  {
    id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    email: 'operator.sheeting@decreto.com',
    full_name: 'Carlos Ruiz (Sheeting)',
    role: 'operator',
    department: 'Sheeting',
    created_at: new Date().toISOString(),
  },
  {
    id: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    email: 'operator.printing@decreto.com',
    full_name: 'Sofía Gómez (Printing)',
    role: 'operator',
    department: 'Printing',
    created_at: new Date().toISOString(),
  },
  {
    id: 'd4e5f6a7-b89c-0d1e-2f3a-4b5c6d7e8f9a',
    email: 'pm@decreto.com',
    full_name: 'Gestor de Proyectos',
    role: 'project_manager',
    department: 'Proyectos',
    created_at: new Date().toISOString(),
  }
];

function getStoredUsers(): IUser[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(MOCK_USERS));
      return MOCK_USERS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('LocalStorage not available, returning default mock users', e);
    return MOCK_USERS;
  }
}

function storeUsers(users: IUser[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users to LocalStorage', e);
  }
}

/**
 * Fetch all user profiles.
 * Tries to read from Supabase public.users table, falls back to LocalStorage mock.
 */
export async function fetchUsers(): Promise<IUser[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetchUsers error, falling back to LocalStorage mock:', error.message);
      return getStoredUsers();
    }

    // Merge Supabase users with LocalStorage-created users if any, or just return DB users
    if (!data || data.length === 0) {
      return getStoredUsers();
    }
    return data as IUser[];
  } catch (err) {
    console.warn('Failed to query users table, falling back to LocalStorage:', err);
    return getStoredUsers();
  }
}

/**
 * Creates/Registers a user profile.
 * Attempts to insert into Supabase, and always mirrors to LocalStorage for offline testing/demo consistency.
 */
export async function createUser(payload: {
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
}): Promise<IUser> {
  const newUser: IUser = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + '-' + Date.now(),
    email: payload.email,
    full_name: payload.fullName,
    role: payload.role,
    department: payload.department,
    created_at: new Date().toISOString(),
  };

  // 1. Save to LocalStorage first to ensure the mock demo state works
  const localUsers = getStoredUsers();
  localUsers.unshift(newUser);
  storeUsers(localUsers);

  // 2. Try to insert to Supabase database if available
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        department: newUser.department,
        created_at: newUser.created_at
      })
      .select()
      .single();

    if (error) {
      console.warn('Could not insert user to Supabase:', error.message);
      if (error.code === '22P02' || error.message.includes('user_role')) {
        throw new Error('El enum "user_role" en Supabase no incluye "project_manager". Por favor ejecuta en el Editor SQL de Supabase: ALTER TYPE user_role ADD VALUE \'project_manager\';');
      }
    } else if (data) {
      return data as IUser;
    }
  } catch (err: any) {
    if (err.message && err.message.includes('user_role')) {
      throw err;
    }
    console.warn('Supabase insert failed, running in mock mode:', err);
  }

  // Log activity
  logActivity('CREATE_USER', {
    email: newUser.email,
    full_name: newUser.full_name,
    role: newUser.role,
    department: newUser.department
  });

  return newUser;
}
