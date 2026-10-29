import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { HowItWorks } from "@/components/home/HowItWorks";
import { TemplatesSection } from "@/components/home/TemplatesSection";
import { ReviewsSection } from "@/components/home/ReviewsSection";
import { TrustBadges } from "@/components/home/TrustBadges";
import { FaqSection } from "@/components/home/FaqSection";
import { CtaSection } from "@/components/home/CtaSection";
import { DigitalHomePage } from "@/components/digital/DigitalHomePage";

async function getStoreMode(): Promise<"physical" | "digital"> {
  try {
    const base =
      process.env.API_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:5000";
    const res = await fetch(`${base}/api/settings/store-mode`, {
      cache: "no-store",
    });
    if (!res.ok) return "physical";
    const data: { mode: string } = await res.json();
    return data.mode === "digital" ? "digital" : "physical";
  } catch {
    return "physical";
  }
}

export default async function HomePage() {
  const mode = await getStoreMode();

  if (mode === "digital") {
    return <DigitalHomePage />;
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <HeroSection />
        <TemplatesSection />
        <TrustBadges />
        <HowItWorks />
        <ReviewsSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
