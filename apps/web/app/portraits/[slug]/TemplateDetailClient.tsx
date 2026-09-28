"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import type { TemplateData } from "@/lib/templates";
import { ArrowRight, ChevronLeft, User, PawPrint, Download, Frame, ImageIcon } from "lucide-react";

const products = [
  { icon: Download, name: "Digital Download", price: "€19.99" },
  { icon: ImageIcon, name: "Poster Print", price: "from €34.99" },
  { icon: Frame, name: "Framed Print", price: "from €59.99" },
  { icon: ImageIcon, name: "Canvas", price: "from €64.99" },
];

export function TemplateDetailClient({ template }: { template: TemplateData }) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FAF6F0] pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-[#8C7B6B] mb-10">
            <Link href="/portraits" className="hover:text-[#C4622D] transition-colors flex items-center gap-1">
              <ChevronLeft size={12} /> All templates
            </Link>
            <span>/</span>
            <span className="text-[#1A1714]">{template.name}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left — portrait preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="sticky top-28"
            >
              <div
                className={`relative rounded-3xl overflow-hidden portrait-frame bg-gradient-to-br ${template.gradient} aspect-[3/4] flex items-center justify-center`}
              >
                <span className="text-9xl opacity-25">{template.emoji}</span>
                {template.bestseller && (
                  <div className="absolute top-4 left-4 bg-[#C4622D] text-white text-xs font-medium px-3 py-1.5 rounded-full">
                    Bestseller
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm text-[#8C7B6B] text-xs font-medium px-3 py-1.5 rounded-full border border-[#E4D8CC]">
                  {template.style}
                </div>
                {/* Watermark hint */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/20 to-transparent p-4">
                  <p className="text-white/60 text-xs text-center">Free watermarked preview · Purchase to unlock</p>
                </div>
              </div>
            </motion.div>

            {/* Right — info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <span className="text-xs font-medium tracking-widest uppercase text-[#C4622D] mb-3 block">
                {template.category}
              </span>
              <h1 className="text-5xl font-display font-light text-[#1A1714] leading-tight mb-5">
                {template.name}
              </h1>
              <p className="text-[#8C7B6B] leading-relaxed mb-8">{template.longDescription}</p>

              {/* Photos needed */}
              <div className="bg-white border border-[#E4D8CC] rounded-2xl p-5 mb-6">
                <p className="text-xs font-semibold text-[#1A1714] uppercase tracking-wider mb-4">
                  Photos you'll upload
                </p>
                <div className="flex flex-col gap-3">
                  {template.uploadSlots.map((slot) => (
                    <div key={slot.name} className="flex items-center gap-3 text-sm text-[#8C7B6B]">
                      <div className="w-8 h-8 rounded-xl bg-[#F2EAE0] flex items-center justify-center flex-shrink-0">
                        {slot.type === "person" ? (
                          <User size={14} className="text-[#C4622D]" />
                        ) : (
                          <PawPrint size={14} className="text-[#C4622D]" />
                        )}
                      </div>
                      <span>{slot.label}</span>
                      {slot.required && <span className="text-[#C4622D] text-xs ml-auto">Required</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Products */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                {products.map((p) => (
                  <div key={p.name} className="bg-white border border-[#E4D8CC] rounded-xl p-4">
                    <p.icon size={16} className="text-[#C4622D] mb-2" />
                    <p className="text-sm font-medium text-[#1A1714] leading-tight">{p.name}</p>
                    <p className="text-xs text-[#C4622D] font-semibold mt-1">{p.price}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link
                href={`/create?template=${template.slug}`}
                className="w-full inline-flex items-center justify-center gap-2.5 bg-[#C4622D] hover:bg-[#9E4A1E] text-white font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-[#C4622D]/25 hover:-translate-y-0.5 group"
              >
                Create this portrait
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>

              <p className="text-center text-xs text-[#8C7B6B] mt-4">
                Free preview · No payment until you're happy
              </p>

              {/* JSON-LD */}
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "Product",
                    name: template.name,
                    description: template.seoDescription,
                    offers: {
                      "@type": "Offer",
                      price: template.price.toFixed(2),
                      priceCurrency: "EUR",
                      availability: "https://schema.org/InStock",
                    },
                  }),
                }}
              />
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
