'use client';

import AdminShell from '@/components/admin/AdminShell';
import UserManager from '@/components/admin/UserManager';

export default function AdminUsersPage() {
  return <AdminShell><UserManager /></AdminShell>;
}
