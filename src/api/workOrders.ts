import { supabase, supabaseOrders } from '../lib/supabase';
import type { IWorkOrder, IOrderProcess } from '../types/models';
import { logActivity } from './logs';

export async function fetchActiveWorkOrders(): Promise<IWorkOrder[]> {
  const { data, error } = await supabaseOrders
    .from('work_orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as IWorkOrder[];
}

export async function fetchWorkOrderById(id: string): Promise<{ workOrder: IWorkOrder; processes: IOrderProcess[] }> {
  const [woResponse, processesResponse] = await Promise.all([
    supabaseOrders.from('work_orders').select('*').eq('id', id).single(),
    supabaseOrders.from('order_processes').select('*').eq('order_id', id).order('sequence_order', { ascending: true })
  ]);

  if (woResponse.error) throw new Error(woResponse.error.message);
  if (processesResponse.error) throw new Error(processesResponse.error.message);

  return {
    workOrder: woResponse.data as IWorkOrder,
    processes: processesResponse.data as IOrderProcess[]
  };
}

export async function createWorkOrder(payload: { 
  workOrder: Omit<IWorkOrder, 'id' | 'created_at'>; 
  processes: Omit<IOrderProcess, 'id' | 'order_id' | 'status' | 'good_pieces' | 'waste'>[] 
  }) {
  // 1. Insert Work Order
  const { data: woData, error: woError } = await supabaseOrders
    .from('work_orders')
    .insert([payload.workOrder])
    .select()
    .single();

  if (woError) throw new Error(woError.message);

  const workOrderId = woData.id;

  // 2. Insert Order Processes
  const processesToInsert = payload.processes.map(p => ({
    ...p,
    order_id: workOrderId,
    status: 'pending' as const,
    good_pieces: 0,
    waste: 0,
  }));

  const { error: processesError } = await supabaseOrders
    .from('order_processes')
    .insert(processesToInsert);

  if (processesError) throw new Error(processesError.message);

  // Log activity
  logActivity('CREATE_WORK_ORDER', {
    workOrderId,
    folio: woData.folio,
    client: woData.client,
    project_name: woData.project_name
  });

  return woData as IWorkOrder;
}

export async function uploadArtwork(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { error } = await supabase.storage
    .from('artworks')
    .upload(filePath, file);

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('artworks').getPublicUrl(filePath);
  return data.publicUrl;
}
