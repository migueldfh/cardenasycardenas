import { supabase } from '@/lib/supabase';

const LOCAL_STORAGE_KEY = 'decreto_activity_logs';

export interface IActivityLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  details: any;
  created_at: string;
}

function getStoredLogs(): IActivityLog[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to read logs from LocalStorage', e);
    return [];
  }
}

function saveStoredLogs(logs: IActivityLog[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logs.slice(0, 200))); // Cap at 200 logs locally
  } catch (e) {
    console.error('Failed to write logs to LocalStorage', e);
  }
}

/**
 * Log a user action.
 * Writes to Supabase and saves/mirrors in LocalStorage.
 */
export async function logActivity(action: string, details: any = {}): Promise<IActivityLog> {
  let userId: string | null = null;
  let userEmail: string | null = null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      userId = session.user.id;
      userEmail = session.user.email ?? null;
    }
  } catch (err) {
    console.warn('Could not determine active user session for logging:', err);
  }

  const logEntry: IActivityLog = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + '-' + Date.now(),
    user_id: userId,
    user_email: userEmail,
    action,
    details,
    created_at: new Date().toISOString(),
  };

  // 1. Mirror to LocalStorage
  const logs = getStoredLogs();
  logs.unshift(logEntry);
  saveStoredLogs(logs);

  // 2. Try to insert to database
  try {
    const { error } = await supabase.from('user_activity_logs').insert({
      id: logEntry.id,
      user_id: logEntry.user_id,
      user_email: logEntry.user_email,
      action: logEntry.action,
      details: logEntry.details,
      created_at: logEntry.created_at,
    });

    if (error) {
      console.warn('Supabase logActivity error, log remains saved in mock storage:', error.message);
    }
  } catch (err) {
    console.warn('Database connection failed, log recorded in mock storage:', err);
  }

  return logEntry;
}

/**
 * Fetch all activity logs (most recent first).
 */
export async function fetchActivityLogs(): Promise<IActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from('user_activity_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetchActivityLogs failed, reading from LocalStorage:', error.message);
      return getStoredLogs();
    }

    if (!data || data.length === 0) {
      return getStoredLogs();
    }

    return data as IActivityLog[];
  } catch (err) {
    console.warn('Database error fetching logs, reading from LocalStorage:', err);
    return getStoredLogs();
  }
}
