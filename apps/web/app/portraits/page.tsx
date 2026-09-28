"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TEMPLATES } from "@/lib/templates";
import { ArrowRight } from "lucide-react";

const categories = ["All", "Dogs", "Cats", "Couple & Pet", "Multiple Pets"];

export default function PortraitsPage() {
  const [active, setActive] = useState("All");

  const filtered =
    active === "All" ? TEMPLATES : TEMPLATES.filter((t) => t.category === active);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FAF6F0] pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-12">
            <span className="text-xs font-medium tracking-widest uppercase text-[#C4622D] mb-3 block">
              All Templates
            </span>
            <h1 className="text-6xl font-display font-light text-[#1A1714] leading-tight">
              Choose your
              <br />
              <em className="not-italic font-medium">portrait style</em>
            </h1>
            <p className="mt-5 text-[#8C7B6B] max-w-xl leading-relaxed">
              Every template has been crafted to look its best with your face and your pet's
              likeness. Pick one, upload your photos, and see a free preview in minutes.
            </p>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 flex-wrap mb-10">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  active === cat
                    ? "bg-[#C4622D] text-white shadow-sm"
                    : "bg-white border border-[#E4D8CC] text-[#8C7B6B] hover:border-[#C4622D] hover:text-[#C4622D]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((template, i) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.5 }}
                layout
              >
                <Link href={`/portraits/${template.slug}`} className="group block">
                  <div className="rounded-2xl overflow-hidden bg-white border border-[#E4D8CC] hover:shadow-xl hover:shadow-[#C4622D]/8 hover:-translate-y-1 transition-all duration-300">
                    {/* Image */}
                    <div
                      className={`relative h-72 bg-gradient-to-br ${template.gradient} flex items-center justify-center overflow-hidden`}
                    >
                      <span className="text-7xl opacity-30 group-hover:opacity-50 group-hover:scale-110 transition-all duration-500">
                        {template.emoji}
                      </span>
                      {template.bestseller && (
                        <div className="absolute top-3 left-3 bg-[#C4622D] text-white text-xs font-medium px-2.5 py-1 rounded-full">
                          Bestseller
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm text-[#8C7B6B] text-xs font-medium px-2.5 py-1 rounded-full border border-[#E4D8CC]">
                        {template.style}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <span className="bg-[#C4622D] text-white text-sm font-medium px-5 py-2.5 rounded-full translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                          View & create
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h2 className="font-medium text-[#1A1714] leading-tight">{template.name}</h2>
                        <span className="text-sm font-semibold text-[#C4622D] whitespace-nowrap">
                          from €{template.price}
                        </span>
                      </div>
                      <p className="text-xs text-[#8C7B6B] leading-relaxed">{template.description}</p>
                      <div className="mt-3 flex items-center gap-1 text-xs text-[#8C7B6B]">
                        {template.uploadSlots.map((s) => s.label).join(" · ")}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
