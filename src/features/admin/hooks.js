import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../app/AuthContext.jsx';
import { api } from '../../lib/api/client.js';

export const useHouseholds = () =>
  useQuery({ queryKey: ['admin', 'households'], queryFn: () => api('/admin/households') });
export const useUsers = () =>
  useQuery({ queryKey: ['admin', 'users'], queryFn: () => api('/admin/users') });

/**
 * Any admin change. Afterwards the lists refetch, and your own profile too: putting yourself in a
 * household should show its pages at once.
 */
export function useAdminMutation(fn) {
  const qc = useQueryClient();
  const { setUser } = useAuth();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['household'] });
      setUser(await api('/me'));
    },
  });
}

export const useCreateHousehold = () =>
  useAdminMutation((body) => api('/admin/households', { method: 'POST', body }));
export const useDeleteHousehold = () =>
  useAdminMutation((id) => api(`/admin/households/${id}`, { method: 'DELETE' }));
export const useCreateUser = () =>
  useAdminMutation((body) => api('/admin/users', { method: 'POST', body }));
export const useUpdateUser = () =>
  useAdminMutation(({ id, ...body }) => api(`/admin/users/${id}`, { method: 'PATCH', body }));
export const useResetPassword = () =>
  useAdminMutation((id) => api(`/admin/users/${id}/reset-password`, { method: 'POST', body: {} }));
