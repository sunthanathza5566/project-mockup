import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai_Looped } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { LangProvider } from '@/context/LangContext';
import { ToastProvider } from '@/context/ToastContext';
import { DialogProvider } from '@/context/DialogContext';
import Toast from '@/components/ui/Toast';
import PrefsInit from '@/components/ui/PrefsInit';
import ThemeProvider from '@/components/ui/ThemeProvider';
import './globals.css';

/** ADR-UI-002 D4 / saas-tokens §T3.1: ฟอนต์ไทยมีหัว ตระกูลเดียวครอบไทย+อังกฤษ — self-host ตอน build (เบราว์เซอร์ไม่เรียก Google) */
const plexThai = IBM_Plex_Sans_Thai_Looped({
  weight: ['400', '500', '600'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-plex-thai',
});

export const metadata: Metadata = {
  title: 'AUN-QA Copilot — ผู้ช่วยจัดทำ SAR ระดับหลักสูตร',
  description: 'ผู้ช่วยจัดทำรายงานประเมินตนเอง (SAR) ตามเกณฑ์ AUN-QA ระดับหลักสูตร: มอบหมายงาน ผูกหลักฐาน ตรวจช่องว่าง ส่งออกเอกสาร',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes ใส่ class/style color-scheme บน <html> ก่อน hydrate (§T12)
    <html lang="th" suppressHydrationWarning className={plexThai.variable}>
      <body>
        <ThemeProvider>
          <PrefsInit />
          {/* Dialog ครอบ Auth — AuthContext ใช้ dialog เตือนหมดอายุ/บันทึกไม่ได้ (ADR 6.4) */}
          <ToastProvider>
            <DialogProvider>
              <AuthProvider>
                <LangProvider>
                  {children}
                  <Toast />
                </LangProvider>
              </AuthProvider>
            </DialogProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
