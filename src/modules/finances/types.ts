export interface IFinanceClient {
  id: string;
  name: string;
  trade_name?: string | null;
  fiscal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  tax_id_rfc?: string | null;
  rfc?: string | null;
  fiscal_regime?: string | null;
  tax_regime?: string | null;
  token: string;
  created_at: string;
  updated_at?: string;
  ciec?: string | null;
  economic_activity?: string | null;
  invoice_email?: string | null;
  contact_person?: string | null;
  assigned_accountant?: string | null;
  notes?: string | null;
  person_type?: string | null;
  status?: string | null;
  // Monthly accounting control fields
  compliance_opinion?: 'Positiva' | 'Negativa' | 'Pendiente' | string | null;
  stationery_received?: boolean | null;
  stationery_date?: string | null;
  accounting_capture_pct?: number | null;
  tax_calculation?: boolean | null;
  tax_presented?: boolean | null;
  diot_presented?: boolean | null;
  financial_statements?: boolean | null;
  accounting_notes?: string | null;
  review_date?: string | null;
  accounting_period?: string | null;
  accounting_status?: 'Completado' | 'En proceso' | 'Pendiente' | 'En riesgo' | 'Atrasado' | string | null;
}

export type DecretoProcessStage =
  | 'solicitud'
  | 'captura'
  | 'diseno_digital'
  | 'aprobacion_diseno'
  | 'aprobacion_captura'
  | 'anticipo'
  | 'corte'
  | 'diseno_impresion'
  | 'impresion'
  | 'sublimado'
  | 'costura'
  | 'revision_final'
  | 'entrega'
  | 'finiquito';

export interface IProcessStageInfo {
  id: DecretoProcessStage;
  stepNumber: number;
  name: string;
  description: string;
  macroPhase: 'Solicitud & Captura' | 'Diseño & Aprobación' | 'Anticipo & Corte' | 'Impresión & Sublimado' | 'Costura & Control' | 'Entrega & Finiquito';
}

export const DECRETO_PROCESS_STAGES: IProcessStageInfo[] = [
  { id: 'solicitud', stepNumber: 1, name: 'Solicitud del Cliente', description: 'Recepción de correo, WhatsApp, cotización o foto de muestra/proyecto', macroPhase: 'Solicitud & Captura' },
  { id: 'captura', stepNumber: 2, name: 'Captura en Sistema', description: 'Carga de Hoja de Trabajo (Moldes, telas, etiquetas, desglose de tallas y personalizado)', macroPhase: 'Solicitud & Captura' },
  { id: 'diseno_digital', stepNumber: 3, name: 'Diseño Digital', description: 'Creación de bosquejo digital (frente y espalda)', macroPhase: 'Diseño & Aprobación' },
  { id: 'aprobacion_diseno', stepNumber: 4, name: 'Aprobación de Diseño', description: 'Cliente aprueba el bosquejo digital', macroPhase: 'Diseño & Aprobación' },
  { id: 'aprobacion_captura', stepNumber: 5, name: 'Aprobación de Captura', description: 'Cliente verifica hoja de datos. Autorizado para Corte', macroPhase: 'Diseño & Aprobación' },
  { id: 'anticipo', stepNumber: 6, name: 'Cobro de Anticipo', description: 'Recepción del 50% de anticipo para iniciar producción', macroPhase: 'Anticipo & Corte' },
  { id: 'corte', stepNumber: 7, name: 'Corte', description: 'Decisión patronista (interno/externo) y generación de Orden de Corte', macroPhase: 'Anticipo & Corte' },
  { id: 'diseno_impresion', stepNumber: 8, name: 'Diseño para Impresión', description: 'Generación de archivos formateados de impresión por talla', macroPhase: 'Impresión & Sublimado' },
  { id: 'impresion', stepNumber: 9, name: 'Impresión', description: 'Muestra física miniatura aprobada + Impresión en plotters', macroPhase: 'Impresión & Sublimado' },
  { id: 'sublimado', stepNumber: 10, name: 'Sublimado', description: 'Transferencia en calandras (planchas cilíndricas)', macroPhase: 'Impresión & Sublimado' },
  { id: 'costura', stepNumber: 11, name: 'Costura', description: 'Ensamble en taller o maquilas 1/2/3', macroPhase: 'Costura & Control' },
  { id: 'revision_final', stepNumber: 12, name: 'Revisión Final', description: 'Control de calidad vs hoja de producción y embolsado', macroPhase: 'Costura & Control' },
  { id: 'entrega', stepNumber: 13, name: 'Entrega al Cliente', description: 'Programación de recolección o envío', macroPhase: 'Entrega & Finiquito' },
  { id: 'finiquito', stepNumber: 14, name: 'Cobro de Finiquito', description: 'Cobro del 50% restante y cierre financiero', macroPhase: 'Entrega & Finiquito' },
];

export interface IRosterEntry {
  id?: string;
  category: 'Caballero' | 'Dama' | 'Infantil';
  size: string;
  name: string;
  number: string;
}

export interface ISizesBreakdown {
  [category: string]: {
    [size: string]: number;
  };
}

export interface ICutOrderData {
  cut_number?: string;
  cutting_date?: string;
  cutter_type?: 'taller_interno' | 'cortador_externo';
  cutter_name?: string;
  total_pieces?: number;
  notes?: string;
  extra_buffer_pieces?: { [size: string]: number };
}

export interface IProjectProcessLog {
  id: string;
  project_id: string;
  from_stage?: string | null;
  to_stage: string;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface IProject {
  id: string;
  client_id: string;
  name: string;
  base_price_total: number;
  custom_price_total: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'completed' | 'cancelled';
  share_token: string;
  requires_invoice: boolean;
  cfdi_use?: string | null;
  order_number?: string | null;
  description?: string | null;
  purchase_order_url?: string | null;
  created_at: string;
  updated_at?: string;
  client?: IFinanceClient;
  iva_rate?: number;
  isr_retention_rate?: number;
  iva_retention_rate?: number;
  invoice_id?: string | null;

  // Decreto Sublimation Process extensions
  current_stage?: DecretoProcessStage;
  is_sample?: boolean;
  mold_name?: string | null;
  fabric_name?: string | null;
  label_name?: string | null;
  cutting_location?: string | null;
  maquila_name?: string | null;
  target_delivery_date?: string | null;
  specifications?: string | null;
  digital_design_url?: string | null;
  print_design_url?: string | null;
  sample_approved?: boolean;
  sample_plotter_name?: string | null;
  sizes_breakdown?: ISizesBreakdown;
  roster_list?: IRosterEntry[];
  cut_order_data?: ICutOrderData;
  unit_cost?: number | null;
  total_pieces?: number;
  print_info?: string | null;
  status_note?: string | null;
}

export interface IInvoice {
  id: string;
  client_id: string;
  invoice_number: string;
  status: 'pending' | 'paid' | 'cancelled';
  iva_rate: number;
  subtotal: number;
  iva: number;
  total: number;
  notes?: string | null;
  created_at: string;
  client?: IFinanceClient;
  projects?: IProject[];
}

export interface IPaymentSchedule {
  id: string;
  project_id: string;
  expected_amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  project?: IProject;
}

export interface IPayment {
  id: string;
  project_id: string;
  amount: number;
  method: 'cash' | 'transfer' | 'card' | 'gateway' | 'redistribution' | 'atm_withdrawal';
  folio?: string | null;
  proof_url?: string | null;
  is_reconciled: boolean;
  reported_by: 'client' | 'admin';
  created_at: string;
  project?: IProject;
}

export interface ISupplier {
  id: string;
  legal_name: string;
  fiscal_name?: string | null;
  tax_id_rfc?: string | null;
  contact_info?: string | null;
  created_at: string;
}

export interface IExpenseCategory {
  id: string;
  name: string;
  color_code: string;
  icon?: string | null;
}

export interface IExpenseRemission {
  id: string;
  expense_id: string;
  project_id?: string | null;
  folio: string;
  file_url?: string | null;
  is_paid: boolean;
  amount: number;
  paid_amount: number;
  created_at: string;
  project?: IProject;
}

export interface IExpense {
  id: string;
  supplier_id?: string | null;
  category_id?: string | null;
  concept: string;
  amount: number;
  status: 'paid' | 'pending_payable' | 'overdue';
  due_date?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  created_at: string;
  supplier?: ISupplier;
  category?: IExpenseCategory;
  project_id?: string | null;
  project?: IProject;
  remissions?: IExpenseRemission[];
  is_factura?: boolean;
  iva_amount?: number;
  invoice_file_url?: string | null;
}

export interface IFinancialStats {
  ingresosTotales: number;
  ingresosMom: number;
  gastosTotales: number;
  gastosMom: number;
  flujoEfectivo: number;
  flujoMom: number;
  cuentasPorPagarMonto: number;
  cuentasPorPagarCount: number;
  cuentasPorPagarMom: number;
  utilidadEstimada: number;
  utilidadMom: number;
}
