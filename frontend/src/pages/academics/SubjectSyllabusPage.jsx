/**
 * IlmForge — Subject Syllabus Editor (School Mentor style)
 * Rich text editor per subject tab with contenteditable + execCommand toolbar
 * Route: /academics/subject-syllabus/:classId/:sectionId
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BookOpen, ChevronLeft, Save, X } from 'lucide-react';
import api from '../../api/client';

const NAVY = '#1B2F6E';
const TEAL = '#0D9488';

/* ── Rich Text Toolbar ── */
function RichTextEditor({ value, onChange, editorRef }) {
  const [charCount, setCharCount] = useState(0);

  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    const html = editorRef.current?.innerHTML || '';
    onChange(html);
    setCharCount(editorRef.current?.innerText?.length || 0);
  }, [editorRef, onChange]);

  const handleInput = useCallback(() => {
    const html = editorRef.current?.innerHTML || '';
    onChange(html);
    setCharCount(editorRef.current?.innerText?.length || 0);
  }, [editorRef, onChange]);

  const handleColorChange = useCallback((e) => {
    exec('foreColor', e.target.value);
  }, [exec]);

  const handleBgColorChange = useCallback((e) => {
    exec('hiliteColor', e.target.value);
  }, [exec]);

  const handleFontSize = useCallback((e) => {
    exec('fontSize', e.target.value);
  }, [exec]);

  const insertTable = useCallback(() => {
    const rows = 3, cols = 3;
    let tbl = '<table border="1" style="border-collapse:collapse;width:100%;margin:8px 0">';
    for (let r = 0; r < rows; r++) {
      tbl += '<tr>';
      for (let c = 0; c < cols; c++) {
        tbl += r === 0
          ? '<th style="background:#1B2F6E;color:#fff;padding:6px 10px;text-align:left">Header</th>'
          : '<td style="padding:6px 10px;border:1px solid #d1d5db">&nbsp;</td>';
      }
      tbl += '</tr>';
    }
    tbl += '</table>';
    exec('insertHTML', tbl);
  }, [exec]);

  /* Set initial content once */
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
      setCharCount(editorRef.current.innerText?.length || 0);
    }
  // Only run when value prop changes from parent (tab switch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const toolbarBtn = (title, onClick, children) => (
    <button
      key={title}
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      style={{
        padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4,
        background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700,
        color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 28, height: 28,
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{ border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 10px',
        background: '#f8f9fa', borderBottom: '1px solid #e5e7eb', alignItems: 'center',
      }}>
        {toolbarBtn('Undo', () => exec('undo'), '↺')}
        {toolbarBtn('Redo', () => exec('redo'), '↻')}

        <div style={{ width: 1, height: 20, background: '#d1d5db', margin: '0 2px' }} />

        {/* Font size */}
        <select
          title="Font Size"
          onMouseDown={e => e.stopPropagation()}
          onChange={handleFontSize}
          defaultValue="3"
          style={{ height: 28, border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, padding: '0 4px', cursor: 'pointer', background: '#fff' }}
        >
          <option value="1">8pt</option>
          <option value="2">10pt</option>
          <option value="3">12pt</option>
          <option value="4">14pt</option>
          <option value="5">18pt</option>
          <option value="6">24pt</option>
          <option value="7">36pt</option>
        </select>

        <div style={{ width: 1, height: 20, background: '#d1d5db', margin: '0 2px' }} />

        {toolbarBtn('Bold', () => exec('bold'), <strong>B</strong>)}
        {toolbarBtn('Underline', () => exec('underline'), <u>U</u>)}
        {toolbarBtn('Italic', () => exec('italic'), <em>I</em>)}
        {toolbarBtn('Strikethrough', () => exec('strikeThrough'), <s>S</s>)}

        <div style={{ width: 1, height: 20, background: '#d1d5db', margin: '0 2px' }} />

        {/* Text Color */}
        <label title="Text Color" style={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', height: 28, padding: '0 4px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', fontSize: 11, fontWeight: 700, color: '#374151' }}>
          A
          <input type="color" defaultValue="#000000" onChange={handleColorChange} style={{ width: 14, height: 14, border: 'none', cursor: 'pointer', padding: 0 }} />
        </label>

        {/* BG Color */}
        <label title="Highlight Color" style={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', height: 28, padding: '0 4px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', fontSize: 11 }}>
          <span style={{ background: '#ffff00', padding: '0 3px', fontWeight: 700, color: '#374151' }}>A</span>
          <input type="color" defaultValue="#ffff00" onChange={handleBgColorChange} style={{ width: 14, height: 14, border: 'none', cursor: 'pointer', padding: 0 }} />
        </label>

        <div style={{ width: 1, height: 20, background: '#d1d5db', margin: '0 2px' }} />

        {toolbarBtn('Align Left', () => exec('justifyLeft'), '⬅')}
        {toolbarBtn('Align Center', () => exec('justifyCenter'), '↔')}
        {toolbarBtn('Align Right', () => exec('justifyRight'), '➡')}

        <div style={{ width: 1, height: 20, background: '#d1d5db', margin: '0 2px' }} />

        {toolbarBtn('Horizontal Line', () => exec('insertHorizontalRule'), '—')}
        {toolbarBtn('Bullet List', () => exec('insertUnorderedList'), '• List')}
        {toolbarBtn('Numbered List', () => exec('insertOrderedList'), '1. List')}
        {toolbarBtn('Insert Table', insertTable, 'Table')}
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={handleInput}
        style={{
          minHeight: 280, padding: '14px 16px', outline: 'none',
          fontSize: 14, lineHeight: 1.6, color: '#1F2937',
          fontFamily: 'inherit',
        }}
        data-placeholder="Start typing syllabus content here..."
      />

      {/* Character count */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '6px 12px', background: '#f8f9fa', borderTop: '1px solid #e5e7eb',
        fontSize: 11, color: '#9CA3AF',
      }}>
        Characters: {charCount}
      </div>
    </div>
  );
}

/* ════════════════════════════════════
   MAIN PAGE
════════════════════════════════════ */
export default function SubjectSyllabusPage() {
  const { classId, sectionId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0);
  /* Map: subjectId -> HTML content */
  const [contents, setContents] = useState({});
  /* Map: subjectId -> scheme/syllabus record id (for PUT) */
  const [schemeIds, setSchemeIds] = useState({});
  const editorRef = useRef(null);

  /* ── Fetch class info ── */
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data || []),
    staleTime: 10 * 60 * 1000,
  });

  const classInfo = classes.find(c => String(c.id) === String(classId));

  /* ── Fetch subjects for this class ── */
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['class-subjects', classId],
    queryFn: () => api.get(`/classes/${classId}/subjects`).then(r => r.data.data || []).catch(() => []),
    enabled: !!classId,
  });

  /* ── Active subject ── */
  const activeSubject = subjects[activeSubjectIdx];

  /* ── Fetch existing syllabus/scheme content for each subject ── */
  const { data: schemesData = [] } = useQuery({
    queryKey: ['schemes-for-class', classId],
    queryFn: () => api.get(`/schemes?classId=${classId}`).then(r => r.data.data || []).catch(() => []),
    enabled: !!classId,
    onSuccess: (data) => {
      const newContents = {};
      const newIds = {};
      data.forEach(s => {
        if (s.subjectId) {
          newContents[s.subjectId] = s.content || s.months || '';
          newIds[s.subjectId] = s.id;
        }
      });
      setContents(prev => ({ ...newContents, ...prev }));
      setSchemeIds(prev => ({ ...newIds, ...prev }));
    },
  });

  /* Populate contents from schemes on load */
  useEffect(() => {
    if (schemesData && schemesData.length > 0) {
      const newContents = {};
      const newIds = {};
      schemesData.forEach(s => {
        if (s.subjectId) {
          newContents[s.subjectId] = s.content || s.months || '';
          newIds[s.subjectId] = s.id;
        }
      });
      setContents(prev => {
        const merged = { ...newContents };
        // Preserve any in-session edits
        Object.keys(prev).forEach(k => { merged[k] = prev[k]; });
        return merged;
      });
      setSchemeIds(newIds);
    }
  }, [schemesData]);

  /* ── Save mutation ── */
  const saveMutation = useMutation({
    mutationFn: ({ subjectId, html }) => {
      const schemeId = schemeIds[subjectId];
      if (schemeId) {
        return api.put(`/schemes/${schemeId}`, { content: html, months: html }).then(r => r.data);
      } else {
        return api.post('/schemes', {
          classId: parseInt(classId),
          subjectId: parseInt(subjectId),
          content: html,
          months: html,
          title: `${classInfo?.name || 'Class'} Syllabus`,
        }).then(r => r.data);
      }
    },
    onSuccess: (data, variables) => {
      toast.success('Saved!');
      if (data?.data?.id) {
        setSchemeIds(prev => ({ ...prev, [variables.subjectId]: data.data.id }));
      }
      qc.invalidateQueries(['schemes-for-class', classId]);
    },
    onError: () => toast.error('Save failed'),
  });

  /* Get current content for the active subject */
  const getCurrentContent = () => {
    if (!activeSubject) return '';
    return contents[activeSubject.id] || '';
  };

  const setCurrentContent = (html) => {
    if (!activeSubject) return;
    setContents(prev => ({ ...prev, [activeSubject.id]: html }));
  };

  const saveCurrentSubject = async () => {
    if (!activeSubject) return;
    await saveMutation.mutateAsync({ subjectId: activeSubject.id, html: editorRef.current?.innerHTML || getCurrentContent() });
  };

  const handleSaveAndNext = async () => {
    await saveCurrentSubject();
    if (activeSubjectIdx < subjects.length - 1) {
      setActiveSubjectIdx(i => i + 1);
    } else {
      toast.success('All subjects saved!');
    }
  };

  const handleSaveAndClose = async () => {
    await saveCurrentSubject();
    navigate('/academics/syllabus');
  };

  const handleClose = () => {
    navigate('/academics/syllabus');
  };

  /* When switching tabs, flush current editor content to state */
  const switchTab = (idx) => {
    if (editorRef.current && activeSubject) {
      setContents(prev => ({ ...prev, [activeSubject.id]: editorRef.current.innerHTML }));
    }
    setActiveSubjectIdx(idx);
  };

  /* ── RENDER ── */
  return (
    <div className="page-content fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={handleClose}
          style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: '#374151' }}
        >
          <ChevronLeft size={15} /> Back
        </button>

        <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,${NAVY},#0073b7)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={18} color="#fff" />
        </div>

        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: NAVY }}>
            {classInfo?.name || `Class ${classId}`} — Syllabus Editor
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>Edit rich syllabus content per subject</p>
        </div>
      </div>

      {subjectsLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>Loading subjects...</div>
      ) : subjects.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <BookOpen size={40} color="#D1D5DB" style={{ marginBottom: 10 }} />
          <p style={{ color: '#6B7280', fontSize: 14, fontWeight: 600 }}>No subjects found for this class</p>
          <p style={{ color: '#9CA3AF', fontSize: 12 }}>Add subjects to this class in Settings first.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Subject Tabs */}
          <div style={{
            display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb',
            background: '#f8f9fa', overflowX: 'auto',
          }}>
            {subjects.map((sub, idx) => {
              const isActive = idx === activeSubjectIdx;
              return (
                <button
                  key={sub.id}
                  onClick={() => switchTab(idx)}
                  style={{
                    padding: '12px 24px', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                    background: isActive ? '#fff' : 'transparent',
                    color: isActive ? NAVY : '#6B7280',
                    borderBottom: isActive ? `3px solid ${NAVY}` : '3px solid transparent',
                    marginBottom: -2, transition: 'all 0.15s',
                    position: 'relative',
                  }}
                >
                  {sub.name}
                  {/* Dot indicator if content exists */}
                  {contents[sub.id] && contents[sub.id] !== '<br>' && contents[sub.id].length > 4 && (
                    <span style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 6, height: 6, borderRadius: '50%',
                      background: TEAL,
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Editor area for active subject */}
          <div style={{ padding: 24 }}>
            {activeSubject && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: NAVY }}>
                    {activeSubject.name} — Syllabus Content
                  </h3>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                    {activeSubjectIdx + 1} of {subjects.length}
                  </span>
                </div>

                <RichTextEditor
                  key={activeSubject.id}
                  value={getCurrentContent()}
                  onChange={setCurrentContent}
                  editorRef={editorRef}
                />

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleClose}
                    style={{
                      padding: '9px 20px', borderRadius: 7, border: '1.5px solid #d1d5db',
                      background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <X size={14} /> Close
                  </button>

                  <button
                    onClick={handleSaveAndClose}
                    disabled={saveMutation.isPending}
                    style={{
                      padding: '9px 20px', borderRadius: 7, border: 'none',
                      background: '#6B7280', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Save size={14} /> Save & Close
                  </button>

                  {activeSubjectIdx < subjects.length - 1 && (
                    <button
                      onClick={handleSaveAndNext}
                      disabled={saveMutation.isPending}
                      style={{
                        padding: '9px 20px', borderRadius: 7, border: 'none',
                        background: NAVY, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <Save size={14} /> Save & Next →
                    </button>
                  )}

                  {activeSubjectIdx === subjects.length - 1 && (
                    <button
                      onClick={saveCurrentSubject}
                      disabled={saveMutation.isPending}
                      style={{
                        padding: '9px 20px', borderRadius: 7, border: 'none',
                        background: TEAL, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <Save size={14} /> {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
