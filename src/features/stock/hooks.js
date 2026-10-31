import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api/client.js';

/** Counts and what needs attention; `kind` = 'food' (default) or 'medicine' (ADR 0008). */
export const useSummary = (kind = 'food', { enabled = true } = {}) =>
  useQuery({
    queryKey: ['stock', 'summary', kind],
    queryFn: () => api('/stock/summary', { query: { kind } }),
    enabled,
  });

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

export const useFoods = (kind = 'food') =>
  useQuery({ queryKey: ['foods', kind], queryFn: () => api('/foods', { query: { kind } }) });

/**
 * Everything that changes food: lists, the summary, places' counts, food names and the shopping
 * list (finished food may be added; staples change) refetch.
 */
function useStockMutation(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['places'] });
      qc.invalidateQueries({ queryKey: ['foods'] });
      qc.invalidateQueries({ queryKey: ['shopping'] });
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

/** A kind of food: its staple amount ("keep at least"), barcode, name, category or unit. */
export const useEditFood = () =>
  useStockMutation(({ id, ...body }) => api(`/foods/${id}`, { method: 'PATCH', body }));

/** A scanned barcode: the household's food, or a name from Open Food Facts. */
export const lookupBarcode = (code, kind = 'food') =>
  api(`/foods/barcode/${code}`, { query: { kind } });
