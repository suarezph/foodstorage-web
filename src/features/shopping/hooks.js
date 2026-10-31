import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api/client.js';

export const useShopping = () =>
  useQuery({ queryKey: ['shopping'], queryFn: () => api('/shopping') });

function useShoppingMutation(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  });
}

export const useAddShopping = () =>
  useShoppingMutation((body) => api('/shopping', { method: 'POST', body }));
export const useUpdateShopping = () =>
  useShoppingMutation(({ id, ...body }) => api(`/shopping/${id}`, { method: 'PATCH', body }));
export const useDeleteShopping = () =>
  useShoppingMutation((id) => api(`/shopping/${id}`, { method: 'DELETE' }));
export const useClearBought = () =>
  useShoppingMutation(() => api('/shopping/clear-done', { method: 'POST' }));
