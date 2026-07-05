const ROLES = ['super_admin', 'admin', 'accountant', 'teacher', 'parent', 'student', 'gatekeeper'];

const MODULES = [
  'dashboard',
  'students',
  'admissions',
  'fees',
  'attendance',
  'staff',
  'exams',
  'settings',
  'notifications',
  'reports',
  'classes',
  'parents',
  'products',
  'expenses',
  'salary',
  'homework',
  'transport',
  'timetable',
  'complaints',
  'leaves',
  'noticeboard',
  'study_materials',
  'online_classes',
  'announcements',
  'tutorials',
  'loans',
  'certificates',
  'appraisals',
  'audit',
  'permissions',
  'payments',
  'library',
  'push',
];

const full = { canView: true, canCreate: true, canUpdate: true, canDelete: true, canExport: true };
const viewOnly = { canView: true, canCreate: false, canUpdate: false, canDelete: false, canExport: false };
const none = { canView: false, canCreate: false, canUpdate: false, canDelete: false, canExport: false };

const ROLE_DEFAULTS = {
  super_admin: Object.fromEntries(MODULES.map((m) => [m, full])),
  admin: Object.fromEntries(MODULES.map((m) => [m, full])),
  accountant: {
    dashboard: { ...viewOnly, canExport: true },
    fees: full,
    reports: { ...full },
    expenses: full,
    salary: { ...full, canDelete: false },
    products: full,
    loans: full,
    payments: full,
    library: { ...viewOnly, canCreate: true, canUpdate: true, canDelete: false, canExport: true },
    push: { ...viewOnly, canCreate: true, canUpdate: false, canDelete: false, canExport: false },
    complaints: { ...viewOnly, canUpdate: true },
    settings: { ...viewOnly, canUpdate: true },
    students: viewOnly,
  },
  teacher: {
    dashboard: viewOnly,
    students: viewOnly,
    attendance: { ...full, canDelete: false, canExport: true },
    homework: full,
    exams: { ...full, canDelete: false, canExport: true },
    classes: viewOnly,
    timetable: viewOnly,
    study_materials: full,
    online_classes: full,
    leaves: { ...viewOnly, canCreate: true },
    noticeboard: viewOnly,
    announcements: { ...viewOnly, canCreate: true, canUpdate: true },
    complaints: { ...viewOnly, canCreate: true },
    tutorials: viewOnly,
    appraisals: viewOnly,
    library: viewOnly,
  },
  parent: {
    dashboard: viewOnly,
    students: viewOnly,
    classes: viewOnly,
    timetable: viewOnly,
    noticeboard: viewOnly,
    leaves: { ...viewOnly, canCreate: true },
    fees: viewOnly,
    attendance: viewOnly,
    homework: viewOnly,
    announcements: viewOnly,
    complaints: { ...viewOnly, canCreate: true },
    timetable: viewOnly,
    noticeboard: viewOnly,
  },
  student: {
    dashboard: viewOnly,
    classes: viewOnly,
    timetable: viewOnly,
    noticeboard: viewOnly,
    attendance: viewOnly,
    homework: viewOnly,
    exams: viewOnly,
    timetable: viewOnly,
    announcements: viewOnly,
    noticeboard: viewOnly,
    study_materials: viewOnly,
    online_classes: viewOnly,
  },
  gatekeeper: {
    dashboard: viewOnly,
    attendance: { ...viewOnly, canCreate: true, canUpdate: true, canExport: false },
    students: viewOnly,
    complaints: { ...none, canCreate: true },
    push: { ...viewOnly, canCreate: true },
  },
};

const normalizePermission = (raw = {}) => ({
  canView: !!raw.canView,
  canCreate: !!raw.canCreate,
  canUpdate: !!raw.canUpdate,
  canDelete: !!raw.canDelete,
  canExport: !!raw.canExport,
});

function getDefaultPermission(role, module) {
  const roleDefaults = ROLE_DEFAULTS[role] || {};
  if (roleDefaults[module]) return normalizePermission(roleDefaults[module]);
  if (role === 'super_admin' || role === 'admin') return { ...full };
  return { ...none };
}

module.exports = {
  ROLES,
  MODULES,
  getDefaultPermission,
  normalizePermission,
};
