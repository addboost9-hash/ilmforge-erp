/**
 * IlmForge — Result Publication Control Page
 * Publish / unpublish exam results; bulk actions; SMS blast after publish.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Globe, Lock, CheckSquare, Square, MessageSquare,
  Info, Eye, EyeOff, Send,
} from 'lucide-react';
import api from '../../api/client';

/* ─── Helpers ────────────────────────────────────────── */
const errMsg = (err) => err?.response?.data?.message || err?.message || 'Something went wrong';

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

const typeBadge = {
  test:    { bg: '#EFF6FF', c: '#1D4ED8' },
  midterm: { bg: '#FEF3C7', c: '#B45309' },
  final:   { bg: '#FEF2F2', c: '#B91C1C' },
};

/* ─── Confirm Modal ──────────────────────────────────── */
function ConfirmModal({ exam, onConfirm, onCancel, loading, publishStep }) {
  const [sendSms, setSendSms] = useState(true); // default ON
  const [portalLink, setPortalLink] = useState(window.location.origin + '/portal');

  /* Step indicator labels */
  const steps = [
    { key: 'idle',        label: null },
    { key: 'publishing',  label: 'Step 1 of 2 — Publishing results…' },
    { key: 'sms',         label: 'Step 2 of 2 — Sending SMS notifications…' },
    { key: 'done',        label: null },
  ];
  const currentStep = steps.find(s => s.key === (publishStep || 'idle'));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: 28, maxWidth: 460, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={18} color="#15803D" />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#111827', fontSize: 15 }}>Publish Results</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{exam?.title}</div>
          </div>
        </div>

        <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6, marginBottom: 14 }}>
          Results will be <strong>visible to all parents and students</strong> on their portals.
          This action can be undone by unpublishing.
        </p>

        {/* SMS toggle */}
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer',
          marginBottom: 14, padding: '12px 14px',
          background: sendSms ? '#F0FDF4' : '#F8FAFC',
          borderRadius: 8,
          border: `1px solid ${sendSms ? '#BBF7D0' : '#E2E8F0'}`,
          transition: 'all 0.15s',
        }}>
          <button
            onClick={() => setSendSms(s => !s)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: sendSms ? '#0F766E' : '#D1D5DB', display: 'inline-flex', marginTop: 1 }}
          >
            {sendSms ? <CheckSquare size={18} /> : <Square size={18} />}
          </button>
          <div>
            <div style={{ fontSize: 13, color: sendSms ? '#0F766E' : '#6B7280', fontWeight: 700, marginBottom: 4 }}>
              Auto-notify parents via SMS
            </div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              Message: "Dear Parent, [Student] result for <em>{exam?.title}</em> has been published.
              Login to view: [portal link]"
            </div>
          </div>
        </label>

        {/* Portal link input (shown when SMS is on) */}
        {sendSms && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
              Portal link in message
            </label>
            <input
              type="url"
              className="form-input"
              value={portalLink}
              onChange={e => setPortalLink(e.target.value)}
              placeholder="https://your-school-portal.com/portal"
              style={{ fontSize: 12 }}
            />
          </div>
        )}

        {/* Progress indicator */}
        {currentStep?.label && (
          <div style={{
            marginBottom: 14, padding: '8px 12px',
            background: '#EFF6FF', border: '1px solid #BFDBFE',
            borderRadius: 6, fontSize: 12.5, color: '#1D4ED8', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
            {currentStep.label}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-teal"
            onClick={() => onConfirm(sendSms, portalLink)}
            disabled={loading}
            style={{ flex: 1 }}
          >
            <Globe size={14} />
            {loading
              ? (publishStep === 'sms' ? 'Sending SMS…' : 'Publishing…')
              : (sendSms ? 'Publish & Notify Parents' : 'Publish Results')}
          </button>
          <button className="btn btn-outline" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Unpublish Confirm Modal ────────────────────────── */
function UnpublishModal({ exam, onConfirm, onCancel, loading }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: 28, maxWidth: 400, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={18} color="#B91C1C" />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#111827', fontSize: 15 }}>Unpublish Results</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{exam?.title}</div>
          </div>
        </div>
        <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6, marginBottom: 20 }}>
          Results will be <strong>hidden from all parents and students</strong>.
          You can republish them at any time. Continue?
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-sm"
            style={{ flex: 1, background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}
            onClick={onConfirm}
            disabled={loading}
          >
            <Lock size={14} /> {loading ? 'Unpublishing…' : 'Unpublish'}
          </button>
          <button className="btn btn-outline" onClick={onCancel} disabled={loading}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════ */
export default function ResultPublicationPage() {
  const qc = useQueryClient();

  const [selected,       setSelected]       = useState(new Set());
  const [publishModal,   setPublishModal]   = useState(null);  // exam object
  const [unpublishModal, setUnpublishModal] = useState(null);  // exam object
  const [actionLoading,  setActionLoading]  = useState({});
  const [bulkLoading,    setBulkLoading]    = useState(false);
  const [publishStep,    setPublishStep]    = useState('idle'); // 'idle'|'publishing'|'sms'|'done'

  /* Load all exams */
  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.get('/exams').then(r => r.data.data || []),
  });

  /* ─── Selection helpers ──────────────────────────── */
  const toggleSelect = (id) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(prev => prev.size === exams.length ? new Set() : new Set(exams.map(e => e.id)));

  const allSelected = exams.length > 0 && selected.size === exams.length;

  /* ─── Publish single (two-step: publish → SMS notify) ─── */
  const doPublish = async (exam, sendSms = true, portalLink = '') => {
    setActionLoading(p => ({ ...p, [exam.id]: 'publish' }));
    setPublishStep('publishing');
    try {
      /* Step 1 — Mark exam as published */
      await api.post(`/exams/${exam.id}/publish`);
      qc.invalidateQueries({ queryKey: ['exams'] });

      if (sendSms) {
        /* Step 2 — Collect parent phones from results, then POST /notifications/sms */
        setPublishStep('sms');
        try {
          /* Fetch result rows to build parent phone list */
          const resultsRes = await api.get(`/exams/${exam.id}/results`);
          const resultRows = resultsRes.data?.data || [];

          /* Collect unique student IDs */
          const uniqueStudentIds = [...new Set(resultRows.map(r => r.studentId).filter(Boolean))];

          /* Build per-student SMS message using sms-blast endpoint which already
             loads parent phones server-side; we just fire it and capture sent count */
          const blastRes = await api.post(`/exams/${exam.id}/results/sms-blast`, {
            portalLink: portalLink || window.location.origin + '/portal',
          });
          const sent = blastRes.data?.sent?.length ?? blastRes.data?.data?.sent ?? uniqueStudentIds.length;
          toast.success(
            `Results published! SMS sent to ${sent} parent${sent !== 1 ? 's' : ''}.`,
            { duration: 5000 }
          );
        } catch (smsErr) {
          /* Publish succeeded but SMS failed — show partial success */
          toast.success(`"${exam.title}" published successfully.`, { duration: 4000 });
          toast.error(
            `SMS notification failed: ${errMsg(smsErr)}`,
            { duration: 6000 }
          );
        }
      } else {
        toast.success(`"${exam.title}" results published successfully.`);
      }
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setPublishStep('idle');
      setActionLoading(p => ({ ...p, [exam.id]: null }));
      setPublishModal(null);
    }
  };

  /* ─── Unpublish single ───────────────────────────── */
  const doUnpublish = async (exam) => {
    setActionLoading(p => ({ ...p, [exam.id]: 'unpublish' }));
    try {
      await api.post(`/exams/${exam.id}/unpublish`);
      toast.success(`"${exam.title}" results unpublished.`);
      qc.invalidateQueries({ queryKey: ['exams'] });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setActionLoading(p => ({ ...p, [exam.id]: null }));
      setUnpublishModal(null);
    }
  };

  /* ─── Bulk publish ───────────────────────────────── */
  const doBulkPublish = async () => {
    if (selected.size === 0) { toast.error('No exams selected.'); return; }
    const unpublished = exams.filter(e => selected.has(e.id) && !e.isPublished);
    if (unpublished.length === 0) { toast('All selected exams are already published.'); return; }
    if (!window.confirm(`Publish results for ${unpublished.length} exam(s)? They will become visible to parents and students.`)) return;

    setBulkLoading(true);
    let ok = 0;
    let fail = 0;
    for (const exam of unpublished) {
      try {
        await api.post(`/exams/${exam.id}/publish`);
        ok++;
      } catch {
        fail++;
      }
    }
    setBulkLoading(false);
    if (ok > 0) toast.success(`${ok} exam(s) published.`);
    if (fail > 0) toast.error(`${fail} exam(s) failed to publish.`);
    qc.invalidateQueries({ queryKey: ['exams'] });
    setSelected(new Set());
  };

  /* ─── Send SMS blast for a single exam ──────────── */
  const handleSmsSingle = async (exam) => {
    if (!window.confirm(`Send SMS to all parents for "${exam.title}"?`)) return;
    setActionLoading(p => ({ ...p, [`sms-${exam.id}`]: true }));
    try {
      const res = await api.post(`/exams/${exam.id}/results/sms-blast`);
      const sent = res.data?.data?.sent ?? '?';
      toast.success(`SMS sent to ${sent} parent(s) for "${exam.title}".`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setActionLoading(p => ({ ...p, [`sms-${exam.id}`]: false }));
    }
  };

  /* ─── Render ─────────────────────────────────────── */
  const publishedCount = exams.filter(e => e.isPublished).length;
  const draftCount     = exams.length - publishedCount;

  return (
    <div className="page-content fade-in">

      {/* Modals */}
      {publishModal && (
        <ConfirmModal
          exam={publishModal}
          onConfirm={(sms, portalLink) => doPublish(publishModal, sms, portalLink)}
          onCancel={() => { if (!actionLoading[publishModal.id]) { setPublishModal(null); setPublishStep('idle'); } }}
          loading={!!actionLoading[publishModal.id]}
          publishStep={publishStep}
        />
      )}
      {unpublishModal && (
        <UnpublishModal
          exam={unpublishModal}
          onConfirm={() => doUnpublish(unpublishModal)}
          onCancel={() => setUnpublishModal(null)}
          loading={!!actionLoading[unpublishModal.id]}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Globe size={22} color="#0F766E" />
          Result Publication Control
        </h1>
        <p className="page-subtitle">Publish or unpublish exam results to control visibility on parent and student portals</p>
      </div>

      {/* Info banner */}
      <div style={{
        marginBottom: 18, padding: '11px 16px',
        background: '#EFF6FF', border: '1px solid #BFDBFE',
        borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Info size={16} color="#1D4ED8" />
        <span style={{ fontSize: 13, color: '#1E3A8A' }}>
          Only <strong>published</strong> results appear on the parent and student portals.
          Draft results are only visible to school staff.
        </span>
      </div>

      {/* Summary stats */}
      {exams.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: 1, minWidth: 140, background: '#F0FDF4', border: 'none', padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#15803D' }}>{publishedCount}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>Published</div>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 140, background: '#F8FAFC', border: 'none', padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#94A3B8' }}>{draftCount}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>Draft</div>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 140, background: '#EFF6FF', border: 'none', padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1D4ED8' }}>{exams.length}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>Total Exams</div>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          marginBottom: 14, padding: '10px 16px',
          background: '#F0FDF9', border: '1px solid #CCFBF1',
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, color: '#0F766E', fontWeight: 600 }}>
            {selected.size} exam{selected.size !== 1 ? 's' : ''} selected
          </span>
          <button
            className="btn btn-teal btn-sm"
            onClick={doBulkPublish}
            disabled={bulkLoading}
          >
            <Globe size={13} /> {bulkLoading ? 'Publishing…' : 'Bulk Publish Selected'}
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setSelected(new Set())}
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Exams table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="loading-center" style={{ padding: 60 }}><div className="spinner" /></div>
        ) : exams.length === 0 ? (
          <div className="empty-state" style={{ padding: 60 }}>
            <div className="empty-state-icon"><Globe size={52} style={{ opacity: 0.15 }} /></div>
            <div className="empty-state-text">No exams found</div>
            <div className="empty-state-sub">Create an exam first from the Exams page</div>
          </div>
        ) : (
          <>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F4C45' }}>
                All Exams — Publication Status
              </span>
              {selected.size > 0 && (
                <span style={{ fontSize: 12.5, color: '#0F766E', fontWeight: 600 }}>
                  {selected.size} selected
                </span>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <button
                        onClick={toggleAll}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: allSelected ? '#0F766E' : '#D1D5DB', display: 'inline-flex' }}
                      >
                        {allSelected ? <CheckSquare size={17} /> : <Square size={17} />}
                      </button>
                    </th>
                    <th>Exam Title</th>
                    <th>Type</th>
                    <th>Class</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Published Date</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map(exam => {
                    const tb         = typeBadge[exam.type] || { bg: '#F1F5F9', c: '#64748B' };
                    const isPublished = !!exam.isPublished;
                    const isSelected  = selected.has(exam.id);
                    const actLoad     = actionLoading[exam.id];
                    const smsLoad     = actionLoading[`sms-${exam.id}`];
                    return (
                      <tr key={exam.id} style={{ background: isSelected ? '#F0FDF9' : undefined }}>
                        <td>
                          <button
                            onClick={() => toggleSelect(exam.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: isSelected ? '#0F766E' : '#D1D5DB', display: 'inline-flex' }}
                          >
                            {isSelected ? <CheckSquare size={17} /> : <Square size={17} />}
                          </button>
                        </td>
                        <td style={{ fontWeight: 700, color: '#111827' }}>
                          {exam.title}
                          {exam.classId && (
                            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>
                              Class {exam.classId}
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, background: tb.bg, color: tb.c }}>
                            {exam.type || 'test'}
                          </span>
                        </td>
                        <td style={{ color: '#374151', fontSize: 13 }}>
                          {exam.classId ? `Class ${exam.classId}` : <span style={{ color: '#94a3b8' }}>All Classes</span>}
                        </td>
                        <td style={{ fontSize: 12.5, color: '#6B7280', whiteSpace: 'nowrap' }}>
                          {fmtDate(exam.createdAt || exam.dateStart)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isPublished ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '4px 10px', borderRadius: 99,
                              background: '#DCFCE7', color: '#15803D',
                              fontSize: 12, fontWeight: 700,
                            }}>
                              <Globe size={11} /> Published
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '4px 10px', borderRadius: 99,
                              background: '#F1F5F9', color: '#64748B',
                              fontSize: 12, fontWeight: 700,
                            }}>
                              <Lock size={11} /> Draft
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: 12.5, color: '#6B7280', whiteSpace: 'nowrap' }}>
                          {isPublished && exam.publishedAt ? fmtDate(exam.publishedAt) : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                            {!isPublished ? (
                              <button
                                className="btn btn-teal btn-sm"
                                onClick={() => setPublishModal(exam)}
                                disabled={!!actLoad}
                                title="Publish results"
                              >
                                <Eye size={12} />
                                {actLoad === 'publish' ? 'Publishing…' : 'Publish'}
                              </button>
                            ) : (
                              <>
                                <button
                                  className="btn btn-sm"
                                  style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}
                                  onClick={() => setUnpublishModal(exam)}
                                  disabled={!!actLoad}
                                  title="Unpublish results"
                                >
                                  <EyeOff size={12} />
                                  {actLoad === 'unpublish' ? 'Working…' : 'Unpublish'}
                                </button>
                                <button
                                  className="btn btn-sm"
                                  style={{ background: '#FFF7ED', color: '#F97316', border: '1px solid #FED7AA' }}
                                  onClick={() => handleSmsSingle(exam)}
                                  disabled={!!smsLoad}
                                  title="Send SMS to all parents"
                                >
                                  <MessageSquare size={12} />
                                  {smsLoad ? '…' : 'SMS'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer legend */}
            <div style={{
              padding: '10px 16px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB',
              display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: '#6B7280',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Globe size={12} color="#15803D" />
                <strong style={{ color: '#15803D' }}>Published</strong> — visible to parents &amp; students
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Lock size={12} color="#94A3B8" />
                <strong style={{ color: '#94A3B8' }}>Draft</strong> — only visible to staff
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Send size={12} color="#F97316" />
                SMS button notifies all parents for that exam
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
