import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HowItWorks } from "@/components/home/HowItWorks";
import { TrustBadges } from "@/components/home/TrustBadges";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "How It Works",
  description: "Three simple steps to get a stunning AI portrait — families, couples, solo, pets and groups. Upload, preview for free, then order.",
};

export default function HowItWorksPage() {
  return (
    <>
      <Header />
      <main className="bg-[#FAF6F0]">
        {/* Hero */}
        <section className="pt-32 pb-10 text-center px-6">
          <span className="text-xs font-medium tracking-widest uppercase text-[#C4622D] mb-4 block">
            The Process
          </span>
          <h1 className="text-6xl lg:text-7xl font-display font-light text-[#1A1714] leading-tight">
            Simple, fast,
            <br />
            <em className="not-italic font-medium text-[#C4622D]">magical.</em>
          </h1>
          <p className="mt-5 text-[#8C7B6B] text-lg max-w-xl mx-auto leading-relaxed">
            From upload to framed portrait on your wall — here's exactly how Tolif works.
          </p>
        </section>

        <HowItWorks />
        <TrustBadges />

        {/* FAQ teaser */}
        <section className="py-16 text-center px-6">
          <p className="text-[#8C7B6B] mb-6">Still have questions?</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/faq" className="text-sm font-medium text-[#C4622D] hover:underline">
              Read our FAQ
            </Link>
            <span className="text-[#E4D8CC]">·</span>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] text-white font-medium px-6 py-3 rounded-full transition-colors"
            >
              Try it free <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
