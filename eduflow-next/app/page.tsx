'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import LandingNav from '@/components/landing/LandingNav';
import HeroSection from '@/components/landing/HeroSection';
import AboutSection from '@/components/landing/AboutSection';
import FlowSection from '@/components/landing/FlowSection';
import CtaSection from '@/components/landing/CtaSection';
import Footer from '@/components/landing/Footer';

/* scroll ไป section ตาม ?hash=... (มาจาก navbar หน้า login) */
function HashScroller() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const hash = searchParams.get('hash');
    if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [searchParams]);
  return null;
}

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}><HashScroller /></Suspense>
      <LandingNav />
      <main id="page-main">
        <HeroSection />
        <AboutSection />
        <FlowSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
