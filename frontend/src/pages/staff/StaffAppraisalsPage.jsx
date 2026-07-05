import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';
import { Award, Plus, Save, RefreshCcw, CheckCircle2, Undo2, Download } from 'lucide-react';

const now = new Date();

function badge(status) {
  const map = {
    draft: { bg: '#FEF3C7', fg: '#B45309' },
    submitted: { bg: '#DBEAFE', fg: '#1D4ED8' },
    finalized: { bg: '#DCFCE7', fg: '#166534' },
  };
  const s = map[status] || { bg: '#E2E8F0', fg: '#334155' };
  return { background: s.bg, color: s.fg, borderRadius: 999, padding: '3px 8px', fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize' };
}

export default function StaffAppraisalsPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const [filters, setFilters] = useState({
    year: String(now.getFullYear()),
    term: '',
    status: '',
  });
  const [selectedAdjustmentId, setSelectedAdjustmentId] = useState(null);

  const [form, setForm] = useState({
    staffId: '',
    year: now.getFullYear(),
    term: 'Annual',
    score: 80,
    rating: 'Good',
    strengths: '',
    improvements: '',
    goals: '',
    status: 'draft',
    appraisalDate: now.toISOString().slice(0, 10),
  });

  const { data: staffRows = [] } = useQuery({
    queryKey: ['staff-list-for-appraisal'],
    queryFn: () => api.get('/staff', { params: { limit: 200 } }).then((r) => r.data.data || []),
    enabled: isAdmin,
    staleTime: 120_000,
  });

  const { data: summary } = useQuery({
    queryKey: ['appraisal-summary'],
    queryFn: () => api.get('/appraisals/summary').then((r) => r.data.data),
    staleTime: 20_000,
  });

  const { data: analytics } = useQuery({
    queryKey: ['appraisal-analytics'],
    queryFn: () => api.get('/appraisals/analytics').then((r) => r.data.data),
    staleTime: 20_000,
  });

  const { data: adjustments = [] } = useQuery({
    queryKey: ['payroll-adjustments'],
    queryFn: () => api.get('/appraisals/payroll/adjustments').then((r) => r.data.data || []),
    enabled: isAdmin,
    staleTime: 15_000,
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ['payroll-adjustment-timeline', selectedAdjustmentId],
    queryFn: () => api.get(`/appraisals/payroll/${selectedAdjustmentId}/timeline`).then((r) => r.data.data || []),
    enabled: !!selectedAdjustmentId,
    staleTime: 10_000,
  });

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['appraisals', filters.year, filters.term, filters.status],
    queryFn: () => api.get('/appraisals', { params: { year: filters.year || undefined, term: filters.term || undefined, status: filters.status || undefined, limit: 200 } }).then((r) => r.data.data || []),
    staleTime: 20_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/appraisals', payload),
    onSuccess: () => {
      toast.success('Appraisal created');
      qc.invalidateQueries({ queryKey: ['appraisals'] });
      qc.invalidateQueries({ queryKey: ['appraisal-summary'] });
      setForm((prev) => ({ ...prev, strengths: '', improvements: '', goals: '' }));
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to create appraisal'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/appraisals/${id}`, payload),
    onSuccess: () => {
      toast.success('Appraisal updated');
      qc.invalidateQueries({ queryKey: ['appraisals'] });
      qc.invalidateQueries({ queryKey: ['appraisal-summary'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Update failed'),
  });

  const proposeAdjustment = useMutation({
    mutationFn: ({ appraisalId, incrementPercent }) => api.post(`/appraisals/${appraisalId}/payroll/propose`, { incrementPercent }),
    onSuccess: () => {
      toast.success('Payroll adjustment proposed');
      qc.invalidateQueries({ queryKey: ['payroll-adjustments'] });
      qc.invalidateQueries({ queryKey: ['appraisal-analytics'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to propose adjustment'),
  });

  const approveAdjustment = useMutation({
    mutationFn: ({ adjustmentId, comment }) => api.post(`/appraisals/payroll/${adjustmentId}/approve`, { comment }),
    onSuccess: () => {
      toast.success('Adjustment approved');
      qc.invalidateQueries({ queryKey: ['payroll-adjustments'] });
      qc.invalidateQueries({ queryKey: ['appraisal-analytics'] });
      if (selectedAdjustmentId) qc.invalidateQueries({ queryKey: ['payroll-adjustment-timeline', selectedAdjustmentId] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to approve'),
  });

  const applyAdjustment = useMutation({
    mutationFn: ({ adjustmentId, comment }) => api.post(`/appraisals/payroll/${adjustmentId}/apply`, { comment }),
    onSuccess: () => {
      toast.success('Adjustment applied to payroll');
      qc.invalidateQueries({ queryKey: ['payroll-adjustments'] });
      qc.invalidateQueries({ queryKey: ['staff-list-for-appraisal'] });
      qc.invalidateQueries({ queryKey: ['appraisal-analytics'] });
      if (selectedAdjustmentId) qc.invalidateQueries({ queryKey: ['payroll-adjustment-timeline', selectedAdjustmentId] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to apply adjustment'),
  });

  const rollbackAdjustment = useMutation({
    mutationFn: (adjustmentId) => api.post(`/appraisals/payroll/${adjustmentId}/rollback`, { reason: 'Rolled back by admin from appraisal console' }),
    onSuccess: () => {
      toast.success('Adjustment rolled back');
      qc.invalidateQueries({ queryKey: ['payroll-adjustments'] });
      qc.invalidateQueries({ queryKey: ['staff-list-for-appraisal'] });
      qc.invalidateQueries({ queryKey: ['appraisal-analytics'] });
      if (selectedAdjustmentId) qc.invalidateQueries({ queryKey: ['payroll-adjustment-timeline', selectedAdjustmentId] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to rollback'),
  });

  const totals = useMemo(() => {
    const total = rows.length;
    const avg = total ? Math.round(rows.reduce((sum, r) => sum + Number(r.score || 0), 0) / total) : 0;
    return { total, avg };
  }, [rows]);

  const submitCreate = (e) => {
    e.preventDefault();
    if (!form.staffId) {
      toast.error('Select staff member first');
      return;
    }
    createMutation.mutate({
      ...form,
      staffId: Number(form.staffId),
      year: Number(form.year),
      score: Number(form.score),
    });
  };

  const downloadPayrollReport = async () => {
    try {
      const response = await api.get('/appraisals/payroll/report.csv', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-adjustments-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Payroll adjustment report downloaded');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to download report');
    }
  };

  const openPdfReport = async () => {
    try {
      const response = await api.get('/appraisals/payroll/report.pdf', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('Printable report opened. Use Print / Save as PDF.');
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to open PDF report');
    }
  };

  const askComment = (title) => window.prompt(`${title}\n\nAdd signed approval comment (required for compliance):`, '') || '';

  return (
    <div className="page-content fade-in" style={{ paddingBottom: 24 }}>
      <div style={{
        background: 'linear-gradient(120deg,#1F2937 0%,#1D4ED8 48%,#059669 100%)',
        borderRadius: 16,
        color: '#fff',
        padding: '20px 22px',
        marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={20} />
          <div style={{ fontSize: 22, fontWeight: 900 }}>Staff Appraisals</div>
        </div>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.92 }}>
          Evaluation setup, reports and increment-ready records for annual and term reviews.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 12 }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12, color: '#64748B' }}>This Year Total</div>
          <div style={{ marginTop: 2, fontSize: 24, fontWeight: 900, color: '#0F172A' }}>{summary?.total ?? totals.total}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12, color: '#64748B' }}>Finalized</div>
          <div style={{ marginTop: 2, fontSize: 24, fontWeight: 900, color: '#166534' }}>{summary?.finalized ?? 0}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12, color: '#64748B' }}>Submitted</div>
          <div style={{ marginTop: 2, fontSize: 24, fontWeight: 900, color: '#1D4ED8' }}>{summary?.submitted ?? 0}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12, color: '#64748B' }}>Average Score</div>
          <div style={{ marginTop: 2, fontSize: 24, fontWeight: 900, color: '#B45309' }}>{summary?.avgScore ?? totals.avg}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>Performance Trend</div>
          <div style={{ fontSize: 12.5, color: '#475569' }}>
            Current Year Avg: <strong style={{ color: '#0F172A' }}>{analytics?.avgScoreThisYear ?? 0}</strong>
          </div>
          <div style={{ fontSize: 12.5, color: '#475569', marginTop: 3 }}>
            Previous Year Avg: <strong style={{ color: '#0F172A' }}>{analytics?.avgScorePrevYear ?? 0}</strong>
          </div>
          <div style={{ marginTop: 8, fontSize: 12.5 }}>
            Trend: <strong style={{ color: analytics?.trend === 'up' ? '#166534' : analytics?.trend === 'down' ? '#B91C1C' : '#334155' }}>{analytics?.trend || 'stable'}</strong>
            <span style={{ marginLeft: 8, color: '#64748B' }}>(delta {analytics?.trendDelta ?? 0})</span>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>Top Performers</div>
          {(analytics?.topPerformers || []).slice(0, 4).map((p) => (
            <div key={`${p.staffId}-${p.score}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px dashed #E2E8F0' }}>
              <div style={{ fontSize: 12.5, color: '#334155' }}>
                <strong style={{ color: '#0F172A' }}>{p.staffName}</strong> {p.empCode ? `(${p.empCode})` : ''}
              </div>
              <div style={{ fontSize: 12.5, color: '#166534', fontWeight: 700 }}>{p.score} / +{p.suggestedIncrementPercent}%</div>
            </div>
          ))}
          {(!analytics?.topPerformers || analytics.topPerformers.length === 0) && (
            <div style={{ fontSize: 12.5, color: '#64748B' }}>No analytics data yet.</div>
          )}
        </div>
      </div>

      {isAdmin && (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Increment and Promotion Recommendations</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Score</th>
                  <th>Rating</th>
                  <th>Suggested Increment</th>
                  <th>Est. Salary Impact</th>
                  <th>Recommendation</th>
                  <th>Payroll Action</th>
                </tr>
              </thead>
              <tbody>
                {(analytics?.recommendations || []).slice(0, 8).map((r) => (
                  <tr key={`${r.staffId}-${r.score}`}>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>{r.staffName}</td>
                    <td>{r.score}</td>
                    <td>{r.rating}</td>
                    <td style={{ color: '#166534', fontWeight: 700 }}>{r.suggestedIncrementPercent}%</td>
                    <td style={{ color: '#334155' }}>Rs {Number(r.estimatedIncrement || 0).toLocaleString('en-PK')}</td>
                    <td style={{ fontSize: 12.5, color: '#475569' }}>{r.recommendation}</td>
                    <td>
                      {!r.payrollStatus || r.payrollStatus === 'rolled_back' || r.payrollStatus === 'rejected' ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-teal"
                          onClick={() => proposeAdjustment.mutate({ appraisalId: r.appraisalId, incrementPercent: r.suggestedIncrementPercent })}
                          disabled={proposeAdjustment.isPending}
                        >
                          Propose
                        </button>
                      ) : (
                        <span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{r.payrollStatus}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!analytics?.recommendations || analytics.recommendations.length === 0) && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state" style={{ padding: 16 }}>
                        <div className="empty-state-text">No recommendation data yet</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAdmin && (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Payroll Adjustment Workflow Board</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="btn btn-sm btn-outline" onClick={downloadPayrollReport}>
                <Download size={12} /> CSV Report
              </button>
              <button type="button" className="btn btn-sm btn-outline" onClick={openPdfReport}>
                <Download size={12} /> PDF Report
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Appraisal</th>
                  <th>Old Basic</th>
                  <th>New Basic</th>
                  <th>Increment</th>
                  <th>Policy</th>
                  <th>Status</th>
                  <th>Approval Stage</th>
                  <th>Actions</th>
                  <th>Timeline</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>{a.staff?.name || '-'} {a.staff?.empCode ? `(${a.staff.empCode})` : ''}</td>
                    <td style={{ color: '#334155' }}>{a.appraisal?.term || '-'} {a.appraisal?.year || ''} • score {a.appraisal?.score ?? '-'}</td>
                    <td>Rs {Number(a.oldBasicSalary || 0).toLocaleString('en-PK')}</td>
                    <td>Rs {Number(a.newBasicSalary || 0).toLocaleString('en-PK')}</td>
                    <td style={{ color: '#166534', fontWeight: 700 }}>+{a.incrementPercent}%</td>
                    <td style={{ fontSize: 12.5, color: '#475569' }}>
                      {a.requiresSuperAdminPair
                        ? 'Dual super_admin'
                        : a.requiresDualApproval
                          ? 'Dual approval'
                          : 'Single approval'}
                    </td>
                    <td><span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{a.status}</span></td>
                    <td style={{ fontSize: 12.5, color: '#475569' }}>
                      {a.requiresDualApproval ? `${a.approvalStage || 0}/2` : a.status === 'approved' || a.status === 'applied' ? '1/1' : '0/1'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {a.status === 'proposed' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                              const comment = askComment('Approve Payroll Adjustment');
                              if (!comment.trim()) { toast.error('Approval comment is required'); return; }
                              approveAdjustment.mutate({ adjustmentId: a.id, comment });
                            }}
                            disabled={approveAdjustment.isPending}
                          >
                            <CheckCircle2 size={12} /> {a.requiresDualApproval ? (a.approvalStage === 0 ? 'First Approve' : 'Final Approve') : 'Approve'}
                          </button>
                        )}
                        {a.status === 'approved' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-teal"
                            onClick={() => {
                              const comment = askComment('Apply Payroll Adjustment');
                              if (!comment.trim()) { toast.error('Apply comment is required'); return; }
                              applyAdjustment.mutate({ adjustmentId: a.id, comment });
                            }}
                            disabled={applyAdjustment.isPending}
                          >
                            Apply
                          </button>
                        )}
                        {a.status === 'applied' && (
                          <button type="button" className="btn btn-sm btn-outline" onClick={() => rollbackAdjustment.mutate(a.id)} disabled={rollbackAdjustment.isPending}>
                            <Undo2 size={12} /> Rollback
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => setSelectedAdjustmentId(a.id)}
                      >
                        View Timeline
                      </button>
                    </td>
                  </tr>
                ))}
                {adjustments.length === 0 && (
                  <tr>
                    <td colSpan={10}>
                      <div className="empty-state" style={{ padding: 16 }}>
                        <div className="empty-state-text">No payroll adjustments yet</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!!selectedAdjustmentId && (
            <div style={{ marginTop: 10, borderTop: '1px dashed #E2E8F0', paddingTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0F172A' }}>Decision Timeline • Adjustment #{selectedAdjustmentId}</div>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => setSelectedAdjustmentId(null)}>Close</button>
              </div>
              {(timeline || []).length === 0 ? (
                <div style={{ fontSize: 12.5, color: '#64748B' }}>No timeline events yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {timeline.map((e, idx) => (
                    <div key={`${e.type}-${idx}`} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 8, background: '#F8FAFC' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', textTransform: 'capitalize' }}>{e.type.replaceAll('_', ' ')}</div>
                      <div style={{ fontSize: 11.5, color: '#64748B' }}>{new Date(e.at).toLocaleString('en-PK')} • {e.actorName || 'System'} {e.actorRole ? `(${e.actorRole})` : ''}</div>
                      {e.comment && <div style={{ marginTop: 4, fontSize: 12.5, color: '#334155' }}>Comment: {e.comment}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <form onSubmit={submitCreate} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Plus size={15} color="#334155" />
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A' }}>Create Appraisal</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
            <select value={form.staffId} onChange={(e) => setForm((s) => ({ ...s, staffId: e.target.value }))} style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px' }}>
              <option value="">Select staff</option>
              {staffRows.map((s) => <option key={s.id} value={s.id}>{s.name} {s.empCode ? `(${s.empCode})` : ''}</option>)}
            </select>
            <input type="number" min="2020" max="2100" value={form.year} onChange={(e) => setForm((s) => ({ ...s, year: e.target.value }))} style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px' }} />
            <select value={form.term} onChange={(e) => setForm((s) => ({ ...s, term: e.target.value }))} style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px' }}>
              <option>Annual</option>
              <option>Mid-Year</option>
              <option>Quarter 1</option>
              <option>Quarter 2</option>
              <option>Quarter 3</option>
              <option>Quarter 4</option>
            </select>
            <input type="number" min="0" max="100" value={form.score} onChange={(e) => setForm((s) => ({ ...s, score: e.target.value }))} style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px' }} />
            <select value={form.rating} onChange={(e) => setForm((s) => ({ ...s, rating: e.target.value }))} style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px' }}>
              <option>Excellent</option>
              <option>Very Good</option>
              <option>Good</option>
              <option>Needs Improvement</option>
            </select>
            <select value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))} style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px' }}>
              <option value="draft">draft</option>
              <option value="submitted">submitted</option>
              <option value="finalized">finalized</option>
            </select>
            <input type="date" value={form.appraisalDate} onChange={(e) => setForm((s) => ({ ...s, appraisalDate: e.target.value }))} style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
            <textarea rows={3} placeholder="Strengths" value={form.strengths} onChange={(e) => setForm((s) => ({ ...s, strengths: e.target.value }))} style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px', resize: 'vertical' }} />
            <textarea rows={3} placeholder="Areas to improve" value={form.improvements} onChange={(e) => setForm((s) => ({ ...s, improvements: e.target.value }))} style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px', resize: 'vertical' }} />
            <textarea rows={3} placeholder="Next goals" value={form.goals} onChange={(e) => setForm((s) => ({ ...s, goals: e.target.value }))} style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="submit" className="btn btn-teal" disabled={createMutation.isPending}>
              <Save size={14} /> {createMutation.isPending ? 'Saving...' : 'Create Appraisal'}
            </button>
          </div>
        </form>
      )}

      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
          <input value={filters.year} onChange={(e) => setFilters((s) => ({ ...s, year: e.target.value }))} placeholder="Year" style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px' }} />
          <input value={filters.term} onChange={(e) => setFilters((s) => ({ ...s, term: e.target.value }))} placeholder="Term (Annual, Mid-Year...)" style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px' }} />
          <select value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))} style={{ border: '1px solid #CBD5E1', borderRadius: 8, padding: '8px 10px' }}>
            <option value="">All statuses</option>
            <option value="draft">draft</option>
            <option value="submitted">submitted</option>
            <option value="finalized">finalized</option>
          </select>
          <button type="button" onClick={() => refetch()} className="btn btn-outline">
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Staff</th>
                  <th>Year</th>
                  <th>Term</th>
                  <th>Score</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Date</th>
                  {isAdmin && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{row.staff?.name || '-'}</div>
                      <div style={{ fontSize: 11.5, color: '#64748B' }}>{row.staff?.empCode || '-'} {row.staff?.designation ? `• ${row.staff.designation}` : ''}</div>
                    </td>
                    <td>{row.year}</td>
                    <td>{row.term}</td>
                    <td style={{ fontWeight: 800, color: '#B45309' }}>{row.score}</td>
                    <td>{row.rating}</td>
                    <td><span style={badge(row.status)}>{row.status}</span></td>
                    <td>{new Date(row.appraisalDate).toLocaleDateString('en-PK')}</td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <select
                            defaultValue={row.status}
                            onChange={(e) => updateMutation.mutate({ id: row.id, payload: { status: e.target.value } })}
                            style={{ border: '1px solid #CBD5E1', borderRadius: 7, padding: '5px 8px', fontSize: 12 }}
                          >
                            <option value="draft">draft</option>
                            <option value="submitted">submitted</option>
                            <option value="finalized">finalized</option>
                          </select>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8}>
                      <div className="empty-state">
                        <div className="empty-state-icon">🏅</div>
                        <div className="empty-state-text">No appraisals found</div>
                        <div className="empty-state-sub">Create the first appraisal record to start performance tracking.</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
