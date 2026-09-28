"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-28 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" as const }}
          className="relative overflow-hidden rounded-3xl bg-[#2D4A3E] px-8 py-20 text-center grain"
        >
          {/* Background blobs */}
          <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#C4622D]/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-[#D4942A]/20 blur-3xl" />
          </div>

          <div className="relative z-10">
            <span className="text-xs font-medium tracking-widest uppercase text-[#D4942A] mb-6 block">
              Start for free
            </span>
            <h2 className="text-5xl lg:text-6xl font-display font-light text-white leading-tight mb-6">
              Ready to create
              <br />
              <em className="not-italic font-medium text-[#D4942A]">your portrait?</em>
            </h2>
            <p className="text-white/60 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              Upload your photos, watch the magic happen, and see a free preview in minutes. Only pay if you love it.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/create"
                className="inline-flex items-center gap-2.5 bg-[#C4622D] hover:bg-[#D97A4A] text-white font-medium px-8 py-4 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-[#C4622D]/30 hover:-translate-y-0.5 group"
              >
                Create your portrait
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/portraits"
                className="inline-flex items-center gap-2 text-white/60 hover:text-white font-medium px-4 py-4 transition-colors"
              >
                Browse templates
              </Link>
            </div>

            <p className="text-white/30 text-xs mt-8">
              Free preview · No credit card required · Results in minutes
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
