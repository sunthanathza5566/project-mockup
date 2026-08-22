'use client';

import { useEffect, useState } from 'react';
import type { StudentProfile } from '@/lib/types';
import { useDialog } from '@/context/DialogContext';

/** ชุดรูปโปรไฟล์สำเร็จรูป (mock — ยังไม่อัปโหลดไฟล์จริง · TODO ต่อ Supabase Storage) */
const PRESET_AVATARS = ['🐱', '🐶', '🦊', '🐰', '🐼', '🐨', '🐧', '🦁', '🐯', '🐸', '🐵', '🦄'];

interface Props {
  profile: StudentProfile;
  showToast: (m: string) => void;
}

export default function ProfileView({ profile }: Props) {
  const { notify } = useDialog();
  const initials = profile.firstName[0] + (profile.lastName?.[0] || '');
  const avatarKey = `eduflow_avatar_${profile.studentId}`;
  const [avatar, setAvatar] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => { setAvatar(localStorage.getItem(avatarKey) || ''); }, [avatarKey]);

  function chooseAvatar(a: string) {
    setAvatar(a);
    if (a) localStorage.setItem(avatarKey, a); else localStorage.removeItem(avatarKey);
    setPickerOpen(false);
    notify({ title: 'อัปเดตรูปโปรไฟล์แล้ว', message: a ? `เปลี่ยนเป็น ${a}` : 'ใช้อักษรย่อแทนรูป', variant: 'success' });
  }

  const InfoRow = ({ label, val }: { label: string; val?: string }) =>
    val ? (
      <div className="stu-info-row">
        <span className="stu-info-label">{label}</span>
        <span className="stu-info-val">{val}</span>
      </div>
    ) : null;

  return (
    <div className="stu-view-wrap">
      <div className="stu-profile-header">
        <div className="stu-profile-avatar-wrap" style={{ position: 'relative' }}>
          <div className="stu-profile-avatar">{avatar || initials}</div>
          <button className="stu-avatar-edit" onClick={() => setPickerOpen(o => !o)} title="เปลี่ยนรูปโปรไฟล์">📷</button>
          {pickerOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 10, zIndex: 30, background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--card-shadow-hover)', padding: '0.9rem', width: 236 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brown-dark)', marginBottom: '0.65rem' }}>เลือกรูปโปรไฟล์</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '0.35rem' }}>
                {PRESET_AVATARS.map(a => (
                  <button key={a} onClick={() => chooseAvatar(a)} style={{ fontSize: '1.3rem', padding: '0.3rem 0', border: avatar === a ? '2px solid var(--brown-mid)' : '1px solid var(--border)', borderRadius: 10, background: avatar === a ? 'var(--cream-dark)' : 'var(--cream)', cursor: 'pointer' }}>{a}</button>
                ))}
              </div>
              <button onClick={() => chooseAvatar('')} style={{ marginTop: '0.65rem', width: '100%', fontSize: '0.8rem', padding: '0.45rem', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--cream)', color: 'var(--brown-deep)', cursor: 'pointer' }}>ใช้อักษรย่อ ({initials})</button>
            </div>
          )}
        </div>
        <div>
          <h2 className="stu-profile-name">{profile.firstName} <em>{profile.lastName}</em></h2>
          <div className="stu-profile-id">รหัสนักเรียน {profile.studentId} · {profile.grade}/{profile.room} · ปีการศึกษา {profile.academicYear}</div>
          <div className="stu-profile-school">{profile.school}</div>
        </div>
      </div>

      <div className="stu-info-grid">
        <div className="stu-info-card">
          <div className="stu-info-card-title">ข้อมูลส่วนตัว</div>
          <InfoRow label="ชื่อ"      val={profile.firstName} />
          <InfoRow label="นามสกุล"   val={profile.lastName} />
          <InfoRow label="ชื่อเล่น"  val={profile.nickname} />
          <InfoRow label="เพศ"       val={profile.gender} />
          <InfoRow label="วันเกิด"   val={profile.dob} />
          <InfoRow label="กรุ๊ปเลือด" val={profile.bloodType} />
          <InfoRow label="ศาสนา"     val={profile.religion} />
          <InfoRow label="สัญชาติ"   val={profile.nationality} />
        </div>

        <div className="stu-info-card">
          <div className="stu-info-card-title">ข้อมูลการศึกษา</div>
          <InfoRow label="รหัสนักเรียน"     val={profile.studentId} />
          <InfoRow label="ระดับชั้น"        val={profile.grade} />
          <InfoRow label="ห้องเรียน"        val={profile.room} />
          <InfoRow label="ปีการศึกษาที่เข้า" val={profile.academicYear} />
          <InfoRow label="โรงเรียน"         val={profile.school} />
        </div>

        <div className="stu-info-card">
          <div className="stu-info-card-title">ข้อมูลผู้ปกครอง</div>
          <InfoRow label="ชื่อบิดา"    val={profile.father.name} />
          <InfoRow label="อาชีพบิดา"   val={profile.father.occupation} />
          <InfoRow label="เบอร์โทรบิดา" val={profile.father.phone} />
          <InfoRow label="ชื่อมารดา"   val={profile.mother.name} />
          <InfoRow label="อาชีพมารดา"  val={profile.mother.occupation} />
          <InfoRow label="เบอร์โทรมารดา" val={profile.mother.phone} />
          <InfoRow label="เบอร์ฉุกเฉิน" val={profile.emergencyContact} />
        </div>

        <div className="stu-info-card">
          <div className="stu-info-card-title">ช่องทางติดต่อ</div>
          <InfoRow label="เบอร์โทรนักเรียน" val={profile.phone} />
          <InfoRow label="อีเมล"            val={profile.email} />
          <InfoRow label="Line ID"          val={profile.lineId} />
          <InfoRow label="ที่อยู่"           val={profile.address} />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button className="stu-btn-outline" onClick={() => notify({ title: 'แจ้งแก้ไขข้อมูล', message: 'กรุณาติดต่อครูประจำชั้นเพื่อแก้ไขข้อมูลส่วนตัวในระบบ', variant: 'info', okText: 'รับทราบ' })}>
          ✏️ แจ้งแก้ไขข้อมูล
        </button>
      </div>
    </div>
  );
}
