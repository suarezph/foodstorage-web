import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api/client.js';

export const useHousehold = () =>
  useQuery({ queryKey: ['household'], queryFn: () => api('/household') });
export const usePlaces = () => useQuery({ queryKey: ['places'], queryFn: () => api('/places') });
export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: () => api('/categories') });

/** Create, change or delete a place or category (managers). Stock is refetched too. */
export function useSave(kind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remove, ...body }) =>
      remove
        ? api(`/${kind}/${id}`, { method: 'DELETE' })
        : id
          ? api(`/${kind}/${id}`, { method: 'PATCH', body })
          : api(`/${kind}`, { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [kind] });
      qc.invalidateQueries({ queryKey: ['stock'] });
    },
  });
}
