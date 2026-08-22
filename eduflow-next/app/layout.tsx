import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { LangProvider } from '@/context/LangContext';
import { ToastProvider } from '@/context/ToastContext';
import { DialogProvider } from '@/context/DialogContext';
import Toast from '@/components/ui/Toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'EduFlow — ระบบอำนวยความสะดวกโรงเรียน',
  description: 'ระบบครบวงจรสำหรับการจัดการการเข้าเรียน ลงชื่อเข้าเรียน และติดตามผลนักเรียนแบบเรียลไทม์',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=DM+Sans:wght@300;400;500&family=Sarabun:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <LangProvider>
            <ToastProvider>
              <DialogProvider>
                {children}
                <Toast />
              </DialogProvider>
            </ToastProvider>
          </LangProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
