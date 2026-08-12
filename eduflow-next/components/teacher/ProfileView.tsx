'use client';

/**
 * ประวัติครูฉบับเต็ม — ดู/แก้ไขได้
 * หมวด: ข้อมูลส่วนบุคคล · ที่อยู่ · ช่องทางติดต่อ · สุขภาพ · การปฏิบัติงาน · การศึกษา · การทำงาน · อบรม/รางวัล
 */

import { useState } from 'react';
import type { TeacherProfile, EducationRecord, WorkRecord } from '@/lib/types';
import { saveTeacherProfile } from '@/lib/api/teacher-profile.store';
import { useToast } from '@/context/ToastContext';

interface ProfileViewProps {
  profile: TeacherProfile;
  username: string;
  onClose: () => void;
  onSaved?: (p: TeacherProfile) => void;
}

const DASH = '—';
const show = (v?: string) => (v && v.trim() ? v : DASH);

export default function TeacherProfileView({ profile, username, onClose, onSaved }: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<TeacherProfile>(profile);
  const { showToast } = useToast();

  const set = (k: keyof TeacherProfile, v: string) => setForm(f => ({ ...f, [k]: v }));

  function handleSave() {
    const name = [form.prefix, form.firstName, form.lastName].filter(Boolean).join(' ').trim() || form.name;
    const next = { ...form, name };
    saveTeacherProfile(username, next);
    setForm(next);
    onSaved?.(next);
    setIsEditing(false);
    showToast('บันทึกประวัติเรียบร้อย — บันทึกลง log แล้ว');
  }

  const initials = (form.firstName?.[0] || form.name[0] || '?') + (form.lastName?.[0] || '');

  // ── โหมดแก้ไข ──
  if (isEditing) {
    return (
      <div className="panel-shell" style={{ padding: '2rem 1.5rem' }}>
        <div className="panel-card">
          <div className="panel-head">
            <h2 className="panel-title">แก้ไข<em>ประวัติครู</em></h2>
            <p className="panel-sub">กรอกข้อมูลให้ครบถ้วนเพื่อใช้ในงานทะเบียนบุคลากรและการติดต่อฉุกเฉิน</p>
          </div>

          <EditSection title="ข้อมูลส่วนบุคคล">
            <Field label="คำนำหน้า"    value={form.prefix}    onChange={v => set('prefix', v)} placeholder="นาย / นาง / นางสาว" />
            <Field label="ชื่อ"         value={form.firstName} onChange={v => set('firstName', v)} />
            <Field label="นามสกุล"      value={form.lastName}  onChange={v => set('lastName', v)} />
            <Field label="ชื่อเล่น"     value={form.nickname}  onChange={v => set('nickname', v)} />
            <Field label="เพศ"          value={form.gender}    onChange={v => set('gender', v)} />
            <Field label="วัน/เดือน/ปีเกิด" value={form.dob}   onChange={v => set('dob', v)} placeholder="เช่น 14 มีนาคม 2528" />
            <Field label="กรุ๊ปเลือด"   value={form.bloodType} onChange={v => set('bloodType', v)} />
            <Field label="เลขบัตรประชาชน" value={form.citizenId} onChange={v => set('citizenId', v)} />
            <Field label="สัญชาติ"      value={form.nationality} onChange={v => set('nationality', v)} />
            <Field label="เชื้อชาติ"    value={form.ethnicity} onChange={v => set('ethnicity', v)} />
            <Field label="ศาสนา"        value={form.religion}  onChange={v => set('religion', v)} />
            <Field label="สถานภาพสมรส"  value={form.maritalStatus} onChange={v => set('maritalStatus', v)} />
          </EditSection>

          <EditSection title="ที่อยู่ & ช่องทางติดต่อ">
            <Field label="ที่อยู่ปัจจุบัน" value={form.addressCurrent} onChange={v => set('addressCurrent', v)} wide />
            <Field label="ที่อยู่ตามทะเบียนบ้าน" value={form.addressRegistered} onChange={v => set('addressRegistered', v)} wide />
            <Field label="เบอร์โทรศัพท์" value={form.phone} onChange={v => set('phone', v)} />
            <Field label="อีเมล"         value={form.email} onChange={v => set('email', v)} />
            <Field label="LINE ID"       value={form.lineId} onChange={v => set('lineId', v)} />
            <Field label="ผู้ติดต่อฉุกเฉิน" value={form.emergencyName} onChange={v => set('emergencyName', v)} />
            <Field label="ความสัมพันธ์"  value={form.emergencyRelation} onChange={v => set('emergencyRelation', v)} />
            <Field label="เบอร์ฉุกเฉิน"  value={form.emergencyPhone} onChange={v => set('emergencyPhone', v)} />
          </EditSection>

          <EditSection title="ข้อมูลสุขภาพ">
            <Field label="โรคประจำตัว" value={form.congenitalDisease} onChange={v => set('congenitalDisease', v)} placeholder="ไม่มี" />
            <Field label="ประวัติแพ้ยา" value={form.drugAllergy} onChange={v => set('drugAllergy', v)} placeholder="ไม่มี" />
            <Field label="ประวัติแพ้อาหาร" value={form.foodAllergy} onChange={v => set('foodAllergy', v)} placeholder="ไม่มี" />
            <Field label="หมายเหตุด้านสุขภาพ" value={form.healthNote} onChange={v => set('healthNote', v)} wide />
          </EditSection>

          <EditSection title="ข้อมูลการปฏิบัติงาน">
            <Field label="ตำแหน่ง"      value={form.position} onChange={v => set('position', v)} />
            <Field label="วิทยฐานะ"     value={form.academicRank} onChange={v => set('academicRank', v)} />
            <Field label="กลุ่มสาระ"    value={form.subjectGroup} onChange={v => set('subjectGroup', v)} />
            <Field label="ประเภทการจ้าง" value={form.employmentType} onChange={v => set('employmentType', v)} />
            <Field label="วันเริ่มปฏิบัติงาน" value={form.startDate} onChange={v => set('startDate', v)} />
            <Field label="เลขที่ใบประกอบวิชาชีพ" value={form.teacherLicense} onChange={v => set('teacherLicense', v)} />
            <Field label="วันหมดอายุใบประกอบวิชาชีพ" value={form.licenseExpiry} onChange={v => set('licenseExpiry', v)} />
            <Field label="ครูที่ปรึกษาประจำชั้น" value={form.homeroomClass} onChange={v => set('homeroomClass', v)} />
            <Field label="โรงเรียน"     value={form.school} onChange={v => set('school', v)} />
            <Field label="วิชาที่สอนหลัก" value={form.subject} onChange={v => set('subject', v)} />
          </EditSection>

          <div className="sched-modal-actions" style={{ justifyContent: 'center' }}>
            <button className="ez-btn ez-btn-primary" onClick={handleSave}>💾 บันทึกประวัติ</button>
            <button className="ez-btn ez-btn-ghost" onClick={() => { setIsEditing(false); setForm(profile); }}>ยกเลิก</button>
          </div>
          <div className="ez-help-box" style={{ marginTop: '1rem' }}>
            ℹ️ ประวัติการศึกษา / การทำงาน / การอบรม / รางวัล แก้ไขผ่านงานทะเบียนบุคลากร —
            แสดงในหน้าประวัติแบบอ่านอย่างเดียว (TODO: เปิดให้แก้เองเมื่อเชื่อมฐานข้อมูลจริง)
          </div>
        </div>
      </div>
    );
  }

  // ── โหมดดู ──
  return (
    <div className="panel-shell" style={{ padding: '2rem 1.5rem' }}>
      <div className="panel-card">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap', marginBottom: '1.75rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div className="stu-profile-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 className="stu-profile-name">{form.name}</h1>
            <div className="stu-profile-id">
              รหัสครู {form.teacherId} · {show(form.position)}{form.academicRank ? ` · ${form.academicRank}` : ''}
            </div>
            <div className="stu-profile-school">{form.school} · กลุ่มสาระ{show(form.subjectGroup || form.subject)}</div>
            {form.homeroomClass && <div className="stu-profile-id">ครูที่ปรึกษา {form.homeroomClass}</div>}
          </div>
          <button className="ez-btn ez-btn-primary" style={{ minHeight: 44, fontSize: '0.92rem' }} onClick={() => setIsEditing(true)}>
            ✏️ แก้ไขประวัติ
          </button>
        </div>

        <div className="stu-info-grid">
          <Card title="ข้อมูลส่วนบุคคล">
            <Row label="ชื่อ-นามสกุล" value={form.name} />
            <Row label="ชื่อเล่น" value={show(form.nickname)} />
            <Row label="เพศ" value={show(form.gender)} />
            <Row label="วัน/เดือน/ปีเกิด" value={show(form.dob)} />
            <Row label="กรุ๊ปเลือด" value={show(form.bloodType)} />
            <Row label="เลขบัตรประชาชน" value={maskId(form.citizenId)} />
            <Row label="สัญชาติ / เชื้อชาติ" value={`${show(form.nationality)} / ${show(form.ethnicity)}`} />
            <Row label="ศาสนา" value={show(form.religion)} />
            <Row label="สถานภาพสมรส" value={show(form.maritalStatus)} />
          </Card>

          <Card title="ช่องทางติดต่อ">
            <Row label="เบอร์โทรศัพท์" value={show(form.phone)} />
            <Row label="อีเมล" value={show(form.email)} />
            <Row label="LINE ID" value={show(form.lineId)} />
            <Row label="ผู้ติดต่อฉุกเฉิน" value={show(form.emergencyName)} />
            <Row label="ความสัมพันธ์" value={show(form.emergencyRelation)} />
            <Row label="เบอร์ฉุกเฉิน" value={show(form.emergencyPhone)} />
          </Card>

          <Card title="ที่อยู่">
            <Row label="ที่อยู่ปัจจุบัน" value={show(form.addressCurrent)} />
            <Row label="ตามทะเบียนบ้าน" value={show(form.addressRegistered)} />
          </Card>

          <Card title="ข้อมูลสุขภาพ">
            <Row label="โรคประจำตัว" value={form.congenitalDisease?.trim() || 'ไม่มี'} />
            <Row label="แพ้ยา" value={form.drugAllergy?.trim() || 'ไม่มี'} />
            <Row label="แพ้อาหาร" value={form.foodAllergy?.trim() || 'ไม่มี'} />
            <Row label="หมายเหตุ" value={show(form.healthNote)} />
          </Card>

          <Card title="ข้อมูลการปฏิบัติงาน">
            <Row label="ตำแหน่ง" value={show(form.position)} />
            <Row label="วิทยฐานะ" value={show(form.academicRank)} />
            <Row label="กลุ่มสาระ" value={show(form.subjectGroup)} />
            <Row label="ประเภทการจ้าง" value={show(form.employmentType)} />
            <Row label="เริ่มปฏิบัติงาน" value={show(form.startDate)} />
            <Row label="ปีการศึกษา" value={show(form.academicYear)} />
          </Card>

          <Card title="ใบประกอบวิชาชีพ">
            <Row label="เลขที่ใบประกอบวิชาชีพ" value={show(form.teacherLicense)} />
            <Row label="วันหมดอายุ" value={show(form.licenseExpiry)} />
            <Row label="โรงเรียน" value={show(form.school)} />
          </Card>
        </div>

        {/* ประวัติการศึกษา */}
        {(form.education?.length || 0) > 0 && (
          <ListCard title="ประวัติการศึกษา">
            {form.education!.map((e: EducationRecord, i) => (
              <div key={i} className="sched-log-row">
                <span className="sched-log-action sched-log-add">{e.level}</span>
                <div className="sched-log-body">
                  <div className="sched-log-detail">{e.major}</div>
                  <div className="sched-log-meta">{e.institute} · สำเร็จการศึกษาปี {e.year}</div>
                </div>
              </div>
            ))}
          </ListCard>
        )}

        {/* ประวัติการทำงาน */}
        {(form.workHistory?.length || 0) > 0 && (
          <ListCard title="ประวัติการทำงาน">
            {form.workHistory!.map((w: WorkRecord, i) => (
              <div key={i} className="sched-log-row">
                <span className="sched-log-action sched-log-edit">{w.year}</span>
                <div className="sched-log-body">
                  <div className="sched-log-detail">{w.position}</div>
                  <div className="sched-log-meta">{w.place}</div>
                </div>
              </div>
            ))}
          </ListCard>
        )}

        {(form.trainings?.length || 0) > 0 && (
          <ListCard title="ประวัติการอบรม/พัฒนาตนเอง">
            {form.trainings!.map((t, i) => (
              <div key={i} className="sched-log-row"><div className="sched-log-body"><div className="sched-log-detail">• {t}</div></div></div>
            ))}
          </ListCard>
        )}

        {(form.awards?.length || 0) > 0 && (
          <ListCard title="รางวัล & ผลงาน">
            {form.awards!.map((a, i) => (
              <div key={i} className="sched-log-row"><div className="sched-log-body"><div className="sched-log-detail">• {a}</div></div></div>
            ))}
          </ListCard>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button className="ez-btn ez-btn-ghost" onClick={onClose}>← กลับหน้าหลัก</button>
        </div>
      </div>
    </div>
  );
}

/** ปิดบังเลขบัตรประชาชน แสดงเฉพาะ 4 หลักท้าย */
function maskId(id?: string): string {
  if (!id || id.length < 4) return DASH;
  return `${'x'.repeat(Math.max(id.length - 4, 0))}${id.slice(-4)}`;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="stu-info-card">
      <div className="stu-info-card-title">{title}</div>
      {children}
    </div>
  );
}

function ListCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sched-log" style={{ borderStyle: 'solid' }}>
      <div className="sched-log-title">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="stu-info-row">
      <span className="stu-info-label">{label}</span>
      <span className="stu-info-val">{value}</span>
    </div>
  );
}

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div className="stu-info-card-title" style={{ marginBottom: '0.75rem' }}>{title}</div>
      <div className="sched-form-grid">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, wide }: {
  label: string; value?: string; onChange: (v: string) => void; placeholder?: string; wide?: boolean;
}) {
  return (
    <div className="sched-form-field" style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <label className="sched-form-label">{label}</label>
      <input
        className="ez-input"
        style={{ minHeight: 44, fontSize: '0.92rem' }}
        value={value || ''}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
