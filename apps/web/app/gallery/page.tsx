"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TEMPLATES } from "@/lib/templates";
import { ArrowRight } from "lucide-react";

// Gallery grid using template previews as stand-ins until real portraits exist
const galleryItems = [
  ...TEMPLATES,
  ...TEMPLATES.slice(0, 3), // repeat for visual richness
].map((t, i) => ({ ...t, uid: `${t.id}-${i}` }));

export default function GalleryPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FAF6F0] pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-medium tracking-widest uppercase text-[#C4622D] mb-3 block">
              Gallery
            </span>
            <h1 className="text-6xl font-display font-light text-[#1A1714] leading-tight">
              Portraits made
              <br />
              <em className="not-italic font-medium">with love</em>
            </h1>
            <p className="mt-5 text-[#8C7B6B] max-w-lg mx-auto">
              A glimpse of what our AI creates. Every portrait uses the customer's real face and
              their pet's likeness.
            </p>
          </div>

          {/* Masonry-style grid */}
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {galleryItems.map((item, i) => (
              <motion.div
                key={item.uid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.5 }}
                className="break-inside-avoid"
              >
                <Link href={`/portraits/${item.slug}`} className="group block">
                  <div
                    className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${item.gradient} border border-[#E4D8CC] hover:shadow-xl hover:shadow-[#C4622D]/10 transition-all duration-300`}
                    style={{ aspectRatio: i % 3 === 0 ? "3/4" : i % 3 === 1 ? "1" : "4/5" }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="opacity-25 group-hover:opacity-40 group-hover:scale-110 transition-all duration-500"
                        style={{ fontSize: i % 2 === 0 ? "4rem" : "3rem" }}
                      >
                        {item.emoji}
                      </span>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/30 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-xs font-medium">{item.name}</p>
                      <p className="text-white/60 text-xs">{item.style}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <p className="text-[#8C7B6B] mb-6">Love what you see?</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] text-white font-medium px-8 py-4 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-[#C4622D]/25 hover:-translate-y-0.5 group"
            >
              Create your portrait
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
