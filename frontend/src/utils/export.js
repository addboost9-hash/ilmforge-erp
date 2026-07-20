/**
 * IlmForge — Export Utilities
 * Provides CSV download and Excel (ExcelJS) export helpers.
 */

/**
 * Download an array of objects as a CSV file.
 * @param {Object[]} data   - Array of flat objects
 * @param {string}   filename - e.g. "students-report.csv"
 */
export function downloadCSV(data, filename) {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(r => headers.map(h => {
    const val = r[h] == null ? '' : String(r[h]);
    // Wrap in quotes if value contains comma, quote, or newline
    return val.includes(',') || val.includes('"') || val.includes('\n')
      ? `"${val.replace(/"/g, '""')}"`
      : val;
  }).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download an array of objects as an Excel (.xlsx) file using ExcelJS.
 * @param {Object[]} data      - Array of flat objects (keys become header row)
 * @param {string}   filename  - e.g. "students-report.xlsx"
 * @param {string}   sheetName - Worksheet tab name (default: "Sheet1")
 * @param {Object[]} [columns] - Optional ExcelJS column definitions:
 *   [{ header: 'Reg No', key: 'regNo', width: 14 }, ...]
 *   If omitted, columns are auto-derived from data keys.
 */
export async function downloadExcel(data, filename, sheetName = 'Sheet1', columns) {
  if (!data || !data.length) return;

  // Dynamically import ExcelJS to keep the bundle lean in pages that don't use it
  const ExcelJS = (await import('exceljs')).default;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IlmForge';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);

  // Build column definitions
  if (columns && columns.length) {
    sheet.columns = columns;
  } else {
    const keys = Object.keys(data[0]);
    sheet.columns = keys.map(k => ({
      header: k,
      key: k,
      width: 18,
    }));
  }

  // Style the header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1B2F6E' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.height = 20;

  // Add data rows
  data.forEach((row, idx) => {
    const r = sheet.addRow(row);
    if (idx % 2 === 1) {
      r.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F7FF' },
      };
    }
  });

  // Auto-fit borders
  sheet.eachRow(r => {
    r.eachCell(cell => {
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left:   { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right:  { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // Write and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
