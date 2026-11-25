/**
 * The sheet of new usernames and passwords (students and parents, staff),
 * built in the browser so the passwords are never sent anywhere else. Used
 * after an Excel import and after registering students from their photos.
 *   results  { students: [{ name, rollNo, credentials }], staff: [...] }
 */
export async function downloadLogins(results, schoolLabel) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'IlmForge';
  const head = (ws) => {
    const r = ws.getRow(1);
    r.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F3D33' } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  };

  const st = wb.addWorksheet('Students & Parents');
  st.columns = [
    { header: 'Student', key: 'name', width: 24 },
    { header: 'Roll No', key: 'roll', width: 16 },
    { header: 'Student signs in with', key: 'sLogin', width: 20 },
    { header: 'Student password', key: 'sPass', width: 18 },
    { header: 'Parent signs in with', key: 'pLogin', width: 22 },
    { header: 'Parent password', key: 'pPass', width: 30 },
    { header: 'Portal link', key: 'link', width: 50 },
  ];
  head(st);
  (results.students || []).filter(r => r.credentials).forEach(r => st.addRow({
    name: r.name, roll: r.rollNo,
    sLogin: r.credentials.student.loginId, sPass: r.credentials.student.password,
    pLogin: r.credentials.parent.loginId, pPass: r.credentials.parent.password,
    link: r.credentials.parent.portalLink,
  }));

  const sf = wb.addWorksheet('Staff');
  sf.columns = [
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Employee Code', key: 'code', width: 16 },
    { header: 'Portal', key: 'portal', width: 18 },
    { header: 'Signs in with', key: 'login', width: 28 },
    { header: 'Temporary password', key: 'pass', width: 20 },
    { header: 'Portal link', key: 'link', width: 50 },
  ];
  head(sf);
  (results.staff || []).filter(r => r.credentials).forEach(r => sf.addRow({
    name: r.name, code: r.credentials.empCode, portal: r.credentials.portal,
    login: r.credentials.loginId, pass: r.credentials.password, link: r.credentials.portalLink,
  }));

  const buf = await wb.xlsx.writeBuffer();
  const href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = href; a.download = `${schoolLabel}-login-details-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}
