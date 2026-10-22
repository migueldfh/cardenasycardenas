import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { fetchActivityLogs, fetchClientActivityLogs, type IActivityLog } from '@/api/logs';
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

// Query Keys Registry
export const FINANCE_KEYS = {
  all: ['finances'] as const,
  clients: () => [...FINANCE_KEYS.all, 'clients'] as const,
  clientDocuments: (clientId: string) => [...FINANCE_KEYS.all, 'client-documents', clientId] as const,
  activityLogs: (limit?: number) => [...FINANCE_KEYS.all, 'activity-logs', limit ?? 100] as const,
  clientActivityLogs: (clientId: string) => [...FINANCE_KEYS.all, 'client-activity-logs', clientId] as const,
  projects: () => [...FINANCE_KEYS.all, 'projects'] as const,
  project: (id: string) => [...FINANCE_KEYS.projects(), id] as const,
  payments: () => [...FINANCE_KEYS.all, 'payments'] as const,
  schedules: (projectId?: string) => [...FINANCE_KEYS.all, 'schedules', projectId].filter(Boolean) as string[],
  suppliers: () => [...FINANCE_KEYS.all, 'suppliers'] as const,
  categories: () => [...FINANCE_KEYS.all, 'categories'] as const,
  expenses: () => [...FINANCE_KEYS.all, 'expenses'] as const,
  invoices: () => [...FINANCE_KEYS.all, 'invoices'] as const,
  stats: () => [...FINANCE_KEYS.all, 'stats'] as const,
  publicProject: (token: string) => ['public-project', token] as const,
  processLogs: (projectId: string) => [...FINANCE_KEYS.all, 'process-logs', projectId] as const,
};

// ─── Clients Hooks ──────────────────────────────────────────────────

export function useFinanceClients() {
  return useQuery<IFinanceClient[]>({
    queryKey: FINANCE_KEYS.clients(),
    queryFn: api.fetchFinanceClients,
  });
}

export function useCreateFinanceClient() {
  const queryClient = useQueryClient();
  return useMutation<IFinanceClient, Error, Parameters<typeof api.createFinanceClient>[0]>({
    mutationFn: api.createFinanceClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.clients() });
    },
  });
}

export function useUpdateFinanceClient() {
  const queryClient = useQueryClient();
  return useMutation<IFinanceClient, Error, { id: string; payload: Parameters<typeof api.updateFinanceClient>[1] }>({
    mutationFn: ({ id, payload }) => api.updateFinanceClient(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.clients() });
      queryClient.invalidateQueries({ queryKey: ['client', data.id] });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.clientActivityLogs(data.id) });
      queryClient.invalidateQueries({ queryKey: [...FINANCE_KEYS.all, 'activity-logs'] });
    },
  });
}

export function useDeleteFinanceClient() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id: string) => api.deleteFinanceClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.clients() });
    },
  });
}



// ─── Projects Hooks ─────────────────────────────────────────────────

export function useProjects() {
  return useQuery<IProject[]>({
    queryKey: FINANCE_KEYS.projects(),
    queryFn: api.fetchProjects,
  });
}

export function useProject(id: string) {
  return useQuery<IProject>({
    queryKey: FINANCE_KEYS.project(id),
    queryFn: () => api.fetchProjectById(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation<IProject, Error, Parameters<typeof api.createProject>[0]>({
    mutationFn: api.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.projects() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.stats() });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation<IProject, Error, { id: string; payload: Partial<IProject> }>({
    mutationFn: ({ id, payload }) => api.updateProject(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.projects() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.project(data.id) });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.stats() });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.projects() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.stats() });
    },
  });
}

export function useUpdateProjectStage() {
  const queryClient = useQueryClient();
  return useMutation<IProject, Error, { id: string; stage: string; notes?: string }>({
    mutationFn: ({ id, stage, notes }) => api.updateProjectStage(id, stage, notes),
    onSuccess: (data) => {
      queryClient.setQueryData(FINANCE_KEYS.project(data.id), data);
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.projects() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.project(data.id) });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.processLogs(data.id) });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.stats() });
    },
  });
}

export function useSaveProjectWorksheet() {
  const queryClient = useQueryClient();
  return useMutation<IProject, Error, { id: string; worksheet: Partial<IProject> }>({
    mutationFn: ({ id, worksheet }) => api.saveProjectWorksheet(id, worksheet),
    onSuccess: (data) => {
      queryClient.setQueryData(FINANCE_KEYS.project(data.id), data);
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.projects() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.project(data.id) });
    },
  });
}

export function useProjectProcessLogs(projectId: string) {
  return useQuery<any[]>({
    queryKey: FINANCE_KEYS.processLogs(projectId),
    queryFn: () => api.fetchProjectProcessLogs(projectId),
    enabled: !!projectId,
  });
}

// ─── Payments & Schedules Hooks ─────────────────────────────────────

export function usePayments() {
  return useQuery<IPayment[]>({
    queryKey: FINANCE_KEYS.payments(),
    queryFn: api.fetchPayments,
  });
}

export function usePaymentSchedules(projectId?: string) {
  return useQuery<IPaymentSchedule[]>({
    queryKey: FINANCE_KEYS.schedules(projectId),
    queryFn: () => api.fetchPaymentSchedules(projectId),
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation<IPayment, Error, Parameters<typeof api.createPayment>[0]>({
    mutationFn: api.createPayment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.payments() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.schedules(data.project_id) });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.projects() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.stats() });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation<IPayment, Error, { id: string; payload: Partial<IPayment> }>({
    mutationFn: ({ id, payload }) => api.updatePayment(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.payments() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.schedules(data.project_id) });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.projects() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.stats() });
    },
  });
}

export function useReconcilePayments() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string[]>({
    mutationFn: api.reconcilePayments,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.payments() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.stats() });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: api.deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.payments() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.stats() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.projects() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.schedules() });
    },
  });
}

// ─── Suppliers & Expenses Hooks ─────────────────────────────────────

export function useSuppliers() {
  return useQuery<ISupplier[]>({
    queryKey: FINANCE_KEYS.suppliers(),
    queryFn: api.fetchSuppliers,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation<ISupplier, Error, Omit<ISupplier, 'id' | 'created_at'>>({
    mutationFn: api.createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.suppliers() });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation<ISupplier, Error, { id: string; payload: Partial<Omit<ISupplier, 'id' | 'created_at'>> }>({
    mutationFn: ({ id, payload }) => api.updateSupplier(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.suppliers() });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: api.deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.suppliers() });
    },
  });
}

export function useExpenseCategories() {
  return useQuery<IExpenseCategory[]>({
    queryKey: FINANCE_KEYS.categories(),
    queryFn: api.fetchExpenseCategories,
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation<IExpenseCategory, Error, Omit<IExpenseCategory, 'id'>>({
    mutationFn: api.createExpenseCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.categories() });
    },
  });
}

export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: api.deleteExpenseCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.categories() });
    },
  });
}

export function useExpenses() {
  return useQuery<IExpense[]>({
    queryKey: FINANCE_KEYS.expenses(),
    queryFn: api.fetchExpenses,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation<IExpense, Error, Parameters<typeof api.createExpense>[0]>({
    mutationFn: api.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.expenses() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.stats() });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation<IExpense, Error, { id: string; payload: Partial<IExpense> }>({
    mutationFn: ({ id, payload }) => api.updateExpense(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.expenses() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.stats() });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.expenses() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.stats() });
    },
  });
}

export function useCreateExpenseRemission() {
  const queryClient = useQueryClient();
  return useMutation<IExpenseRemission, Error, Parameters<typeof api.createExpenseRemission>[0]>({
    mutationFn: api.createExpenseRemission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.expenses() });
    },
  });
}

export function useUpdateExpenseRemission() {
  const queryClient = useQueryClient();
  return useMutation<IExpenseRemission, Error, { id: string; payload: Partial<IExpenseRemission> }>({
    mutationFn: ({ id, payload }) => api.updateExpenseRemission(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.expenses() });
    },
  });
}

export function useDeleteExpenseRemission() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: api.deleteExpenseRemission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.expenses() });
    },
  });
}


// ─── Financial Stats Hooks ──────────────────────────────────────────

export function useFinancialStats() {
  return useQuery<IFinancialStats>({
    queryKey: FINANCE_KEYS.stats(),
    queryFn: api.fetchFinancialStats,
    refetchInterval: 10000, // Refetch stats every 10s for real-time visual updates
  });
}

// ─── Public Client Portal Hooks ──────────────────────────────────────

export function usePublicProject(token: string) {
  return useQuery<any>({
    queryKey: FINANCE_KEYS.publicProject(token),
    queryFn: () => api.fetchPublicProjectByToken(token),
    enabled: !!token,
  });
}

export function useApprovePublicProject() {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationFn: api.approvePublicProject,
    onSuccess: (_, token) => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.publicProject(token) });
    },
  });
}

export function useReportPublicPayment() {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, Parameters<typeof api.reportPublicPayment>[0]>({
    mutationFn: api.reportPublicPayment,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.publicProject(vars.project_token) });
    },
  });
}

// ─── Invoices Hooks ──────────────────────────────────────────────────

export function useInvoices() {
  return useQuery<IInvoice[]>({
    queryKey: FINANCE_KEYS.invoices(),
    queryFn: api.fetchInvoices,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation<IInvoice, Error, Parameters<typeof api.createInvoice>[0]>({
    mutationFn: api.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.invoices() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.projects() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.stats() });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation<IInvoice, Error, { id: string; payload: Parameters<typeof api.updateInvoice>[1] }>({
    mutationFn: ({ id, payload }) => api.updateInvoice(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.invoices() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.projects() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.stats() });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: api.deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.invoices() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.projects() });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.stats() });
    },
  });
}

// ─── Client Documents Hooks (Supabase Storage) ─────────────────────

export function useClientDocuments(clientId: string) {
  return useQuery<IClientDocument[]>({
    queryKey: FINANCE_KEYS.clientDocuments(clientId),
    queryFn: () => api.fetchClientDocuments(clientId),
    enabled: !!clientId,
  });
}

export function useCreateClientDocument() {
  const queryClient = useQueryClient();
  return useMutation<IClientDocument, Error, Parameters<typeof api.createClientDocument>[0]>({
    mutationFn: api.createClientDocument,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.clientDocuments(data.client_id) });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.clientActivityLogs(data.client_id) });
      queryClient.invalidateQueries({ queryKey: [...FINANCE_KEYS.all, 'activity-logs'] });
    },
  });
}

export function useUpdateClientDocument() {
  const queryClient = useQueryClient();
  return useMutation<
    IClientDocument,
    Error,
    { id: string; payload: Parameters<typeof api.updateClientDocument>[1] }
  >({
    mutationFn: ({ id, payload }) => api.updateClientDocument(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.clientDocuments(data.client_id) });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.clientActivityLogs(data.client_id) });
      queryClient.invalidateQueries({ queryKey: [...FINANCE_KEYS.all, 'activity-logs'] });
    },
  });
}

export function useDeleteClientDocument() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string; clientId: string; filePath?: string | null }>({
    mutationFn: ({ id, clientId, filePath }) => api.deleteClientDocument(id, clientId, filePath),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.clientDocuments(vars.clientId) });
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.clientActivityLogs(vars.clientId) });
      queryClient.invalidateQueries({ queryKey: [...FINANCE_KEYS.all, 'activity-logs'] });
    },
  });
}

// ─── Activity & Business Logic Logs Hooks ────────────────────────────

export function useActivityLogs(limit = 100) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: [...FINANCE_KEYS.all, 'activity-logs'] });
    };
    window.addEventListener('activity-log-created', handler);
    return () => window.removeEventListener('activity-log-created', handler);
  }, [queryClient]);

  return useQuery<IActivityLog[]>({
    queryKey: FINANCE_KEYS.activityLogs(limit),
    queryFn: () => fetchActivityLogs(limit),
  });
}

export function useClientActivityLogs(clientId: string, clientName?: string, limit = 100) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!clientId) return;
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_KEYS.clientActivityLogs(clientId) });
    };
    window.addEventListener('activity-log-created', handler);
    return () => window.removeEventListener('activity-log-created', handler);
  }, [clientId, queryClient]);

  return useQuery<IActivityLog[]>({
    queryKey: FINANCE_KEYS.clientActivityLogs(clientId),
    queryFn: () => fetchClientActivityLogs(clientId, clientName, limit),
    enabled: !!clientId,
  });
}


