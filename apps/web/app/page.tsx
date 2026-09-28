import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { HowItWorks } from "@/components/home/HowItWorks";
import { TemplatesSection } from "@/components/home/TemplatesSection";
import { ReviewsSection } from "@/components/home/ReviewsSection";
import { TrustBadges } from "@/components/home/TrustBadges";
import { FaqSection } from "@/components/home/FaqSection";
import { CtaSection } from "@/components/home/CtaSection";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <HeroSection />
        <TrustBadges />
        <HowItWorks />
        <TemplatesSection />
        <ReviewsSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
