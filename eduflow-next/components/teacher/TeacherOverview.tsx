'use client';

/**
 * หน้าแรกฝั่งครู (Dashboard) — สรุปภาพรวมการสอนในหน้าเดียว
 *
 * โครงหน้า:
 *   1. ทักทาย + KPI 4 ตัว
 *   2. ทางลัด (Quick actions) — กระโดดไปเมนูที่ใช้บ่อย
 *   3. 2 คอลัมน์: ตารางสอนวันนี้ | สิ่งที่ต้องทำ (งานรอตรวจ)
 *   4. ห้องที่สอนของฉัน — การ์ดพร้อมทางลัดรายห้อง
 *   5. ข่าวสารโรงเรียน (NewsBoard)
 *
 * ดึงข้อมูลจริงจาก store: ตารางสอน (schedule) + งานรอตรวจ (assignments)
 */

import { useMemo } from 'react';
import type { TeacherProfile, ClassInfo } from '@/lib/types';
import type { TeacherView } from './TeacherLayout';
import { getTeacherSlots, PERIODS, DAYS, type DayKey } from '@/lib/api/schedule.store';
import { getClassAssignmentsStore } from '@/lib/api/assignments.store';
import { hasPermission } from '@/lib/api/permissions';
import NewsBoard from '@/components/ui/NewsBoard';

interface Props {
  profile: TeacherProfile;
  classes: ClassInfo[];
  username: string;
  ratingSummary: { avg: number | null; count: number };
  todayPeriods: number;
  weekPeriods: number;
  onNavigate: (view: TeacherView) => void;
  onSelectClass: (id: string) => void;
  t: (s: string) => string;
}

const DAY_MAP: Record<number, DayKey> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri' };

/** "08:30–09:20" → [510, 560] (นาทีจากเที่ยงคืน) */
function parseRange(time: string): [number, number] {
  const [a, b] = time.split('–').map(s => {
    const [h, m] = s.trim().split(':').map(Number);
    return h * 60 + (m || 0);
  });
  return [a ?? 0, b ?? 0];
}

export default function TeacherOverview({
  profile, classes, username, ratingSummary, todayPeriods, weekPeriods, onNavigate, onSelectClass, t,
}: Props) {
  const todayKey = DAY_MAP[new Date().getDay()];
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  // ── ตารางสอนวันนี้ ──
  const todaySlots = useMemo(() => {
    if (!todayKey) return [];
    return getTeacherSlots(username)
      .filter(s => s.day === todayKey)
      .sort((a, b) => a.period - b.period);
  }, [username, todayKey]);

  // ── งานรอตรวจ (มีนักเรียนส่งแล้วแต่ยังไม่ให้คะแนน) ──
  const pendingGrading = useMemo(() => {
    const rows: { classId: string; label: string; title: string; count: number }[] = [];
    for (const c of classes) {
      for (const a of getClassAssignmentsStore(c.id)) {
        const count = Object.values(a.submissions).filter(s => s.status === 'submitted').length;
        if (count > 0) rows.push({ classId: c.id, label: `${c.grade}/${c.room}`, title: a.title, count });
      }
    }
    return rows.sort((x, y) => y.count - x.count);
  }, [classes]);

  const totalPending = pendingGrading.reduce((s, r) => s + r.count, 0);

  // ── ทางลัด (เฉพาะเมนูที่มีสิทธิ์) ──
  const QUICK_ACTIONS: { icon: string; label: string; view: TeacherView; perm?: string }[] = [
    { icon: '🔲', label: 'เช็คชื่อ',      view: 'attendance', perm: 'attendanceQR' },
    { icon: '📝', label: 'บันทึกคะแนน',   view: 'gradebook',  perm: 'gradebook' },
    { icon: '📚', label: 'สั่งการบ้าน',   view: 'assignments',perm: 'assignments' },
    { icon: '📁', label: 'เพิ่มสื่อ',     view: 'materials',  perm: 'materials' },
    { icon: '📅', label: 'ตารางสอน',      view: 'schedule',   perm: 'viewTeachSchedule' },
  ];
  const quickActions = QUICK_ACTIONS.filter(a => !a.perm || hasPermission(a.perm));

  function goClass(id: string, view: TeacherView) {
    onSelectClass(id);
    onNavigate(view);
  }

  const kpis = [
    { num: classes.length, label: t('ห้องที่สอน') },
    { num: todayPeriods, label: t('คาบวันนี้') },
    { num: weekPeriods, label: 'คาบต่อสัปดาห์' },
    {
      num: ratingSummary.avg !== null ? `⭐ ${ratingSummary.avg.toFixed(1)}` : '⭐ —',
      label: `ผลประเมินการสอน (${ratingSummary.count} ครั้ง)`,
    },
  ];

  const cardStyle: React.CSSProperties = {
    background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem',
  };
  const cardTitle: React.CSSProperties = {
    fontSize: '0.9rem', fontWeight: 700, color: 'var(--brown-dark)', marginBottom: '0.85rem',
    display: 'flex', alignItems: 'center', gap: '0.4rem',
  };

  return (
    <>
      {/* ── ทักทาย + KPI ── */}
      <div className="dash-section">
        <div className="section-label">{t('ครู')} · {profile.school}</div>
        <h2 className="dash-h2">สวัสดี คุณครู<em>{profile.name.replace('ครู', '').trim()}</em></h2>

        <div className="dash-kpi-row">
          {kpis.map((k, i) => (
            <div key={i} className="dash-kpi">
              <div className="dash-kpi-num">{k.num}</div>
              <div className="dash-kpi-label">{k.label}</div>
            </div>
          ))}
        </div>

        {/* ทางลัด */}
        <div style={{ marginTop: '1.1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            ⚡ ทางลัด
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {quickActions.map(a => (
              <button
                key={a.view + a.label}
                onClick={() => onNavigate(a.view)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem',
                  background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 10,
                  cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--brown-dark)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <span style={{ fontSize: '1.05rem' }}>{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        </div>

        {classes.length === 0 && (
          <div className="ez-help-box" style={{ marginTop: '1rem' }}>
            🕐 ยังไม่มีห้องสอน — เริ่มที่เมนู “จัดการตารางสอน” เพื่อจัดคาบสอนของท่าน
            แล้วห้อง/วิชาจะปรากฏในทุกเมนูโดยอัตโนมัติ
          </div>
        )}
      </div>

      {/* ── 2 คอลัมน์: ตารางวันนี้ | งานรอตรวจ ── */}
      <div className="dash-section">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>

          {/* ตารางสอนวันนี้ */}
          <div style={cardStyle}>
            <div style={cardTitle}>
              📅 ตารางสอนวันนี้
              <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                {todayKey ? DAYS.find(d => d.key === todayKey)?.th : 'วันหยุด'}
              </span>
            </div>
            {!todayKey ? (
              <div className="stu-empty" style={{ padding: '1.5rem 0.5rem' }}>🌴 วันหยุดสุดสัปดาห์ — ไม่มีคาบสอน</div>
            ) : todaySlots.length === 0 ? (
              <div className="stu-empty" style={{ padding: '1.5rem 0.5rem' }}>วันนี้ไม่มีคาบสอน — พักผ่อนได้เลย 😌</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {todaySlots.map(s => {
                  const time = PERIODS.find(p => p.period === s.period)?.time || '';
                  const [start, end] = parseRange(time);
                  const isNow  = nowMin >= start && nowMin < end;
                  const isPast = nowMin >= end;
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem',
                        borderRadius: 10, opacity: isPast ? 0.5 : 1,
                        background: isNow ? 'rgba(139,90,43,0.10)' : 'var(--cream)',
                        border: `1px solid ${isNow ? 'var(--brown-light)' : 'var(--border)'}`,
                      }}
                    >
                      <div style={{ textAlign: 'center', minWidth: 42 }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>คาบ</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--brown-dark)' }}>{s.period}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brown-dark)' }}>
                          {s.subjectName} {isNow && <span style={{ fontSize: '0.65rem', color: 'var(--present, #2E8B5B)', fontWeight: 700 }}>● กำลังสอน</span>}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {time} · {s.room || 'ไม่ระบุห้อง'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* งานรอตรวจ */}
          <div style={cardStyle}>
            <div style={cardTitle}>
              📝 สิ่งที่ต้องทำ
              {totalPending > 0 && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff', background: 'var(--absent)', borderRadius: 20, padding: '0.1rem 0.5rem' }}>
                  {totalPending} รอตรวจ
                </span>
              )}
            </div>
            {pendingGrading.length === 0 ? (
              <div className="stu-empty" style={{ padding: '1.5rem 0.5rem' }}>✅ ไม่มีงานค้างตรวจ — เยี่ยมมาก!</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {pendingGrading.slice(0, 5).map((r, i) => (
                  <button
                    key={i}
                    onClick={() => goClass(r.classId, 'assignments')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem',
                      background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 10,
                      cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>📥</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--brown-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ห้อง {r.label}</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--absent)' }}>{r.count} คน →</span>
                  </button>
                ))}
                {pendingGrading.length > 5 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    และอีก {pendingGrading.length - 5} รายการ
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ห้องที่สอนของฉัน ── */}
      {classes.length > 0 && (
        <div className="dash-section">
          <div className="dash-section-title">🏫 ห้องที่สอนของฉัน</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.85rem' }}>
            {classes.map(c => (
              <div key={c.id} style={{ ...cardStyle, padding: '1rem', borderTop: `3px solid ${c.color || 'var(--brown-light)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>{c.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--brown-dark)' }}>{c.grade}/{c.room}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.subject}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {[
                    { icon: '🔲', label: 'เช็คชื่อ', view: 'attendance' as TeacherView, perm: 'attendanceQR' },
                    { icon: '📚', label: 'การบ้าน', view: 'assignments' as TeacherView, perm: 'assignments' },
                    { icon: '📁', label: 'สื่อ',    view: 'materials' as TeacherView, perm: 'materials' },
                  ].filter(b => hasPermission(b.perm)).map(b => (
                    <button
                      key={b.view}
                      onClick={() => goClass(c.id, b.view)}
                      style={{
                        flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                        padding: '0.45rem 0.5rem', background: 'var(--cream)', border: '1px solid var(--border)',
                        borderRadius: 8, cursor: 'pointer', fontSize: '0.74rem', fontWeight: 600, color: 'var(--brown-deep)',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {b.icon} {b.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ข่าวสารโรงเรียน ── */}
      <NewsBoard />
    </>
  );
}
