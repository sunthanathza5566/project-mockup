'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import LandingNav from '@/components/landing/LandingNav';
import HeroSection from '@/components/landing/HeroSection';
import AboutSection from '@/components/landing/AboutSection';
import ShowcaseSection from '@/components/landing/ShowcaseSection';
import CtaSection from '@/components/landing/CtaSection';
import Footer from '@/components/landing/Footer';
import NewsBoard from '@/components/ui/NewsBoard';

/* scroll ไป section ตาม ?hash=... (มาจาก navbar หน้า login) — แยก component เพราะ useSearchParams ต้องอยู่ใน Suspense */
function HashScroller() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const hash = searchParams.get('hash');
    if (hash) {
      setTimeout(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [searchParams]);

  return null;
}

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <HashScroller />
      </Suspense>
      <LandingNav />
      <main id="page-main">
        {/* แต่ละ section มี id ของตัวเองอยู่แล้ว (#about, #clients, #contact) สำหรับ hash scroll */}
        <HeroSection />
        <AboutSection />
        <ShowcaseSection />
        <section id="news" className="ll-news-sec">
          <div className="ll-news-inner">
            <NewsBoard title="ข่าวสาร กิจกรรม และประกาศของโรงเรียน" limit={6} />
          </div>
        </section>
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
