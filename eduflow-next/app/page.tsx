'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import LandingNav from '@/components/landing/LandingNav';
import HeroSection from '@/components/landing/HeroSection';
import AboutSection from '@/components/landing/AboutSection';
import ShowcaseSection from '@/components/landing/ShowcaseSection';
import CtaSection from '@/components/landing/CtaSection';
import Footer from '@/components/landing/Footer';

export default function HomePage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const hash = searchParams.get('hash');
    if (hash) {
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [searchParams]);

  return (
    <>
      <LandingNav />
      <main id="page-main">
        <HeroSection />
        <AboutSection id="about" />
        <ShowcaseSection id="clients" />
        <CtaSection id="contact" />
      </main>
      <Footer />
    </>
  );
}
