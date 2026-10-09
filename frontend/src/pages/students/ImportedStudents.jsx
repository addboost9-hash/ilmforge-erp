/**
 * The students just imported from Excel, ready to finish off: add photos,
 * fill in what the spreadsheet left out, fix a wrong class, or delete a row
 * that should not have been imported. Shown on the import result screen.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import StudentPhotoButton from '../../components/StudentPhotoButton';
import StudentRowActions, { MissingBadge, missingInfo } from '../../components/StudentRowActions';

export default function ImportedStudents({ ids }) {
  const [filter, setFilter] = useState('all');
  const key = ids.join(',');
  const { data: students = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['students', 'imported', key],
    queryFn: () => api.get('/students', { params: { ids: key, limit: 300 } }).then((r) => r.data.data || []),
    enabled: ids.length > 0,
  });

  const counts = useMemo(() => {
    const c = { photo: 0, 'date of birth': 0, 'parent phone': 0, 'B-Form': 0, complete: 0 };
    students.forEach((s) => {
      const m = missingInfo(s);
      if (!m.length) c.complete += 1;
      m.forEach((x) => { if (c[x] !== undefined) c[x] += 1; });
    });
    return c;
  }, [students]);

  const shown = filter === 'all' ? students
    : filter === 'incomplete' ? students.filter((s) => missingInfo(s).length)
      : students.filter((s) => missingInfo(s).includes(filter));

  if (!ids.length) return null;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Imported students</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            Add photos and anything the spreadsheet left out, fix a wrong class, or delete a row imported by mistake.
          </div>
        </div>
        <div role="tablist" aria-label="Show" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            ['all', `All (${students.length})`],
            ['incomplete', `Incomplete (${students.length - counts.complete})`],
            ['photo', `No photo (${counts.photo})`],
            ['date of birth', `No date of birth (${counts['date of birth']})`],
            ['parent phone', `No parent phone (${counts['parent phone']})`],
          ].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
              className={`btn btn-sm ${filter === k ? 'btn-primary' : 'btn-outline'}`}>{label}</button>
          ))}
        </div>
      </div>

      {isLoading ? <div className="loading-center"><div className="spinner" /></div> : isError ? (
        <div style={{ fontSize: 13 }}>The imported students could not be loaded. <button className="btn btn-sm btn-outline" onClick={() => refetch()}>Try again</button></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Photo</th><th>Roll No</th><th>Name</th><th>Father</th><th>Class</th><th>Record</th><th>Actions</th></tr></thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id}>
                  <td><StudentPhotoButton student={s} size={32} showLabel={false} /></td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F766E' }}>{s.rollNo || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{s.fatherName || '—'}</td>
                  <td>{s.class?.name || '—'}{s.section?.name ? ` - ${s.section.name}` : ''}</td>
                  <td><MissingBadge student={s} /></td>
                  <td><StudentRowActions student={s} compact /></td>
                </tr>
              ))}
              {!shown.length && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 18, color: 'var(--text-muted)' }}>
                  {students.length ? 'Nothing here: these records are complete.' : 'The imported students are no longer in the list (deleted).'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
