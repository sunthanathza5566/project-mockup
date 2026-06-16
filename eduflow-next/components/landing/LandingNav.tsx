'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session } = useAuth();
  const router = useRouter();

  function handleLoginClick(e: React.MouseEvent) {
    e.preventDefault();
    if (!session) { router.push('/login'); return; }
    if (session.role === 'student') router.push('/student');
    else if (session.role === 'teacher') router.push('/teacher');
    else router.push('/dashboard');
  }

  return (
    <nav className="landing-nav">
      <div className="nav-logo">Edu<span>Flow</span></div>

      <button
        className="nav-hamburger"
        onClick={() => setMobileOpen(o => !o)}
        aria-label="เมนู"
      >
        ☰
      </button>

      <ul className={`nav-links${mobileOpen ? ' mobile-open' : ''}`}>
        <li><a href="#home"    onClick={() => setMobileOpen(false)}>หน้าแรก</a></li>
        <li><a href="#about"   onClick={() => setMobileOpen(false)}>เกี่ยวกับเรา</a></li>
        <li><a href="#clients" onClick={() => setMobileOpen(false)}>ลูกค้าของเรา</a></li>
        <li><a href="#contact" onClick={() => setMobileOpen(false)}>ติดต่อเรา</a></li>
        <li>
          <a href="#" className="nav-cta" onClick={handleLoginClick}>
            {session ? 'Dashboard →' : 'เข้าสู่ระบบ'}
          </a>
        </li>
      </ul>
    </nav>
  );
}
