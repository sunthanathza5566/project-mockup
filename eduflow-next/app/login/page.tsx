import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <>
      {/* Navbar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        background: 'var(--cream)',
        borderBottom: '1px solid var(--border-light)',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div
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
        </Link>
        <Link href="/">
          <button
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
        </Link>
      </nav>

      {/* Login Form */}
      <LoginForm />
    </>
  );
}
