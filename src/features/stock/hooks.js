import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api/client.js';

export const useSummary = () =>
  useQuery({ queryKey: ['stock', 'summary'], queryFn: () => api('/stock/summary') });

export const useStock = (filters) =>
  useQuery({
    queryKey: ['stock', 'list', filters],
    queryFn: () => api('/stock', { query: filters }),
  });

export const useItem = (id) =>
  useQuery({
    queryKey: ['stock', 'item', id],
    queryFn: () => api(`/stock/${id}`),
    enabled: Boolean(id),
  });

export const useFoods = () => useQuery({ queryKey: ['foods'], queryFn: () => api('/foods') });

/** Everything that changes food: lists, the summary, places' counts and food names refetch. */
function useStockMutation(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['places'] });
      qc.invalidateQueries({ queryKey: ['foods'] });
    },
  });
}

export const useAddFood = () => useStockMutation((body) => api('/stock', { method: 'POST', body }));

/** use | open | move | finish | discard */
export const useAction = () =>
  useStockMutation(({ id, action, body = {} }) =>
    api(`/stock/${id}/${action}`, { method: 'POST', body }),
  );

export const useEditItem = () =>
  useStockMutation(({ id, ...body }) => api(`/stock/${id}`, { method: 'PATCH', body }));

export const useDeleteItem = () =>
  useStockMutation((id) => api(`/stock/${id}`, { method: 'DELETE' }));
