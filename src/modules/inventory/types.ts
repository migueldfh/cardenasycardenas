export interface IRawMaterial {
  id?: string;
  product_id: string;
  material_type: 'CRC_CRG' | 'WTOP' | 'MC1C' | 'MC2C' | 'SBS' | 'LNR' | 'MED';
  roll_width?: number;
  grammage?: number;
  caliper?: number;
  weight?: number;
  batch_number?: string;
  supplier?: string;
  created_at: string;
}

export interface IProduct {
  id: string;
  part_number: string;
  description?: string;
  created_at: string;
  raw_material?: IRawMaterial;
}

export interface ILocation {
  id: string;
  warehouse: string;
  aisle?: string;
  rack?: string;
  section?: string;
  level?: string;
  position?: string;
}

export interface IInventory {
  id: string;
  product_id: string;
  location_id: string;
  quantity: number;
  updated_at: string;
}

export interface IInventoryLog {
  id: string;
  inventory_id: string | null;
  product_id: string | null;
  location_id: string | null;
  user_id: string | null;
  action: string;
  quantity_change: number;
  previous_quantity: number | null;
  new_quantity: number | null;
  notes: string | null;
  created_at: string;
}

/** Returned by v_stock_by_location view */
export interface IStockByLocation {
  part_number: string;
  quantity: number;
  warehouse: string;
  aisle: string | null;
  rack: string | null;
  section: string | null;
  level: string | null;
  updated_at: string;
}

/** Returned by v_total_stock view */
export interface ITotalStock {
  part_number: string;
  total_quantity: number;
  occupied_slots: number;
}

export interface VerifyStockPayload {
  inventoryId: string;
  expectedQuantity: number;
  physicalQuantity: number;
  notes?: string;
}

export interface IClient {
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
  product_count?: number;
  total_paid?: number;
  total_debt?: number;
  ciec?: string | null;
  economic_activity?: string | null;
  invoice_email?: string | null;
  contact_person?: string | null;
  assigned_accountant?: string | null;
  notes?: string | null;
  person_type?: string | null;
  status?: string | null;
}

export interface IClientProduct {
  client_id: string;
  product_id: string;
}

export interface IClientStock {
  client_name: string;
  part_number: string;
  description: string | null;
  warehouse: string | null;
  quantity: number;
  updated_at: string | null;
}

export interface UpdateProductPayload {
  productId: string;
  description?: string;
  rawMaterial?: {
    material_type: 'CRC_CRG' | 'WTOP' | 'MC1C' | 'MC2C' | 'SBS' | 'LNR' | 'MED';
    roll_width?: number;
    grammage?: number;
    caliper?: number;
    weight?: number;
    batch_number?: string;
    supplier?: string;
  };
}


export interface AdjustStockPayload {
  inventoryId: string;
  quantityChange: number;
  action: 'add' | 'subtract' | 'set';
  notes?: string;
}

export interface TransferStockPayload {
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  notes?: string;
}
