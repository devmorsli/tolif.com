"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: "easeOut" as const },
  }),
};


export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#FAF6F0] grain">
      {/* Warm gradient blob background */}
      <div
        aria-hidden
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-[#F2EAE0] opacity-60 blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-[500px] h-[500px] rounded-full bg-[#F0D5C0] opacity-40 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 w-[400px] h-[400px] rounded-full bg-[#E8A838]/10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-12 items-center py-32 lg:py-0">
        {/* ── Left: Copy ── */}
        <div className="relative z-10">
          {/* Badge */}
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="inline-flex items-center gap-2 bg-white border border-[#E4D8CC] rounded-full px-4 py-1.5 text-xs font-medium text-[#8C7B6B] mb-8 shadow-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#C4622D] animate-pulse" />
            AI-powered portraits • Delivered in minutes
          </motion.div>

          {/* Headline */}
          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="text-6xl sm:text-7xl lg:text-8xl font-display font-light text-[#1A1714] leading-[0.95] tracking-tight"
          >
            Every story
            <br />
            <em className="text-[#C4622D] not-italic font-medium">
              deserves
            </em>
            <br />
            a portrait.
          </motion.h1>

          {/* Subtext */}
          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-7 text-lg text-[#8C7B6B] leading-relaxed max-w-md font-light"
          >
            Upload your photos — families, couples, individuals, pets — and our
            AI recreates a beautiful portrait in the style you choose. Your
            faces, your story, one timeless image.
          </motion.p>

          {/* CTA row */}
          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/create"
              className="inline-flex items-center gap-2.5 bg-[#C4622D] hover:bg-[#9E4A1E] text-white font-medium px-8 py-4 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-[#C4622D]/25 hover:-translate-y-0.5 group"
            >
              Create your portrait
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
            <Link
              href="/portraits"
              className="inline-flex items-center gap-2 text-[#1A1714] font-medium px-4 py-4 hover:text-[#C4622D] transition-colors"
            >
              Browse templates
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-12 flex items-center gap-5"
          >
            {/* Avatar stack */}
            <div className="flex -space-x-3">
              {["🧑", "👩", "👨", "🧕", "🧔"].map((emoji, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F2EAE0] to-[#E4D8CC] border-2 border-white flex items-center justify-center text-sm"
                >
                  {emoji}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={12} className="fill-[#D4942A] text-[#D4942A]" />
                ))}
                <span className="text-sm font-semibold text-[#1A1714] ml-1">4.9</span>
              </div>
              <p className="text-xs text-[#8C7B6B] mt-0.5">Loved by 2,400+ customers worldwide</p>
            </div>
          </motion.div>
        </div>

        {/* ── Right: 2×2 portrait grid ── */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="grid grid-cols-2 gap-4 items-end">
            {/* Col 1: big top, small bottom */}
            <div className="flex flex-col gap-4 items-end">
              {/* Card 1 — big */}
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.9, ease: "easeOut" }}
                className="portrait-frame overflow-hidden"
                style={{ width: 200, height: 260, transform: "rotate(-3deg)" }}
              >
                <div className="w-full h-full flex flex-col items-center justify-end p-3">
                  <img src="/portraits/family1.jpg" alt="Family & Dog" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="relative z-10 w-full bg-white/60 backdrop-blur-sm rounded-sm px-2 py-1.5 text-center">
                    <p className="text-[10px] font-medium text-[#1A1714]">Family &amp; Dog</p>
                  </div>
                </div>
              </motion.div>

              {/* Card 3 — small */}
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.9, ease: "easeOut" }}
                className="portrait-frame overflow-hidden"
                style={{ width: 155, height: 200, transform: "rotate(-2deg)" }}
              >
                <div className="w-full h-full flex flex-col items-center justify-end p-3">
                  <img src="/portraits/grandfather.jpg" alt="Grandfather" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="relative z-10 w-full bg-white/60 backdrop-blur-sm rounded-sm px-2 py-1.5 text-center">
                    <p className="text-[10px] font-medium text-[#1A1714]">Grandfather</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Col 2: small top, big bottom */}
            <div className="flex flex-col gap-4 items-start">
              {/* Card 2 — small */}
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.9, ease: "easeOut" }}
                className="portrait-frame overflow-hidden"
                style={{ width: 155, height: 200, transform: "rotate(3deg)" }}
              >
                <div className="w-full h-full flex flex-col items-center justify-end p-3">
                  <img src="/portraits/dog.jpg" alt="Pet Portrait" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="relative z-10 w-full bg-white/60 backdrop-blur-sm rounded-sm px-2 py-1.5 text-center">
                    <p className="text-[10px] font-medium text-[#1A1714]">Pet Portrait</p>
                  </div>
                </div>
              </motion.div>

              {/* Card 4 — big */}
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.9, ease: "easeOut" }}
                className="portrait-frame overflow-hidden relative"
                style={{ width: 200, height: 260, transform: "rotate(3deg)" }}
              >
                <div className="w-full h-full flex flex-col items-center justify-end p-3">
                  <img src="/portraits/couple.jpg" alt="Couple Portrait" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="relative z-10 w-full bg-white/60 backdrop-blur-sm rounded-sm px-2 py-1.5 text-center">
                    <p className="text-[10px] font-medium text-[#1A1714]">Couple Portrait</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-[#8C7B6B] tracking-widest uppercase">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-[#8C7B6B] to-transparent" />
      </motion.div>
    </section>
  );
}
