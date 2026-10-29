"use client";

import { motion } from "framer-motion";
import { ArrowRight, Star, Download, Shield, Zap } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: "easeOut" as const },
  }),
};

const mockRows = [
  { label: "Revenue", q1: "€12,400", q2: "€18,200", q3: "€22,100", color: "#C4622D" },
  { label: "Expenses", q1: "€4,200",  q2: "€5,100",  q3: "€6,300",  color: "#8C7B6B" },
  { label: "Profit",   q1: "€8,200",  q2: "€13,100", q3: "€15,800", color: "#2D7A45" },
  { label: "Growth",   q1: "—",       q2: "+47%",     q3: "+21%",    color: "#1A1714" },
];

function SpreadsheetMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.9, ease: "easeOut" }}
      className="relative"
    >
      {/* Glow */}
      <div className="absolute inset-0 bg-[#C4622D]/10 blur-3xl rounded-3xl" />

      {/* Card */}
      <div className="relative bg-white rounded-2xl border border-[#E4D8CC] shadow-2xl overflow-hidden">
        {/* Window bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E4D8CC] bg-[#FAF6F0]">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          <span className="ml-3 text-xs text-[#8C7B6B] font-mono">Business Tracker.xlsx</span>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-5 text-[11px] font-semibold text-[#8C7B6B] px-4 py-2 border-b border-[#F2EAE0] bg-[#FAF6F0]">
          <span>Metric</span>
          <span className="text-center">Q1</span>
          <span className="text-center">Q2</span>
          <span className="text-center">Q3</span>
          <span className="text-center">Trend</span>
        </div>

        {/* Rows */}
        {mockRows.map((row, i) => (
          <div
            key={row.label}
            className={`grid grid-cols-5 px-4 py-2.5 text-sm border-b border-[#F2EAE0] last:border-0 ${
              i % 2 === 0 ? "bg-white" : "bg-[#FAF6F0]/50"
            }`}
          >
            <span className="font-medium text-[#1A1714]">{row.label}</span>
            <span className="text-center text-[#8C7B6B] font-mono text-xs">{row.q1}</span>
            <span className="text-center text-[#8C7B6B] font-mono text-xs">{row.q2}</span>
            <span
              className="text-center font-semibold font-mono text-xs"
              style={{ color: row.color }}
            >
              {row.q3}
            </span>
            {/* Trend bar */}
            <div className="flex items-center justify-center">
              <div className="flex items-end gap-0.5 h-4">
                {[3, 5, 7, 6, 8].map((h, j) => (
                  <div
                    key={j}
                    className="w-1 rounded-sm"
                    style={{
                      height: `${h * 2}px`,
                      backgroundColor: j === 4 ? row.color : "#E4D8CC",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#FAF6F0] border-t border-[#E4D8CC]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#28C840] animate-pulse" />
            <span className="text-xs text-[#8C7B6B]">Auto-calculating</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#C4622D] font-medium">
            <Download size={11} />
            <span>Instant download</span>
          </div>
        </div>
      </div>

      {/* Badge floats */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute -right-4 top-1/4 bg-white border border-[#E4D8CC] rounded-xl px-3 py-2 shadow-lg text-xs"
      >
        <div className="flex items-center gap-1.5">
          <Zap size={12} className="text-[#C4622D]" />
          <span className="font-medium text-[#1A1714]">Works in Excel & Google Sheets</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute -left-4 bottom-1/4 bg-white border border-[#E4D8CC] rounded-xl px-3 py-2 shadow-lg text-xs"
      >
        <div className="flex items-center gap-1.5">
          <Shield size={12} className="text-[#C4622D]" />
          <span className="font-medium text-[#1A1714]">One-time payment</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function DigitalHeroSection() {
  const scrollToPricing = () => {
    document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" });
  };
  const scrollToProducts = () => {
    document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#FAF6F0] grain">
      {/* Background blobs */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-[#F2EAE0] opacity-60 blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-[500px] h-[500px] rounded-full bg-[#F0D5C0] opacity-40 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 w-[400px] h-[400px] rounded-full bg-[#E8A838]/10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-16 items-center py-32 lg:py-0">
        {/* Left: Copy */}
        <div className="relative z-10">
          {/* Badge */}
          <motion.div
            custom={0} variants={fadeUp} initial="hidden" animate="show"
            className="inline-flex items-center gap-2 bg-white border border-[#E4D8CC] rounded-full px-4 py-1.5 text-xs font-medium text-[#8C7B6B] mb-8 shadow-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#C4622D] animate-pulse" />
            Instant Download · No subscription
          </motion.div>

          {/* Headline */}
          <motion.h1
            custom={1} variants={fadeUp} initial="hidden" animate="show"
            className="text-6xl sm:text-7xl lg:text-8xl font-display font-light text-[#1A1714] leading-[0.95] tracking-tight"
          >
            Spreadsheets
            <br />
            <em className="text-[#C4622D] not-italic font-medium">
              that work
            </em>
            <br />
            for you.
          </motion.h1>

          {/* Sub */}
          <motion.p
            custom={2} variants={fadeUp} initial="hidden" animate="show"
            className="mt-7 text-lg text-[#8C7B6B] leading-relaxed max-w-md font-light"
          >
            Professional-grade spreadsheet templates built for entrepreneurs,
            freelancers, and teams who want clarity — not complexity.
            Download once, use forever.
          </motion.p>

          {/* CTAs */}
          <motion.div
            custom={3} variants={fadeUp} initial="hidden" animate="show"
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <button
              onClick={scrollToPricing}
              className="inline-flex items-center gap-2.5 bg-[#C4622D] hover:bg-[#9E4A1E] text-white font-medium px-8 py-4 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-[#C4622D]/25 hover:-translate-y-0.5 group"
            >
              Browse Templates
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <button
              onClick={scrollToProducts}
              className="inline-flex items-center gap-2 text-[#1A1714] font-medium px-4 py-4 hover:text-[#C4622D] transition-colors"
            >
              See what&apos;s inside
            </button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            custom={4} variants={fadeUp} initial="hidden" animate="show"
            className="mt-12 flex items-center gap-5"
          >
            <div className="flex -space-x-3">
              {["🧑‍💼", "👩‍💼", "👨‍💻", "🧕", "👩‍🚀"].map((emoji, i) => (
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
              <p className="text-xs text-[#8C7B6B] mt-0.5">Trusted by 800+ businesses worldwide</p>
            </div>
          </motion.div>
        </div>

        {/* Right: Spreadsheet mockup */}
        <div className="hidden lg:flex items-center justify-center">
          <SpreadsheetMockup />
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-[#8C7B6B] tracking-widest uppercase">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-[#8C7B6B] to-transparent" />
      </motion.div>
    </section>
  );
}
