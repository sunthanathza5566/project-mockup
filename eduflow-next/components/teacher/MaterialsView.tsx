'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getMaterials, createMaterial, updateMaterial, deleteMaterial, toggleMaterialPin,
  getAnnouncements, createAnnouncement, deleteAnnouncement,
  type Material, type Announcement, type MaterialType,
} from '@/lib/api/materials.store';
import { logActivity } from '@/lib/api/activity.log';
import { useDialog } from '@/context/DialogContext';

interface Props {
  teacherName: string;
  selectedClass: { id: string; grade: string; room: string; subject: string };
}

const TYPE_META: Record<MaterialType, { icon: string; label: string; color: string }> = {
  file:  { icon: '📄', label: 'ไฟล์เอกสาร', color: '#C4804A' },
  video: { icon: '🎬', label: 'วิดีโอ',      color: '#B5533E' },
  link:  { icon: '🔗', label: 'ลิงก์',       color: '#4A7BA6' },
};

type SortKey = 'recent' | 'views' | 'title';
const SORT_META: Record<SortKey, string> = { recent: '🕐 ล่าสุด', views: '👁 ยอดเข้าชม', title: '🔤 ชื่อ A-Z' };

const UNCATEGORIZED = 'ทั่วไป';

export default function MaterialsView({ teacherName, selectedClass }: Props) {
  const { confirm, notify } = useDialog();
  const [tab, setTab] = useState<'materials' | 'announcements'>('materials');

  const [materials,     setMaterials]     = useState<Material[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // ── ฟอร์มสื่อการสอน (ใช้ทั้งเพิ่มและแก้ไข) ──
  const [showMatForm, setShowMatForm] = useState(false);
  const [editId,   setEditId]   = useState<number | null>(null);
  const [matType,  setMatType]  = useState<MaterialType>('file');
  const [matTitle, setMatTitle] = useState('');
  const [matDesc,  setMatDesc]  = useState('');
  const [matUrl,   setMatUrl]   = useState('');
  const [matCat,   setMatCat]   = useState('');
  const [matPin,   setMatPin]   = useState(false);

  // ── ตัวกรอง/ค้นหา/เรียง ──
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState<MaterialType | 'all'>('all');
  const [sortKey,    setSortKey]    = useState<SortKey>('recent');

  // ── ฟอร์มประกาศ ──
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annTitle,  setAnnTitle]  = useState('');
  const [annBody,   setAnnBody]   = useState('');
  const [annPinned, setAnnPinned] = useState(false);

  const refresh = useCallback(() => {
    setMaterials(getMaterials(selectedClass.id));
    setAnnouncements(getAnnouncements(selectedClass.id));
  }, [selectedClass.id]);

  useEffect(() => { refresh(); }, [refresh]);

  // หมวดหมู่ที่มีอยู่แล้ว — ใช้เป็น datalist ให้เลือกซ้ำได้ง่าย
  const existingCats = useMemo(
    () => Array.from(new Set(materials.map(m => m.category).filter(Boolean))),
    [materials],
  );

  function resetForm() {
    setEditId(null); setMatType('file'); setMatTitle(''); setMatDesc('');
    setMatUrl(''); setMatCat(''); setMatPin(false); setShowMatForm(false);
  }

  function openCreate() {
    resetForm(); setShowMatForm(true);
  }

  function openEdit(m: Material) {
    setEditId(m.id); setMatType(m.type); setMatTitle(m.title); setMatDesc(m.description);
    setMatUrl(m.url); setMatCat(m.category); setMatPin(m.pinned); setShowMatForm(true);
  }

  async function handleSaveMaterial() {
    if (!matTitle.trim()) { notify({ title: 'ข้อมูลไม่ครบ', message: 'กรอกชื่อสื่อการสอนก่อน', variant: 'warning' }); return; }
    if ((matType === 'link' || matType === 'video') && !matUrl.trim()) { notify({ title: 'ข้อมูลไม่ครบ', message: 'กรอก URL ก่อน', variant: 'warning' }); return; }

    const editing = editId !== null;
    if (!(await confirm({ title: editing ? 'บันทึกการแก้ไขสื่อ?' : 'เผยแพร่สื่อให้นักเรียน?', message: <><b>{matTitle.trim()}</b>{editing ? '' : <><br /><span style={{ color: 'var(--text-muted)' }}>จะแจ้งเตือนถึงนักเรียนในห้อง</span></>}</>, confirmText: editing ? 'บันทึกการแก้ไข' : 'เผยแพร่' }))) return;

    if (editing) {
      updateMaterial(editId!, {
        type: matType, title: matTitle.trim(), description: matDesc.trim(),
        url: matUrl.trim() || `${matTitle.trim()}.pdf`, category: matCat.trim(), pinned: matPin,
      });
      logActivity('teacher', 'แก้ไขสื่อการสอน', `${matTitle.trim()} — ${selectedClass.grade}/${selectedClass.room} ${selectedClass.subject}`);
    } else {
      createMaterial({
        classId: selectedClass.id, type: matType,
        title: matTitle.trim(), description: matDesc.trim(),
        url: matUrl.trim() || `${matTitle.trim()}.pdf`,
        category: matCat.trim(), pinned: matPin, teacherName,
      });
      logActivity('teacher', 'เพิ่มสื่อการสอน', `${matTitle.trim()} — ${selectedClass.grade}/${selectedClass.room} ${selectedClass.subject}`);
    }
    resetForm();
    refresh();
    notify({ title: editing ? 'แก้ไขสื่อแล้ว' : 'เผยแพร่สื่อแล้ว', message: editing ? matTitle.trim() : 'แจ้งเตือนถึงนักเรียนในห้องแล้ว', variant: 'success' });
  }

  async function handleCreateAnnouncement() {
    if (!annTitle.trim() || !annBody.trim()) { notify({ title: 'ข้อมูลไม่ครบ', message: 'กรอกหัวข้อและเนื้อหาก่อน', variant: 'warning' }); return; }
    if (!(await confirm({ title: 'โพสต์ประกาศนี้?', message: <><b>{annTitle.trim()}</b><br /><span style={{ color: 'var(--text-muted)' }}>จะแจ้งเตือนถึงนักเรียนในห้อง</span></>, confirmText: 'โพสต์ประกาศ' }))) return;
    createAnnouncement({
      classId: selectedClass.id,
      title: annTitle.trim(), body: annBody.trim(), pinned: annPinned,
      teacherName,
    });
    logActivity('teacher', 'โพสต์ประกาศ', `${annTitle.trim()} — ${selectedClass.grade}/${selectedClass.room} ${selectedClass.subject}`);
    setAnnTitle(''); setAnnBody(''); setAnnPinned(false); setShowAnnForm(false);
    refresh();
    notify({ title: 'โพสต์ประกาศแล้ว', message: 'แจ้งเตือนถึงนักเรียนในห้องแล้ว', variant: 'success' });
  }

  // ── กรอง + เรียง + จัดกลุ่มตามหมวด ──
  const visibleMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = materials.filter(m =>
      (typeFilter === 'all' || m.type === typeFilter) &&
      (!q || m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)),
    );
    if (sortKey === 'views') list = [...list].sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (b.views - a.views));
    else if (sortKey === 'title') list = [...list].sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || a.title.localeCompare(b.title, 'th'));
    return list;
  }, [materials, search, typeFilter, sortKey]);

  const grouped = useMemo(() => {
    const map = new Map<string, Material[]>();
    for (const m of visibleMaterials) {
      const key = m.category.trim() || UNCATEGORIZED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    // หมวด "ทั่วไป" ไว้ท้ายสุดเสมอ
    return Array.from(map.entries()).sort(([a], [b]) =>
      a === UNCATEGORIZED ? 1 : b === UNCATEGORIZED ? -1 : a.localeCompare(b, 'th'),
    );
  }, [visibleMaterials]);

  const totalViews = useMemo(() => materials.reduce((s, m) => s + m.views, 0), [materials]);
  const countByType = (t: MaterialType) => materials.filter(m => m.type === t).length;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8,
    fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', outline: 'none',
    background: 'var(--warm-white)', color: 'var(--text-body)',
  };

  return (
    <div className="dash-section">
      <div className="dash-section-title">สื่อการสอน & ประกาศ — {selectedClass.grade}/{selectedClass.room} {selectedClass.subject}
      </div>

      {/* Tabs */}
      <div className="dash-tabs-bar" style={{ marginBottom: '1.25rem' }}>
        <button className={`dash-tab-btn${tab === 'materials' ? ' active' : ''}`} onClick={() => setTab('materials')}>
          📁 สื่อการสอน ({materials.length})
        </button>
        <button className={`dash-tab-btn${tab === 'announcements' ? ' active' : ''}`} onClick={() => setTab('announcements')}>
          📢 ประกาศ ({announcements.length})
        </button>
      </div>

      {/* ── สื่อการสอน ── */}
      {tab === 'materials' && (
        <div style={{ display: 'grid', gap: '1rem' }}>

          {/* สรุปภาพรวม */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.6rem' }}>
            {[
              { icon: '📚', num: materials.length,   label: 'สื่อทั้งหมด' },
              { icon: '📄', num: countByType('file'), label: 'ไฟล์เอกสาร' },
              { icon: '🎬', num: countByType('video'),label: 'วิดีโอ' },
              { icon: '🔗', num: countByType('link'), label: 'ลิงก์' },
              { icon: '👁', num: totalViews,          label: 'ยอดเข้าชมรวม' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.75rem 0.9rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem' }}>{s.icon}</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--brown-dark)', lineHeight: 1.2 }}>{s.num}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ฟอร์มเพิ่ม/แก้ไข */}
          {!showMatForm ? (
            <button className="dash-action-btn" style={{ justifySelf: 'start' }} onClick={openCreate}>
              ➕ เพิ่มสื่อการสอน
            </button>
          ) : (
            <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--brown-dark)', fontSize: '0.9rem' }}>
                {editId !== null ? '✏️ แก้ไขสื่อการสอน' : '➕ เพิ่มสื่อการสอนใหม่'}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {(Object.keys(TYPE_META) as MaterialType[]).map(t => (
                  <button key={t} className={`dash-tab-btn${matType === t ? ' active' : ''}`} onClick={() => setMatType(t)}>
                    {TYPE_META[t].icon} {TYPE_META[t].label}
                  </button>
                ))}
              </div>
              <input style={inputStyle} placeholder="ชื่อสื่อ เช่น สรุปบทที่ 4 สมการเชิงเส้น" value={matTitle} onChange={e => setMatTitle(e.target.value)} />
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="คำอธิบาย (ไม่บังคับ)" value={matDesc} onChange={e => setMatDesc(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>หน่วย / บทเรียน (จัดหมวด)</label>
                  <input style={inputStyle} list="mat-cats" placeholder="เช่น บทที่ 1, ใบงาน" value={matCat} onChange={e => setMatCat(e.target.value)} />
                  <datalist id="mat-cats">
                    {existingCats.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-body)', cursor: 'pointer', paddingBottom: '0.5rem' }}>
                  <input type="checkbox" checked={matPin} onChange={e => setMatPin(e.target.checked)} />
                  📌 ปักหมุดให้เด่นบนสุด
                </label>
              </div>
              {matType === 'file' ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--warm-white)', border: '1px dashed var(--border)', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
                  📎 แนบไฟล์ — TODO(PostgreSQL): เชื่อม storage จริง (ตอนนี้ mock เป็นชื่อไฟล์)
                </div>
              ) : (
                <input style={inputStyle} placeholder="URL เช่น https://youtube.com/..." value={matUrl} onChange={e => setMatUrl(e.target.value)} />
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="dash-action-btn" onClick={handleSaveMaterial}>
                  {editId !== null ? '💾 บันทึกการแก้ไข' : '📤 เผยแพร่ให้นักเรียน'}
                </button>
                <button className="dash-action-btn" style={{ opacity: 0.7 }} onClick={resetForm}>ยกเลิก</button>
              </div>
            </div>
          )}

          {/* แถบค้นหา / กรอง / เรียง — แสดงเมื่อมีสื่อ */}
          {materials.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <input
                style={{ ...inputStyle, flex: '1 1 180px', width: 'auto' }}
                placeholder="🔍 ค้นหาสื่อ / หมวด..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button className={`dash-tab-btn${typeFilter === 'all' ? ' active' : ''}`} onClick={() => setTypeFilter('all')}>ทั้งหมด</button>
                {(Object.keys(TYPE_META) as MaterialType[]).map(t => (
                  <button key={t} className={`dash-tab-btn${typeFilter === t ? ' active' : ''}`} onClick={() => setTypeFilter(t)}>
                    {TYPE_META[t].icon}
                  </button>
                ))}
              </div>
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value as SortKey)}
                style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}
              >
                {(Object.keys(SORT_META) as SortKey[]).map(k => <option key={k} value={k}>{SORT_META[k]}</option>)}
              </select>
            </div>
          )}

          {/* รายการสื่อ จัดกลุ่มตามหมวด */}
          {materials.length === 0 ? (
            <div className="stu-empty">ยังไม่มีสื่อการสอนในห้องนี้ — กด “➕ เพิ่มสื่อการสอน” เพื่อเริ่ม</div>
          ) : visibleMaterials.length === 0 ? (
            <div className="stu-empty">ไม่พบสื่อที่ตรงกับการค้นหา</div>
          ) : (
            grouped.map(([cat, items]) => (
              <div key={cat} style={{ display: 'grid', gap: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--brown-deep)', textTransform: 'none', marginTop: '0.25rem' }}>
                  📂 {cat}
                  <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>({items.length})</span>
                </div>
                {items.map(m => (
                  <div key={m.id} style={{ background: 'var(--cream)', border: `1px solid ${m.pinned ? 'var(--brown-light)' : 'var(--border)'}`, borderRadius: 12, padding: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ fontSize: '1.4rem' }}>{TYPE_META[m.type].icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {m.pinned && <span title="ปักหมุด">📌</span>}
                        <span style={{ fontWeight: 600, color: 'var(--brown-dark)', fontSize: '0.9rem' }}>{m.title}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: TYPE_META[m.type].color, background: 'var(--warm-white)', border: `1px solid ${TYPE_META[m.type].color}40`, borderRadius: 6, padding: '0.1rem 0.4rem' }}>
                          {TYPE_META[m.type].label}
                        </span>
                      </div>
                      {m.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{m.description}</div>}
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        {m.type !== 'file' && m.url.startsWith('http')
                          ? <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brown-deep)', textDecoration: 'underline' }}>{m.url.length > 40 ? m.url.slice(0, 40) + '…' : m.url}</a>
                          : <span>{m.url}</span>}
                        <span>👁 {m.views} ครั้ง</span>
                        <span>{new Date(m.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}{m.updatedAt ? ' · แก้ไขแล้ว' : ''}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
                      <button
                        onClick={() => { toggleMaterialPin(m.id); refresh(); }}
                        title={m.pinned ? 'เอาหมุดออก' : 'ปักหมุด'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: m.pinned ? 1 : 0.4 }}
                      >📌</button>
                      <button
                        onClick={() => openEdit(m)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-deep)', fontSize: '0.75rem' }}
                      >แก้ไข</button>
                      <button
                        onClick={async () => { if (await confirm({ title: 'ลบสื่อการสอนนี้?', message: <b>{m.title}</b>, variant: 'danger', confirmText: 'ลบสื่อ' })) { deleteMaterial(m.id); refresh(); notify({ title: 'ลบสื่อแล้ว', message: m.title, variant: 'success' }); } }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--absent)', fontSize: '0.75rem' }}
                      >ลบ</button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── ประกาศ ── */}
      {tab === 'announcements' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {!showAnnForm ? (
            <button className="dash-action-btn" style={{ justifySelf: 'start' }} onClick={() => setShowAnnForm(true)}>
              ➕ โพสต์ประกาศ
            </button>
          ) : (
            <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <input style={inputStyle} placeholder="หัวข้อประกาศ" value={annTitle} onChange={e => setAnnTitle(e.target.value)} />
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="เนื้อหาประกาศ" value={annBody} onChange={e => setAnnBody(e.target.value)} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-body)', cursor: 'pointer' }}>
                <input type="checkbox" checked={annPinned} onChange={e => setAnnPinned(e.target.checked)} />
                📌 ปักหมุดไว้บนสุด
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="dash-action-btn" onClick={handleCreateAnnouncement}>📢 โพสต์ประกาศ</button>
                <button className="dash-action-btn" style={{ opacity: 0.7 }} onClick={() => setShowAnnForm(false)}>ยกเลิก</button>
              </div>
            </div>
          )}

          {announcements.length === 0
            ? <div className="stu-empty">ยังไม่มีประกาศในห้องนี้</div>
            : announcements.map(a => (
                <div key={a.id} style={{ background: 'var(--cream)', border: `1px solid ${a.pinned ? 'var(--brown-light)' : 'var(--border)'}`, borderRadius: 12, padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, fontWeight: 600, color: 'var(--brown-dark)', fontSize: '0.9rem' }}>
                      {a.pinned && '📌 '}{a.title}
                    </div>
                    <button
                      onClick={async () => { if (await confirm({ title: 'ลบประกาศนี้?', message: <b>{a.title}</b>, variant: 'danger', confirmText: 'ลบประกาศ' })) { deleteAnnouncement(a.id); refresh(); notify({ title: 'ลบประกาศแล้ว', message: a.title, variant: 'success' }); } }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--absent)', fontSize: '0.78rem' }}
                    >
                      ลบ
                    </button>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-body)', marginTop: '0.35rem', lineHeight: 1.6 }}>{a.body}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    {a.teacherName} · {new Date(a.createdAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
