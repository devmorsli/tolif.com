import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { ArrowRight, Sparkles, Heart, Globe, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "About Tolif",
  description:
    "Tolif is an AI portrait studio that turns your photos into stunning, painterly portraits — for families, couples, individuals, and pets.",
};

const values = [
  {
    icon: Sparkles,
    title: "AI-powered, human-felt",
    body: "We combine the latest generative AI models with carefully designed artistic templates to create portraits that feel genuinely painted — not just filtered.",
  },
  {
    icon: Heart,
    title: "Made for real people",
    body: "From family milestones to couple gifts and pet memorials, every template is designed around a real life moment worth preserving.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy first",
    body: "Your photos are processed securely, never shared, never used to train AI models, and automatically deleted after 30 days. We are GDPR-compliant.",
  },
  {
    icon: Globe,
    title: "Shipped worldwide",
    body: "Digital downloads delivered in minutes. Physical prints — posters, framed prints, and canvases — shipped to over 100 countries by our print partners.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FAF6F0]">

        {/* Hero */}
        <section className="pt-36 pb-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-xs font-semibold tracking-widest uppercase text-[#C4622D] mb-4 block">
              About us
            </span>
            <h1 className="text-5xl sm:text-6xl font-display font-light text-[#1A1714] leading-tight mb-6">
              Every face tells a{" "}
              <em className="not-italic font-medium text-[#C4622D]">story</em>
            </h1>
            <p className="text-[#8C7B6B] text-lg leading-relaxed max-w-2xl mx-auto">
              Tolif is an AI portrait studio. We turn your photos into beautiful, hand-painted-style
              portraits — for families, couples, individuals, and pets. Order a digital download or
              a print shipped anywhere in the world.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-display font-light text-[#1A1714] text-center mb-12">
              What we stand for
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map(({ icon: Icon, title, body }) => (
                <div key={title}>
                  <div className="w-10 h-10 rounded-2xl bg-[#F2EAE0] flex items-center justify-center mb-4">
                    <Icon size={18} className="text-[#C4622D]" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1A1714] mb-2">{title}</h3>
                  <p className="text-sm text-[#8C7B6B] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works strip */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-display font-light text-[#1A1714] mb-4">
              How Tolif works
            </h2>
            <p className="text-[#8C7B6B] leading-relaxed mb-8">
              Choose a portrait style, upload your photos, and receive a stunning AI-generated
              portrait in about 60 seconds — free watermarked preview included. Pay only if you love
              it, then download instantly or order a premium print.
            </p>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#C4622D] hover:text-[#9E4A1E] transition-colors group"
            >
              Learn more
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        {/* Contact strip */}
        <section className="py-16 px-6 bg-[#2D4A3E]">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-display font-light text-white mb-4">
              Get in touch
            </h2>
            <p className="text-white/60 mb-6">
              Questions, business enquiries, or press? We&apos;re happy to help.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-white/80">
              <span>
                Email:{" "}
                <a href="mailto:hello@tolif.com" className="text-[#C4622D] hover:underline font-medium">
                  hello@tolif.com
                </a>
              </span>
              <span className="hidden sm:block text-white/30">·</span>
              <Link href="/contact" className="text-white/80 hover:text-white transition-colors">
                Contact form →
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
