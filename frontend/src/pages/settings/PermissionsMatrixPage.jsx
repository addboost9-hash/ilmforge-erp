import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { ShieldCheck, RotateCcw } from 'lucide-react';

const ACTIONS = [
  { key: 'canView', label: 'View' },
  { key: 'canCreate', label: 'Create' },
  { key: 'canUpdate', label: 'Update' },
  { key: 'canDelete', label: 'Delete' },
  { key: 'canExport', label: 'Export' },
];

const roleLabel = (role) => {
  const map = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    accountant: 'Accountant',
    teacher: 'Teacher',
    parent: 'Parent',
    student: 'Student',
    gatekeeper: 'Gatekeeper',
  };
  return map[role] || role;
};

const moduleLabel = (module) => module.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

export default function PermissionsMatrixPage() {
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['permission-matrix'],
    queryFn: () => api.get('/permissions').then((r) => r.data.data || []),
    staleTime: 15_000,
  });

  const updatePermission = useMutation({
    mutationFn: ({ role, module, payload }) => api.put(`/permissions/${role}/${module}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permission-matrix'] });
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message || 'Failed to update permission');
    },
  });

  const resetDefaults = useMutation({
    mutationFn: () => api.post('/permissions/reset-defaults'),
    onSuccess: () => {
      toast.success('Permissions reset to defaults');
      qc.invalidateQueries({ queryKey: ['permission-matrix'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to reset defaults'),
  });

  const flatRows = useMemo(() => {
    const list = [];
    rows.forEach((roleBlock) => {
      roleBlock.modules.forEach((mod) => {
        list.push({ role: roleBlock.role, ...mod });
      });
    });
    return list;
  }, [rows]);

  const handleToggle = (entry, key) => {
    const payload = {
      canView: !!entry.canView,
      canCreate: !!entry.canCreate,
      canUpdate: !!entry.canUpdate,
      canDelete: !!entry.canDelete,
      canExport: !!entry.canExport,
      [key]: !entry[key],
    };

    if ((key === 'canCreate' || key === 'canUpdate' || key === 'canDelete' || key === 'canExport') && payload[key]) {
      payload.canView = true;
    }

    updatePermission.mutate({ role: entry.role, module: entry.module, payload });
  };

  return (
    <div className="page-content fade-in" style={{ paddingBottom: 24 }}>
      <div style={{
        background: 'linear-gradient(120deg,#0F172A 0%,#1D4ED8 55%,#0F766E 100%)',
        borderRadius: 16,
        color: '#fff',
        padding: '20px 22px',
        marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={20} />
          <div style={{ fontSize: 22, fontWeight: 900 }}>Permission Matrix</div>
        </div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.92 }}>
          Configure role-wise module action access across view, create, update, delete and export.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 12.5, color: '#64748B' }}>
          Rows: <strong style={{ color: '#0F172A' }}>{flatRows.length}</strong>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => resetDefaults.mutate()} disabled={resetDefaults.isPending}>
          <RotateCcw size={14} /> {resetDefaults.isPending ? 'Resetting...' : 'Reset To Defaults'}
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Module</th>
                  {ACTIONS.map((a) => <th key={a.key}>{a.label}</th>)}
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {flatRows.map((entry) => (
                  <tr key={`${entry.role}-${entry.module}`}>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>{roleLabel(entry.role)}</td>
                    <td style={{ color: '#334155' }}>{moduleLabel(entry.module)}</td>
                    {ACTIONS.map((a) => (
                      <td key={a.key}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!entry[a.key]}
                            onChange={() => handleToggle(entry, a.key)}
                            disabled={entry.role === 'super_admin' || updatePermission.isPending}
                            style={{ width: 15, height: 15 }}
                          />
                        </label>
                      </td>
                    ))}
                    <td>
                      <span className={`badge ${entry.isOverride ? 'badge-blue' : 'badge-gray'}`}>
                        {entry.isOverride ? 'Custom' : 'Default'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
