import { supabase, supabaseInventory } from '@/lib/supabase';
import type {
  IProduct,
  IRawMaterial,
  ILocation,
  IInventory,
  IInventoryLog,
  IStockByLocation,
  ITotalStock,
  AdjustStockPayload,
  TransferStockPayload,
  IClient,
  IClientStock,
  UpdateProductPayload,
} from './types';
import { logActivity } from '@/api/logs';

// ─── Queries ────────────────────────────────────────────────────────

/** Fetch aggregated stock totals for every part number (v_total_stock view). */
export async function fetchTotalStock(): Promise<ITotalStock[]> {
  const { data, error } = await supabaseInventory
    .from('v_total_stock')
    .select('*')
    .order('part_number');

  if (error) throw new Error(error.message);
  return data as ITotalStock[];
}

/** Fetch per-location stock rows filtered by warehouse (v_stock_by_location view). */
export async function fetchStockByWarehouse(warehouseId: string): Promise<IStockByLocation[]> {
  const { data, error } = await supabaseInventory
    .from('v_stock_by_location')
    .select('*')
    .eq('warehouse', warehouseId)
    .order('rack')
    .order('section')
    .order('level');

  if (error) throw new Error(error.message);
  return data as IStockByLocation[];
}

/** Fetch per-location stock for a specific part number. */
export async function fetchStockByProduct(partNumber: string): Promise<IStockByLocation[]> {
  const { data, error } = await supabaseInventory
    .from('v_stock_by_location')
    .select('*')
    .eq('part_number', partNumber)
    .order('warehouse')
    .order('rack');

  if (error) throw new Error(error.message);
  return data as IStockByLocation[];
}

/** Fetch all products with their raw materials. */
export async function fetchProducts(): Promise<IProduct[]> {
  const { data, error } = await supabaseInventory
    .from('products')
    .select('*, raw_materials(*)')
    .order('part_number');

  if (error) throw new Error(error.message);
  
  return (data || []).map((row: any) => {
    const raw_material = Array.isArray(row.raw_materials)
      ? row.raw_materials[0]
      : row.raw_materials;
    return {
      id: row.id,
      part_number: row.part_number,
      description: row.description,
      created_at: row.created_at,
      raw_material: raw_material || undefined,
    } as IProduct;
  });
}

/** Fetch single product details with raw material relationship using part_number. */
export async function fetchProductByPartNumber(partNumber: string): Promise<IProduct | null> {
  const { data, error } = await supabaseInventory
    .from('products')
    .select('*, raw_materials(*)')
    .eq('part_number', partNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (data) {
    const raw_material = Array.isArray(data.raw_materials)
      ? data.raw_materials[0]
      : data.raw_materials;
    return {
      id: data.id,
      part_number: data.part_number,
      description: data.description,
      created_at: data.created_at,
      raw_material: raw_material || undefined,
    } as IProduct;
  }
  return null;
}

/** Create a product and its raw material details in a transaction-like multi-step operation. */
export async function createRawMaterial(payload: {
  description?: string;
  material_type: 'CRC_CRG' | 'WTOP' | 'MC1C' | 'MC2C' | 'SBS' | 'LNR' | 'MED';
  roll_width?: number;
  grammage?: number;
  caliper?: number;
  weight?: number;
  batch_number?: string;
  supplier?: string;
}): Promise<IProduct> {
  // 1. Insert product (let part_number auto-increment via default sequence value)
  const { data: productData, error: productError } = await supabaseInventory
    .from('products')
    .insert({
      description: payload.description || null,
    })
    .select()
    .single();

  if (productError) throw new Error(`Error creating product: ${productError.message}`);

  const product = productData as IProduct;

  // 2. Insert raw material details referencing product.id
  const { data: rawMaterialData, error: rawMaterialError } = await supabaseInventory
    .from('raw_materials')
    .insert({
      product_id: product.id,
      material_type: payload.material_type,
      roll_width: payload.roll_width || null,
      grammage: payload.grammage || null,
      caliper: payload.caliper || null,
      weight: payload.weight || null,
      batch_number: payload.batch_number || null,
      supplier: payload.supplier || null,
    })
    .select()
    .single();

  if (rawMaterialError) {
    // Attempt cleanup if raw material insert fails
    await supabaseInventory.from('products').delete().eq('id', product.id);
    throw new Error(`Error creating raw material details: ${rawMaterialError.message}`);
  }

  // Log user activity
  logActivity('CREATE_RAW_MATERIAL', {
    productId: product.id,
    partNumber: product.part_number,
    materialType: payload.material_type,
  });

  return {
    ...product,
    raw_material: rawMaterialData as IRawMaterial,
  };
}

/** Fetch all locations for a given warehouse. */
export async function fetchLocationsByWarehouse(warehouseId: string): Promise<ILocation[]> {
  const { data, error } = await supabaseInventory
    .from('locations')
    .select('*')
    .eq('warehouse', warehouseId)
    .order('rack')
    .order('section')
    .order('level');

  if (error) throw new Error(error.message);
  return data as ILocation[];
}

/** Fetch inventory logs for a given product, most recent first. */
export async function fetchInventoryLogs(productId: string): Promise<IInventoryLog[]> {
  const { data, error } = await supabaseInventory
    .from('inventory_logs')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data as IInventoryLog[];
}

// ─── Mutations ──────────────────────────────────────────────────────

/**
 * Adjust the quantity of an inventory record and log the change.
 * Uses a two-step approach: read current → update → insert log.
 */
export async function adjustStock(payload: AdjustStockPayload): Promise<IInventory> {
  // 1. Read current inventory row
  const { data: current, error: readError } = await supabaseInventory
    .from('inventory')
    .select('*')
    .eq('id', payload.inventoryId)
    .single();

  if (readError) throw new Error(readError.message);

  const previousQuantity = (current as IInventory).quantity;
  let newQuantity: number;

  switch (payload.action) {
    case 'add':
      newQuantity = previousQuantity + payload.quantityChange;
      break;
    case 'subtract':
      newQuantity = previousQuantity - payload.quantityChange;
      break;
    case 'set':
      newQuantity = payload.quantityChange;
      break;
  }

  if (newQuantity < 0) {
    throw new Error(`Insufficient stock. Current: ${previousQuantity}, Requested change: -${payload.quantityChange}`);
  }

  // 2. Update inventory
  const { data: updated, error: updateError } = await supabaseInventory
    .from('inventory')
    .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
    .eq('id', payload.inventoryId)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);

  // 3. Insert audit log
  const { error: logError } = await supabaseInventory
    .from('inventory_logs')
    .insert({
      inventory_id: payload.inventoryId,
      product_id: (current as IInventory).product_id,
      location_id: (current as IInventory).location_id,
      action: payload.action,
      quantity_change: payload.action === 'subtract' ? -payload.quantityChange : payload.quantityChange,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      notes: payload.notes ?? null,
    });

  if (logError) {
    console.error('Failed to write inventory log:', logError);
    // Non-blocking
  }

  // Log user activity
  logActivity('ADJUST_STOCK', {
    inventoryId: payload.inventoryId,
    quantityChange: payload.quantityChange,
    action: payload.action,
    notes: payload.notes
  });

  return updated as IInventory;
}

/**
 * Transfer stock between two locations for the same product.
 * Decrements the source and increments (or creates) the destination.
 */
export async function transferStock(payload: TransferStockPayload): Promise<void> {
  // 1. Find source inventory row
  const { data: source, error: srcErr } = await supabaseInventory
    .from('inventory')
    .select('*')
    .eq('product_id', payload.productId)
    .eq('location_id', payload.fromLocationId)
    .single();

  if (srcErr) throw new Error(`Source location not found: ${srcErr.message}`);

  const srcRecord = source as IInventory;

  if (srcRecord.quantity < payload.quantity) {
    throw new Error(`Insufficient stock at source. Available: ${srcRecord.quantity}, Requested: ${payload.quantity}`);
  }

  // 2. Subtract from source
  await adjustStock({
    inventoryId: srcRecord.id,
    quantityChange: payload.quantity,
    action: 'subtract',
    notes: payload.notes ?? `Transfer to location ${payload.toLocationId}`,
  });

  // 3. Find or create destination inventory row
  const { data: dest, error: destErr } = await supabaseInventory
    .from('inventory')
    .select('*')
    .eq('product_id', payload.productId)
    .eq('location_id', payload.toLocationId)
    .maybeSingle();

  if (destErr) throw new Error(`Destination lookup failed: ${destErr.message}`);

  if (dest) {
    // Increment existing
    await adjustStock({
      inventoryId: (dest as IInventory).id,
      quantityChange: payload.quantity,
      action: 'add',
      notes: payload.notes ?? `Transfer from location ${payload.fromLocationId}`,
    });
  } else {
    // Create new inventory row at destination
    const { error: insertErr } = await supabaseInventory
      .from('inventory')
      .insert({
        product_id: payload.productId,
        location_id: payload.toLocationId,
        quantity: payload.quantity,
      });

    if (insertErr) throw new Error(`Failed to create destination inventory: ${insertErr.message}`);

    // Log the creation
    await supabaseInventory.from('inventory_logs').insert({
      product_id: payload.productId,
      location_id: payload.toLocationId,
      action: 'transfer_in',
      quantity_change: payload.quantity,
      previous_quantity: 0,
      new_quantity: payload.quantity,
      notes: payload.notes ?? `Transfer from location ${payload.fromLocationId}`,
    });
  }

  // Log user activity
  logActivity('TRANSFER_STOCK', {
    productId: payload.productId,
    fromLocationId: payload.fromLocationId,
    toLocationId: payload.toLocationId,
    quantity: payload.quantity,
    notes: payload.notes
  });
}

/** Update product description and raw material details if raw material is associated. */
export async function updateProductOrRawMaterial(payload: UpdateProductPayload): Promise<void> {
  // 1. Update product description
  if (payload.description !== undefined) {
    const { error: prodError } = await supabaseInventory
      .from('products')
      .update({ description: payload.description })
      .eq('id', payload.productId);

    if (prodError) throw new Error(`Error al actualizar el producto: ${prodError.message}`);
  }

  // 2. Update raw material details if rawMaterial payload is provided
  if (payload.rawMaterial) {
    const { error: rawError } = await supabaseInventory
      .from('raw_materials')
      .update({
        material_type: payload.rawMaterial.material_type,
        roll_width: payload.rawMaterial.roll_width ?? null,
        grammage: payload.rawMaterial.grammage ?? null,
        caliper: payload.rawMaterial.caliper ?? null,
        weight: payload.rawMaterial.weight ?? null,
        batch_number: payload.rawMaterial.batch_number ?? null,
        supplier: payload.rawMaterial.supplier ?? null,
      })
      .eq('product_id', payload.productId);

    if (rawError) throw new Error(`Error al actualizar la materia prima: ${rawError.message}`);
  }

  logActivity('UPDATE_PRODUCT', {
    productId: payload.productId,
    hasRawMaterial: !!payload.rawMaterial,
  });
}

// ─── Clients API ───────────────────────────────────────────────────

/** Fetch all clients with their attached products count. */
export async function fetchClients(): Promise<IClient[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name');

  if (error) throw new Error(error.message);

  const { data: cpData, error: cpError } = await supabaseInventory
    .from('client_products')
    .select('client_id');

  if (cpError) throw new Error(cpError.message);

  const clientProductCounts = (cpData || []).reduce((acc: Record<string, number>, row: any) => {
    acc[row.client_id] = (acc[row.client_id] || 0) + 1;
    return acc;
  }, {});

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    trade_name: row.trade_name,
    fiscal_name: row.fiscal_name,
    email: row.email,
    phone: row.phone,
    tax_id_rfc: row.tax_id_rfc,
    fiscal_regime: row.fiscal_regime,
    token: row.token,
    created_at: row.created_at,
    product_count: clientProductCounts[row.id] || 0,
  })) as IClient[];
}

/** Create a new client. */
export async function createClient(payload: {
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
}): Promise<IClient> {
  const { data, error } = await supabase
    .from('clients')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);

  logActivity('CREATE_CLIENT', {
    client_id: (data as any)?.id,
    client_name: payload.name,
    rfc: payload.tax_id_rfc,
    title: 'Nuevo cliente registrado',
    description: `Se dio de alta al cliente ${payload.name} (${payload.tax_id_rfc || 'Sin RFC'})`,
  });

  return data as IClient;
}

/** Update an existing client. */
export async function updateClient(
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
  }
): Promise<IClient> {
  const { data, error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  logActivity('UPDATE_CLIENT', {
    client_id: id,
    client_name: (data as any)?.name || payload.name,
    updated_fields: Object.keys(payload),
    title: 'Datos del cliente actualizados',
    description: `Se actualizó el expediente fiscal de ${(data as any)?.name || payload.name || 'Cliente'}`,
  });

  return data as IClient;
}

/** Delete a client. */
export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  logActivity('DELETE_CLIENT', {
    client_id: id,
    title: 'Cliente eliminado del padrón',
  });
}

/** Fetch products associated with a client. */
export async function fetchClientProducts(clientId: string): Promise<IProduct[]> {
  const { data, error } = await supabaseInventory
    .from('client_products')
    .select('product_id, product:products(*)')
    .eq('client_id', clientId);

  if (error) throw new Error(error.message);

  const products = (data || []).map((row: any) => row.product).filter(Boolean);
  return products as IProduct[];
}

/** Associate a product to a client. */
export async function attachProductToClient(clientId: string, productId: string): Promise<void> {
  const { error } = await supabaseInventory
    .from('client_products')
    .insert({ client_id: clientId, product_id: productId });

  if (error) throw new Error(error.message);
}

/** Disassociate a product from a client. */
export async function detachProductFromClient(productId: string): Promise<void> {
  const { error } = await supabaseInventory
    .from('client_products')
    .delete()
    .eq('product_id', productId);

  if (error) throw new Error(error.message);
}

/** Retrieve client stock by token using secure RPC. */
export async function fetchClientStockByToken(token: string): Promise<IClientStock[]> {
  const { data, error } = await supabaseInventory
    .rpc('get_client_stock_by_token', { client_token: token });

  if (error) throw new Error(error.message);
  return data as IClientStock[];
}

/** Retrieve client by token. */
export async function fetchClientByToken(token: string): Promise<IClient | null> {
  const { data, error } = await supabase
    .rpc('get_client_by_token', { client_token: token })
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as IClient | null;
}

/** Retrieve client projects by token using secure RPC. */
export async function fetchClientProjectsByToken(token: string): Promise<any[]> {
  const { data, error } = await supabase
    .rpc('get_client_projects_by_token', { client_token: token });

  if (error) throw new Error(error.message);
  return data || [];
}

/** Fetch all unique warehouses in the locations table. */
export async function fetchWarehouses(): Promise<{ id: string; label: string }[]> {
  const { data, error } = await supabaseInventory
    .from('locations')
    .select('warehouse')
    .order('warehouse');

  if (error) throw new Error(error.message);

  const uniqueWarehouses = [...new Set((data || []).map((d: any) => d.warehouse))];

  const labelMap: Record<string, string> = {
    B8: "Bodega 8",
    B7: "Bodega 7",
    WP: "Warehouse Principal",
  };

  return uniqueWarehouses.map((w) => ({
    id: w,
    label: labelMap[w] || `Almacén ${w}`,
  }));
}

/** Bulk upsert warehouse locations in segments of 200 items. */
export async function bulkCreateLocations(locations: Omit<ILocation, 'id'>[]): Promise<void> {
  const BATCH_SIZE = 200;
  for (let i = 0; i < locations.length; i += BATCH_SIZE) {
    const chunk = locations.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseInventory
      .from('locations')
      .upsert(chunk, { onConflict: 'warehouse,aisle,rack,section,level,position' });

    if (error) throw new Error(`Error setting up warehouse layout: ${error.message}`);
  }

  logActivity('BULK_CREATE_LOCATIONS', {
    count: locations.length,
    warehouse: locations[0]?.warehouse,
  });
}

/** Update a warehouse's code in locations table and local storage label. */
export async function updateWarehouse(oldCode: string, newCode: string, newLabel: string): Promise<void> {
  const oldCodeClean = oldCode.trim();
  const newCodeClean = newCode.trim();

  if (oldCodeClean !== newCodeClean) {
    const { error } = await supabaseInventory
      .from('locations')
      .update({ warehouse: newCodeClean })
      .eq('warehouse', oldCodeClean);

    if (error) throw new Error(`Error updating warehouse code: ${error.message}`);
  }

  const storedLabels = JSON.parse(localStorage.getItem("warehouse_labels") || "{}");
  if (oldCodeClean !== newCodeClean) {
    delete storedLabels[oldCodeClean];
  }
  if (newLabel.trim()) {
    storedLabels[newCodeClean] = newLabel.trim();
  } else {
    delete storedLabels[newCodeClean];
  }
  localStorage.setItem("warehouse_labels", JSON.stringify(storedLabels));

  logActivity('UPDATE_WAREHOUSE', {
    oldCode: oldCodeClean,
    newCode: newCodeClean,
    label: newLabel.trim(),
  });
}

/** Delete a warehouse. */
export async function deleteWarehouse(warehouseCode: string, forceDelete: boolean = false): Promise<void> {
  const codeClean = warehouseCode.trim();

  if (!forceDelete) {
    const { data: activeStock, error: checkError } = await supabaseInventory
      .from('v_stock_by_location')
      .select('quantity')
      .eq('warehouse', codeClean)
      .gt('quantity', 0)
      .limit(1);

    if (checkError) throw new Error(`Error checking warehouse stock: ${checkError.message}`);

    if (activeStock && activeStock.length > 0) {
      throw new Error("No se puede eliminar el almacén porque contiene productos con stock activo. Transfiere o ajusta el stock a 0 primero.");
    }
  }

  const { data: locations, error: locError } = await supabaseInventory
    .from('locations')
    .select('id')
    .eq('warehouse', codeClean);

  if (locError) throw new Error(`Error fetching locations: ${locError.message}`);

  const locationIds = (locations || []).map((l: any) => l.id);

  if (locationIds.length > 0) {
    const { error: invDelError } = await supabaseInventory
      .from('inventory')
      .delete()
      .in('location_id', locationIds);

    if (invDelError) throw new Error(`Error deleting inventory association: ${invDelError.message}`);

    const { error: locDelError } = await supabaseInventory
      .from('locations')
      .delete()
      .in('id', locationIds);

    if (locDelError) throw new Error(`Error deleting locations: ${locDelError.message}`);
  }

  const storedLabels = JSON.parse(localStorage.getItem("warehouse_labels") || "{}");
  delete storedLabels[codeClean];
  localStorage.setItem("warehouse_labels", JSON.stringify(storedLabels));

  logActivity('DELETE_WAREHOUSE', {
    warehouse: codeClean,
    force: forceDelete,
  });
}

/** Transfer all active stock from one warehouse to another. */
export async function transferWarehouseStock(fromWarehouse: string, toWarehouse: string): Promise<void> {
  const fromClean = fromWarehouse.trim();
  const toClean = toWarehouse.trim();

  const { data: activeStock, error: fetchErr } = await supabaseInventory
    .from('inventory')
    .select('*, locations:locations!inner(*)')
    .eq('locations.warehouse', fromClean)
    .gt('quantity', 0);

  if (fetchErr) throw new Error(`Error fetching source warehouse stock: ${fetchErr.message}`);
  if (!activeStock || activeStock.length === 0) return;

  for (const item of activeStock) {
    const sourceLoc = item.locations;
    const productId = item.product_id;
    const qty = item.quantity;

    let destLocationId: string;
    const { data: destLoc, error: destLocErr } = await supabaseInventory
      .from('locations')
      .select('id')
      .eq('warehouse', toClean)
      .eq('aisle', sourceLoc.aisle || 'General')
      .eq('rack', sourceLoc.rack || '')
      .eq('section', sourceLoc.section || '')
      .eq('level', sourceLoc.level || '')
      .eq('position', sourceLoc.position || 'Col 1')
      .limit(1)
      .maybeSingle();

    if (destLocErr) throw new Error(`Error checking destination location: ${destLocErr.message}`);

    if (destLoc) {
      destLocationId = destLoc.id;
    } else {
      const { data: newLoc, error: createLocErr } = await supabaseInventory
        .from('locations')
        .insert({
          warehouse: toClean,
          aisle: sourceLoc.aisle || 'General',
          rack: sourceLoc.rack || '',
          section: sourceLoc.section || '',
          level: sourceLoc.level || '',
          position: sourceLoc.position || 'Col 1',
        })
        .select('id')
        .single();

      if (createLocErr) throw new Error(`Error creating target location: ${createLocErr.message}`);
      destLocationId = (newLoc as any).id;
    }

    const { error: subErr } = await supabaseInventory
      .from('inventory')
      .update({ quantity: 0, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (subErr) throw new Error(`Error updating source stock: ${subErr.message}`);

    await supabaseInventory.from('inventory_logs').insert({
      inventory_id: item.id,
      product_id: productId,
      location_id: sourceLoc.id,
      action: 'transfer_out',
      quantity_change: -qty,
      previous_quantity: qty,
      new_quantity: 0,
      notes: `Transferencia masiva de almacén ${fromClean} a ${toClean}`,
    });

    const { data: destInv, error: destInvErr } = await supabaseInventory
      .from('inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('location_id', destLocationId)
      .maybeSingle();

    if (destInvErr) throw new Error(`Error checking destination stock: ${destInvErr.message}`);

    if (destInv) {
      const newQty = destInv.quantity + qty;
      await supabaseInventory
        .from('inventory')
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq('id', destInv.id);

      await supabaseInventory.from('inventory_logs').insert({
        inventory_id: destInv.id,
        product_id: productId,
        location_id: destLocationId,
        action: 'transfer_in',
        quantity_change: qty,
        previous_quantity: destInv.quantity,
        new_quantity: newQty,
        notes: `Transferencia masiva de almacén ${fromClean} a ${toClean}`,
      });
    } else {
      const { data: newInv, error: createInvErr } = await supabaseInventory
        .from('inventory')
        .insert({
          product_id: productId,
          location_id: destLocationId,
          quantity: qty,
        })
        .select()
        .single();

      if (createInvErr) throw new Error(`Error creating destination stock: ${createInvErr.message}`);

      await supabaseInventory.from('inventory_logs').insert({
        inventory_id: (newInv as any).id,
        product_id: productId,
        location_id: destLocationId,
        action: 'transfer_in',
        quantity_change: qty,
        previous_quantity: 0,
        new_quantity: qty,
        notes: `Transferencia masiva de almacén ${fromClean} a ${toClean}`,
      });
    }
  }

  logActivity('TRANSFER_WAREHOUSE_STOCK', {
    fromWarehouse: fromClean,
    toWarehouse: toClean,
    itemsTransferred: activeStock.length,
  });
}




