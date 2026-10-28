import { supabase } from '@/lib/supabase';
import type { IUser, UserRole } from '@/types/models';
import { logActivity } from './logs';

const LOCAL_STORAGE_KEY = 'decreto_users_mock';
const CUSTOM_CONTADORES_KEY = 'cardenas_custom_accountants';

export const DEFAULT_ACCOUNTANT_PASSWORD = 'Cardenas2026!';

export interface ContadorTeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: 'Activo' | 'Inactivo';
  created_at?: string;
  temporary_password?: string;
}

export const BASE_CONTADORES_TEAM: ContadorTeamMember[] = [
  { id: "1", name: "Alejandra Díaz", role: "Contadora Fiscalista", email: "alejandra@cardenasycardenas.mx", phone: "81 2010 3796", status: "Activo" },
  { id: "2", name: "Brandon Ruíz", role: "Contador de Operaciones", email: "brandon@cardenasycardenas.mx", phone: "81 1481 9559", status: "Activo" },
  { id: "3", name: "Carlos Martinez", role: "Contador Senior", email: "carlos@cardenasycardenas.mx", phone: "81 2686 9514", status: "Activo" },
  { id: "4", name: "Elder Corpus", role: "Contador General", email: "elder@cardenasycardenas.mx", phone: "81 1173 3652", status: "Activo" },
  { id: "5", name: "Marisol Sinahi", role: "Contadora Fiscalista", email: "marisol@cardenasycardenas.mx", phone: "81 1241 8596", status: "Activo" },
  { id: "6", name: "Rodrigo Cerda", role: "Contador Senior", email: "rodrigo@cardenasycardenas.mx", phone: "81 1905 5308", status: "Activo" },
  { id: "7", name: "Rubí Jimenez", role: "Contadora de Operaciones", email: "rubi@cardenasycardenas.mx", phone: "81 1810 0295", status: "Activo" },
  { id: "8", name: "Vero Aguillon", role: "Contadora Senior", email: "vero@cardenasycardenas.mx", phone: "81 8334 4376", status: "Activo" },
];

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

function getStoredCustomContadores(): ContadorTeamMember[] {
  try {
    const data = localStorage.getItem(CUSTOM_CONTADORES_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load custom accountants from LocalStorage', e);
    return [];
  }
}

function saveStoredCustomContador(contador: ContadorTeamMember) {
  try {
    const list = getStoredCustomContadores();
    const existingIndex = list.findIndex(
      (c) => c.email.toLowerCase() === contador.email.toLowerCase() || c.id === contador.id
    );
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...contador };
    } else {
      list.push(contador);
    }
    localStorage.setItem(CUSTOM_CONTADORES_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save custom accountant to LocalStorage', e);
  }
}

/**
 * Fetch full accountants team.
 * Combines BASE_CONTADORES_TEAM with database users (role: 'accountant') and locally persisted accountants.
 */
export async function fetchContadoresTeam(): Promise<ContadorTeamMember[]> {
  const customLocal = getStoredCustomContadores();
  const map = new Map<string, ContadorTeamMember>();

  // 1. Add base static team members
  for (const c of BASE_CONTADORES_TEAM) {
    map.set(c.email.toLowerCase(), { ...c });
  }

  // 2. Add local custom contadores
  for (const c of customLocal) {
    const key = c.email.toLowerCase();
    if (map.has(key)) {
      map.set(key, { ...map.get(key)!, ...c });
    } else {
      map.set(key, c);
    }
  }

  // 3. Query Supabase public.users for live accountants (if available)
  try {
    const { data: dbUsers, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'accountant');

    if (!error && dbUsers && dbUsers.length > 0) {
      for (const u of dbUsers) {
        const key = (u.email || '').toLowerCase();
        if (!key) continue;

        if (map.has(key)) {
          const existing = map.get(key)!;
          map.set(key, {
            ...existing,
            id: u.id || existing.id,
            name: u.full_name || existing.name,
            created_at: u.created_at || existing.created_at,
          });
        } else {
          map.set(key, {
            id: u.id,
            name: u.full_name || 'Contador Sin Nombre',
            email: u.email,
            phone: '',
            role: 'Contador General',
            status: 'Activo',
            created_at: u.created_at,
          });
        }
      }
    }
  } catch (err) {
    console.warn('Could not query users table for accountants, using cached/base list:', err);
  }

  return Array.from(map.values());
}

/**
 * Generates an institutional welcome and onboarding message ready to be copied
 * to WhatsApp or email for the newly registered accountant.
 */
export function generateAccountantWelcomeMessage(params: {
  fullName: string;
  email: string;
  temporaryPassword: string;
  roleTitle?: string;
  baseUrl?: string;
}): string {
  const origin = params.baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const changePasswordUrl = `${origin}/cambiar-password?email=${encodeURIComponent(params.email)}`;
  const loginUrl = `${origin}/login`;

  return [
    `¡Hola ${params.fullName}!`,
    `Te damos la bienvenida al equipo contable de Cárdenas & Cárdenas Consultores.`,
    ``,
    `Tus credenciales iniciales para ingresar a la plataforma son:`,
    `• Portal de acceso: ${loginUrl}`,
    `• Correo electrónico: ${params.email}`,
    `• Contraseña temporal por defecto: ${params.temporaryPassword}`,
    ``,
    `🔐 IMPORTANTE: Para mayor seguridad institucional, debes ingresar a definir tu propia contraseña definitiva en el siguiente enlace directo:`,
    changePasswordUrl,
    ``,
    `¡Mucho éxito en tus labores fiscales y contables!`,
  ].join('\n');
}

/**
 * Creates/Registers a new accountant user.
 * 1. Tries Supabase RPC `admin_create_accountant` (creates in auth.users, auth.identities, public.users)
 * 2. Mirrors locally to cache/localStorage
 * 3. Logs activity
 */
export async function createAccountantUser(payload: {
  fullName: string;
  email: string;
  phone?: string;
  roleTitle?: string;
  defaultPassword?: string;
  status?: 'Activo' | 'Inactivo';
}): Promise<{
  success: boolean;
  contador: ContadorTeamMember;
  defaultPassword: string;
  welcomeMessage: string;
}> {
  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanName = payload.fullName.trim();
  const cleanPhone = (payload.phone || '').trim();
  const roleTitle = payload.roleTitle?.trim() || 'Contador General';
  const temporaryPassword = payload.defaultPassword?.trim() || DEFAULT_ACCOUNTANT_PASSWORD;
  const status: 'Activo' | 'Inactivo' = payload.status || 'Activo';

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Por favor ingresa un correo electrónico válido.');
  }
  if (!cleanName) {
    throw new Error('El nombre completo del contador es requerido.');
  }

  let createdId = crypto.randomUUID ? crypto.randomUUID() : `acc-${Date.now()}`;
  let rpcSuccess = false;

  // 1. Try Supabase RPC
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_create_accountant', {
      p_email: cleanEmail,
      p_full_name: cleanName,
      p_phone: cleanPhone,
      p_password: temporaryPassword,
      p_role_title: roleTitle,
    });

    if (rpcError) {
      console.warn('RPC admin_create_accountant error, will fallback to local/table:', rpcError.message);
    } else if (rpcData && (rpcData.success || rpcData.id)) {
      rpcSuccess = true;
      if (rpcData.id) {
        createdId = rpcData.id;
      }
    }
  } catch (rpcErr) {
    console.warn('Calling admin_create_accountant failed:', rpcErr);
  }

  // 2. If RPC was not applied yet in DB, try direct insert into public.users
  if (!rpcSuccess) {
    try {
      await supabase.from('users').upsert({
        id: createdId,
        email: cleanEmail,
        full_name: cleanName,
        role: 'accountant' as UserRole,
        department: 'Contabilidad',
        created_at: new Date().toISOString(),
      });
    } catch (insertErr) {
      console.warn('Direct users table insert skipped/failed:', insertErr);
    }
  }

  const newContador: ContadorTeamMember = {
    id: createdId,
    name: cleanName,
    role: roleTitle,
    email: cleanEmail,
    phone: cleanPhone,
    status,
    created_at: new Date().toISOString(),
    temporary_password: temporaryPassword,
  };

  // 3. Save to local storage cache so it persists and renders immediately
  saveStoredCustomContador(newContador);

  // 4. Log activity
  try {
    await logActivity('CREACION_NUEVO_CONTADOR', {
      module: 'contadores',
      email: cleanEmail,
      full_name: cleanName,
      role_title: roleTitle,
      default_password_assigned: true,
      rpc_provisioned: rpcSuccess,
      title: 'Nuevo contador creado',
      description: `Se registró al contador ${cleanName} (${cleanEmail}) con contraseña provisional por defecto.`,
    });
  } catch (logErr) {
    console.warn('Failed to log accountant creation activity:', logErr);
  }

  const welcomeMessage = generateAccountantWelcomeMessage({
    fullName: cleanName,
    email: cleanEmail,
    temporaryPassword,
    roleTitle,
  });

  return {
    success: true,
    contador: newContador,
    defaultPassword: temporaryPassword,
    welcomeMessage,
  };
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
