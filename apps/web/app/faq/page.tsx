import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FaqSection } from "@/components/home/FaqSection";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about Tolif AI portraits — photos, pricing, delivery, GDPR, and more.",
};

export default function FaqPage() {
  return (
    <>
      <Header />
      <main className="bg-[#FAF6F0]">
        <div className="pt-32 pb-4 text-center px-6">
          <span className="text-xs font-medium tracking-widest uppercase text-[#C4622D] mb-3 block">
            Help
          </span>
          <h1 className="text-6xl font-display font-light text-[#1A1714] leading-tight">
            Frequently asked
            <br />
            <em className="not-italic font-medium text-[#C4622D]">questions</em>
          </h1>
        </div>
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
