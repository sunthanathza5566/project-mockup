'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import LandingNav from '@/components/landing/LandingNav';
import HeroSection from '@/components/landing/HeroSection';
import AboutSection from '@/components/landing/AboutSection';
import FlowSection from '@/components/landing/FlowSection';
import TrustSection from '@/components/landing/TrustSection';
import CtaSection from '@/components/landing/CtaSection';
import Footer from '@/components/landing/Footer';

/* scroll ไป section ตาม ?hash=... (ลิงก์เดิมจากหน้าอื่น) */
function HashScroller() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const hash = searchParams.get('hash');
    if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView(), 100);
  }, [searchParams]);
  return null;
}

export default function HomePage() {
  return (
    <>
      <a href="#main" className="aq-skip">ข้ามไปเนื้อหาหลัก</a>
      <Suspense fallback={null}><HashScroller /></Suspense>
      <LandingNav />
      <main id="main" tabIndex={-1}>
        <HeroSection />
        <AboutSection />
        <FlowSection />
        <TrustSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
