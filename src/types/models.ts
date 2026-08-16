export type UserRole = 'admin' | 'operator' | 'project_manager';
export type OrderStatus = 'draft' | 'production' | 'completed';
export type ProcessStatus = 'pending' | 'ready' | 'in_progress' | 'paused' | 'completed';
export type Priority = 'low' | 'medium' | 'high';

export interface IUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string;
  created_at: string;
}

export interface IWorkOrder {
  id: string;
  folio: string;
  client: string;
  project_name: string;
  product: string;
  quantity: number;
  delivery_date: string;
  priority: Priority;
  status: OrderStatus;
  file_url?: string;
  created_by: string;
  created_at: string;
}

export interface IOrderProcess {
  id: string;
  order_id: string;
  process_name: string;
  sequence_order: number;
  assigned_to?: string;
  status: ProcessStatus;
  started_at?: string;
  finished_at?: string;
  good_pieces: number;
  waste: number;
  notes?: string;
  photo_url?: string;
}

export interface IProcessPause {
  id: string;
  process_id: string;
  reason: string;
  paused_at: string;
  resumed_at?: string;
}


