'use client';

import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  function handleNavLink(e: React.MouseEvent, hash: string) {
    e.preventDefault();
    router.push(`/?hash=${hash}`);
  }

  const linkStyle = {
    textDecoration: 'none',
    fontSize: '0.85rem',
    fontWeight: '400',
    color: 'var(--text-muted)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    transition: 'color 0.2s',
    cursor: 'pointer',
  };

  return (
    <>
      {/* Navbar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.2rem 4rem',
        background: 'rgba(250,247,242,0.88)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: 'var(--brown-dark)',
              cursor: 'pointer',
              fontFamily: 'Cormorant Garamond, serif',
              letterSpacing: '0.04em',
            }}
          >
            Edu<span style={{ color: 'var(--brown-mid)' }}>Flow</span>
          </div>
        </Link>

        <ul style={{
          display: 'flex',
          gap: '2.5rem',
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}>
          <li>
            <a
              href="/"
              onClick={(e) => handleNavLink(e, '#about')}
              style={linkStyle}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--brown-deep)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              เกี่ยวกับเรา
            </a>
          </li>
          <li>
            <a
              href="/"
              onClick={(e) => handleNavLink(e, '#clients')}
              style={linkStyle}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--brown-deep)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              ลูกค้าของเรา
            </a>
          </li>
          <li>
            <a
              href="/"
              onClick={(e) => handleNavLink(e, '#contact')}
              style={linkStyle}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--brown-deep)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              ติดต่อเรา
            </a>
          </li>
        </ul>
      </nav>

      {/* Login Form */}
      <LoginForm />
    </>
  );
}
