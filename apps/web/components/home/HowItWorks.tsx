"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Upload, Wand2, Package } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload your photos",
    description:
      "Choose a template — family, couple, solo, or pet — then upload clear photos of the people or animals to include. The better your photo, the more stunning the result.",
    color: "#C4622D",
    bg: "#F9ECE4",
  },
  {
    number: "02",
    icon: Wand2,
    title: "AI creates your portrait",
    description:
      "Our AI recreates the template portrait with everyone's exact likeness. A watermarked preview is ready in minutes for you to review — and if you'd like changes, regenerate for free.",
    color: "#D4942A",
    bg: "#FDF4E3",
  },
  {
    number: "03",
    icon: Package,
    title: "Download or receive it",
    description:
      "Purchase the high-resolution version for instant download, or order it as a museum-quality poster, framed print, or canvas — shipped to your door.",
    color: "#2D4A3E",
    bg: "#E6EFEb",
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-xs font-medium tracking-widest uppercase text-[#C4622D] mb-4 block">
            How It Works
          </span>
          <h2 className="text-5xl lg:text-6xl font-display font-light text-[#1A1714] leading-tight">
            Three steps to
            <br />
            <em className="not-italic font-medium text-[#C4622D]">something timeless</em>
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.7, ease: "easeOut" as const }}
              className="relative group"
            >
              {/* Connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[calc(100%_-_24px)] w-full h-px bg-gradient-to-r from-[#E4D8CC] to-transparent z-0" />
              )}

              <div className="relative z-10">
                {/* Icon circle */}
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:-translate-y-1"
                  style={{ backgroundColor: step.bg }}
                >
                  <step.icon size={28} style={{ color: step.color }} />
                </div>

                {/* Step number */}
                <span
                  className="text-xs font-semibold tracking-widest uppercase mb-3 block"
                  style={{ color: step.color }}
                >
                  Step {step.number}
                </span>

                <h3 className="text-2xl font-display font-medium text-[#1A1714] mb-3 leading-tight">
                  {step.title}
                </h3>
                <p className="text-[#8C7B6B] leading-relaxed text-sm">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
