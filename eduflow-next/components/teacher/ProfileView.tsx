'use client';

import { useState } from 'react';
import type { TeacherProfile } from '@/lib/types';
import { useToast } from '@/context/ToastContext';

interface ProfileViewProps {
  profile: TeacherProfile;
  onClose: () => void;
}

export default function TeacherProfileView({ profile, onClose }: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(profile);
  const { showToast } = useToast();

  const handleSave = () => {
    showToast('📤 ส่งคำขอให้ admin ตรวจสอบและอนุมัติ');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
          }}
        >
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--brown-dark)' }}>แก้ไขข้อมูลครู</h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--brown-dark)' }}>
              ชื่อ-นามสกุล
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--brown-dark)' }}>
              รหัสครู
            </label>
            <input
              type="text"
              value={editForm.teacherId}
              disabled
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                fontSize: '0.9rem',
                background: 'var(--cream)',
                cursor: 'not-allowed',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--brown-dark)' }}>
              โรงเรียน
            </label>
            <input
              type="text"
              value={editForm.school}
              onChange={(e) => setEditForm({ ...editForm, school: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--brown-dark)' }}>
              วิชาที่สอน
            </label>
            <input
              type="text"
              value={editForm.subject}
              onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button
              onClick={handleSave}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--brown-dark)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              💾 บันทึก
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditForm(profile);
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                color: 'var(--brown-dark)',
                border: '2px solid var(--brown-dark)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              ❌ ยกเลิก
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header Card */}
      <div
        style={{
          background: 'var(--cream)',
          border: '1px solid var(--border-light)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'var(--brown-dark)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: 'bold',
            flexShrink: 0,
          }}
        >
          {profile.name.substring(0, 2)}
        </div>
        <div>
          <h1 style={{ margin: 0, color: 'var(--brown-dark)', fontSize: '1.5rem', fontWeight: '600' }}>
            {profile.name}
          </h1>
          <p style={{ margin: '0.25rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            รหัสครู: {profile.teacherId}
          </p>
          <p style={{ margin: '0.25rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            โรงเรียน: {profile.school}
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Basic Info */}
        <div
          style={{
            background: 'var(--cream)',
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <h3 style={{ marginBottom: '1rem', color: 'var(--brown-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            👤 ข้อมูลส่วนตัว
          </h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <InfoRow label="ชื่อ-นามสกุล" value={profile.name} />
            <InfoRow label="รหัสครู" value={profile.teacherId} />
          </div>
        </div>

        {/* Academic Info */}
        <div
          style={{
            background: 'var(--cream)',
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}
        >
          <h3 style={{ marginBottom: '1rem', color: 'var(--brown-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🎓 ข้อมูลการศึกษา
          </h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <InfoRow label="โรงเรียน" value={profile.school} />
            <InfoRow label="วิชาที่สอน" value={profile.subject} />
            <InfoRow label="ปีการศึกษา" value={profile.academicYear} />
          </div>
        </div>
      </div>

      {/* Edit Button */}
      <button
        onClick={() => setIsEditing(true)}
        style={{
          padding: '0.75rem 1.5rem',
          background: 'transparent',
          color: 'var(--brown-dark)',
          border: '2px solid var(--brown-dark)',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '1rem',
          display: 'block',
          margin: '0 auto',
        }}
      >
        ✏️ แก้ไขข้อมูล
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--brown-dark)', fontWeight: '500' }}>{value}</span>
    </div>
  );
}
