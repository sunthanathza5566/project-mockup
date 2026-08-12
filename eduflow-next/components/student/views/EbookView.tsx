'use client';

/**
 * ห้องสมุดออนไลน์ — เช่าอ่านหนังสืออิเล็กทรอนิกส์ (ไม่ใช่จองมารับ)
 *   เช่าเพื่อเปิดสิทธิ์อ่านตามเวลา → อ่านออนไลน์ → หมดเวลาสิทธิ์ถูกตัดอัตโนมัติ (อ่านอีกต้องเช่าใหม่)
 *
 * 3 แท็บ: เช่าหนังสือ · ชั้นหนังสือของฉัน (ที่เช่าอยู่) · ประวัติ & แต้มนักอ่าน
 */

import { useCallback, useEffect, useState } from 'react';
import type { StudentProfile } from '@/lib/types';
import {
  getEbookCatalog, getEbookCategories, rentEbook, returnEbook, markCompleted,
  getActiveRentals, getRentalHistory, getReaderStats, getBookPages, remainingMs,
  RENT_OPTIONS, READER_RANKS,
  type EbookInfo, type EbookRental, type ReaderStats,
} from '@/lib/api/ebook.store';

interface Props { profile: StudentProfile; showToast: (m: string) => void }

type Tab = 'rent' | 'shelf' | 'history';

function fmtRemain(ms: number): string {
  if (ms <= 0) return 'หมดเวลาแล้ว';
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  if (d >= 1) return `เหลือ ${d} วัน ${h % 24} ชม.`;
  const m = Math.floor((ms % 3600000) / 60000);
  return h >= 1 ? `เหลือ ${h} ชม. ${m} นาที` : `เหลือ ${m} นาที`;
}

export default function EbookView({ profile, showToast }: Props) {
  const student = { code: profile.studentId, name: `${profile.firstName} ${profile.lastName}`.trim() };

  const [tab, setTab]         = useState<Tab>('rent');
  const [catalog, setCatalog] = useState<EbookInfo[]>([]);
  const [cats, setCats]       = useState<string[]>([]);
  const [catFilter, setCatFilter] = useState('ทั้งหมด');
  const [active, setActive]   = useState<EbookRental[]>([]);
  const [history, setHistory] = useState<EbookRental[]>([]);
  const [stats, setStats]     = useState<ReaderStats | null>(null);

  const [rentBook, setRentBook] = useState<EbookInfo | null>(null);
  const [rentDays, setRentDays] = useState(7);
  const [reader, setReader]     = useState<{ rental: EbookRental; pages: string[]; page: number } | null>(null);

  const refresh = useCallback(() => {
    setActive(getActiveRentals(student.code));
    setHistory(getRentalHistory(student.code));
    setStats(getReaderStats(student.code));
  }, [student.code]);

  useEffect(() => {
    setCatalog(getEbookCatalog());
    setCats(getEbookCategories());
    refresh();
  }, [refresh]);

  // นับเวลาถอยหลังของเล่มที่เช่าอยู่ (อัปเดตทุก 30 วิ — พอหมดเวลาจะหลุดจากชั้นเอง)
  useEffect(() => {
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  const filtered = catFilter === 'ทั้งหมด' ? catalog : catalog.filter(b => b.category === catFilter);

  function doRent() {
    if (!rentBook) return;
    const r = rentEbook(rentBook.id, rentDays, student);
    if (!r.ok) { showToast(`${r.error}`); setRentBook(null); return; }
    showToast(`เช่า "${rentBook.title}" ${rentDays} วันแล้ว — เปิดอ่านได้เลย`);
    setRentBook(null);
    setTab('shelf');
    refresh();
  }

  function openReader(rental: EbookRental) {
    setReader({ rental, pages: getBookPages(rental.bookId), page: 0 });
  }

  function flip(dir: 1 | -1) {
    if (!reader) return;
    const page = Math.min(Math.max(reader.page + dir, 0), reader.pages.length - 1);
    // อ่านถึงหน้าสุดท้าย = ทำเครื่องหมายอ่านจบ (นับเป็นแต้มนักอ่าน)
    const reachedEnd = page === reader.pages.length - 1 && !reader.rental.completed;
    setReader({ ...reader, page, rental: reachedEnd ? { ...reader.rental, completed: true } : reader.rental });
    if (reachedEnd) {
      markCompleted(reader.rental.id);
      showToast('อ่านจบแล้ว! ได้รับแต้มนักอ่าน +1');
      refresh();
    }
  }

  function handleReturn(rental: EbookRental) {
    if (!window.confirm(`คืนหนังสือ "${rental.bookTitle}" ก่อนกำหนด? สิทธิ์อ่านจะถูกตัดทันที`)) return;
    returnEbook(rental.id);
    showToast('↩️ คืนหนังสือแล้ว');
    refresh();
  }

  return (
    <div className="stu-view-wrap">
      <div className="stu-page-header">
        <h2 className="stu-page-title">📱 ห้องสมุดออนไลน์</h2>
        <p className="stu-page-sub">เช่าอ่านหนังสืออิเล็กทรอนิกส์ — อ่านออนไลน์ตามเวลาที่เช่า · สะสมแต้มเลื่อนระดับนักอ่าน</p>
      </div>

      {/* แท็บ */}
      <div className="stu-filters">
        <button className={`stu-filter-chip${tab === 'rent' ? ' active' : ''}`} onClick={() => setTab('rent')}>📚 เช่าหนังสือ</button>
        <button className={`stu-filter-chip${tab === 'shelf' ? ' active' : ''}`} onClick={() => setTab('shelf')}>📖 ชั้นหนังสือของฉัน ({active.length})</button>
        <button className={`stu-filter-chip${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>🏅 ประวัติ & นักอ่าน</button>
      </div>

      {/* ── แท็บเช่าหนังสือ ── */}
      {tab === 'rent' && (
        <>
          <div className="stu-lib-chips" style={{ marginBottom: '1rem' }}>
            {cats.map(c => (
              <button key={c} className={`stu-lib-chip${catFilter === c ? ' active' : ''}`} onClick={() => setCatFilter(c)}>{c}</button>
            ))}
          </div>
          <div className="stu-lib-grid">
            {filtered.map(b => {
              const rented = active.some(r => r.bookId === b.id);
              return (
                <div key={b.id} className="stu-lib-card" onClick={() => rented ? setTab('shelf') : setRentBook(b)}>
                  <div className="stu-lib-cover">{b.cover}</div>
                  <span className="stu-lib-badge" style={{ background: 'var(--cream-dark)', color: 'var(--brown-deep)' }}>{b.category}</span>
                  <div className="stu-lib-title">{b.title}</div>
                  <div className="stu-lib-author">{b.author} · {b.pages} หน้า</div>
                  {rented
                    ? <span className="stu-lib-done">✓ เช่าอยู่ — เปิดอ่าน</span>
                    : <div className="stu-cls-btn" style={{ marginTop: '0.4rem' }}>เช่าอ่าน</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── แท็บชั้นหนังสือ ── */}
      {tab === 'shelf' && (
        active.length === 0 ? (
          <div className="stu-empty">ยังไม่มีหนังสือที่เช่าอยู่ — ไปที่แท็บ “เช่าหนังสือ” เพื่อเริ่มอ่าน 📚</div>
        ) : (
          <div className="stu-hw-list">
            {active.map(r => (
              <div key={r.id} className="stu-hw-card">
                <div className="stu-hw-card-top">
                  <span style={{ fontSize: '2rem' }}>{r.cover}</span>
                  <span className="stu-hw-status-badge badge-graded">{fmtRemain(remainingMs(r))}</span>
                </div>
                <div className="stu-hw-card-title">{r.bookTitle}</div>
                <div className="stu-hw-card-meta">
                  <span>{r.category}</span>
                  <span>เช่า {r.durationDays} วัน</span>
                  <span>{r.completed ? '✓ อ่านจบแล้ว' : 'ยังอ่านไม่จบ'}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="stu-hw-submit-btn" onClick={() => openReader(r)}>📖 เปิดอ่าน</button>
                  <button className="stu-hw-submit-btn" style={{ background: 'var(--text-muted)' }} onClick={() => handleReturn(r)}>↩️ คืนก่อนกำหนด</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── แท็บประวัติ & นักอ่าน ── */}
      {tab === 'history' && stats && (
        <>
          {/* การ์ดระดับนักอ่าน */}
          <div className="stu-greeting-bar" style={{ alignItems: 'center' }}>
            <div>
              <div className="stu-greeting-sub">ระดับนักอ่านของคุณ</div>
              <h1 className="stu-greeting-name" style={{ color: stats.rank.color }}>{stats.rank.icon} {stats.rank.label}</h1>
              <div className="stu-greeting-date">
                อ่านจบแล้ว {stats.booksCompleted} เล่ม · เช่าทั้งหมด {stats.totalRentals} ครั้ง
                {stats.nextRank && ` · อีก ${stats.toNext} เล่มถึงระดับ ${stats.nextRank.label}`}
              </div>
            </div>
            <div style={{ fontSize: '3rem' }}>{stats.rank.icon}</div>
          </div>

          {/* แถบความคืบหน้าไประดับถัดไป */}
          {stats.nextRank && (
            <div className="stu-section">
              <div className="stu-cls-bar-wrap" style={{ height: 10 }}>
                <div className="stu-cls-bar-fill" style={{
                  width: `${Math.min(100, (stats.booksCompleted / stats.nextRank.min) * 100)}%`,
                  background: stats.rank.color,
                }} />
              </div>
              <div className="stu-att-summary" style={{ marginTop: '0.4rem' }}>
                {stats.booksCompleted} / {stats.nextRank.min} เล่ม → {stats.nextRank.icon} {stats.nextRank.label}
              </div>
            </div>
          )}

          {/* ระดับทั้งหมด */}
          <div className="stu-section">
            <div className="stu-section-title">ระดับนักอ่านทั้งหมด</div>
            <div className="stu-lib-chips">
              {READER_RANKS.map(r => (
                <span key={r.key} className="stu-lib-chip" style={{
                  borderColor: r.key === stats.rank.key ? r.color : undefined,
                  background: r.key === stats.rank.key ? 'var(--cream-dark)' : undefined,
                  fontWeight: r.key === stats.rank.key ? 700 : 400,
                }}>
                  {r.icon} {r.label} ({r.min}+ เล่ม)
                </span>
              ))}
            </div>
          </div>

          {/* สรุปตามหมวด */}
          {Object.keys(stats.byCategory).length > 0 && (
            <div className="stu-section">
              <div className="stu-section-title">สรุปการอ่านตามหมวดหมู่</div>
              <div className="stu-hw-summary-row">
                {Object.entries(stats.byCategory).map(([cat, n]) => (
                  <div key={cat} className="stu-hw-sum stu-hw-sum-graded"><strong>{n}</strong> {cat}</div>
                ))}
              </div>
            </div>
          )}

          {/* ประวัติการเช่า */}
          <div className="stu-section">
            <div className="stu-section-title">ประวัติการเช่าหนังสือ</div>
            {history.length === 0 ? (
              <div className="stu-empty">ยังไม่มีประวัติการเช่า</div>
            ) : (
              <div className="stu-hw-list">
                {history.map(r => {
                  const act = Date.now() < r.expiresAt;
                  return (
                    <div key={r.id} className="stu-hw-row" style={{ cursor: 'default' }}>
                      <span style={{ fontSize: '1.3rem' }}>{r.cover}</span>
                      <div className="stu-hw-info">
                        <div className="stu-hw-title">{r.bookTitle}</div>
                        <div className="stu-hw-meta">
                          {r.category} · เช่า {new Date(r.rentedAt).toLocaleDateString('th-TH')} ({r.durationDays} วัน)
                          {r.completed && ' · ✓ อ่านจบ'}
                        </div>
                      </div>
                      <span className={`stu-hw-badge ${act ? 'badge-graded' : 'badge-submitted'}`}>{act ? 'กำลังเช่า' : 'หมดอายุ'}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="sched-log-meta" style={{ marginTop: '0.6rem' }}>บันทึกไว้เผื่อระบบแลกแต้ม/รางวัลยอดนักอ่านในอนาคต: {profile.firstName} {profile.lastName} เช่าหนังสือรวม {stats.totalRentals} ครั้ง
            </div>
          </div>
        </>
      )}

      {/* ── Popup เลือกระยะเวลาเช่า ── */}
      {rentBook && (
        <div className="sched-modal-wrap" onClick={() => setRentBook(null)}>
          <div className="sched-modal" style={{ width: 'min(400px, 94vw)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '3rem' }}>{rentBook.cover}</div>
            <div className="sched-modal-title">เช่าอ่าน “{rentBook.title}”</div>
            <div className="sched-modal-sub">{rentBook.author} · {rentBook.category} · {rentBook.pages} หน้า</div>
            <div className="stu-lib-filter-label" style={{ textAlign: 'left' }}>เลือกระยะเวลาเช่า</div>
            <div className="stu-lib-chips" style={{ marginBottom: '1rem' }}>
              {RENT_OPTIONS.map(o => (
                <button key={o.days} className={`stu-lib-chip${rentDays === o.days ? ' active' : ''}`} onClick={() => setRentDays(o.days)}>{o.label}</button>
              ))}
            </div>
            <div className="ez-help-box" style={{ textAlign: 'left', marginBottom: '0.85rem' }}>
              หมดเวลาเช่า สิทธิ์อ่านจะถูกตัดอัตโนมัติ — อยากอ่านอีกต้องเช่าใหม่
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button className="stu-hw-submit-btn" style={{ flex: 1 }} onClick={doRent}>📖 ยืนยันเช่า {rentDays} วัน</button>
              <button className="stu-hw-submit-btn" style={{ flex: 1, background: 'var(--text-muted)' }} onClick={() => setRentBook(null)}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* ── หน้าอ่าน (Reader) ── */}
      {reader && (
        <div className="ebook-reader">
          <div className="ebook-reader-bar">
            <span className="ebook-reader-title">{reader.rental.bookTitle}</span>
            <button className="stu-notif-ph-close" onClick={() => setReader(null)}>✕ ปิด</button>
          </div>
          <div className="ebook-reader-page">
            {reader.pages[reader.page].split('\n').map((line, i) => (
              <p key={i} style={{ margin: line ? '0 0 0.8rem' : '0.4rem 0' }}>{line}</p>
            ))}
          </div>
          <div className="ebook-reader-nav">
            <button className="stu-btn-outline" disabled={reader.page === 0} onClick={() => flip(-1)}>← ก่อนหน้า</button>
            <span className="ebook-reader-count">หน้า {reader.page + 1} / {reader.pages.length}</span>
            <button className="stu-btn-outline" disabled={reader.page >= reader.pages.length - 1} onClick={() => flip(1)}>ถัดไป →</button>
          </div>
        </div>
      )}
    </div>
  );
}
