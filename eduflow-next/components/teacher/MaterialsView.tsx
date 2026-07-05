'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getMaterials, createMaterial, deleteMaterial,
  getAnnouncements, createAnnouncement, deleteAnnouncement,
  type Material, type Announcement, type MaterialType,
} from '@/lib/api/materials.store';
import { useToast } from '@/context/ToastContext';

interface Props {
  teacherName: string;
  selectedClass: { id: string; grade: string; room: string; subject: string };
}

const TYPE_META: Record<MaterialType, { icon: string; label: string }> = {
  file:  { icon: '📄', label: 'ไฟล์เอกสาร' },
  video: { icon: '🎬', label: 'วิดีโอ' },
  link:  { icon: '🔗', label: 'ลิงก์' },
};

export default function MaterialsView({ teacherName, selectedClass }: Props) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'materials' | 'announcements'>('materials');

  const [materials,     setMaterials]     = useState<Material[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // ── ฟอร์มสื่อการสอน ──
  const [showMatForm, setShowMatForm] = useState(false);
  const [matType,  setMatType]  = useState<MaterialType>('file');
  const [matTitle, setMatTitle] = useState('');
  const [matDesc,  setMatDesc]  = useState('');
  const [matUrl,   setMatUrl]   = useState('');

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

  function handleCreateMaterial() {
    if (!matTitle.trim()) { showToast('⚠️ กรอกชื่อสื่อการสอนก่อน'); return; }
    if ((matType === 'link' || matType === 'video') && !matUrl.trim()) { showToast('⚠️ กรอก URL ก่อน'); return; }
    createMaterial({
      classId: selectedClass.id, type: matType,
      title: matTitle.trim(), description: matDesc.trim(),
      url: matUrl.trim() || `${matTitle.trim()}.pdf`, // mock ชื่อไฟล์เมื่อยังไม่มี storage จริง
      teacherName,
    });
    showToast('✅ เพิ่มสื่อการสอนแล้ว — แจ้งเตือนถึงนักเรียนในห้อง');
    setMatTitle(''); setMatDesc(''); setMatUrl(''); setShowMatForm(false);
    refresh();
  }

  function handleCreateAnnouncement() {
    if (!annTitle.trim() || !annBody.trim()) { showToast('⚠️ กรอกหัวข้อและเนื้อหาก่อน'); return; }
    createAnnouncement({
      classId: selectedClass.id,
      title: annTitle.trim(), body: annBody.trim(), pinned: annPinned,
      teacherName,
    });
    showToast('✅ โพสต์ประกาศแล้ว — แจ้งเตือนถึงนักเรียนในห้อง');
    setAnnTitle(''); setAnnBody(''); setAnnPinned(false); setShowAnnForm(false);
    refresh();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8,
    fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', outline: 'none',
    background: 'var(--warm-white)', color: 'var(--text-body)',
  };

  return (
    <div className="dash-section">
      <div className="dash-section-title">
        📁 สื่อการสอน & ประกาศ — {selectedClass.grade}/{selectedClass.room} {selectedClass.subject}
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
          {!showMatForm ? (
            <button className="dash-action-btn" style={{ justifySelf: 'start' }} onClick={() => setShowMatForm(true)}>
              ➕ เพิ่มสื่อการสอน
            </button>
          ) : (
            <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {(Object.keys(TYPE_META) as MaterialType[]).map(t => (
                  <button key={t} className={`dash-tab-btn${matType === t ? ' active' : ''}`} onClick={() => setMatType(t)}>
                    {TYPE_META[t].icon} {TYPE_META[t].label}
                  </button>
                ))}
              </div>
              <input style={inputStyle} placeholder="ชื่อสื่อ เช่น สรุปบทที่ 4 สมการเชิงเส้น" value={matTitle} onChange={e => setMatTitle(e.target.value)} />
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="คำอธิบาย (ไม่บังคับ)" value={matDesc} onChange={e => setMatDesc(e.target.value)} />
              {matType === 'file' ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--warm-white)', border: '1px dashed var(--border)', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
                  📎 แนบไฟล์ — TODO(PostgreSQL): เชื่อม storage จริง (ตอนนี้ mock เป็นชื่อไฟล์)
                </div>
              ) : (
                <input style={inputStyle} placeholder="URL เช่น https://youtube.com/..." value={matUrl} onChange={e => setMatUrl(e.target.value)} />
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="dash-action-btn" onClick={handleCreateMaterial}>📤 เผยแพร่ให้นักเรียน</button>
                <button className="dash-action-btn" style={{ opacity: 0.7 }} onClick={() => setShowMatForm(false)}>ยกเลิก</button>
              </div>
            </div>
          )}

          {materials.length === 0
            ? <div className="stu-empty">ยังไม่มีสื่อการสอนในห้องนี้</div>
            : materials.map(m => (
                <div key={m.id} style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ fontSize: '1.4rem' }}>{TYPE_META[m.type].icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--brown-dark)', fontSize: '0.9rem' }}>{m.title}</div>
                    {m.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{m.description}</div>}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      {m.url} · {new Date(m.createdAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button
                    onClick={() => { deleteMaterial(m.id); refresh(); showToast('ลบสื่อแล้ว'); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--absent)', fontSize: '0.78rem' }}
                  >
                    ลบ
                  </button>
                </div>
              ))}
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
                      onClick={() => { deleteAnnouncement(a.id); refresh(); showToast('ลบประกาศแล้ว'); }}
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
