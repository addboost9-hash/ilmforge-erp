// ─── Pakistan phone validation ───────────────────────────────────────────────
export const validatePhone = (phone) => {
  const cleaned = phone.replace(/[\s\-]/g, '');
  const patterns = [
    /^03[0-9]{9}$/,        // 03XX-XXXXXXX
    /^\+923[0-9]{9}$/,     // +923XX-XXXXXXX
    /^923[0-9]{9}$/,       // 923XX-XXXXXXX
  ];
  return patterns.some(p => p.test(cleaned));
};

export const formatPhone = (phone) => {
  const cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('92') && cleaned.length === 12) return '+' + cleaned;
  if (cleaned.startsWith('0') && cleaned.length === 11) return cleaned;
  return cleaned;
};

// ─── CNIC validation (13 digits, format XXXXX-XXXXXXX-X) ────────────────────
export const validateCNIC = (cnic) => {
  const cleaned = cnic.replace(/[-\s]/g, '');
  return /^[0-9]{13}$/.test(cleaned);
};

export const formatCNIC = (cnic) => {
  const cleaned = cnic.replace(/[^0-9]/g, '').slice(0, 13);
  if (cleaned.length <= 5) return cleaned;
  if (cleaned.length <= 12) return cleaned.slice(0, 5) + '-' + cleaned.slice(5);
  return cleaned.slice(0, 5) + '-' + cleaned.slice(5, 12) + '-' + cleaned.slice(12);
};

// ─── Marks validation ────────────────────────────────────────────────────────
export const validateMarks = (marks, maxMarks) => {
  const n = Number(marks);
  return !isNaN(n) && n >= 0 && n <= Number(maxMarks);
};

// ─── Required field ──────────────────────────────────────────────────────────
export const isRequired = (value) =>
  value !== null && value !== undefined && String(value).trim() !== '';

// ─── Email ───────────────────────────────────────────────────────────────────
export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
