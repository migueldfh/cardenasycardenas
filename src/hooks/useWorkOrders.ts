import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchActiveWorkOrders, 
  fetchWorkOrderById, 
  createWorkOrder, 
  uploadArtwork 
} from '../api/workOrders';

export const WORK_ORDERS_KEYS = {
  all: ['workOrders'] as const,
  detail: (id: string) => ['workOrders', id] as const,
};

export function useActiveWorkOrders() {
  return useQuery({
    queryKey: WORK_ORDERS_KEYS.all,
    queryFn: fetchActiveWorkOrders,
  });
}

export function useWorkOrderDetails(id: string) {
  return useQuery({
    queryKey: WORK_ORDERS_KEYS.detail(id),
    queryFn: () => fetchWorkOrderById(id),
    enabled: !!id,
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createWorkOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORK_ORDERS_KEYS.all });
    },
  });
}

export function useUploadArtwork() {
  return useMutation({
    mutationFn: uploadArtwork,
  });
}
