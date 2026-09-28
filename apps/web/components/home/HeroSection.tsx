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

// Decorative portrait placeholder cards
const portraits = [
  {
    id: 1,
    gradient: "from-[#C4622D]/20 via-[#E8A838]/10 to-[#2D4A3E]/20",
    label: "Woman & Golden Retriever",
    rotation: "-6deg",
    scale: 1,
    top: "5%",
    left: "4%",
    delay: "0s",
    size: "w-44 h-56",
  },
  {
    id: 2,
    gradient: "from-[#2D4A3E]/20 via-[#C4622D]/15 to-[#D4942A]/20",
    label: "Couple & Labrador",
    rotation: "4deg",
    scale: 1,
    top: "18%",
    left: "48%",
    delay: "0.8s",
    size: "w-52 h-64",
  },
  {
    id: 3,
    gradient: "from-[#D4942A]/20 via-[#F0D5C0]/30 to-[#C4622D]/15",
    label: "Man & Cat",
    rotation: "-3deg",
    scale: 1,
    top: "55%",
    left: "18%",
    delay: "1.6s",
    size: "w-40 h-52",
  },
];

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
            Your bond,
            <br />
            <em className="text-[#C4622D] not-italic font-medium">
              painted
            </em>
            <br />
            forever.
          </motion.h1>

          {/* Subtext */}
          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-7 text-lg text-[#8C7B6B] leading-relaxed max-w-md font-light"
          >
            Upload your photo and your pet's photo. Our AI recreates a
            beautiful portrait — your faces, your story, one timeless image.
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
              <p className="text-xs text-[#8C7B6B] mt-0.5">Loved by 2,400+ pet owners</p>
            </div>
          </motion.div>
        </div>

        {/* ── Right: Floating portrait frames ── */}
        <div className="relative h-[540px] hidden lg:block">
          {portraits.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: 0.4 + p.id * 0.15,
                duration: 0.9,
                ease: "easeOut" as const,
              }}
              className={`absolute ${p.size} portrait-frame overflow-hidden`}
              style={{
                top: p.top,
                left: p.left,
                transform: `rotate(${p.rotation})`,
                animationDelay: p.delay,
              }}
            >
              {/* Gradient portrait placeholder */}
              <div
                className={`w-full h-full bg-gradient-to-br ${p.gradient} flex flex-col items-center justify-end p-3`}
              >
                {/* Simulated portrait silhouette */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <div className="w-16 h-16 rounded-full bg-[#8C7B6B]" />
                </div>
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-[#C4622D]/30" />
                <div className="relative z-10 w-full bg-white/60 backdrop-blur-sm rounded-sm px-2 py-1.5 text-center">
                  <p className="text-[10px] font-medium text-[#1A1714] leading-tight">{p.label}</p>
                </div>
              </div>

              {/* Floating animation overlay */}
              <div
                className="absolute inset-0"
                style={{
                  animation: `float-slow ${5 + p.id}s ease-in-out infinite`,
                  animationDelay: p.delay,
                }}
              />
            </motion.div>
          ))}

          {/* Price badge floating */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="absolute bottom-12 right-0 bg-white rounded-2xl shadow-xl border border-[#E4D8CC] px-5 py-4"
          >
            <p className="text-xs text-[#8C7B6B] uppercase tracking-wider font-medium">Starting from</p>
            <p className="text-3xl font-display font-semibold text-[#1A1714] mt-0.5">€19.99</p>
            <p className="text-xs text-[#8C7B6B] mt-1">Digital download</p>
          </motion.div>

          {/* Preview badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="absolute top-4 right-4 bg-[#2D4A3E] text-white rounded-xl px-4 py-2.5 text-xs font-medium"
          >
            ✓ Free preview
          </motion.div>
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
