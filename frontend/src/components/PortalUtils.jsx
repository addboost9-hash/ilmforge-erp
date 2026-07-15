/**
 * IlmForge — Shared Portal Utilities
 * Skeleton loaders, error states, export helpers, print helpers
 * Used by all 5 portals for consistent professional UI
 */
import { useState } from 'react';
import { AlertTriangle, RefreshCw, Download, Printer, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

/* ─── Color tokens ──────────────────────────────────────── */
export const PORTAL_COLORS = {
  navy:   '#1B2F6E',
  cyan:   '#00c0ef',
  teal:   '#0D9488',
  green:  '#00a65a',
  red:    '#dd4b39',
  yellow: '#f39c12',
  purple: '#605ca8',
};

/* ─── Skeleton loader ───────────────────────────────────── */
export function SkeletonRow({ cols = 4, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} style={{ borderBottom: '1px solid #f1f5f9' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} style={{ padding: '12px 14px' }}>
              <div className="skeleton" style={{ height: 14, borderRadius: 4, width: c === 0 ? '60%' : c === cols - 1 ? '40%' : '80%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonCard({ height = 80 }) {
  return <div className="skeleton" style={{ height, borderRadius: 8, marginBottom: 12 }} />;
}

export function SkeletonGrid({ count = 4, height = 90 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height, borderRadius: 8 }} />
      ))}
    </div>
  );
}

/* ─── Error state ───────────────────────────────────────── */
export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <AlertTriangle size={24} color="#dc2626" />
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#1e3a5f', marginBottom: 6 }}>Failed to load</div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>{message}</div>
      {onRetry && (
        <button onClick={onRetry} style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#374151' }}>
          <RefreshCw size={13} /> Try Again
        </button>
      )}
    </div>
  );
}

/* ─── Empty state ───────────────────────────────────────── */
export function EmptyState({ icon = '📋', title, subtitle, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>{subtitle}</div>}
      {action}
    </div>
  );
}

/* ─── Status badge ──────────────────────────────────────── */
export function StatusBadge({ status }) {
  const map = {
    paid:      { bg: '#dcfce7', color: '#15803d', icon: CheckCircle, label: 'Paid' },
    unpaid:    { bg: '#fee2e2', color: '#b91c1c', icon: XCircle,     label: 'Unpaid' },
    partial:   { bg: '#fef9c3', color: '#854d0e', icon: Clock,        label: 'Partial' },
    overdue:   { bg: '#fce7f3', color: '#9d174d', icon: AlertTriangle,label: 'Overdue' },
    present:   { bg: '#dcfce7', color: '#15803d', icon: CheckCircle, label: 'Present' },
    absent:    { bg: '#fee2e2', color: '#b91c1c', icon: XCircle,     label: 'Absent' },
    late:      { bg: '#fef9c3', color: '#854d0e', icon: Clock,        label: 'Late' },
    pending:   { bg: '#fef9c3', color: '#854d0e', icon: Clock,        label: 'Pending' },
    approved:  { bg: '#dcfce7', color: '#15803d', icon: CheckCircle, label: 'Approved' },
    rejected:  { bg: '#fee2e2', color: '#b91c1c', icon: XCircle,     label: 'Rejected' },
    active:    { bg: '#dbeafe', color: '#1d4ed8', icon: CheckCircle, label: 'Active' },
    inactive:  { bg: '#f1f5f9', color: '#475569', icon: XCircle,     label: 'Inactive' },
  };
  const m = map[String(status).toLowerCase()] || { bg: '#f1f5f9', color: '#475569', label: status };
  const Icon = m.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, background: m.bg, color: m.color, fontSize: 11.5, fontWeight: 700 }}>
      {Icon && <Icon size={10} />} {m.label}
    </span>
  );
}

/* ─── Export to CSV ─────────────────────────────────────── */
export function exportToCSV(filename, headers, rows) {
  const escape = (v) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };
  const csv = [
    headers.map(escape).join(','),
    ...rows.map(r => r.map(escape).join(',')),
  ].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

/* ─── Export button ─────────────────────────────────────── */
export function ExportBtn({ onClick, label = 'Export CSV', loading }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#374151' }}>
      <Download size={13} color="#0073b7" /> {loading ? 'Exporting…' : label}
    </button>
  );
}

/* ─── Print button ──────────────────────────────────────── */
export function PrintBtn({ onClick, label = 'Print' }) {
  return (
    <button onClick={onClick || (() => window.print())}
      style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#374151' }}>
      <Printer size={13} color="#374151" /> {label}
    </button>
  );
}

/* ─── Stat card (portal version) ────────────────────────── */
export function PortalStatCard({ icon, label, value, color = '#0073b7', bg = '#eff6ff', trend, sub }) {
  const Icon = icon;
  return (
    <div style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 10, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -6, top: -6, opacity: 0.08 }}>
        {Icon && <Icon size={56} color={color} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {Icon && (
          <div style={{ width: 38, height: 38, borderRadius: 9, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={18} color={color} />
          </div>
        )}
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: 500 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      {trend !== undefined && (
        <div style={{ fontSize: 11, fontWeight: 600, marginTop: 6, color: trend >= 0 ? '#15803d' : '#dc2626' }}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  );
}

/* ─── Progress bar ──────────────────────────────────────── */
export function ProgressBar({ value, max = 100, color = '#0073b7', height = 6, showLabel = true }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const barColor = pct >= 90 ? '#15803d' : pct >= 75 ? '#0073b7' : pct >= 50 ? '#f59e0b' : '#dc2626';
  return (
    <div>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 3 }}>
          <span>{value}/{max}</span>
          <span style={{ fontWeight: 700, color: barColor }}>{pct}%</span>
        </div>
      )}
      <div style={{ height, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color || barColor, borderRadius: 99, transition: 'width .4s ease' }} />
      </div>
    </div>
  );
}

/* ─── Fee voucher print — professional 3-copy with all heads ─ */
export function printFeeVoucher({ student, invoice, school }) {
  const schoolName = school?.name || localStorage.getItem('registeredSchoolName') || 'IlmForge School';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthLabel = invoice?.month ? `${months[invoice.month-1]} ${invoice?.year || ''}` : '—';
  const dueDate = invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-PK') : '—';
  const total = Number(invoice?.dueAmount || invoice?.totalAmount || 0);
  const isPaid = invoice?.status === 'paid';

  // Build fee heads rows
  const heads = invoice?.heads || invoice?.feeHeads || [];
  const headsRows = heads.length > 0
    ? heads.map(h => `<tr><td>${h.name || h.feeHeadName || '—'}</td><td style="text-align:right;font-weight:700">Rs. ${Number(h.amount||0).toLocaleString('en-PK')}</td></tr>`).join('')
    : `<tr><td>Monthly Fee</td><td style="text-align:right;font-weight:700">Rs. ${total.toLocaleString('en-PK')}</td></tr>`;

  const copyHtml = (copyLabel) => `
    <div class="copy">
      <div class="header">
        <div class="school-name">${schoolName}</div>
        <div class="copy-label">${copyLabel}</div>
        <div class="title">FEE PAYMENT VOUCHER</div>
      </div>
      <div class="info-grid">
        <div><span class="lbl">Student:</span> <strong>${student?.name || '—'}</strong></div>
        <div><span class="lbl">Roll No:</span> <strong>${student?.rollNo || '—'}</strong></div>
        <div><span class="lbl">Class:</span> <strong>${student?.class?.name || student?.className || '—'}</strong></div>
        <div><span class="lbl">Month:</span> <strong>${monthLabel}</strong></div>
        <div><span class="lbl">Due Date:</span> <strong>${dueDate}</strong></div>
        <div><span class="lbl">Voucher:</span> <strong>#${invoice?.voucherNo || invoice?.id || '—'}</strong></div>
      </div>
      <table class="heads-table">
        <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${headsRows}</tbody>
        <tfoot><tr><td><strong>TOTAL AMOUNT</strong></td><td style="text-align:right"><strong>Rs. ${total.toLocaleString('en-PK')}</strong></td></tr></tfoot>
      </table>
      <div class="total-box ${isPaid ? 'paid' : ''}">
        Rs. ${total.toLocaleString('en-PK')} &nbsp;
        <span class="badge">${isPaid ? 'PAID' : 'UNPAID'}</span>
      </div>
      <div class="sig-row">
        <div class="sig-box">Parent Signature: __________</div>
        <div class="sig-box">Cashier: __________</div>
      </div>
      <div class="footer">IlmForge School Management System • Generated ${new Date().toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'})}</div>
    </div>`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Fee Voucher — ${student?.name}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:Arial,sans-serif; font-size:11px; background:#fff; }
      .page { padding:10px; }
      .copy { border:2px solid #1B2F6E; border-radius:6px; padding:12px; margin-bottom:10px; page-break-inside:avoid; }
      .header { text-align:center; border-bottom:2px solid #1B2F6E; padding-bottom:8px; margin-bottom:10px; }
      .school-name { font-size:16px; font-weight:900; color:#1B2F6E; }
      .copy-label { display:inline-block; background:#1B2F6E; color:white; font-size:9px; font-weight:700; padding:2px 10px; border-radius:99px; margin:3px 0; letter-spacing:1px; }
      .title { font-size:11px; font-weight:700; color:#374151; letter-spacing:0.5px; }
      .info-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px 12px; margin:8px 0; padding:8px; background:#f8fafc; border-radius:4px; }
      .lbl { color:#64748b; }
      .heads-table { width:100%; border-collapse:collapse; margin:8px 0; font-size:11px; }
      .heads-table th { background:#1B2F6E; color:white; padding:5px 8px; text-align:left; }
      .heads-table td { padding:4px 8px; border-bottom:1px solid #f1f5f9; }
      .heads-table tfoot td { background:#f1f5f9; font-weight:700; border-top:2px solid #1B2F6E; padding:6px 8px; }
      .total-box { text-align:center; font-size:18px; font-weight:800; color:#1B2F6E; border:2px solid #1B2F6E; border-radius:6px; padding:8px; margin:8px 0; }
      .total-box.paid { color:#15803d; border-color:#15803d; background:#f0fdf4; }
      .badge { display:inline-block; padding:2px 10px; border-radius:99px; font-size:10px; font-weight:700; background:#fee2e2; color:#b91c1c; }
      .total-box.paid .badge { background:#dcfce7; color:#15803d; }
      .sig-row { display:flex; justify-content:space-between; margin-top:8px; }
      .sig-box { font-size:10px; color:#64748b; padding-top:4px; }
      .footer { text-align:center; font-size:9px; color:#94a3b8; margin-top:8px; padding-top:6px; border-top:1px solid #e2e8f0; }
      .divider { border:none; border-top:2px dashed #cbd5e1; margin:4px 0; }
      @media print { body{-webkit-print-color-adjust:exact; print-color-adjust:exact;} }
    </style></head><body>
    <div class="page">
      ${copyHtml('BANK COPY')}
      <hr class="divider"/>
      ${copyHtml('SCHOOL COPY')}
      <hr class="divider"/>
      ${copyHtml('PARENT/STUDENT COPY')}
    </div>
    <script>window.onload=()=>{window.print();}<\/script>
    </body></html>`;

  const w = window.open('', '_blank', 'width=860,height=700');
  if (w) { w.document.write(html); w.document.close(); }
}

/* ─── Attendance sheet print ────────────────────────────── */
export function printAttendanceSheet({ className, date, students }) {
  const rows = (students || []).map(s => `
    <tr>
      <td>${s.rollNo || '—'}</td>
      <td>${s.name || '—'}</td>
      <td style="width:60px;text-align:center">${s.status || ''}</td>
      <td style="width:80px"></td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><title>Attendance — ${className} — ${date}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; }
      h2 { text-align:center; color:#1B2F6E; margin-bottom: 6px; }
      p  { text-align:center; color:#64748b; margin-bottom: 14px; }
      table { width:100%; border-collapse:collapse; }
      th { background:#1B2F6E; color:white; padding:8px; text-align:left; }
      td { padding:7px 8px; border-bottom:1px solid #e2e8f0; }
      tr:nth-child(even) { background:#f8f9fa; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    </style></head>
    <body>
      <h2>Attendance Sheet — ${className}</h2>
      <p>Date: ${date} &nbsp;|&nbsp; Total Students: ${(students || []).length}</p>
      <table>
        <thead><tr><th>Roll No</th><th>Student Name</th><th>Status</th><th>Remarks</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;

  const w = window.open('', '_blank', 'width=800,height=600');
  w.document.write(html);
  w.document.close();
  w.print();
}

/* ─── Marks sheet print ─────────────────────────────────── */
export function printMarksSheet({ examTitle, className, students }) {
  const rows = (students || []).map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${s.rollNo || '—'}</td>
      <td>${s.name || '—'}</td>
      <td style="text-align:center">${s.obtainedMarks ?? '—'}</td>
      <td style="text-align:center">${s.totalMarks || '—'}</td>
      <td style="text-align:center">${s.obtainedMarks && s.totalMarks ? Math.round((s.obtainedMarks/s.totalMarks)*100)+'%' : '—'}</td>
      <td style="text-align:center">${s.grade || '—'}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><title>Marks — ${examTitle}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; }
      h2 { text-align:center; color:#1B2F6E; }
      p  { text-align:center; color:#64748b; margin-bottom:12px; }
      table { width:100%; border-collapse:collapse; }
      th { background:#1B2F6E; color:white; padding:8px; }
      td { padding:7px 8px; border-bottom:1px solid #e2e8f0; text-align:left; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    </style></head>
    <body>
      <h2>${examTitle}</h2>
      <p>Class: ${className} &nbsp;|&nbsp; Total Students: ${(students||[]).length}</p>
      <table>
        <thead><tr><th>#</th><th>Roll No</th><th>Name</th><th>Obtained</th><th>Total</th><th>%</th><th>Grade</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;

  const w = window.open('', '_blank', 'width=800,height=600');
  w.document.write(html);
  w.document.close();
  w.print();
}

export default { SkeletonRow, SkeletonCard, SkeletonGrid, ErrorState, EmptyState, StatusBadge, ExportBtn, PrintBtn, PortalStatCard, ProgressBar, exportToCSV, printFeeVoucher, printAttendanceSheet, printMarksSheet };
