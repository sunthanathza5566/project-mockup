'use client';

import { useState, useEffect } from 'react';
import type { StudentProfile, LibraryBook } from '@/lib/types';
import { getLibraryBooks, markBookRead, getReadBooksLocal } from '@/lib/api/student.api';

interface Props {
  profile: StudentProfile;
  showToast: (m: string) => void;
}

const TYPE_FILTERS = ['ทั้งหมด', 'การ์ตูน', 'ความรู้', 'นิทาน'];
const GRADE_FILTERS = [
  { id: 'auto', label: 'ระดับชั้นฉัน (อัตโนมัติ)' },
  { id: 'p1-3', label: 'ป.1-3' }, { id: 'p4-6', label: 'ป.4-6' },
  { id: 'm1-3', label: 'ม.1-3' }, { id: 'm4-6', label: 'ม.4-6' },
];
const BADGE_CLASS: Record<string, string> = {
  'การ์ตูน': 'lib-badge-การ์ตูน', 'ความรู้': 'lib-badge-ความรู้', 'นิทาน': 'lib-badge-นิทาน',
};

export default function LibraryView({ profile, showToast }: Props) {
  const [books,       setBooks]       = useState<LibraryBook[]>([]);
  const [typeFilter,  setTypeFilter]  = useState('ทั้งหมด');
  const [gradeFilter, setGradeFilter] = useState('auto');
  const [readDone,    setReadDone]    = useState<Record<number, boolean>>({});
  const [openBook,    setOpenBook]    = useState<LibraryBook | null>(null);
  const [curPage,     setCurPage]     = useState(0);

  useEffect(() => {
    getLibraryBooks().then(setBooks);
    setReadDone(getReadBooksLocal());
  }, []);

  function gradeNum(): number {
    const g = profile.grade || 'ม.1';
    if (g.startsWith('ป.')) return parseInt(g.slice(2)) || 1;
    if (g.startsWith('ม.')) return (parseInt(g.slice(2)) || 1) + 6;
    return 7;
  }

  function matchGrade(book: LibraryBook): boolean {
    const gn = gradeNum();
    if (gradeFilter === 'auto') return gn >= book.gradeMin && gn <= book.gradeMax;
    const ranges: Record<string, [number, number]> = { 'p1-3': [1,3], 'p4-6': [4,6], 'm1-3': [7,9], 'm4-6': [10,12] };
    const [min, max] = ranges[gradeFilter] || [1, 12];
    return book.gradeMin <= max && book.gradeMax >= min;
  }

  const filtered = books.filter(b => (typeFilter === 'ทั้งหมด' || b.type === typeFilter) && matchGrade(b));

  async function openReader(book: LibraryBook) {
    setOpenBook(book);
    setCurPage(0);
  }

  async function finishBook(book: LibraryBook) {
    await markBookRead(profile.studentId, book.id);
    setReadDone(prev => ({ ...prev, [book.id]: true }));
    setOpenBook(null);
    showToast(`✅ อ่าน "${book.title}" จบแล้ว! ได้คะแนนจิตพิสัย +1 ⭐`);
  }

  return (
    <div className="stu-view-wrap">
      <div className="stu-page-header">
        <h2 className="stu-page-title">📖 ห้องสมุดออนไลน์</h2>
        <p className="stu-page-sub">อ่านหนังสือออนไลน์ · ได้คะแนนจิตพิสัย</p>
      </div>

      <div className="stu-lib-note">
        📚 อ่านหนังสือออนไลน์ครบ จะได้รับ <strong>คะแนนจิตพิสัย</strong> — สะสมคะแนนเพื่อรับรางวัลพิเศษ!
      </div>

      <div className="stu-lib-filter-group">
        <span className="stu-lib-filter-label">ประเภท</span>
        <div className="stu-lib-chips">
          {TYPE_FILTERS.map(t => <button key={t} className={`stu-lib-chip${typeFilter === t ? ' active' : ''}`} onClick={() => setTypeFilter(t)}>{t}</button>)}
        </div>
      </div>
      <div className="stu-lib-filter-group">
        <span className="stu-lib-filter-label">ระดับชั้น</span>
        <div className="stu-lib-chips">
          {GRADE_FILTERS.map(f => <button key={f.id} className={`stu-lib-chip${gradeFilter === f.id ? ' active' : ''}`} onClick={() => setGradeFilter(f.id)}>{f.label}</button>)}
        </div>
      </div>

      <div className="stu-lib-grid">
        {filtered.map(book => (
          <div key={book.id} className="stu-lib-card" onClick={() => openReader(book)}>
            <div className="stu-lib-cover">{book.cover}</div>
            <div className={`stu-lib-badge ${BADGE_CLASS[book.type] || ''}`}>{book.type}</div>
            <div className="stu-lib-title">{book.title}</div>
            <div className="stu-lib-author">{book.author}</div>
            <div className="stu-lib-pages">{book.pages} หน้า</div>
            {readDone[book.id] && <div className="stu-lib-done">✓ อ่านแล้ว</div>}
          </div>
        ))}
      </div>

      {/* Book reader modal */}
      {openBook && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(18,10,4,0.90)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 'min(460px,94vw)', height: 'min(660px,86vh)', background: 'var(--warm-white)', borderRadius: 6, boxShadow: '0 28px 80px rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--cream)', flexShrink: 0 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brown-dark)' }}>{openBook.title}</span>
              <button style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setOpenBook(null)}>✕</button>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.75rem', textAlign: 'center' }}>
              {curPage === 0 ? (
                <>
                  <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>{openBook.cover}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.9rem', fontWeight: 300, color: 'var(--brown-ink)', marginBottom: '0.25rem' }}>{openBook.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{openBook.author}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 280, lineHeight: 1.6 }}>{openBook.desc}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '4rem', marginBottom: '1.1rem' }}>📄</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', color: 'var(--brown-ink)', marginBottom: '0.75rem' }}>หน้า {curPage}</div>
                  <div style={{ fontSize: '0.92rem', color: 'var(--text-body)', lineHeight: 1.85, maxWidth: 320 }}>เนื้อหาของหน้านี้จะแสดงเมื่อเชื่อมต่อกับ PostgreSQL (ดึงจาก table: book_pages)</div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', background: 'var(--cream)', flexShrink: 0 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>หน้า {curPage + 1} / {openBook.pages + 1}</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {curPage > 0 && (
                  <button style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--warm-white)', cursor: 'pointer', fontSize: '0.82rem' }} onClick={() => setCurPage(p => p - 1)}>← ก่อนหน้า</button>
                )}
                {curPage < openBook.pages ? (
                  <button style={{ padding: '0.5rem 1rem', background: 'var(--brown-dark)', color: 'var(--cream)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem' }} onClick={() => setCurPage(p => p + 1)}>ถัดไป →</button>
                ) : (
                  <button style={{ padding: '0.5rem 1.25rem', background: '#2E8B5B', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }} onClick={() => finishBook(openBook)}>✅ อ่านจบแล้ว!</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
