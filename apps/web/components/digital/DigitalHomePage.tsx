import { DigitalHeader } from "./DigitalHeader";
import { DigitalHeroSection } from "./DigitalHeroSection";
import { DigitalHowItWorks } from "./DigitalHowItWorks";
import { DigitalPricingSection } from "./DigitalPricingSection";
import { DigitalFaqSection } from "./DigitalFaqSection";
import { Footer } from "@/components/layout/Footer";
import { ReviewsSection } from "@/components/home/ReviewsSection";

export function DigitalHomePage() {
  return (
    <>
      <DigitalHeader />
      <main className="flex-1">
        <DigitalHeroSection />
        <DigitalHowItWorks />
        <DigitalPricingSection />
        <ReviewsSection />
        <DigitalFaqSection />
      </main>
      <Footer />
    </>
  );
}
