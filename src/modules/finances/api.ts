import { supabase, supabaseFinances } from '@/lib/supabase';
import type {
  IFinanceClient,
  IClientDocument,
  IProject,
  IPaymentSchedule,
  IPayment,
  ISupplier,
  IExpenseCategory,
  IExpense,
  IFinancialStats,
  IExpenseRemission,
  IInvoice,
} from './types';
import { logActivity } from '@/api/logs';

// ─── Clients API ───────────────────────────────────────────────────

export async function fetchFinanceClients(): Promise<IFinanceClient[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name');

  if (error) throw new Error(error.message);
  return ((data || []) as any[]).map((c) => ({
    ...c,
    rfc: c.tax_id_rfc || c.rfc || '',
    tax_regime: c.fiscal_regime || c.tax_regime || '',
  })) as IFinanceClient[];
}

export async function createFinanceClient(payload: {
  name: string;
  trade_name?: string | null;
  fiscal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  tax_id_rfc?: string | null;
  fiscal_regime?: string | null;
  ciec?: string | null;
  economic_activity?: string | null;
  invoice_email?: string | null;
  contact_person?: string | null;
  assigned_accountant?: string | null;
  notes?: string | null;
  person_type?: string | null;
  status?: string | null;
}): Promise<IFinanceClient> {
  const { data, error } = await supabase
    .from('clients')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  const client = data as IFinanceClient;
  logActivity('CREATE_CLIENT', {
    clientId: client.id,
    name: client.name,
  });

  return client;
}

export async function updateFinanceClient(
  id: string,
  payload: {
    name?: string;
    trade_name?: string | null;
    fiscal_name?: string | null;
    email?: string | null;
    phone?: string | null;
    tax_id_rfc?: string | null;
    fiscal_regime?: string | null;
    ciec?: string | null;
    economic_activity?: string | null;
    invoice_email?: string | null;
    contact_person?: string | null;
    assigned_accountant?: string | null;
    notes?: string | null;
    person_type?: string | null;
    status?: string | null;
    contracted_services?: string[] | null;
    compliance_opinion?: string | null;
    stationery_received?: boolean | null;
    stationery_date?: string | null;
    accounting_capture_pct?: number | null;
    tax_calculation?: boolean | null;
    tax_presented?: boolean | null;
    diot_presented?: boolean | null;
    financial_statements?: boolean | null;
    accounting_notes?: string | null;
    accounting_period?: string | null;
    accounting_status?: string | null;
  }
): Promise<IFinanceClient> {
  const { data, error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const client = data as IFinanceClient;
  const periodLabel = payload.accounting_period || client.accounting_period || 'Octubre 2026';

  const hasAccountingFields =
    payload.compliance_opinion !== undefined ||
    payload.stationery_received !== undefined ||
    payload.stationery_date !== undefined ||
    payload.accounting_capture_pct !== undefined ||
    payload.tax_calculation !== undefined ||
    payload.tax_presented !== undefined ||
    payload.diot_presented !== undefined ||
    payload.financial_statements !== undefined ||
    payload.accounting_notes !== undefined ||
    payload.accounting_status !== undefined;

  if (hasAccountingFields) {
    // Also sync to client_monthly_accounting so historical periods and DB triggers stay in sync
    await supabase
      .from('client_monthly_accounting')
      .upsert(
        {
          client_id: client.id,
          period: periodLabel,
          compliance_opinion: client.compliance_opinion ?? 'Positiva',
          stationery_received: client.stationery_received ?? false,
          stationery_date: client.stationery_date ?? null,
          accounting_capture_pct: client.accounting_capture_pct ?? 0,
          tax_calculation: client.tax_calculation ?? false,
          tax_presented: client.tax_presented ?? false,
          diot_presented: client.diot_presented ?? false,
          financial_statements: client.financial_statements ?? false,
          accounting_notes: client.accounting_notes ?? null,
          accounting_status: client.accounting_status ?? 'En proceso',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id,period' }
      )
      .then(({ error: syncErr }) => {
        if (syncErr) {
          // If client_monthly_accounting didn't fire an UPDATE trigger (e.g., first INSERT), log explicitly
          logActivity('CLIENT_ACCOUNTING_UPDATED', {
            client_id: client.id,
            client_name: client.name,
            period: periodLabel,
            user_name: client.assigned_accountant || undefined,
            title: `Control contable actualizado (${periodLabel})`,
            description: `Se actualizaron las etapas contables de ${client.name} para ${periodLabel}.`,
            category: 'contabilidad',
            changes: payload,
          });
        }
      });
  } else if (payload.contracted_services !== undefined) {
    logActivity('CLIENT_SERVICES_UPDATED', {
      client_id: client.id,
      client_name: client.name,
      user_name: client.assigned_accountant || undefined,
      services: payload.contracted_services,
      title: 'Servicios contratados actualizados',
      description: `Servicios activos configurados (${(payload.contracted_services || []).length}): ${(payload.contracted_services || []).join(', ') || 'Ninguno'}`,
      category: 'servicios',
    });
  } else {
    logActivity('UPDATE_CLIENT', {
      client_id: client.id,
      client_name: client.name,
      name: client.name,
      user_name: client.assigned_accountant || undefined,
      title: 'Ficha fiscal del cliente actualizada',
      description: `Actualización de datos fiscales y generales de ${client.name} (${client.tax_id_rfc || 'Sin RFC'}).`,
      category: 'servicios',
    });
  }

  return client;
}

export async function deleteFinanceClient(id: string): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  logActivity('DELETE_CLIENT', { clientId: id });
}




// ─── Projects & Quotations API ──────────────────────────────────────

export async function fetchProjects(): Promise<IProject[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, client:clients(*)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as IProject[];
}

export async function fetchProjectById(id: string): Promise<IProject> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, client:clients(*)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as IProject;
}

export async function createProject(payload: {
  client_id: string;
  name: string;
  base_price_total: number;
  custom_price_total: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'completed' | 'cancelled';
  requires_invoice: boolean;
  cfdi_use?: string | null;
  order_number?: string | null;
  description?: string | null;
  purchase_order_url?: string | null;
  iva_rate?: number;
  isr_retention_rate?: number;
  iva_retention_rate?: number;
  unit_cost?: number | null;
  total_pieces?: number;
  print_info?: string | null;
  status_note?: string | null;
  paymentSchedules?: Omit<IPaymentSchedule, 'id' | 'project_id'>[];
}): Promise<IProject> {
  // 1. Insert project
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .insert({
      client_id: payload.client_id,
      name: payload.name,
      base_price_total: payload.base_price_total,
      custom_price_total: payload.custom_price_total,
      status: payload.status,
      requires_invoice: payload.requires_invoice,
      cfdi_use: payload.cfdi_use || null,
      order_number: payload.order_number || null,
      description: payload.description || null,
      purchase_order_url: payload.purchase_order_url || null,
      iva_rate: payload.iva_rate !== undefined ? payload.iva_rate : 0.16,
      isr_retention_rate: payload.isr_retention_rate || 0.0,
      iva_retention_rate: payload.iva_retention_rate || 0.0,
      unit_cost: payload.unit_cost !== undefined ? payload.unit_cost : null,
      total_pieces: payload.total_pieces || 0,
      print_info: payload.print_info || null,
      status_note: payload.status_note || null,
    })
    .select()
    .single();

  if (projectError) throw new Error(projectError.message);
  const project = projectData as IProject;

  // 2. Insert payment schedules if provided
  if (payload.paymentSchedules && payload.paymentSchedules.length > 0) {
    const schedulesToInsert = payload.paymentSchedules.map((s) => ({
      project_id: project.id,
      expected_amount: s.expected_amount,
      due_date: s.due_date,
      status: s.status || 'pending',
    }));

    const { error: schedulesError } = await supabaseFinances
      .from('payment_schedules')
      .insert(schedulesToInsert);

    if (schedulesError) {
      // Cleanup project if schedule insert fails
      await supabase.from('projects').delete().eq('id', project.id);
      throw new Error(`Error setting schedules: ${schedulesError.message}`);
    }
  }

  logActivity('CREATE_PROJECT', {
    projectId: project.id,
    name: project.name,
    customPrice: project.custom_price_total,
  });

  return project;
}

export async function updateProject(id: string, payload: Partial<IProject>): Promise<IProject> {
  const cleanPayload = { ...payload };
  if (cleanPayload.target_delivery_date === "") {
    cleanPayload.target_delivery_date = null;
  }

  const { data, error } = await supabase
    .from('projects')
    .update(cleanPayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const project = data as IProject;

  logActivity('UPDATE_PROJECT', {
    projectId: project.id,
    name: project.name,
    changes: payload,
  });

  return project;
}

export async function deleteProject(id: string): Promise<void> {
  // Delete related payment schedules first if existing
  await supabaseFinances.from('payment_schedules').delete().eq('project_id', id);

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  logActivity('DELETE_PROJECT', { projectId: id });
}

export async function updateProjectStage(
  id: string,
  newStage: string,
  notes?: string
): Promise<IProject> {
  const currentProject = await fetchProjectById(id);
  const oldStage = currentProject.current_stage || 'solicitud';

  // Automatically sync project status if moving to specific milestones
  let statusUpdate: any = {};
  if (newStage === 'aprobacion_captura' || newStage === 'anticipo' || newStage === 'corte') {
    statusUpdate.status = 'approved';
  } else if (newStage === 'finiquito') {
    statusUpdate.status = 'completed';
  }

  const { data, error } = await supabase
    .from('projects')
    .update({
      current_stage: newStage,
      ...statusUpdate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Insert log entry
  await supabase.from('project_process_logs').insert({
    project_id: id,
    from_stage: oldStage,
    to_stage: newStage,
    notes: notes || null,
  });

  logActivity('UPDATE_PROJECT_STAGE', {
    projectId: id,
    fromStage: oldStage,
    toStage: newStage,
  });

  return data as IProject;
}

export async function fetchProjectProcessLogs(projectId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('project_process_logs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveProjectWorksheet(
  id: string,
  worksheet: Partial<IProject>
): Promise<IProject> {
  const cleanWorksheet = { ...worksheet };
  if (cleanWorksheet.target_delivery_date === "") {
    cleanWorksheet.target_delivery_date = null;
  }

  const { data, error } = await supabase
    .from('projects')
    .update({
      ...cleanWorksheet,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as IProject;
}


// ─── Payments & Schedules API ───────────────────────────────────────

export async function fetchPayments(): Promise<IPayment[]> {
  const { data, error } = await supabaseFinances
    .from('payments')
    .select('*, project:projects(*, client:clients(*))')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as any) as IPayment[];
}

export async function fetchPaymentSchedules(projectId?: string): Promise<IPaymentSchedule[]> {
  let query = supabaseFinances
    .from('payment_schedules')
    .select('*, project:projects(*, client:clients(*))')
    .order('due_date', { ascending: true });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as any) as IPaymentSchedule[];
}

export async function createPayment(payload: {
  project_id: string;
  amount: number;
  method: 'cash' | 'transfer' | 'card' | 'gateway' | 'redistribution' | 'atm_withdrawal';
  folio?: string | null;
  proof_url?: string | null;
  is_reconciled?: boolean;
}): Promise<IPayment> {
  const { data, error } = await supabaseFinances
    .from('payments')
    .insert({
      project_id: payload.project_id,
      amount: payload.amount,
      method: payload.method,
      folio: payload.folio || null,
      proof_url: payload.proof_url || null,
      is_reconciled: payload.is_reconciled || false,
      reported_by: 'admin',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Trigger a check to see if there is a pending payment schedule that is satisfied
  // Fetch pending schedules for this project
  const schedules = await fetchPaymentSchedules(payload.project_id);
  const pendingSchedule = schedules.find((s) => s.status !== 'paid');
  
  if (pendingSchedule) {
    // For simplicity, mark the oldest pending schedule as paid if a payment is registered
    await supabaseFinances
      .from('payment_schedules')
      .update({ status: 'paid' })
      .eq('id', pendingSchedule.id);
  }

  logActivity('CREATE_PAYMENT', {
    projectId: payload.project_id,
    amount: payload.amount,
    method: payload.method,
  });

  return data as IPayment;
}

export async function updatePayment(
  id: string,
  payload: Partial<IPayment>
): Promise<IPayment> {
  const { data, error } = await supabaseFinances
    .from('payments')
    .update({
      project_id: payload.project_id,
      amount: payload.amount,
      method: payload.method,
      folio: payload.folio,
      proof_url: payload.proof_url,
      is_reconciled: payload.is_reconciled,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  logActivity('UPDATE_PAYMENT', {
    paymentId: id,
    projectId: payload.project_id,
    amount: payload.amount,
  });

  return data as IPayment;
}

export async function reconcilePayments(paymentIds: string[]): Promise<void> {
  const { error } = await supabaseFinances
    .from('payments')
    .update({ is_reconciled: true })
    .in('id', paymentIds);

  if (error) throw new Error(error.message);

  logActivity('RECONCILE_PAYMENTS', {
    count: paymentIds.length,
    paymentIds,
  });
}

export async function deletePayment(id: string): Promise<void> {
  const { data: payment } = await supabaseFinances
    .from('payments')
    .select('project_id, amount')
    .eq('id', id)
    .single();

  const { error } = await supabaseFinances
    .from('payments')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  if (payment) {
    logActivity('DELETE_PAYMENT', {
      paymentId: id,
      projectId: payment.project_id,
      amount: payment.amount,
    });
  }
}

// ─── Suppliers & Expenses API ───────────────────────────────────────

export async function fetchSuppliers(): Promise<ISupplier[]> {
  const { data, error } = await supabaseFinances
    .from('suppliers')
    .select('*')
    .order('legal_name');

  if (error) throw new Error(error.message);
  return data as ISupplier[];
}

export async function createSupplier(payload: Omit<ISupplier, 'id' | 'created_at'>): Promise<ISupplier> {
  const { data, error } = await supabaseFinances
    .from('suppliers')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  const supplier = data as ISupplier;
  logActivity('CREATE_SUPPLIER', {
    supplierId: supplier.id,
    name: supplier.legal_name,
  });

  return supplier;
}

export async function updateSupplier(id: string, payload: Partial<Omit<ISupplier, 'id' | 'created_at'>>): Promise<ISupplier> {
  const { data, error } = await supabaseFinances
    .from('suppliers')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  const supplier = data as ISupplier;
  logActivity('UPDATE_SUPPLIER', {
    supplierId: supplier.id,
    name: supplier.legal_name,
    changes: payload,
  });

  return supplier;
}

export async function deleteSupplier(id: string): Promise<void> {
  const { data: supplier } = await supabaseFinances
    .from('suppliers')
    .select('legal_name')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabaseFinances
    .from('suppliers')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  if (supplier) {
    logActivity('DELETE_SUPPLIER', {
      supplierId: id,
      name: supplier.legal_name,
    });
  }
}

export async function fetchExpenseCategories(): Promise<IExpenseCategory[]> {
  const { data, error } = await supabaseFinances
    .from('expense_categories')
    .select('*')
    .order('name');

  if (error) throw new Error(error.message);
  return data as IExpenseCategory[];
}

export async function createExpenseCategory(payload: Omit<IExpenseCategory, 'id'>): Promise<IExpenseCategory> {
  const { data, error } = await supabaseFinances
    .from('expense_categories')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  const category = data as IExpenseCategory;
  logActivity('CREATE_EXPENSE_CATEGORY', {
    categoryId: category.id,
    name: category.name,
  });

  return category;
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  const { error } = await supabaseFinances
    .from('expense_categories')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  logActivity('DELETE_EXPENSE_CATEGORY', {
    categoryId: id,
  });
}

export async function fetchExpenses(): Promise<IExpense[]> {
  const { data, error } = await supabaseFinances
    .from('expenses')
    .select('*, supplier:suppliers(*), category:expense_categories(*), project:projects(*), remissions:expense_remissions(*, project:projects(*))')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as IExpense[];
}

export async function createExpense(payload: Omit<IExpense, 'id' | 'created_at' | 'supplier' | 'category'>): Promise<IExpense> {
  const { data, error } = await supabaseFinances
    .from('expenses')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);

  logActivity('CREATE_EXPENSE', {
    concept: payload.concept,
    amount: payload.amount,
    status: payload.status,
  });

  return data as IExpense;
}

export async function updateExpense(id: string, payload: Partial<IExpense>): Promise<IExpense> {
  const { data, error } = await supabaseFinances
    .from('expenses')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  const expense = data as IExpense;
  logActivity('UPDATE_EXPENSE', {
    expenseId: expense.id,
    concept: expense.concept,
    changes: payload,
  });

  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const { data: expense } = await supabaseFinances
    .from('expenses')
    .select('concept, amount')
    .eq('id', id)
    .single();

  const { error } = await supabaseFinances
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  if (expense) {
    logActivity('DELETE_EXPENSE', {
      id,
      concept: expense.concept,
      amount: expense.amount,
    });
  }
}


// ─── Public Client Portals (Anonymous access via RPC) ──────────────────

export async function fetchPublicProjectByToken(token: string): Promise<any> {
  const { data, error } = await supabase
    .rpc('get_project_by_token', { project_token: token });

  if (error) throw new Error(error.message);
  return (data && data.length > 0) ? data[0] : null;
}

export async function approvePublicProject(token: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('approve_project_by_token', { project_token: token });

  if (error) throw new Error(error.message);
  return !!data;
}

export async function reportPublicPayment(payload: {
  project_token: string;
  amount: number;
  method: string;
  folio: string;
  proof_url?: string | null;
}): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('report_payment_by_token', {
      project_token: payload.project_token,
      payment_amount: payload.amount,
      payment_method: payload.method,
      payment_folio: payload.folio,
      payment_proof_url: payload.proof_url || null,
    });

  if (error) throw new Error(error.message);
  return !!data;
}

export async function uploadPaymentProof(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `receipts/${fileName}`;

  const { error } = await supabase.storage
    .from('evidence')
    .upload(filePath, file);

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('evidence').getPublicUrl(filePath);
  return data.publicUrl;
}

export async function uploadPurchaseOrder(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `purchase_orders/${fileName}`;

  const { error } = await supabase.storage
    .from('evidence')
    .upload(filePath, file);

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('evidence').getPublicUrl(filePath);
  return data.publicUrl;
}

export async function uploadProjectDesign(file: File, folder: 'digital' | 'print' = 'digital'): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `project_designs/${folder}/${fileName}`;

  const { error } = await supabase.storage
    .from('evidence')
    .upload(filePath, file);

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('evidence').getPublicUrl(filePath);
  return data.publicUrl;
}


// ─── Excel/CSV Bulk Import ───────────────────────────────────────────

export async function bulkImportProjects(rows: any[]): Promise<{ imported: number; errors: string[] }> {
  let imported = 0;
  const errors: string[] = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    try {
      if (!row.client_name || !row.project_name || !row.base_price) {
        throw new Error('Missing required fields: client_name, project_name, base_price');
      }

      // Find or create client
      let client: IFinanceClient | null = null;
      const { data: clientSearch, error: searchErr } = await supabase
        .from('clients')
        .select('*')
        .eq('name', row.client_name.trim())
        .maybeSingle();

      if (searchErr) throw searchErr;

      if (clientSearch) {
        client = clientSearch as IFinanceClient;
      } else {
        const { data: newClient, error: createErr } = await supabase
          .from('clients')
          .insert({
            name: row.client_name.trim(),
            email: row.client_email || null,
            phone: row.client_phone || null,
          })
          .select()
          .single();

        if (createErr) throw createErr;
        client = newClient as IFinanceClient;
      }

      // Create project
      const customPrice = row.custom_price ? parseFloat(row.custom_price) : parseFloat(row.base_price);
      await createProject({
        client_id: client.id,
        name: row.project_name.trim(),
        base_price_total: parseFloat(row.base_price),
        custom_price_total: customPrice,
        status: row.status || 'draft',
        requires_invoice: !!row.requires_invoice,
        cfdi_use: row.cfdi_use || null,
      });

      imported++;
    } catch (e: any) {
      errors.push(`Row ${index + 1}: ${e.message}`);
    }
  }

  return { imported, errors };
}

// ─── Dashboard Stats & MoM Calculations ──────────────────────────────

export async function fetchFinancialStats(): Promise<IFinancialStats> {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // Fetch all payments
  const paymentsList = await fetchPayments();
  // Fetch all expenses
  const expensesList = await fetchExpenses();

  const getAmountSum = (list: any[], dateField: string, start: Date, end: Date) => {
    return list
      .filter((item) => {
        const d = new Date(item[dateField]);
        return d >= start && d <= end;
      })
      .reduce((sum, item) => sum + Number(item.amount), 0);
  };

  // 1. Income totals
  const totalRevenue = paymentsList.reduce((sum, item) => sum + Number(item.amount), 0);
  const currentMonthRevenue = getAmountSum(paymentsList, 'created_at', currentMonthStart, currentMonthEnd);
  const prevMonthRevenue = getAmountSum(paymentsList, 'created_at', prevMonthStart, prevMonthEnd);
  const revenueMom = prevMonthRevenue > 0 ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

  // 2. Expenses totals
  const totalExpenses = expensesList.reduce((sum, item) => sum + Number(item.amount), 0);
  const currentMonthExpenses = getAmountSum(expensesList, 'created_at', currentMonthStart, currentMonthEnd);
  const prevMonthExpenses = getAmountSum(expensesList, 'created_at', prevMonthStart, prevMonthEnd);
  const expensesMom = prevMonthExpenses > 0 ? ((currentMonthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100 : 0;

  // 3. Cash Flow (Net Liquidity)
  const netCashFlow = totalRevenue - totalExpenses;
  const currentMonthFlow = currentMonthRevenue - currentMonthExpenses;
  const prevMonthFlow = prevMonthRevenue - prevMonthExpenses;
  const flowMom = prevMonthFlow !== 0 ? ((currentMonthFlow - prevMonthFlow) / Math.abs(prevMonthFlow)) * 100 : 0;

  // 4. Accounts Payable
  const pendingExpenses = expensesList.filter((e) => e.status !== 'paid');
  const accountsPayableAmount = pendingExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const accountsPayableCount = pendingExpenses.length;
  
  // MoM for accounts payable (based on due dates)
  const currentMonthAP = getAmountSum(pendingExpenses, 'due_date', currentMonthStart, currentMonthEnd);
  const prevMonthAP = getAmountSum(pendingExpenses, 'due_date', prevMonthStart, prevMonthEnd);
  const apMom = prevMonthAP > 0 ? ((currentMonthAP - prevMonthAP) / prevMonthAP) * 100 : 0;

  // 5. Estimated profit
  // Estimated profit is (projectscustompricetotal) - totalExpenses
  const projectsList = await fetchProjects();
  const approvedProjects = projectsList.filter((p) => p.status === 'approved' || p.status === 'completed');
  const totalCustomVal = approvedProjects.reduce((sum, item) => sum + Number(item.custom_price_total), 0);
  const estimatedProfit = totalCustomVal - totalExpenses;
  const profitMom = flowMom; // Map similarly or base on project approvals MoM

  return {
    ingresosTotales: totalRevenue,
    ingresosMom: revenueMom,
    gastosTotales: totalExpenses,
    gastosMom: expensesMom,
    flujoEfectivo: netCashFlow,
    flujoMom: flowMom,
    cuentasPorPagarMonto: accountsPayableAmount,
    cuentasPorPagarCount: accountsPayableCount,
    cuentasPorPagarMom: apMom,
    utilidadEstimada: estimatedProfit,
    utilidadMom: profitMom,
  };
}

// ─── Expense Remissions API ──────────────────────────────────────────

export async function createExpenseRemission(payload: {
  expense_id: string;
  project_id?: string | null;
  folio: string;
  file_url?: string | null;
  is_paid: boolean;
  amount: number;
  paid_amount: number;
}): Promise<IExpenseRemission> {
  const { data, error } = await supabaseFinances
    .from('expense_remissions')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  const remission = data as IExpenseRemission;
  logActivity('CREATE_EXPENSE_REMISSION', {
    remissionId: remission.id,
    expenseId: remission.expense_id,
    folio: remission.folio,
  });

  return remission;
}

export async function updateExpenseRemission(id: string, payload: Partial<IExpenseRemission>): Promise<IExpenseRemission> {
  const { data, error } = await supabaseFinances
    .from('expense_remissions')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  const remission = data as IExpenseRemission;
  logActivity('UPDATE_EXPENSE_REMISSION', {
    remissionId: remission.id,
    expenseId: remission.expense_id,
    changes: payload,
  });

  return remission;
}

export async function deleteExpenseRemission(id: string): Promise<void> {
  const { error } = await supabaseFinances
    .from('expense_remissions')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  logActivity('DELETE_EXPENSE_REMISSION', {
    remissionId: id,
  });
}

export async function uploadRemissionFile(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `remissions/${fileName}`;

  const { error } = await supabase.storage
    .from('evidence')
    .upload(filePath, file);

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('evidence').getPublicUrl(filePath);
  return data.publicUrl;
}

// ─── Invoices API ───────────────────────────────────────────────────

export async function fetchInvoices(): Promise<IInvoice[]> {
  const { data, error } = await supabaseFinances
    .from('invoices')
    .select('*, client:clients(*), projects(*)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as IInvoice[];
}

export async function createInvoice(payload: {
  client_id: string;
  invoice_number: string;
  iva_rate: number;
  subtotal: number;
  iva: number;
  total: number;
  notes?: string | null;
  status: 'pending' | 'paid' | 'cancelled';
  project_ids: string[];
}): Promise<IInvoice> {
  const { data: invoiceData, error: invoiceError } = await supabaseFinances
    .from('invoices')
    .insert({
      client_id: payload.client_id,
      invoice_number: payload.invoice_number,
      iva_rate: payload.iva_rate,
      subtotal: payload.subtotal,
      iva: payload.iva,
      total: payload.total,
      notes: payload.notes || null,
      status: payload.status,
    })
    .select()
    .single();

  if (invoiceError) throw new Error(invoiceError.message);
  const invoice = invoiceData as IInvoice;

  if (payload.project_ids && payload.project_ids.length > 0) {
    const { error: projectsError } = await supabase
      .from('projects')
      .update({ invoice_id: invoice.id })
      .in('id', payload.project_ids);

    if (projectsError) {
      await supabaseFinances.from('invoices').delete().eq('id', invoice.id);
      throw new Error(`Error linking projects to invoice: ${projectsError.message}`);
    }
  }

  logActivity('CREATE_INVOICE', {
    client_id: payload.client_id,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    invoice_number: invoice.invoice_number,
    total: invoice.total,
    amount: invoice.total,
    projectCount: payload.project_ids.length,
    title: `Factura ${invoice.invoice_number} emitida`,
    description: `Emisión de factura ${invoice.invoice_number} por ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(invoice.total)} (${payload.project_ids.length} proyecto(s) vinculados).`,
    category: 'finanzas',
  });

  return invoice;
}

export async function updateInvoice(
  id: string,
  payload: Partial<IInvoice> & { project_ids?: string[] }
): Promise<IInvoice> {
  const { project_ids, ...updatePayload } = payload;

  const { data: invoiceData, error: invoiceError } = await supabaseFinances
    .from('invoices')
    .update({
      client_id: updatePayload.client_id,
      invoice_number: updatePayload.invoice_number,
      iva_rate: updatePayload.iva_rate,
      subtotal: updatePayload.subtotal,
      iva: updatePayload.iva,
      total: updatePayload.total,
      notes: updatePayload.notes,
      status: updatePayload.status,
    })
    .eq('id', id)
    .select()
    .single();

  if (invoiceError) throw new Error(invoiceError.message);
  const invoice = invoiceData as IInvoice;

  if (project_ids !== undefined) {
    // 1. Unlink existing projects for this invoice
    await supabase
      .from('projects')
      .update({ invoice_id: null })
      .eq('invoice_id', id);

    // 2. Link new projects
    if (project_ids.length > 0) {
      const { error: projectsError } = await supabase
        .from('projects')
        .update({ invoice_id: id })
        .in('id', project_ids);

      if (projectsError) throw new Error(projectsError.message);
    }
  }

  logActivity('UPDATE_INVOICE', {
    client_id: invoice.client_id,
    invoiceId: id,
    invoice_number: invoice.invoice_number,
    status: invoice.status,
    title: `Factura ${invoice.invoice_number} actualizada`,
    description: `Actualización de factura ${invoice.invoice_number}${updatePayload.status ? ` (Estatus: ${updatePayload.status === 'paid' ? 'Pagada' : updatePayload.status === 'cancelled' ? 'Cancelada' : 'Pendiente'})` : ''}.`,
    category: 'finanzas',
    changes: payload,
  });

  return invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  // Clear invoice_id in projects first (just to be safe, though database will do ON DELETE SET NULL)
  await supabase
    .from('projects')
    .update({ invoice_id: null })
    .eq('invoice_id', id);

  const { error } = await supabaseFinances
    .from('invoices')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  logActivity('DELETE_INVOICE', {
    invoiceId: id,
  });
}

// ─── Client Documents & Supabase Storage API ────────────────────────

export async function fetchClientDocuments(clientId: string): Promise<IClientDocument[]> {
  const { data, error } = await supabase
    .from('client_documents')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as IClientDocument[];
}

export async function uploadClientDocumentFile(
  clientId: string,
  file: File
): Promise<{
  filePath: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}> {
  const sanitizedName = file.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${clientId}/${Date.now()}-${sanitizedName}`;

  const { error } = await supabase.storage
    .from('client-documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('client-documents').getPublicUrl(filePath);
  return {
    filePath,
    fileUrl: data.publicUrl,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
  };
}

export async function createClientDocument(payload: {
  client_id: string;
  name: string;
  category?: string;
  period?: string | null;
  document_date?: string | null;
  badge?: string | null;
  notes?: string | null;
  file?: File | null;
}): Promise<IClientDocument> {
  let fileMeta: {
    filePath: string | null;
    fileUrl: string | null;
    fileName: string | null;
    fileSize: number | null;
    mimeType: string | null;
  } = {
    filePath: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    mimeType: null,
  };

  if (payload.file) {
    fileMeta = await uploadClientDocumentFile(payload.client_id, payload.file);
  }

  const { data, error } = await supabase
    .from('client_documents')
    .insert({
      client_id: payload.client_id,
      name: payload.name,
      category: payload.category || 'Importante',
      period: payload.period || null,
      document_date: payload.document_date || null,
      badge: payload.badge || null,
      notes: payload.notes || null,
      file_path: fileMeta.filePath,
      file_url: fileMeta.fileUrl,
      file_name: fileMeta.fileName,
      file_size: fileMeta.fileSize,
      mime_type: fileMeta.mimeType,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  logActivity('CREATE_CLIENT_DOCUMENT', {
    client_id: payload.client_id,
    clientId: payload.client_id,
    documentName: payload.name,
    doc_type: payload.category || 'Importante',
    period: payload.period || 'General',
    title: `Documento cargado: ${payload.name}`,
    description: `Se subió "${payload.name}" (${payload.category || 'Importante'}) al expediente digital${payload.period ? ` — ${payload.period}` : ''}.`,
    category: 'documentos',
  });

  return data as IClientDocument;
}

export async function updateClientDocument(
  id: string,
  payload: {
    client_id: string;
    name?: string;
    category?: string;
    period?: string | null;
    document_date?: string | null;
    badge?: string | null;
    notes?: string | null;
    file?: File | null;
    existing_file_path?: string | null;
  }
): Promise<IClientDocument> {
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.category !== undefined) updateData.category = payload.category;
  if (payload.period !== undefined) updateData.period = payload.period;
  if (payload.document_date !== undefined) updateData.document_date = payload.document_date;
  if (payload.badge !== undefined) updateData.badge = payload.badge;
  if (payload.notes !== undefined) updateData.notes = payload.notes;

  if (payload.file) {
    const fileMeta = await uploadClientDocumentFile(payload.client_id, payload.file);
    updateData.file_path = fileMeta.filePath;
    updateData.file_url = fileMeta.fileUrl;
    updateData.file_name = fileMeta.fileName;
    updateData.file_size = fileMeta.fileSize;
    updateData.mime_type = fileMeta.mimeType;

    if (payload.existing_file_path && payload.existing_file_path !== fileMeta.filePath) {
      await supabase.storage
        .from('client-documents')
        .remove([payload.existing_file_path])
        .catch(() => {});
    }
  }

  const { data, error } = await supabase
    .from('client_documents')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  logActivity('UPDATE_CLIENT_DOCUMENT', {
    documentId: id,
    client_id: payload.client_id,
    clientId: payload.client_id,
    documentName: payload.name,
    title: `Documento editado: ${payload.name || 'Expediente'}`,
    description: `Se actualizaron los metadatos o archivo de "${payload.name || 'documento'}" en el expediente digital.`,
    category: 'documentos',
  });

  return data as IClientDocument;
}

export async function deleteClientDocument(
  id: string,
  clientId: string,
  filePath?: string | null
): Promise<void> {
  if (filePath) {
    await supabase.storage
      .from('client-documents')
      .remove([filePath])
      .catch(() => {});
  }

  const { error } = await supabase
    .from('client_documents')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  logActivity('DELETE_CLIENT_DOCUMENT', {
    documentId: id,
    client_id: clientId,
    clientId,
    title: 'Documento eliminado del expediente',
    description: `Se eliminó un archivo del expediente digital del cliente.`,
    category: 'documentos',
  });
}



