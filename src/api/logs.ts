import { supabase } from '@/lib/supabase';

export interface IActivityLog {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  client_id?: string | null;
  module?: string | null;
  description?: string | null;
  action: string;
  details?: Record<string, any> | null;
  created_at: string;
}

export type ActivityCategory =
  | 'contabilidad'
  | 'impuestos'
  | 'cumplimiento'
  | 'documentos'
  | 'servicios'
  | 'clientes'
  | 'finanzas'
  | 'seguridad'
  | 'calendario'
  | 'comentario'
  | 'sistema';

export interface FormattedActivityLog {
  id: string;
  action: string;
  title: string;
  description: string;
  category: ActivityCategory;
  moduleLabel: string;
  actorName: string;
  actorEmail: string;
  clientId: string | null;
  clientName: string | null;
  period: string | null;
  stage: string | null;
  badgeTone: 'emerald' | 'blue' | 'amber' | 'rose' | 'indigo' | 'slate';
  tone: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'indigo' | 'slate';
  relativeTime: string;
  formattedDate: string;
  createdAt: string;
  raw: IActivityLog;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Session user cache to avoid repeated profile lookups
let cachedActor: {
  id: string | null;
  email: string | null;
  name: string | null;
  fetchedAt: number;
} | null = null;

async function resolveCurrentActor(): Promise<{
  id: string | null;
  email: string | null;
  name: string | null;
}> {
  if (cachedActor && Date.now() - cachedActor.fetchedAt < 60_000) {
    return cachedActor;
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id || null;
    const userEmail = session?.user?.email || null;
    let userName: string | null =
      session?.user?.user_metadata?.full_name ||
      session?.user?.user_metadata?.name ||
      null;

    if (userId && !userName) {
      const { data: profile } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle();
      if (profile?.full_name) {
        userName = profile.full_name;
      }
    }

    cachedActor = {
      id: userId,
      email: userEmail,
      name: userName,
      fetchedAt: Date.now(),
    };
    return cachedActor;
  } catch {
    return { id: null, email: null, name: null };
  }
}

const ACTION_META: Record<
  string,
  {
    title: string;
    category: ActivityCategory;
    moduleLabel: string;
    badgeTone: FormattedActivityLog['badgeTone'];
  }
> = {
  ACCOUNTING_STAGE_PAPELERIA: {
    title: 'Recepción de papelería actualizada',
    category: 'contabilidad',
    moduleLabel: 'Contabilidad',
    badgeTone: 'emerald',
  },
  ACCOUNTING_STAGE_CAPTURA: {
    title: 'Avance de captura contable',
    category: 'contabilidad',
    moduleLabel: 'Contabilidad',
    badgeTone: 'blue',
  },
  ACCOUNTING_STAGE_CALCULO_IMPUESTOS: {
    title: 'Cálculo de impuestos completado',
    category: 'impuestos',
    moduleLabel: 'Impuestos',
    badgeTone: 'emerald',
  },
  ACCOUNTING_STAGE_DECLARACION_SAT: {
    title: 'Declaraciones presentadas',
    category: 'impuestos',
    moduleLabel: 'Declaraciones SAT',
    badgeTone: 'emerald',
  },
  ACCOUNTING_STAGE_DIOT: {
    title: 'DIOT presentada',
    category: 'impuestos',
    moduleLabel: 'Declaración DIOT',
    badgeTone: 'emerald',
  },
  ACCOUNTING_STAGE_ESTADOS_FINANCIEROS: {
    title: 'Estados financieros actualizados',
    category: 'contabilidad',
    moduleLabel: 'Contabilidad',
    badgeTone: 'blue',
  },
  ACCOUNTING_STAGE_OPINION_32D: {
    title: 'Opinión de cumplimiento 32-D verificada',
    category: 'cumplimiento',
    moduleLabel: 'Cumplimiento 32-D',
    badgeTone: 'emerald',
  },
  ACCOUNTING_PERIOD_STATUS_UPDATED: {
    title: 'Estatus contable del periodo actualizado',
    category: 'contabilidad',
    moduleLabel: 'Control Mensual',
    badgeTone: 'indigo',
  },
  ACCOUNTING_COMMENT_UPDATED: {
    title: 'Comentario del contador registrado',
    category: 'comentario',
    moduleLabel: 'Bitácora Contable',
    badgeTone: 'amber',
  },
  MANUAL_CLIENT_LOG_CREATED: {
    title: 'Movimiento registrado en bitácora',
    category: 'comentario',
    moduleLabel: 'Bitácora del Cliente',
    badgeTone: 'blue',
  },
  CLIENT_DOCUMENT_UPLOADED: {
    title: 'Documento cargado al expediente',
    category: 'documentos',
    moduleLabel: 'Expediente Digital',
    badgeTone: 'indigo',
  },
  CLIENT_DOCUMENT_UPDATED: {
    title: 'Documento del expediente editado',
    category: 'documentos',
    moduleLabel: 'Expediente Digital',
    badgeTone: 'blue',
  },
  CLIENT_DOCUMENT_DELETED: {
    title: 'Documento eliminado del expediente',
    category: 'documentos',
    moduleLabel: 'Expediente Digital',
    badgeTone: 'rose',
  },
  CLIENT_DOCUMENT_DOWNLOADED: {
    title: 'Documento descargado del expediente',
    category: 'documentos',
    moduleLabel: 'Expediente Digital',
    badgeTone: 'slate',
  },
  CREATE_CLIENT_DOCUMENT: {
    title: 'Documento cargado al expediente',
    category: 'documentos',
    moduleLabel: 'Expediente Digital',
    badgeTone: 'indigo',
  },
  UPDATE_CLIENT_DOCUMENT: {
    title: 'Documento del expediente editado',
    category: 'documentos',
    moduleLabel: 'Expediente Digital',
    badgeTone: 'blue',
  },
  DELETE_CLIENT_DOCUMENT: {
    title: 'Documento eliminado del expediente',
    category: 'documentos',
    moduleLabel: 'Expediente Digital',
    badgeTone: 'rose',
  },
  CLIENT_SERVICES_UPDATED: {
    title: 'Servicios contratados actualizados',
    category: 'servicios',
    moduleLabel: 'Servicios del Cliente',
    badgeTone: 'indigo',
  },
  CREATE_CLIENT: {
    title: 'Nuevo cliente dado de alta',
    category: 'servicios',
    moduleLabel: 'Clientes',
    badgeTone: 'emerald',
  },
  UPDATE_CLIENT: {
    title: 'Ficha fiscal del cliente actualizada',
    category: 'servicios',
    moduleLabel: 'Clientes',
    badgeTone: 'blue',
  },
  DELETE_CLIENT: {
    title: 'Cliente dado de baja',
    category: 'servicios',
    moduleLabel: 'Clientes',
    badgeTone: 'rose',
  },
  CREATE_PROJECT: {
    title: 'Proyecto / cotización creado',
    category: 'finanzas',
    moduleLabel: 'Proyectos',
    badgeTone: 'indigo',
  },
  UPDATE_PROJECT: {
    title: 'Proyecto / cotización actualizado',
    category: 'finanzas',
    moduleLabel: 'Proyectos',
    badgeTone: 'blue',
  },
  DELETE_PROJECT: {
    title: 'Proyecto eliminado',
    category: 'finanzas',
    moduleLabel: 'Proyectos',
    badgeTone: 'rose',
  },
  CREATE_PAYMENT: {
    title: 'Cobro / ingreso registrado',
    category: 'finanzas',
    moduleLabel: 'Ingresos y Cobranza',
    badgeTone: 'emerald',
  },
  UPDATE_PAYMENT: {
    title: 'Cobro actualizado',
    category: 'finanzas',
    moduleLabel: 'Ingresos y Cobranza',
    badgeTone: 'blue',
  },
  DELETE_PAYMENT: {
    title: 'Cobro eliminado',
    category: 'finanzas',
    moduleLabel: 'Ingresos y Cobranza',
    badgeTone: 'rose',
  },
  RECONCILE_PAYMENTS: {
    title: 'Conciliación bancaria de pagos aplicada',
    category: 'finanzas',
    moduleLabel: 'Conciliación Bancaria',
    badgeTone: 'emerald',
  },
  CREATE_EXPENSE: {
    title: 'Gasto / egreso registrado',
    category: 'finanzas',
    moduleLabel: 'Gastos y Compras',
    badgeTone: 'amber',
  },
  UPDATE_EXPENSE: {
    title: 'Gasto / egreso actualizado',
    category: 'finanzas',
    moduleLabel: 'Gastos y Compras',
    badgeTone: 'blue',
  },
  DELETE_EXPENSE: {
    title: 'Gasto eliminado',
    category: 'finanzas',
    moduleLabel: 'Gastos y Compras',
    badgeTone: 'rose',
  },
  CREATE_SUPPLIER: {
    title: 'Proveedor registrado',
    category: 'finanzas',
    moduleLabel: 'Proveedores',
    badgeTone: 'indigo',
  },
  UPDATE_SUPPLIER: {
    title: 'Proveedor actualizado',
    category: 'finanzas',
    moduleLabel: 'Proveedores',
    badgeTone: 'blue',
  },
  DELETE_SUPPLIER: {
    title: 'Proveedor eliminado',
    category: 'finanzas',
    moduleLabel: 'Proveedores',
    badgeTone: 'rose',
  },
  CREATE_EXPENSE_CATEGORY: {
    title: 'Categoría de gasto creada',
    category: 'finanzas',
    moduleLabel: 'Categorías',
    badgeTone: 'indigo',
  },
  DELETE_EXPENSE_CATEGORY: {
    title: 'Categoría de gasto eliminada',
    category: 'finanzas',
    moduleLabel: 'Categorías',
    badgeTone: 'rose',
  },
  CREATE_EXPENSE_REMISSION: {
    title: 'Remisión de gasto agregada',
    category: 'finanzas',
    moduleLabel: 'Gastos y Compras',
    badgeTone: 'blue',
  },
  UPDATE_EXPENSE_REMISSION: {
    title: 'Abono / estado de remisión actualizado',
    category: 'finanzas',
    moduleLabel: 'Cuentas por Pagar',
    badgeTone: 'emerald',
  },
  DELETE_EXPENSE_REMISSION: {
    title: 'Remisión de gasto eliminada',
    category: 'finanzas',
    moduleLabel: 'Gastos y Compras',
    badgeTone: 'rose',
  },
  CREATE_INVOICE: {
    title: 'Factura emitida para cliente',
    category: 'finanzas',
    moduleLabel: 'Facturación',
    badgeTone: 'emerald',
  },
  UPDATE_INVOICE: {
    title: 'Factura actualizada',
    category: 'finanzas',
    moduleLabel: 'Facturación',
    badgeTone: 'blue',
  },
  DELETE_INVOICE: {
    title: 'Factura eliminada',
    category: 'finanzas',
    moduleLabel: 'Facturación',
    badgeTone: 'rose',
  },
  CLIENT_CREATED: {
    title: 'Nuevo cliente dado de alta',
    category: 'servicios',
    moduleLabel: 'Clientes',
    badgeTone: 'emerald',
  },
  CLIENT_UPDATED: {
    title: 'Ficha fiscal del cliente actualizada',
    category: 'servicios',
    moduleLabel: 'Clientes',
    badgeTone: 'blue',
  },
  CLIENT_DELETED: {
    title: 'Cliente dado de baja',
    category: 'servicios',
    moduleLabel: 'Clientes',
    badgeTone: 'rose',
  },
  CLIENTS_CSV_EXPORTED: {
    title: 'Padrón de clientes exportado a CSV',
    category: 'sistema',
    moduleLabel: 'Clientes',
    badgeTone: 'slate',
  },
  CLIENT_ACCOUNTING_UPDATED: {
    title: 'Control contable del cliente actualizado',
    category: 'contabilidad',
    moduleLabel: 'Contabilidades',
    badgeTone: 'blue',
  },
  CONTABILIDADES_CSV_EXPORTED: {
    title: 'Reporte de contabilidades exportado a CSV',
    category: 'contabilidad',
    moduleLabel: 'Contabilidades',
    badgeTone: 'slate',
  },
  CONTROL_MENSUAL_CSV_EXPORTED: {
    title: 'Control mensual exportado a CSV',
    category: 'contabilidad',
    moduleLabel: 'Control Mensual',
    badgeTone: 'slate',
  },
  OPINIONES_SAT_SYNCED: {
    title: 'Sincronización de opiniones 32-D con el SAT',
    category: 'cumplimiento',
    moduleLabel: 'Opiniones 32-D',
    badgeTone: 'emerald',
  },
  OPINION_STATUS_UPDATED: {
    title: 'Sentido de opinión 32-D actualizado',
    category: 'cumplimiento',
    moduleLabel: 'Opiniones 32-D',
    badgeTone: 'emerald',
  },
  OPINION_ACUSE_DOWNLOADED: {
    title: 'Acuse PDF 32-D descargado',
    category: 'cumplimiento',
    moduleLabel: 'Opiniones 32-D',
    badgeTone: 'blue',
  },
  OPINIONES_CSV_EXPORTED: {
    title: 'Reporte de opiniones 32-D exportado a CSV',
    category: 'cumplimiento',
    moduleLabel: 'Opiniones 32-D',
    badgeTone: 'slate',
  },
  PENDIENTE_COMPLETED: {
    title: 'Pendiente fiscal completado y cerrado',
    category: 'impuestos',
    moduleLabel: 'Pendientes Fiscales',
    badgeTone: 'emerald',
  },
  PENDIENTE_REMINDER_SENT: {
    title: 'Recordatorio fiscal enviado al cliente',
    category: 'cumplimiento',
    moduleLabel: 'Pendientes Fiscales',
    badgeTone: 'amber',
  },
  PENDIENTES_MASS_REMINDER_SENT: {
    title: 'Recordatorios fiscales masivos enviados',
    category: 'cumplimiento',
    moduleLabel: 'Pendientes Fiscales',
    badgeTone: 'amber',
  },
  PENDIENTES_CSV_EXPORTED: {
    title: 'Listado de pendientes fiscales exportado',
    category: 'impuestos',
    moduleLabel: 'Pendientes Fiscales',
    badgeTone: 'slate',
  },
  CALENDAR_OBLIGATION_CREATED: {
    title: 'Obligación fiscal agendada en calendario',
    category: 'calendario',
    moduleLabel: 'Calendario Fiscal',
    badgeTone: 'indigo',
  },
  CALENDAR_OBLIGATION_STATUS_UPDATED: {
    title: 'Estatus de obligación fiscal actualizado',
    category: 'calendario',
    moduleLabel: 'Calendario Fiscal',
    badgeTone: 'emerald',
  },
  CALENDAR_OBLIGATION_DELETED: {
    title: 'Obligación fiscal eliminada del calendario',
    category: 'calendario',
    moduleLabel: 'Calendario Fiscal',
    badgeTone: 'rose',
  },
  VAULT_UNLOCKED: {
    title: 'Bóveda SAT CIEC desbloqueada',
    category: 'seguridad',
    moduleLabel: 'Seguridad SAT',
    badgeTone: 'amber',
  },
  VAULT_LOCKED: {
    title: 'Bóveda SAT CIEC bloqueada',
    category: 'seguridad',
    moduleLabel: 'Seguridad SAT',
    badgeTone: 'slate',
  },
  VIEW_CIEC_PASSWORD: {
    title: 'Contraseña CIEC revelada en pantalla',
    category: 'seguridad',
    moduleLabel: 'Seguridad SAT',
    badgeTone: 'amber',
  },
  COPY_CIEC_PASSWORD: {
    title: 'Contraseña CIEC copiada al portapapeles',
    category: 'seguridad',
    moduleLabel: 'Seguridad SAT',
    badgeTone: 'amber',
  },
  CIEC_UPDATED_ENCRYPTED: {
    title: 'Contraseña CIEC actualizada y cifrada',
    category: 'seguridad',
    moduleLabel: 'Seguridad SAT',
    badgeTone: 'emerald',
  },
  PAYMENT_CREATED: {
    title: 'Cobro / ingreso registrado',
    category: 'finanzas',
    moduleLabel: 'Ingresos y Cobranza',
    badgeTone: 'emerald',
  },
  PAYMENT_UPDATED: {
    title: 'Cobro actualizado',
    category: 'finanzas',
    moduleLabel: 'Ingresos y Cobranza',
    badgeTone: 'blue',
  },
  PAYMENT_DELETED: {
    title: 'Cobro eliminado',
    category: 'finanzas',
    moduleLabel: 'Ingresos y Cobranza',
    badgeTone: 'rose',
  },
  PAYMENTS_RECONCILED: {
    title: 'Conciliación bancaria de pagos aplicada',
    category: 'finanzas',
    moduleLabel: 'Conciliación Bancaria',
    badgeTone: 'emerald',
  },
  EXPENSE_CREATED: {
    title: 'Gasto / egreso registrado',
    category: 'finanzas',
    moduleLabel: 'Gastos y Compras',
    badgeTone: 'amber',
  },
  EXPENSE_UPDATED: {
    title: 'Gasto / egreso actualizado',
    category: 'finanzas',
    moduleLabel: 'Gastos y Compras',
    badgeTone: 'blue',
  },
  EXPENSE_DELETED: {
    title: 'Gasto eliminado',
    category: 'finanzas',
    moduleLabel: 'Gastos y Compras',
    badgeTone: 'rose',
  },
  SUPPLIER_CREATED: {
    title: 'Proveedor registrado',
    category: 'finanzas',
    moduleLabel: 'Proveedores',
    badgeTone: 'indigo',
  },
  EXPENSE_REMISSION_CREATED: {
    title: 'Remisión de gasto agregada',
    category: 'finanzas',
    moduleLabel: 'Gastos y Compras',
    badgeTone: 'blue',
  },
  EXPENSE_REMISSION_UPDATED: {
    title: 'Abono / estado de remisión actualizado',
    category: 'finanzas',
    moduleLabel: 'Cuentas por Pagar',
    badgeTone: 'emerald',
  },
  EXPENSE_REMISSION_DELETED: {
    title: 'Remisión de gasto eliminada',
    category: 'finanzas',
    moduleLabel: 'Gastos y Compras',
    badgeTone: 'rose',
  },
  INVOICE_CREATED: {
    title: 'Factura emitida para cliente',
    category: 'finanzas',
    moduleLabel: 'Facturación',
    badgeTone: 'emerald',
  },
  INVOICE_UPDATED: {
    title: 'Factura actualizada',
    category: 'finanzas',
    moduleLabel: 'Facturación',
    badgeTone: 'blue',
  },
  INVOICE_DELETED: {
    title: 'Factura eliminada',
    category: 'finanzas',
    moduleLabel: 'Facturación',
    badgeTone: 'rose',
  },
  EXPENSE_CATEGORY_CREATED: {
    title: 'Categoría de gasto creada',
    category: 'finanzas',
    moduleLabel: 'Categorías',
    badgeTone: 'indigo',
  },
  EXPENSE_CATEGORY_DELETED: {
    title: 'Categoría de gasto eliminada',
    category: 'finanzas',
    moduleLabel: 'Categorías',
    badgeTone: 'rose',
  },
  FISCAL_CONFIG_SAVED: {
    title: 'Configuración fiscal del despacho guardada',
    category: 'sistema',
    moduleLabel: 'Configuración',
    badgeTone: 'blue',
  },
  FISCAL_OBLIGATIONS_RESTORED: {
    title: 'Catálogo de obligaciones SAT restaurado',
    category: 'sistema',
    moduleLabel: 'Configuración',
    badgeTone: 'amber',
  },
  BRANDING_UPDATED: {
    title: 'Identidad visual del sistema actualizada',
    category: 'sistema',
    moduleLabel: 'Ajustes',
    badgeTone: 'indigo',
  },
};

export function formatActivityLog(log: IActivityLog): FormattedActivityLog {
  const details = log.details || {};
  const meta = ACTION_META[log.action] || {
    title: details.title || log.description || log.action.replace(/_/g, ' '),
    category: (details.category as ActivityCategory) || 'contabilidad',
    moduleLabel: log.module || details.module || 'General',
    badgeTone: 'blue' as const,
  };

  const title = details.title || meta.title;
  const clientId =
    log.client_id ||
    details.client_id ||
    details.clientId ||
    null;
  const clientName =
    details.client_name ||
    details.clientName ||
    details.name ||
    null;
  const period = details.period || details.accounting_period || null;
  const stage = details.stage || null;

  // Build rich Spanish description if not explicitly provided
  let description = details.description || log.description || '';
  if (!description) {
    const parts: string[] = [];
    if (clientName) parts.push(`Cliente: ${clientName}`);
    if (period) parts.push(`Periodo: ${period}`);
    if (details.doc_type) parts.push(`Tipo: ${details.doc_type}`);
    if (details.invoice_number) parts.push(`Folio: ${details.invoice_number}`);
    if (details.folio) parts.push(`Folio: ${details.folio}`);
    if (details.amount !== undefined) {
      parts.push(
        `Monto: ${new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN',
        }).format(Number(details.amount) || 0)}`
      );
    }
    if (details.notes) parts.push(String(details.notes));
    description = parts.join(' · ') || title;
  }

  const actorName =
    log.user_name ||
    details.user_name ||
    details.accountant ||
    details.uploaded_by_name ||
    (log.user_email ? log.user_email.split('@')[0] : 'Contador Asignado');

  // Adjust badgeTone dynamically for negative opinions or risk states
  let badgeTone = meta.badgeTone;
  const valStr = String(details.new_value ?? details.opinion ?? details.status ?? '').toLowerCase();
  if (valStr.includes('negativa') || valStr.includes('riesgo') || valStr.includes('atrasado')) {
    badgeTone = 'rose';
  } else if (valStr.includes('pendiente') || valStr.includes('proceso')) {
    badgeTone = 'amber';
  } else if (
    valStr.includes('positiva') ||
    valStr.includes('completado') ||
    valStr.includes('presentada') ||
    valStr.includes('recibida') ||
    valStr === 'true'
  ) {
    badgeTone = 'emerald';
  }

  const createdDate = log.created_at ? new Date(log.created_at) : new Date();
  const diffMs = Math.max(0, Date.now() - createdDate.getTime());
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const relativeTime =
    diffMins < 2
      ? 'Hace un momento'
      : diffMins < 60
        ? `Hace ${diffMins} min`
        : diffHours < 24
          ? `Hace ${diffHours} h`
          : diffDays === 1
            ? `Ayer ${createdDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
            : createdDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

  const formattedDate = createdDate.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const tone: FormattedActivityLog['tone'] =
    badgeTone === 'indigo' ? 'purple' : badgeTone;

  return {
    id: log.id,
    action: log.action,
    title,
    description,
    category: (details.category as ActivityCategory) || meta.category,
    moduleLabel: meta.moduleLabel,
    actorName,
    actorEmail: log.user_email || details.user_email || 'contabilidad@cardenasycardenas.mx',
    clientId,
    clientName,
    period,
    stage,
    badgeTone,
    tone,
    relativeTime,
    formattedDate,
    createdAt: log.created_at,
    raw: log,
  };
}

/**
 * Records a user or business logic movement in public.user_activity_logs.
 */
export async function logActivity(
  action: string,
  details: Record<string, any> = {}
): Promise<void> {
  try {
    const actor = await resolveCurrentActor();

    const rawClientId = details.client_id || details.clientId || null;
    const validClientId =
      typeof rawClientId === 'string' && UUID_REGEX.test(rawClientId)
        ? rawClientId
        : null;

    const meta = ACTION_META[action];
    const enrichedDetails: Record<string, any> = {
      ...details,
      ...(validClientId ? { client_id: validClientId } : {}),
      user_name: details.user_name || actor.name || undefined,
      category: details.category || meta?.category || 'sistema',
      title: details.title || meta?.title || action,
    };

    const description =
      details.description ||
      details.title ||
      meta?.title ||
      action;

    const moduleName =
      details.module ||
      meta?.category ||
      'general';

    const { error } = await supabase.from('user_activity_logs').insert([
      {
        user_id: actor.id,
        user_email: actor.email || details.user_email || 'sistema@cardenasycardenas.mx',
        user_name: details.user_name || actor.name || null,
        client_id: validClientId,
        module: moduleName,
        description,
        action,
        details: enrichedDetails,
      },
    ]);

    if (error) {
      // Fallback insert using only original columns if needed
      await supabase.from('user_activity_logs').insert([
        {
          user_id: actor.id,
          user_email: actor.email || 'sistema@cardenasycardenas.mx',
          action,
          details: enrichedDetails,
        },
      ]);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('activity-log-created', {
          detail: { action, clientId: validClientId, details: enrichedDetails },
        })
      );
    }
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

export async function fetchActivityLogs(limit = 100): Promise<IActivityLog[]> {
  const { data, error } = await supabase
    .from('user_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching activity logs:', error);
    return [];
  }

  return (data || []) as IActivityLog[];
}

export async function fetchClientActivityLogs(
  clientId: string,
  clientName?: string,
  limit = 100
): Promise<IActivityLog[]> {
  if (!clientId) return [];

  const isUuid = UUID_REGEX.test(clientId);

  if (isUuid) {
    const { data, error } = await supabase
      .from('user_activity_logs')
      .select('*')
      .or(`client_id.eq.${clientId},details->>client_id.eq.${clientId},details->>clientId.eq.${clientId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data as IActivityLog[];
    }
  }

  // Fallback: fetch recent logs and match by clientId or clientName in memory
  const { data: allRecent } = await supabase
    .from('user_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(250);

  if (!allRecent) return [];

  const normalizedName = clientName?.trim().toLowerCase();
  return (allRecent as IActivityLog[]).filter((log) => {
    const d = log.details || {};
    if (log.client_id === clientId || d.client_id === clientId || d.clientId === clientId) {
      return true;
    }
    if (normalizedName) {
      const logClientName = String(d.client_name || d.clientName || d.name || '')
        .trim()
        .toLowerCase();
      if (logClientName && logClientName === normalizedName) {
        return true;
      }
    }
    return false;
  });
}
