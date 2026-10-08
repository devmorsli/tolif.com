"use client";

import { motion } from "framer-motion";
import { useWizardStore } from "@/store/wizardStore";
import { RefreshCw, ChevronLeft, ChevronRight, Lock, Star } from "lucide-react";

export function Step4Preview() {
  const {
    selectedTemplate,
    previewUrl,
    regenerationsLeft,
    setGenerationStatus,
    goTo,
    next,
    back,
  } = useWizardStore();

  const handleRegenerate = () => {
    if (regenerationsLeft <= 0) return;
    // Don't decrement locally — backend is the source of truth.
    setGenerationStatus("idle");
    goTo(3);
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-4xl font-display font-light text-[#1A1714]">
          Your <em className="not-italic font-medium text-[#C4622D]">portrait preview</em>
        </h2>
        <p className="mt-3 text-[#8C7B6B] text-sm max-w-md mx-auto">
          This is a watermarked preview at reduced resolution. Purchase to get the full
          high-resolution version.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Preview image */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative rounded-2xl overflow-hidden portrait-frame"
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Your portrait preview"
                className="w-full aspect-[3/4] object-cover"
              />
            ) : (
              <div className="w-full aspect-[3/4] bg-gradient-to-br from-[#C4622D]/20 via-[#E8A838]/15 to-[#2D4A3E]/20 flex flex-col items-center justify-center gap-4">
                <span className="text-7xl opacity-30">🧑🐕</span>
                <p className="text-[#8C7B6B] text-sm">Portrait preview</p>
              </div>
            )}

            {/* Watermark overlay */}
            <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center">
              <p
                className="text-white/20 text-4xl font-display rotate-[-30deg] tracking-widest whitespace-nowrap"
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
              >
                TOLIF PREVIEW
              </p>
            </div>
          </motion.div>

          {/* Regen button */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={handleRegenerate}
              disabled={regenerationsLeft <= 0}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#8C7B6B] hover:text-[#C4622D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={14} />
              Try again ({regenerationsLeft} left)
            </button>
          </div>
        </div>

        {/* Info panel */}
        <div className="flex flex-col gap-5">
          {/* Unlock banner */}
          <div className="bg-[#2D4A3E] text-white rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={16} className="text-[#D4942A]" />
              <span className="text-sm font-semibold">Unlock the full portrait</span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed mb-5">
              Purchase to remove the watermark and receive the full high-resolution file, ready for print at any size.
            </p>
            <div className="flex items-center gap-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={12} className="fill-[#D4942A] text-[#D4942A]" />
              ))}
              <span className="text-white/60 text-xs ml-1">4.9 from 2,400+ portraits</span>
            </div>
          </div>

          {/* What you get */}
          <div className="bg-[#F2EAE0] rounded-2xl p-5">
            <p className="text-xs font-semibold text-[#C4622D] uppercase tracking-wider mb-4">
              What you get
            </p>
            <ul className="space-y-3">
              {[
                "Full-resolution PNG (no watermark)",
                "Suitable for printing at any size",
                "Delivered instantly by email",
                "Optional physical prints shipped worldwide",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-[#1A1714]">
                  <span className="w-5 h-5 rounded-full bg-[#C4622D]/10 flex items-center justify-center flex-shrink-0 text-[#C4622D] text-xs">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={back}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#8C7B6B] hover:text-[#1A1714] transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </button>
            <button
              onClick={next}
              className="inline-flex items-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] text-white font-semibold px-8 py-3.5 rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-[#C4622D]/25 hover:-translate-y-0.5"
            >
              Choose product
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
