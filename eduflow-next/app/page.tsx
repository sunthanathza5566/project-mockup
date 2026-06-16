import LandingNav from '@/components/landing/LandingNav';
import HeroSection from '@/components/landing/HeroSection';
import AboutSection from '@/components/landing/AboutSection';
import ShowcaseSection from '@/components/landing/ShowcaseSection';
import CtaSection from '@/components/landing/CtaSection';
import Footer from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <>
      <LandingNav />
      <main id="page-main">
        <HeroSection />
        <AboutSection />
        <ShowcaseSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
