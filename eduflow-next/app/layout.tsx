import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { LangProvider } from '@/context/LangContext';
import { ToastProvider } from '@/context/ToastContext';
import { DialogProvider } from '@/context/DialogContext';
import Toast from '@/components/ui/Toast';
import PrefsInit from '@/components/ui/PrefsInit';
import './globals.css';

export const metadata: Metadata = {
  title: 'AUN-QA Copilot — ผู้ช่วยจัดทำ SAR ระดับหลักสูตร',
  description: 'ผู้ช่วยจัดทำรายงานประเมินตนเอง (SAR) ตามเกณฑ์ AUN-QA ระดับหลักสูตร: มอบหมายงาน ผูกหลักฐาน ตรวจช่องว่าง ส่งออกเอกสาร',
};

/** ADR-UI-001 T11: โหมดสว่างอย่างเดียว — กันเบราว์เซอร์กลับสีฟอร์มเอง */
export const viewport: Viewport = {
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        {/* ADR-UI-001 T2.1: Sarabun ตระกูลเดียว 400/600/700 ผ่าน <link> (ไม่ใช้ next/font) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <PrefsInit />
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
