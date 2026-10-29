import { DigitalHeader } from "./DigitalHeader";
import { DigitalFooter } from "./DigitalFooter";
import { DigitalHeroSection } from "./DigitalHeroSection";
import { DigitalHowItWorks } from "./DigitalHowItWorks";
import { DigitalPricingSection } from "./DigitalPricingSection";
import { DigitalReviewsSection } from "./DigitalReviewsSection";
import { DigitalFaqSection } from "./DigitalFaqSection";

export function DigitalHomePage() {
  return (
    <>
      <DigitalHeader />
      <main className="flex-1">
        <DigitalHeroSection />
        <DigitalHowItWorks />
        <DigitalPricingSection />
        <DigitalReviewsSection />
        <DigitalFaqSection />
      </main>
      <DigitalFooter />
    </>
  );
}
