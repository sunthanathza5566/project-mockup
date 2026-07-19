'use client';

import AdminShell from '@/components/admin/AdminShell';
import AcademicManager from '@/components/dashboard/AcademicManager';
import { useAuth } from '@/context/AuthContext';

export default function AdminAcademicPage() {
  const { session } = useAuth();
  return <AdminShell>{session && <AcademicManager adminUsername={session.username} />}</AdminShell>;
}
