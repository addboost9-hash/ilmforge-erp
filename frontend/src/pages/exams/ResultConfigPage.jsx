/**
 * ResultConfigPage — Result Setup & Result Card Options
 * Navy #1B2F6E theme, two sub-tabs, React Query + api client
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Save, Plus, Trash2, Edit3, Check, X,
  Settings, ToggleLeft, ToggleRight, Award, FileText, User,
} from 'lucide-react';
import api from '../../api/client';

// ─── constants ───────────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  grades: [
    { grade: 'A+', minPercent: 90, comment: 'Outstanding Performance' },
    { grade: 'A',  minPercent: 80, comment: 'Remarkable Performance' },
    { grade: 'B',  minPercent: 70, comment: 'Great Effort. Keep it up!' },
    { grade: 'C',  minPercent: 60, comment: 'Need more Effort!' },
    { grade: 'D',  minPercent: 50, comment: 'Kindly Put More Effort!!' },
    { grade: 'F',  minPercent: 0,  comment: 'Fail' },
  ],
  signatures: [
    { name: 'Principal', designation: 'Principal', signatureUrl: '' },
  ],
  finalRemarks: [
    { minPercent: 90, maxPercent: 100, remark: 'Excellent — Outstanding Student' },
    { minPercent: 80, maxPercent: 89,  remark: 'Very Good — Remarkable Effort' },
    { minPercent: 70, maxPercent: 79,  remark: 'Good — Keep it up!' },
    { minPercent: 60, maxPercent: 69,  remark: 'Satisfactory — Need Improvement' },
    { minPercent: 50, maxPercent: 59,  remark: 'Below Average — Work Harder' },
    { minPercent: 0,  maxPercent: 49,  remark: 'Fail — Serious Improvement Needed' },
  ],
  cardOptions: {
    includeComments:       true,
    includeFinalRemarks:   true,
    includeOverallGrade:   true,
    includeOverallPercent: true,
    includeSectionRanking: true,
  },
  signatureOptions: { principal: true },
};

const NAVY  = '#1B2F6E';
const TEAL  = '#0D9488';

// ─── tiny helpers ─────────────────────────────────────────────────────────────

/** iOS-style toggle switch */
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      aria-pressed={checked}
      style={{
        width: 42, height: 24, borderRadius: 12,
        background: checked ? TEAL : '#CBD5E1',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.22s',
        flexShrink: 0, outline: 'none',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3, left: checked ? 21 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
        transition: 'left 0.22s',
      }} />
    </button>
  );
}

/** Small badge pill */
function Pill({ label, color = '#6366F1' }) {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4,
      background: color + '18', color,
      padding: '2px 8px', borderRadius: 99,
    }}>
      {label}
    </span>
  );
}

// ─── sub-tab: Result Setup ────────────────────────────────────────────────────

function ResultSetupTab({ config, onChange }) {
  const [editingGradeIdx, setEditingGradeIdx] = useState(null);
  const [editingGrade, setEditingGrade]       = useState({});
  const [editingRemarkIdx, setEditingRemarkIdx] = useState(null);
  const [editingRemark, setEditingRemark]       = useState({});

  // ── Grade rows ──────────────────────────────────────────────

  const startEditGrade = (idx) => {
    setEditingGradeIdx(idx);
    setEditingGrade({ ...config.grades[idx] });
  };

  const saveGrade = () => {
    const updated = config.grades.map((g, i) => i === editingGradeIdx ? { ...editingGrade, minPercent: Number(editingGrade.minPercent) } : g);
    onChange({ grades: updated });
    setEditingGradeIdx(null);
  };

  const cancelGrade = () => setEditingGradeIdx(null);

  const addGrade = () => {
    const newGrade = { grade: 'NEW', minPercent: 0, comment: '' };
    const updated = [...config.grades, newGrade];
    onChange({ grades: updated });
    setEditingGradeIdx(updated.length - 1);
    setEditingGrade(newGrade);
  };

  const removeGrade = (idx) => {
    onChange({ grades: config.grades.filter((_, i) => i !== idx) });
    if (editingGradeIdx === idx) setEditingGradeIdx(null);
  };

  // ── Signature rows ──────────────────────────────────────────

  const addSignature = () => {
    onChange({ signatures: [...config.signatures, { name: '', designation: '', signatureUrl: '' }] });
  };

  const updateSignature = (idx, field, val) => {
    const updated = config.signatures.map((s, i) => i === idx ? { ...s, [field]: val } : s);
    onChange({ signatures: updated });
  };

  const removeSignature = (idx) => {
    onChange({ signatures: config.signatures.filter((_, i) => i !== idx) });
  };

  // ── Final Remarks rows ──────────────────────────────────────

  const startEditRemark = (idx) => {
    setEditingRemarkIdx(idx);
    setEditingRemark({ ...config.finalRemarks[idx] });
  };

  const saveRemark = () => {
    const updated = config.finalRemarks.map((r, i) =>
      i === editingRemarkIdx
        ? { ...editingRemark, minPercent: Number(editingRemark.minPercent), maxPercent: Number(editingRemark.maxPercent) }
        : r
    );
    onChange({ finalRemarks: updated });
    setEditingRemarkIdx(null);
  };

  const addRemark = () => {
    const newRemark = { minPercent: 0, maxPercent: 0, remark: '' };
    const updated = [...config.finalRemarks, newRemark];
    onChange({ finalRemarks: updated });
    setEditingRemarkIdx(updated.length - 1);
    setEditingRemark(newRemark);
  };

  const removeRemark = (idx) => {
    onChange({ finalRemarks: config.finalRemarks.filter((_, i) => i !== idx) });
    if (editingRemarkIdx === idx) setEditingRemarkIdx(null);
  };

  // ── Grade color map ─────────────────────────────────────────

  const gradeColor = (g) => {
    const map = { 'A+': '#15803D', A: '#0D9488', B: '#2563EB', C: '#D97706', D: '#EA580C', F: '#DC2626' };
    return map[g] || '#6366F1';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Grade Configuration ───────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={16} color={TEAL} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>Grade Configuration</h3>
          </div>
          <button
            onClick={addGrade}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 7, border: `1.5px solid ${TEAL}`,
              background: 'transparent', color: TEAL, fontSize: 12.5,
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Plus size={13} /> Add Grade
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F1F5F9' }}>
                {['Sr.no', 'Grade', 'Min Percentage', 'Comment', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.grades.map((g, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                  <td style={{ padding: '8px 12px', color: '#94A3B8', fontWeight: 600 }}>{idx + 1}</td>

                  {editingGradeIdx === idx ? (
                    <>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          value={editingGrade.grade}
                          onChange={e => setEditingGrade(p => ({ ...p, grade: e.target.value }))}
                          className="form-input"
                          style={{ width: 60, padding: '4px 8px', fontSize: 13 }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12, color: '#64748B' }}>≥</span>
                          <input
                            type="number" min="0" max="100"
                            value={editingGrade.minPercent}
                            onChange={e => setEditingGrade(p => ({ ...p, minPercent: e.target.value }))}
                            className="form-input"
                            style={{ width: 70, padding: '4px 8px', fontSize: 13 }}
                          />
                          <span style={{ fontSize: 12, color: '#64748B' }}>%</span>
                        </div>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          value={editingGrade.comment}
                          onChange={e => setEditingGrade(p => ({ ...p, comment: e.target.value }))}
                          className="form-input"
                          style={{ width: '100%', minWidth: 200, padding: '4px 8px', fontSize: 13 }}
                          placeholder="Comment on result card"
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={saveGrade} style={{ ...iconBtn, color: TEAL, borderColor: TEAL }}><Check size={13} /></button>
                          <button onClick={cancelGrade} style={{ ...iconBtn, color: '#EF4444', borderColor: '#EF4444' }}><X size={13} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontWeight: 700, color: gradeColor(g.grade), fontSize: 14 }}>{g.grade}</span>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#374151' }}>
                        {g.minPercent === 0 && g.grade === 'F' ? '< 50' : `≥ ${g.minPercent}`}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#64748B' }}>{g.comment}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => startEditGrade(idx)} style={{ ...iconBtn, color: '#0073b7', borderColor: '#0073b7' }}><Edit3 size={12} /></button>
                          <button onClick={() => removeGrade(idx)} style={{ ...iconBtn, color: '#EF4444', borderColor: '#EF4444' }}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {config.grades.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                    No grades configured. Click "Add Grade" to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Signatures ───────────────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} color={TEAL} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>Signatories</h3>
          </div>
          <button
            onClick={addSignature}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 7, border: `1.5px solid ${TEAL}`,
              background: 'transparent', color: TEAL, fontSize: 12.5,
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Plus size={13} /> Add Signatory
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F1F5F9' }}>
                {['Sr.no', 'Name', 'Designation', 'Signature Image URL', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.signatures.map((sig, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                  <td style={{ padding: '8px 12px', color: '#94A3B8', fontWeight: 600 }}>{idx + 1}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <input
                      value={sig.name}
                      onChange={e => updateSignature(idx, 'name', e.target.value)}
                      className="form-input"
                      style={{ width: '100%', minWidth: 110, padding: '4px 8px', fontSize: 13 }}
                      placeholder="e.g. Principal"
                    />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input
                      value={sig.designation}
                      onChange={e => updateSignature(idx, 'designation', e.target.value)}
                      className="form-input"
                      style={{ width: '100%', minWidth: 130, padding: '4px 8px', fontSize: 13 }}
                      placeholder="e.g. Principal"
                    />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input
                      value={sig.signatureUrl}
                      onChange={e => updateSignature(idx, 'signatureUrl', e.target.value)}
                      className="form-input"
                      style={{ width: '100%', minWidth: 200, padding: '4px 8px', fontSize: 13 }}
                      placeholder="https://… (leave blank if none)"
                    />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <button onClick={() => removeSignature(idx)} style={{ ...iconBtn, color: '#EF4444', borderColor: '#EF4444' }}>
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              {config.signatures.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                    No signatories yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Final Remarks ─────────────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color={TEAL} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>Final Remarks</h3>
            <Pill label="Printed on result card per % range" color="#6366F1" />
          </div>
          <button
            onClick={addRemark}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 7, border: `1.5px solid ${TEAL}`,
              background: 'transparent', color: TEAL, fontSize: 12.5,
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Plus size={13} /> Add Remark
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F1F5F9' }}>
                {['Sr.no', 'Min %', 'Max %', 'Remark', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.finalRemarks.map((r, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                  <td style={{ padding: '8px 12px', color: '#94A3B8', fontWeight: 600 }}>{idx + 1}</td>
                  {editingRemarkIdx === idx ? (
                    <>
                      <td style={{ padding: '6px 8px' }}>
                        <input type="number" min="0" max="100" value={editingRemark.minPercent}
                          onChange={e => setEditingRemark(p => ({ ...p, minPercent: e.target.value }))}
                          className="form-input" style={{ width: 65, padding: '4px 8px', fontSize: 13 }} />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input type="number" min="0" max="100" value={editingRemark.maxPercent}
                          onChange={e => setEditingRemark(p => ({ ...p, maxPercent: e.target.value }))}
                          className="form-input" style={{ width: 65, padding: '4px 8px', fontSize: 13 }} />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input value={editingRemark.remark}
                          onChange={e => setEditingRemark(p => ({ ...p, remark: e.target.value }))}
                          className="form-input" style={{ width: '100%', minWidth: 260, padding: '4px 8px', fontSize: 13 }}
                          placeholder="Remark text" />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={saveRemark} style={{ ...iconBtn, color: TEAL, borderColor: TEAL }}><Check size={13} /></button>
                          <button onClick={() => setEditingRemarkIdx(null)} style={{ ...iconBtn, color: '#EF4444', borderColor: '#EF4444' }}><X size={13} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#374151' }}>{r.minPercent}%</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#374151' }}>{r.maxPercent}%</td>
                      <td style={{ padding: '8px 12px', color: '#64748B' }}>{r.remark}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => startEditRemark(idx)} style={{ ...iconBtn, color: '#0073b7', borderColor: '#0073b7' }}><Edit3 size={12} /></button>
                          <button onClick={() => removeRemark(idx)} style={{ ...iconBtn, color: '#EF4444', borderColor: '#EF4444' }}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {config.finalRemarks.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                    No remarks configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── sub-tab: Result Card Options ─────────────────────────────────────────────

function ResultCardOptionsTab({ config, onChange }) {
  const { cardOptions, signatureOptions, signatures } = config;

  const toggleCard = (key) => {
    onChange({ cardOptions: { ...cardOptions, [key]: !cardOptions[key] } });
  };

  const toggleSig = (key) => {
    onChange({ signatureOptions: { ...signatureOptions, [key]: !signatureOptions[key] } });
  };

  const GENERAL_OPTIONS = [
    { key: 'includeComments',       label: 'Include Comments',         desc: 'Show grade comment on result card' },
    { key: 'includeFinalRemarks',   label: 'Include Final Remarks',    desc: 'Print final remark per percentage range' },
    { key: 'includeOverallGrade',   label: 'Include Overall Grade',    desc: 'Show overall letter grade' },
    { key: 'includeOverallPercent', label: 'Include Overall Percentage', desc: 'Show total percentage' },
    { key: 'includeSectionRanking', label: 'Include Section Ranking',  desc: 'Show student rank in class/section' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* General toggles */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <Settings size={16} color={TEAL} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>GENERAL</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {GENERAL_OPTIONS.map((opt, i) => (
            <div
              key={opt.key}
              onClick={() => toggleCard(opt.key)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: i < GENERAL_OPTIONS.length - 1 ? '1px solid #F1F5F9' : 'none',
                cursor: 'pointer',
                borderRadius: i === 0 ? '8px 8px 0 0' : i === GENERAL_OPTIONS.length - 1 ? '0 0 8px 8px' : 0,
                background: cardOptions[opt.key] ? '#F0FDF9' : '#FAFBFF',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1E293B' }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{opt.desc}</div>
              </div>
              <Toggle
                checked={!!cardOptions[opt.key]}
                onChange={() => toggleCard(opt.key)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Signatures toggles */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <User size={16} color={TEAL} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: NAVY }}>SIGNATURES</h3>
          <Pill label="Shown on result card" color={TEAL} />
        </div>

        {signatures.length === 0 && (
          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
            No signatories configured. Add them in the "Result Setup" tab.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {signatures.map((sig, i) => {
            const sigKey = (sig.name || `sig_${i}`).toLowerCase().replace(/\s+/g, '_');
            const checked = signatureOptions[sigKey] !== false; // default on

            return (
              <div
                key={sigKey}
                onClick={() => toggleSig(sigKey)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderBottom: i < signatures.length - 1 ? '1px solid #F1F5F9' : 'none',
                  cursor: 'pointer',
                  background: checked ? '#F0FDF9' : '#FAFBFF',
                  transition: 'background 0.15s',
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1E293B' }}>
                    Signature — {sig.name || 'Unnamed'}
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                    {sig.designation || '—'}
                    {sig.signatureUrl ? ' · Image set' : ' · No image uploaded'}
                  </div>
                </div>
                <Toggle checked={checked} onChange={() => toggleSig(sigKey)} />
              </div>
            );
          })}
        </div>

        {signatures.length > 0 && (
          <p style={{ fontSize: 11.5, color: '#94A3B8', margin: '12px 0 0' }}>
            Tip: Disabled signatures are hidden from printed result cards.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Icon button style helper ─────────────────────────────────────────────────

const iconBtn = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: 6, border: '1.5px solid',
  background: 'transparent', cursor: 'pointer',
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResultConfigPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('setup'); // 'setup' | 'options'

  // ── Fetch config ─────────────────────────────────────────
  const { data: serverConfig, isLoading } = useQuery({
    queryKey: ['result-config'],
    queryFn: async () => {
      const { data } = await api.get('/exams/result-config');
      return data?.data ?? DEFAULT_CONFIG;
    },
    placeholderData: DEFAULT_CONFIG,
  });

  // Local working copy (so we don't mutate the cache directly)
  const [localConfig, setLocalConfig] = useState(null);
  const config = localConfig ?? serverConfig ?? DEFAULT_CONFIG;

  // Merge partial updates into localConfig
  const handleChange = useCallback((patch) => {
    setLocalConfig(prev => {
      const base = prev ?? serverConfig ?? DEFAULT_CONFIG;
      return { ...base, ...patch };
    });
  }, [serverConfig]);

  // Sync localConfig when serverConfig first arrives (or resets after save)
  const syncFromServer = useCallback(() => {
    setLocalConfig(null);
  }, []);

  // ── Save mutation ─────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload) => api.put('/exams/result-config', payload),
    onSuccess: (res) => {
      qc.setQueryData(['result-config'], res.data?.data);
      syncFromServer();
      toast.success('Result config saved!');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save result config.');
    },
  });

  const handleSave = () => saveMutation.mutate(config);

  const isSaving = saveMutation.isPending;

  // ── Tabs ──────────────────────────────────────────────────
  const TABS = [
    { id: 'setup',   label: 'Result Setup' },
    { id: 'options', label: 'Result Card Options' },
  ];

  return (
    <div className="page-content fade-up">

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Result Configuration</h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
            Configure grade thresholds, signatories, final remarks and result card printing options
          </p>
        </div>
        <button
          className="btn btn-teal"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 22px' }}
        >
          {isSaving ? <><Save size={14} /> Saving…</> : <><Save size={14} /> Save Preferences</>}
        </button>
      </div>

      {/* Sub-tabs */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 20,
        borderBottom: '2px solid #E2E8F0',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 22px',
              border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13.5, fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? TEAL : '#64748B',
              borderBottom: activeTab === tab.id ? `2.5px solid ${TEAL}` : '2.5px solid transparent',
              marginBottom: -2, transition: 'color 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[180, 140, 200].map((h, i) => (
            <div key={i} className="card" style={{
              height: h,
              background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s infinite',
            }} />
          ))}
          <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        </div>
      ) : activeTab === 'setup' ? (
        <ResultSetupTab config={config} onChange={handleChange} />
      ) : (
        <ResultCardOptionsTab config={config} onChange={handleChange} />
      )}

      {/* Bottom save button */}
      {!isLoading && (
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-teal"
            onClick={handleSave}
            disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 28px' }}
          >
            {isSaving ? <><Save size={14} /> Saving…</> : <><Save size={14} /> Save Preferences</>}
          </button>
        </div>
      )}
    </div>
  );
}
