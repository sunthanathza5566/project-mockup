'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LangToggle from '@/components/ui/LangToggle';

export default function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  function handleLoginClick(e: React.MouseEvent) {
    e.preventDefault();
    router.push(user ? '/app' : '/login');
  }

  return (
    <nav className="landing-nav">
      <div className="nav-logo">AUN-QA <span>Copilot</span></div>

      <button className="nav-hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="เมนู">☰</button>

      <ul className={`nav-links${mobileOpen ? ' mobile-open' : ''}`}>
        <li><a href="#home"    onClick={() => setMobileOpen(false)}>หน้าแรก</a></li>
        <li><a href="#about"   onClick={() => setMobileOpen(false)}>จุดเด่น</a></li>
        <li><a href="#flow"    onClick={() => setMobileOpen(false)}>ขั้นตอนใช้งาน</a></li>
        <li><a href="#contact" onClick={() => setMobileOpen(false)}>เริ่มใช้งาน</a></li>
        <li>
          <a href="/login" className="nav-cta" data-testid="landing-login" onClick={handleLoginClick}>
            {user ? 'เข้าสู่แอป →' : 'เข้าสู่ระบบ'}
          </a>
        </li>
        <li><LangToggle /></li>
      </ul>
    </nav>
  );
}
