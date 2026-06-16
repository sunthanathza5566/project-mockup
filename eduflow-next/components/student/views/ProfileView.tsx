'use client';

import type { StudentProfile } from '@/lib/types';

interface Props {
  profile: StudentProfile;
  showToast: (m: string) => void;
}

export default function ProfileView({ profile, showToast }: Props) {
  const initials = profile.firstName[0] + (profile.lastName?.[0] || '');

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
        <div className="stu-profile-avatar-wrap">
          <div className="stu-profile-avatar">{initials}</div>
          <button className="stu-avatar-edit" onClick={() => showToast('ฟีเจอร์อัปโหลดรูปภาพกำลังพัฒนา...')}>📷</button>
        </div>
        <div>
          <h2 className="stu-profile-name">{profile.firstName} <em>{profile.lastName}</em></h2>
          <div className="stu-profile-id">รหัสนักเรียน {profile.studentId} · {profile.grade}/{profile.room} · ปีการศึกษา {profile.academicYear}</div>
          <div className="stu-profile-school">{profile.school}</div>
        </div>
      </div>

      <div className="stu-info-grid">
        <div className="stu-info-card">
          <div className="stu-info-card-title">👤 ข้อมูลส่วนตัว</div>
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
          <div className="stu-info-card-title">🏫 ข้อมูลการศึกษา</div>
          <InfoRow label="รหัสนักเรียน"     val={profile.studentId} />
          <InfoRow label="ระดับชั้น"        val={profile.grade} />
          <InfoRow label="ห้องเรียน"        val={profile.room} />
          <InfoRow label="ปีการศึกษาที่เข้า" val={profile.academicYear} />
          <InfoRow label="โรงเรียน"         val={profile.school} />
        </div>

        <div className="stu-info-card">
          <div className="stu-info-card-title">👨‍👩‍👧 ข้อมูลผู้ปกครอง</div>
          <InfoRow label="ชื่อบิดา"    val={profile.father.name} />
          <InfoRow label="อาชีพบิดา"   val={profile.father.occupation} />
          <InfoRow label="เบอร์โทรบิดา" val={profile.father.phone} />
          <InfoRow label="ชื่อมารดา"   val={profile.mother.name} />
          <InfoRow label="อาชีพมารดา"  val={profile.mother.occupation} />
          <InfoRow label="เบอร์โทรมารดา" val={profile.mother.phone} />
          <InfoRow label="เบอร์ฉุกเฉิน" val={profile.emergencyContact} />
        </div>

        <div className="stu-info-card">
          <div className="stu-info-card-title">📱 ช่องทางติดต่อ</div>
          <InfoRow label="เบอร์โทรนักเรียน" val={profile.phone} />
          <InfoRow label="อีเมล"            val={profile.email} />
          <InfoRow label="Line ID"          val={profile.lineId} />
          <InfoRow label="ที่อยู่"           val={profile.address} />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button className="stu-btn-outline" onClick={() => showToast('กรุณาติดต่อครูเพื่อแก้ไขข้อมูล')}>
          ✏️ แจ้งแก้ไขข้อมูล
        </button>
      </div>
    </div>
  );
}
