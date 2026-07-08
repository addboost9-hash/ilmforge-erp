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

/* ─── Fee voucher print (inline HTML) ───────────────────── */
export function printFeeVoucher({ student, invoice, school }) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Fee Voucher — ${student?.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; }
        .voucher { width: 210mm; margin: 0 auto; padding: 16px; }
        .header { text-align: center; border-bottom: 2px solid #1B2F6E; padding-bottom: 10px; margin-bottom: 12px; }
        .school-name { font-size: 18px; font-weight: 800; color: #1B2F6E; }
        .title { font-size: 14px; font-weight: 700; margin-top: 4px; color: #374151; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 0; }
        .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f0f0f0; }
        .label { color: #64748b; font-size: 11px; }
        .value { font-weight: 700; font-size: 12px; }
        .amount { font-size: 22px; font-weight: 800; color: #1B2F6E; text-align: center; padding: 12px; border: 2px solid #1B2F6E; border-radius: 8px; margin: 12px 0; }
        .status { display: inline-block; padding: 3px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; background: ${invoice?.status === 'paid' ? '#dcfce7' : '#fee2e2'}; color: ${invoice?.status === 'paid' ? '#15803d' : '#b91c1c'}; }
        .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <div class="voucher">
        <div class="header">
          <div class="school-name">${school?.name || 'IlmForge School'}</div>
          <div class="title">Fee Payment Voucher</div>
        </div>
        <div class="grid">
          <div>
            <div class="row"><span class="label">Student Name</span><span class="value">${student?.name || '—'}</span></div>
            <div class="row"><span class="label">Roll Number</span><span class="value">${student?.rollNo || '—'}</span></div>
            <div class="row"><span class="label">Class</span><span class="value">${student?.class?.name || '—'}</span></div>
          </div>
          <div>
            <div class="row"><span class="label">Voucher No</span><span class="value">${invoice?.voucherNo || invoice?.id || '—'}</span></div>
            <div class="row"><span class="label">Fee Month</span><span class="value">${invoice?.month ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][invoice.month-1] : '—'} ${invoice?.year || ''}</span></div>
            <div class="row"><span class="label">Due Date</span><span class="value">${invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-PK') : '—'}</span></div>
          </div>
        </div>
        <div class="amount">Rs. ${Number(invoice?.dueAmount || invoice?.totalAmount || 0).toLocaleString('en-PK')} &nbsp; <span class="status">${(invoice?.status || 'unpaid').toUpperCase()}</span></div>
        <div class="footer">
          Generated by IlmForge School Management System • ${new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </body>
    </html>`;
  const w = window.open('', '_blank', 'width=800,height=600');
  w.document.write(html);
  w.document.close();
  w.print();
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
