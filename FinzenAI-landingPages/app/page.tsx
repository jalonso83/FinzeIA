import Navbar from '@/components/sections/Navbar';
import Hero from '@/components/sections/Hero';
import PainPoints from '@/components/sections/PainPoints';
import Solution from '@/components/sections/Solution';
import Features from '@/components/sections/Features';
import ZenioShowcase from '@/components/sections/ZenioShowcase';
import HowItWorks from '@/components/sections/HowItWorks';
import Pricing from '@/components/sections/Pricing';
import UseCases from '@/components/sections/UseCases';
import FAQ from '@/components/sections/FAQ';
import FinalCTA from '@/components/sections/FinalCTA';
import Footer from '@/components/sections/Footer';

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <PainPoints />
      <Solution />
      <Features />
      <ZenioShowcase />
      <HowItWorks />
      <Pricing />
      <UseCases />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
