'use client';

/**
 * จัดการข่าว & ฟีด (web admin) — แหล่งข้อมูลเดียวของการ์ดบนแดชบอร์ดครู/นักเรียน + หน้าแรก
 * ออกแบบให้ "ไม่งง": แท็บแยกตามชนิดชัดเจน · 1 ฟอร์มเพิ่ม/แก้ · list + preview + ลบ ในหน้าเดียว
 */

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import {
  getFeed, getRailItems, createFeed, updateFeed, deleteFeed, moveFeed, setPlacement, fileToDataUrl,
  FEED_META, type FeedItem, type FeedType, type RailSide,
} from '@/lib/api/feed.store';
import { logActivity } from '@/lib/api/activity.log';

const TYPES = Object.keys(FEED_META) as FeedType[];
const SIDES: { side: RailSide; label: string }[] = [
  { side: 'left', label: '◀ รางซ้าย (วันหยุด & ข่าวสาร)' },
  { side: 'right', label: 'รางขวา (กิจกรรม & เกร็ดความรู้) ▶' },
];

export default function ContentView() {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'content' | 'arrange'>('content');
  const [tab, setTab] = useState<FeedType>('activity');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [rails, setRails] = useState<Record<RailSide, FeedItem[]>>({ left: [], right: [] });

  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body,  setBody]  = useState('');
  const [date,  setDate]  = useState('');
  const [image, setImage] = useState<string | undefined>();
  const [pinned, setPinned] = useState(false);
  const [place, setPlace] = useState<RailSide>('right');
  const [showForm, setShowForm] = useState(false);

  function refresh() {
    setItems(getFeed(tab));
    setRails({ left: getRailItems('left'), right: getRailItems('right') });
  }
  useEffect(refresh, [tab]);

  function reset() {
    setEditId(null); setTitle(''); setBody(''); setDate(''); setImage(undefined); setPinned(false); setPlace('right'); setShowForm(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  function edit(it: FeedItem) {
    setEditId(it.id); setTitle(it.title); setBody(it.body); setDate(it.date);
    setImage(it.image); setPinned(it.pinned); setPlace(it.placement); setShowForm(true);
  }

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2_500_000) { showToast('⚠️ ไฟล์ใหญ่เกิน ~2.5MB — ย่อรูปก่อน'); return; }
    setImage(await fileToDataUrl(f));
  }

  function submit() {
    if (!title.trim() || !body.trim()) { showToast('⚠️ กรอกหัวข้อและเนื้อหาก่อน'); return; }
    const payload = { type: tab, title: title.trim(), body: body.trim(), date: date.trim() || 'อัปเดตล่าสุด', image, pinned, placement: place };
    if (editId !== null) {
      updateFeed(editId, payload);
      logActivity('admin', 'แก้ไขข่าว/ฟีด', `${FEED_META[tab].label}: ${title.trim()}`);
      showToast('✅ แก้ไขแล้ว');
    } else {
      createFeed(payload);
      logActivity('admin', 'เพิ่มข่าว/ฟีด', `${FEED_META[tab].label}: ${title.trim()}`);
      showToast('✅ เพิ่มแล้ว — แสดงบนแดชบอร์ดครู/นักเรียนทันที');
    }
    reset(); refresh();
  }

  const input: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8,
    fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', background: 'var(--warm-white)', color: 'var(--text-body)',
  };

  return (
    <div className="dash-section">
      <div className="dash-section-title">📰 จัดการข่าว & ฟีด — แสดงบนแดชบอร์ดครู/นักเรียน + หน้าแรก</div>

      {/* สลับโหมด: แก้เนื้อหา ↔ จัดตำแหน่งราง */}
      <div className="dash-tabs-bar" style={{ marginBottom: '1rem' }}>
        <button className={`dash-tab-btn${mode === 'content' ? ' active' : ''}`} onClick={() => { setMode('content'); reset(); }}>✍️ เนื้อหา (เพิ่ม/แก้/ลบ)</button>
        <button className={`dash-tab-btn${mode === 'arrange' ? ' active' : ''}`} onClick={() => { setMode('arrange'); refresh(); }}>🧭 จัดตำแหน่งราง (ซ้าย/ขวา)</button>
      </div>

      {mode === 'arrange' && (
        <>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            ลากลำดับด้วยปุ่ม ▲▼ · ย้ายฝั่งซ้าย/ขวาได้ · ลำดับนี้คือลำดับจริงที่โผล่บนแดชบอร์ด (ปักหมุด 📌 จะเด้งขึ้นบนสุดเสมอ)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {SIDES.map(({ side, label }) => (
              <div key={side} style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.9rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--brown-dark)', fontSize: '0.85rem', marginBottom: '0.6rem' }}>{label} · {rails[side].length}</div>
                <div style={{ display: 'grid', gap: '0.4rem' }}>
                  {rails[side].length === 0 ? <div className="stu-empty">ว่าง</div> : rails[side].map((it, i) => (
                    <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.6rem' }}>
                      <span style={{ fontSize: '1rem' }}>{FEED_META[it.type].icon}</span>
                      <div style={{ flex: 1, minWidth: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--brown-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.pinned && '📌 '}{it.title}</div>
                      <button title="ขึ้น"  disabled={i === 0} onClick={() => { moveFeed(it.id, 'up'); refresh(); }}   style={{ border: '1px solid var(--border)', background: 'var(--warm-white)', borderRadius: 6, cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1, width: 26, height: 24 }}>▲</button>
                      <button title="ลง"    disabled={i === rails[side].length - 1} onClick={() => { moveFeed(it.id, 'down'); refresh(); }} style={{ border: '1px solid var(--border)', background: 'var(--warm-white)', borderRadius: 6, cursor: i === rails[side].length - 1 ? 'default' : 'pointer', opacity: i === rails[side].length - 1 ? 0.3 : 1, width: 26, height: 24 }}>▼</button>
                      <button title="ย้ายอีกฝั่ง" onClick={() => { setPlacement(it.id, side === 'left' ? 'right' : 'left'); refresh(); showToast(`ย้ายไป${side === 'left' ? 'ขวา' : 'ซ้าย'}แล้ว`); }} style={{ border: '1px solid var(--border)', background: 'var(--warm-white)', borderRadius: 6, cursor: 'pointer', width: 30, height: 24 }}>{side === 'left' ? '▶' : '◀'}</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {mode === 'content' && (<>
      {/* แท็บชนิด */}
      <div className="dash-tabs-bar" style={{ marginBottom: '1.25rem' }}>
        {TYPES.map(ty => (
          <button key={ty} className={`dash-tab-btn${tab === ty ? ' active' : ''}`}
            onClick={() => { setTab(ty); reset(); }}>
            {FEED_META[ty].icon} {FEED_META[ty].label} ({getFeed(ty).length})
          </button>
        ))}
      </div>

      {/* ปุ่มเพิ่ม / ฟอร์ม */}
      {!showForm ? (
        <button className="dash-action-btn" style={{ marginBottom: '1rem' }} onClick={() => { reset(); setPlace(tab === 'news' || tab === 'holiday' ? 'left' : 'right'); setShowForm(true); }}>
          ➕ เพิ่ม{FEED_META[tab].label}
        </button>
      ) : (
        <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--brown-dark)' }}>
            {editId !== null ? '✏️ แก้ไข' : '➕ เพิ่ม'}{FEED_META[tab].label}
          </div>
          <input style={input} placeholder="หัวข้อ" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea style={{ ...input, resize: 'vertical' }} rows={3} placeholder="เนื้อหา" value={body} onChange={e => setBody(e.target.value)} />
          <input style={input} placeholder="วันที่ เช่น 29 ก.ค. 2569 (ไม่บังคับ)" value={date} onChange={e => setDate(e.target.value)} />

          {/* อัปโหลดรูปจริง */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} style={{ fontSize: '0.8rem' }} />
            {image && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img src={image} alt="" style={{ width: 80, height: 54, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                <button className="dash-action-btn" style={{ opacity: 0.7 }} onClick={() => { setImage(undefined); if (fileRef.current) fileRef.current.value = ''; }}>ลบรูป</button>
              </div>
            )}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>รูปเก็บเป็นไฟล์จริง (base64) · แนะนำ ≤ 2.5MB · TODO: ย้ายขึ้น storage จริงภายหลัง</div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
            🧭 แสดงที่ราง:
            <select value={place} onChange={e => setPlace(e.target.value as RailSide)} style={{ ...input, width: 'auto', cursor: 'pointer' }}>
              <option value="left">◀ ซ้าย (วันหยุด & ข่าวสาร)</option>
              <option value="right">ขวา (กิจกรรม & เกร็ดความรู้) ▶</option>
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} /> 📌 ปักหมุดขึ้นก่อน
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="dash-action-btn" onClick={submit}>{editId !== null ? '💾 บันทึก' : '📤 เผยแพร่'}</button>
            <button className="dash-action-btn" style={{ opacity: 0.7 }} onClick={reset}>ยกเลิก</button>
          </div>
        </div>
      )}

      {/* รายการ + preview */}
      {items.length === 0 ? (
        <div className="stu-empty">ยังไม่มี{FEED_META[tab].label} — กด “➕ เพิ่ม” เพื่อเริ่ม</div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {items.map(it => (
            <div key={it.id} style={{ display: 'flex', gap: '0.85rem', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.85rem', alignItems: 'center' }}>
              {it.image
                ? <img src={it.image} alt="" style={{ width: 90, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                : <div style={{ width: 90, height: 60, borderRadius: 8, background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0 }}>{FEED_META[it.type].icon}</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--brown-dark)' }}>{it.pinned && '📌 '}{it.title}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.body}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{it.date}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <button onClick={() => edit(it)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-deep)', fontSize: '0.78rem' }}>แก้ไข</button>
                <button onClick={() => { if (confirm(`ลบ "${it.title}"?`)) { deleteFeed(it.id); refresh(); showToast('ลบแล้ว'); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--absent)', fontSize: '0.78rem' }}>ลบ</button>
              </div>
            </div>
          ))}
        </div>
      )}
      </>)}
    </div>
  );
}
