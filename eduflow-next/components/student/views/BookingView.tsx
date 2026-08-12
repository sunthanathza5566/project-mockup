'use client';

import { useEffect, useState, useCallback } from 'react';
import type { StudentProfile } from '@/lib/types';
import {
  getBookCatalog, getBookCategories, availableCopies,
  reserveBook, getMyReservations, cancelReservation, queuePosition,
  type CatalogBook, type Reservation,
} from '@/lib/api/booking.store';

interface Props {
  profile: StudentProfile;
  showToast: (m: string) => void;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  ready:    { label: '✅ รอรับที่ห้องสมุด (ภายใน 3 วัน)', cls: 'badge-graded' },
  waiting:  { label: '⏳ เข้าคิวรอ',                     cls: 'badge-pending' },
  pickedup: { label: '📖 รับแล้ว',                        cls: 'badge-submitted' },
};

/** จองหนังสือเล่มจริง — รายการมาจาก catalog ที่นำเข้าไว้ (แบ่งตามประเภท) */
export default function BookingView({ profile, showToast }: Props) {
  const [catalog,  setCatalog]  = useState<CatalogBook[]>([]);
  const [cats,     setCats]     = useState<string[]>([]);
  const [catFilter, setCatFilter] = useState('ทั้งหมด');
  const [search,   setSearch]   = useState('');
  const [mine,     setMine]     = useState<(Reservation & { book?: CatalogBook })[]>([]);
  const [confirmBook, setConfirmBook] = useState<CatalogBook | null>(null);

  const refresh = useCallback(() => {
    setCatalog(getBookCatalog());
    setCats(getBookCategories());
    setMine(getMyReservations(profile.studentId));
  }, [profile.studentId]);
  useEffect(() => { refresh(); }, [refresh]);

  const filtered = catalog
    .filter(b => catFilter === 'ทั้งหมด' || b.category === catFilter)
    .filter(b => !search.trim() || b.title.includes(search.trim()) || b.author.includes(search.trim()));

  function handleReserve(book: CatalogBook) {
    const name = `${profile.firstName} ${profile.lastName}`.trim() || profile.studentId;
    const r = reserveBook(book.id, profile.studentId, name);
    if (!r.ok) { showToast(`${r.error}`); setConfirmBook(null); return; }
    showToast(r.status === 'ready'
      ? `✅ จอง "${book.title}" สำเร็จ — รับได้ที่ห้องสมุดภายใน 3 วัน`
      : `⏳ "${book.title}" เล่มหมด — เข้าคิวรอแล้ว จะแจ้งเตือนเมื่อถึงคิว`);
    setConfirmBook(null);
    refresh();
  }

  function handleCancel(r: Reservation & { book?: CatalogBook }) {
    if (!confirm(`ยกเลิกการจอง "${r.book?.title}"?`)) return;
    cancelReservation(r.id);
    showToast('ยกเลิกการจองแล้ว');
    refresh();
  }

  return (
    <div className="stu-view-wrap">
      <div className="stu-page-header">
        <h2 className="stu-page-title">📚 จองหนังสือห้องสมุด</h2>
        <p className="stu-page-sub">จองเล่มจริงล่วงหน้า · รับที่ห้องสมุดภายใน 3 วัน · เล่มหมดเข้าคิวรอได้</p>
      </div>

      {/* ── รายการจองของฉัน ── */}
      {mine.length > 0 && (
        <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 1.1rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--brown-dark)', marginBottom: '0.6rem' }}>🎫 รายการจองของฉัน ({mine.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {mine.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.55rem 0.8rem' }}>
                <span style={{ fontSize: '1.3rem' }}>{r.book?.cover}</span>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brown-dark)' }}>{r.book?.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    จองเมื่อ {new Date(r.reservedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    {r.status === 'waiting' && ` · คิวที่ ${queuePosition(r.id)}`}
                  </div>
                </div>
                <span className={`stu-hw-status-badge ${STATUS_META[r.status]?.cls || ''}`}>{STATUS_META[r.status]?.label || r.status}</span>
                {(r.status === 'ready' || r.status === 'waiting') && (
                  <button onClick={() => handleCancel(r)} style={{ background: 'none', border: '1px solid rgba(160,80,80,0.3)', color: 'var(--absent)', borderRadius: 8, padding: '0.25rem 0.7rem', fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>ยกเลิก</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ค้นหา + หมวดหมู่ (จาก catalog ที่นำเข้า) ── */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.85rem' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 ค้นหาชื่อหนังสือ / ผู้แต่ง"
          style={{ flex: 1, minWidth: 200, padding: '0.6rem 0.9rem', border: '1px solid var(--border)', borderRadius: 10, fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', outline: 'none', background: 'var(--warm-white)' }}
        />
        <div className="stu-lib-chips">
          {cats.map(c => <button key={c} className={`stu-lib-chip${catFilter === c ? ' active' : ''}`} onClick={() => setCatFilter(c)}>{c}</button>)}
        </div>
      </div>

      {/* ── รายการหนังสือ ── */}
      <div className="stu-lib-grid">
        {filtered.length === 0
          ? <div className="stu-empty">ไม่พบหนังสือในหมวดนี้</div>
          : filtered.map(book => {
              const avail = availableCopies(book.id);
              const reserved = mine.some(r => r.bookId === book.id && (r.status === 'ready' || r.status === 'waiting'));
              return (
                <div key={book.id} className="stu-lib-card" style={{ cursor: 'default' }}>
                  <div className="stu-lib-cover">{book.cover}</div>
                  <div className="stu-lib-badge">{book.category}</div>
                  <div className="stu-lib-title">{book.title}</div>
                  <div className="stu-lib-author">{book.author}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: avail > 0 ? 'var(--success)' : 'var(--absent)', margin: '0.3rem 0' }}>
                    {avail > 0 ? `เหลือ ${avail} เล่ม` : 'เล่มหมด — จองเข้าคิวได้'}
                  </div>
                  {reserved
                    ? <div className="stu-lib-done">✓ จองแล้ว</div>
                    : (
                      <button className="stu-hw-submit-btn" style={{ width: '100%', marginTop: '0.25rem' }} onClick={() => setConfirmBook(book)}>
                        {avail > 0 ? '📚 จองเล่มนี้' : '⏳ เข้าคิวรอ'}
                      </button>
                    )}
                </div>
              );
            })}
      </div>

      {/* ── Popup ยืนยันการจอง ── */}
      {confirmBook && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(18,10,4,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: 'min(360px, 92vw)', background: 'var(--warm-white)', borderRadius: 16, padding: '1.5rem', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{confirmBook.cover}</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--brown-dark)', marginBottom: '0.25rem' }}>{confirmBook.title}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{confirmBook.author} · หมวด{confirmBook.category}</div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-body)', marginBottom: '1.25rem' }}>
              {availableCopies(confirmBook.id) > 0
                ? 'ยืนยันการจอง? รับหนังสือได้ที่ห้องสมุดภายใน 3 วัน'
                : 'เล่มหมดชั่วคราว — ยืนยันเข้าคิวรอ? ระบบจะแจ้งเตือนเมื่อถึงคิว'}
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
              <button className="stu-hw-submit-btn" onClick={() => handleReserve(confirmBook)}>✅ ยืนยันการจอง</button>
              <button className="stu-hw-submit-btn" style={{ background: 'var(--text-muted)' }} onClick={() => setConfirmBook(null)}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
