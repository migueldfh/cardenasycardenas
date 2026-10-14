import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTotalStock,
  fetchStockByWarehouse,
  fetchStockByProduct,
  fetchProducts,
  fetchLocationsByWarehouse,
  fetchInventoryLogs,
  adjustStock,
  transferStock,
  fetchProductByPartNumber,
  createRawMaterial,
  fetchClients,
  createClient,
  deleteClient,
  updateClient,
  fetchClientProducts,
  attachProductToClient,
  detachProductFromClient,
  fetchClientStockByToken,
  fetchClientByToken,
  fetchClientProjectsByToken,
  updateProductOrRawMaterial,
  fetchWarehouses,
  bulkCreateLocations,
  updateWarehouse,
  deleteWarehouse,
  transferWarehouseStock,
} from './api';
import type { AdjustStockPayload, TransferStockPayload, UpdateProductPayload, ILocation } from './types';

// ─── Query Keys ─────────────────────────────────────────────────────

export const INVENTORY_KEYS = {
  all: ['inventory'] as const,
  totalStock: () => [...INVENTORY_KEYS.all, 'totalStock'] as const,
  warehouseMap: (warehouseId: string) => [...INVENTORY_KEYS.all, 'warehouse', warehouseId] as const,
  productStock: (partNumber: string) => [...INVENTORY_KEYS.all, 'product', partNumber] as const,
  productDetail: (partNumber: string) => [...INVENTORY_KEYS.all, 'productDetail', partNumber] as const,
  products: () => [...INVENTORY_KEYS.all, 'products'] as const,
  locations: (warehouseId: string) => [...INVENTORY_KEYS.all, 'locations', warehouseId] as const,
  logs: (productId: string) => [...INVENTORY_KEYS.all, 'logs', productId] as const,
  clients: () => [...INVENTORY_KEYS.all, 'clients'] as const,
  clientProducts: (clientId: string) => [...INVENTORY_KEYS.all, 'clientProducts', clientId] as const,
  clientStock: (token: string) => [...INVENTORY_KEYS.all, 'clientStock', token] as const,
};

// ─── Query Hooks ────────────────────────────────────────────────────

/**
 * Fetch the aggregated stock summary for all part numbers.
 * Uses the `v_total_stock` database view.
 */
export function useInventory() {
  return useQuery({
    queryKey: INVENTORY_KEYS.totalStock(),
    queryFn: fetchTotalStock,
  });
}

/**
 * Fetch the physical layout and stock levels for a specific warehouse.
 * Uses the `v_stock_by_location` view filtered by `warehouseId`.
 */
export function useWarehouseMap(warehouseId: string) {
  return useQuery({
    queryKey: INVENTORY_KEYS.warehouseMap(warehouseId),
    queryFn: () => fetchStockByWarehouse(warehouseId),
    enabled: !!warehouseId,
  });
}

/**
 * Fetch stock distribution across all locations for a single product.
 */
export function useProductStock(partNumber: string) {
  return useQuery({
    queryKey: INVENTORY_KEYS.productStock(partNumber),
    queryFn: () => fetchStockByProduct(partNumber),
    enabled: !!partNumber,
  });
}

/**
 * Fetch the full product catalog.
 */
export function useProducts() {
  return useQuery({
    queryKey: INVENTORY_KEYS.products(),
    queryFn: fetchProducts,
  });
}

/**
 * Fetch all locations for a given warehouse.
 */
export function useLocations(warehouseId: string) {
  return useQuery({
    queryKey: INVENTORY_KEYS.locations(warehouseId),
    queryFn: () => fetchLocationsByWarehouse(warehouseId),
    enabled: !!warehouseId,
  });
}

/**
 * Fetch audit logs for a specific product.
 */
export function useInventoryLogs(productId: string) {
  return useQuery({
    queryKey: INVENTORY_KEYS.logs(productId),
    queryFn: () => fetchInventoryLogs(productId),
    enabled: !!productId,
  });
}

// ─── Mutation Hooks ─────────────────────────────────────────────────

/**
 * Adjust the quantity of an existing inventory record.
 * Invalidates all inventory queries on success.
 */
export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdjustStockPayload) => adjustStock(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
  });
}

/**
 * Transfer stock between two locations for the same product.
 * Invalidates all inventory queries on success.
 */
export function useTransferStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TransferStockPayload) => transferStock(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
  });
}

/**
 * Fetch a single product's detail along with its raw material relationship.
 */
export function useProductDetail(partNumber: string) {
  return useQuery({
    queryKey: INVENTORY_KEYS.productDetail(partNumber),
    queryFn: () => fetchProductByPartNumber(partNumber),
    enabled: !!partNumber,
  });
}

/**
 * Create a new raw material.
 */
export function useCreateRawMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof createRawMaterial>[0]) => createRawMaterial(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
  });
}

// ─── Clients Hooks ─────────────────────────────────────────────────

/** Fetch all clients. */
export function useClients() {
  return useQuery({
    queryKey: INVENTORY_KEYS.clients(),
    queryFn: fetchClients,
  });
}

/** Create a client. */
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      name: string;
      trade_name?: string | null;
      fiscal_name?: string | null;
      email?: string | null;
      phone?: string | null;
      tax_id_rfc?: string | null;
      fiscal_regime?: string | null;
    }) => createClient(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.clients() });
    },
  });
}

/** Delete a client. */
export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.clients() });
    },
  });
}

/** Fetch products of a client. */
export function useClientProducts(clientId: string) {
  return useQuery({
    queryKey: INVENTORY_KEYS.clientProducts(clientId),
    queryFn: () => fetchClientProducts(clientId),
    enabled: !!clientId,
  });
}

/** Associate a product to a client. */
export function useAttachProductToClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { clientId: string; productId: string }) => 
      attachProductToClient(payload.clientId, payload.productId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.clientProducts(variables.clientId) });
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.clients() });
    },
  });
}

/** Disassociate a product from a client. */
export function useDetachProductFromClient(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => detachProductFromClient(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.clientProducts(clientId) });
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.clients() });
    },
  });
}

/** Public hook to fetch client stock by token. */
export function useClientStockByToken(token: string) {
  return useQuery({
    queryKey: INVENTORY_KEYS.clientStock(token),
    queryFn: () => fetchClientStockByToken(token),
    enabled: !!token,
  });
}

/** Update product or raw material details. */
export function useUpdateProductOrRawMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProductPayload) => updateProductOrRawMaterial(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
  });
}

/** Public hook to fetch client by token. */
export function useClientByToken(token: string) {
  return useQuery({
    queryKey: ['inventory', 'clientByToken', token],
    queryFn: () => fetchClientByToken(token),
    enabled: !!token,
  });
}

/** Public hook to fetch client projects by token. */
export function useClientProjectsByToken(token: string) {
  return useQuery({
    queryKey: ['inventory', 'clientProjectsByToken', token],
    queryFn: () => fetchClientProjectsByToken(token),
    enabled: !!token,
  });
}


/** Update an existing client. */
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      id: string;
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
      };
    }) => updateClient(variables.id, variables.payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.clients() });
      queryClient.invalidateQueries({ queryKey: ["client", variables.id] });
    },
  });
}

/** Fetch all unique warehouses. */
export function useWarehouses(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['inventory', 'warehouses'],
    queryFn: fetchWarehouses,
    ...options,
  });
}

/** Bulk create locations for a warehouse. */
export function useBulkCreateLocations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locations: Omit<ILocation, 'id'>[]) => bulkCreateLocations(locations),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
  });
}

/** Update warehouse details. */
export function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { oldCode: string; newCode: string; newLabel: string }) => 
      updateWarehouse(payload.oldCode, payload.newCode, payload.newLabel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
  });
}

/** Delete a warehouse. */
export function useDeleteWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { warehouseCode: string; forceDelete?: boolean }) =>
      deleteWarehouse(payload.warehouseCode, payload.forceDelete),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
  });
}

/** Transfer all warehouse stock to another warehouse. */
export function useTransferWarehouseStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { fromWarehouse: string; toWarehouse: string }) =>
      transferWarehouseStock(payload.fromWarehouse, payload.toWarehouse),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.all });
    },
  });
}



