/** Salary & Expenses Hub */
import { lazy, Suspense } from 'react';
import HubShell from './HubShell';
import { Landmark, Receipt } from 'lucide-react';

const SalaryPage  = lazy(() => import('../salary/SalaryPage'));
const LoanPage    = lazy(() => import('../salary/LoanManagementPage'));
const ExpensesPage = lazy(() => import('../expenses/ExpensesPage'));
const ExpenseMgmt = lazy(() => import('../expenses/ExpenseManagementPage'));
const ReportsPage = lazy(() => import('../reports/ReportsPage'));
const ReportingArea = lazy(() => import('../reports/ReportingAreaPage'));

const L = (C) => () => <Suspense fallback={<div className="p-10 text-center text-slate-400 text-sm">Loading…</div>}><C /></Suspense>;

export default function PayrollHub() {
  return (
    <HubShell
      title="🏦 Salary & Expenses Hub"
      subtitle="Payroll, loans, expenses, financial reports — school finance ek jagah"
      accent="#4F46E5"
      quickActions={[
        { label: 'Generate Salary', tab: 'salary', icon: Landmark },
        { label: 'Add Expense', tab: 'expenses', icon: Receipt },
      ]}
      tabs={[
        { id: 'salary',    label: 'Salary',        hint: 'Generate + slips',      render: L(SalaryPage) },
        { id: 'loans',     label: 'Staff Loans',   hint: 'Auto-deduction',        render: L(LoanPage) },
        { id: 'expenses',  label: 'Expenses',      hint: 'Daily entries',         render: L(ExpensesPage) },
        { id: 'expmgmt',   label: 'Expense Mgmt',  hint: 'Categories + analysis', render: L(ExpenseMgmt) },
        { id: 'reports',   label: 'Reports',       hint: 'Income & expense',      render: L(ReportsPage) },
        { id: 'reporting', label: 'Reporting Area', hint: 'All report types',     render: L(ReportingArea) },
      ]}
    />
  );
}
