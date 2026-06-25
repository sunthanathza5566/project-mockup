'use client';

import { useRouter } from 'next/navigation';
import LoginForm from './LoginForm';

export default function LoginPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        background: 'var(--cream)',
        borderBottom: '1px solid var(--border-light)',
      }}>
        <div
          onClick={() => router.push('/')}
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'var(--brown-dark)',
            cursor: 'pointer',
            fontFamily: 'Cormorant Garamond, serif',
            letterSpacing: '1px',
          }}
        >
          Edu<span style={{ color: 'var(--accent-warm)' }}>Flow</span>
        </div>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '0.5rem 1.25rem',
            background: 'transparent',
            color: 'var(--brown-dark)',
            border: '2px solid var(--brown-dark)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.9rem',
          }}
        >
          ← กลับหน้าหลัก
        </button>
      </nav>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoginForm />
      </div>
    </div>
  );
}
