/**
 * The school's fee types (Admission Fee, Exam Fee…) and its campuses, kept
 * on the server (GET/PUT /fees/types) so every office computer sees the same
 * list. They used to live in one browser's localStorage; what this browser
 * kept there is moved to the server the first time.
 *
 *   const { types, campuses, save } = useFeeTypes();
 *   await save([...types, { name: 'Picnic Fee', campusId: null }]);
 */
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

export const FEE_TYPES_KEY = ['fee-types'];
const LEGACY_KEY = 'ilmforge_fee_types';
let migrating = false;

// The old list held { id, name, campus: 'Main Campus' } or plain names.
function fromLegacy(list, campuses) {
  const byName = new Map(campuses.map((c) => [c.name.trim().toLowerCase(), c.id]));
  const seen = new Set();
  return list
    .map((t) => (typeof t === 'string' ? { name: t } : { id: t?.id, name: t?.name, campusId: byName.get(String(t?.campus || '').trim().toLowerCase()) ?? null }))
    .filter((t) => {
      const key = String(t.name || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export default function useFeeTypes() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: FEE_TYPES_KEY,
    queryFn: () => api.get('/fees/types').then((r) => r.data.data),
    staleTime: 30_000,
  });
  const save = useMutation({
    mutationFn: (types) => api.put('/fees/types', { types }).then((r) => r.data.data),
    onSuccess: (data) => qc.setQueryData(FEE_TYPES_KEY, data),
  });

  useEffect(() => {
    const d = q.data;
    if (!d || migrating) return;
    // The school already has its list: this browser's old copy is stale.
    if (d.saved) { try { localStorage.removeItem(LEGACY_KEY); } catch { /* blocked */ } return; }
    let local = null;
    try { local = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null'); } catch { local = null; }
    if (!Array.isArray(local) || !local.length) return;
    const types = fromLegacy(local, d.campuses || []);
    if (!types.length) return;
    migrating = true;
    save.mutate(types, {
      onSuccess: () => { try { localStorage.removeItem(LEGACY_KEY); } catch { /* blocked */ } },
      onSettled: () => { migrating = false; },
    });
  }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const campuses = q.data?.campuses || [];
  return {
    types: q.data?.types || [],
    campuses,
    campusName: (id) => (id == null ? 'All campuses' : campuses.find((c) => c.id === Number(id))?.name || 'All campuses'),
    isLoading: q.isLoading,
    error: q.error,
    save: save.mutateAsync,
    isSaving: save.isPending,
  };
}
