'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LangToggle from '@/components/ui/LangToggle';

/** Navbar ของหน้า login/register — โลโก้ + เมนูกลับหน้าหลัก + ปุ่มเปลี่ยนภาษา */
export default function AuthNav() {
  const router = useRouter();

  const linkStyle: React.CSSProperties = {
    textDecoration: 'none', fontSize: '0.85rem', fontWeight: 400,
    color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase',
    transition: 'color 0.2s', cursor: 'pointer',
  };

  const links: [string, string][] = [['#about', 'เกี่ยวกับเรา'], ['#clients', 'ลูกค้าของเรา'], ['#contact', 'ติดต่อเรา']];

  return (
    <nav style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '1.2rem 4rem', background: 'rgba(250,247,242,0.88)',
      backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)',
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <div style={{
          fontSize: '1.5rem', fontWeight: 600, color: 'var(--brown-dark)', cursor: 'pointer',
          fontFamily: 'Cormorant Garamond, serif', letterSpacing: '0.04em',
        }}>
          Edu<span style={{ color: 'var(--brown-mid)' }}>Flow</span>
        </div>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
        <ul style={{ display: 'flex', gap: '2.5rem', listStyle: 'none', margin: 0, padding: 0 }}>
          {links.map(([hash, label]) => (
            <li key={hash}>
              <a
                href="/"
                onClick={e => { e.preventDefault(); router.push(`/?hash=${hash}`); }}
                style={linkStyle}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--brown-deep)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <LangToggle />
      </div>
    </nav>
  );
}
