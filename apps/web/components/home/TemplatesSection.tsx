"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const categories = ["All", "Dogs", "Cats", "Couple & Pet", "Multiple Pets"];

const templates = [
  {
    id: "woman-with-dog",
    name: "Woman with Dog",
    category: "Dogs",
    style: "Oil Painting",
    price: "from €19.99",
    gradient: "from-[#C4622D]/25 via-[#E8A838]/15 to-[#FAF6F0]",
    emoji: "🧑‍🦰🐕",
    bestseller: true,
  },
  {
    id: "man-with-cat",
    name: "Man with Cat",
    category: "Cats",
    style: "Impressionist",
    price: "from €19.99",
    gradient: "from-[#2D4A3E]/25 via-[#D4942A]/10 to-[#FAF6F0]",
    emoji: "👨🐈",
    bestseller: false,
  },
  {
    id: "couple-with-dog",
    name: "Couple with Dog",
    category: "Couple & Pet",
    style: "Golden Hour",
    price: "from €19.99",
    gradient: "from-[#D4942A]/25 via-[#C4622D]/10 to-[#FAF6F0]",
    emoji: "👫🐕",
    bestseller: true,
  },
  {
    id: "woman-with-cat",
    name: "Woman with Cat",
    category: "Cats",
    style: "Watercolour",
    price: "from €19.99",
    gradient: "from-[#F0D5C0]/60 via-[#C4622D]/10 to-[#FAF6F0]",
    emoji: "👩🐱",
    bestseller: false,
  },
  {
    id: "multiple-pets",
    name: "Person & Multiple Pets",
    category: "Multiple Pets",
    style: "Digital Art",
    price: "from €19.99",
    gradient: "from-[#2D4A3E]/20 via-[#E8A838]/15 to-[#FAF6F0]",
    emoji: "🧑🐕🐈",
    bestseller: false,
  },
  {
    id: "man-with-dog",
    name: "Man with Dog",
    category: "Dogs",
    style: "Realistic Oil",
    price: "from €19.99",
    gradient: "from-[#8C7B6B]/20 via-[#C4622D]/10 to-[#FAF6F0]",
    emoji: "👨🐶",
    bestseller: false,
  },
];

export function TemplatesSection() {
  const [active, setActive] = useState("All");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const filtered =
    active === "All" ? templates : templates.filter((t) => t.category === active);

  return (
    <section ref={ref} className="py-28 bg-[#FAF6F0]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12"
        >
          <div>
            <span className="text-xs font-medium tracking-widest uppercase text-[#C4622D] mb-3 block">
              Portrait Templates
            </span>
            <h2 className="text-5xl font-display font-light text-[#1A1714] leading-tight">
              Choose your
              <br />
              <em className="not-italic font-medium">masterpiece</em>
            </h2>
          </div>
          <Link
            href="/portraits"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#8C7B6B] hover:text-[#C4622D] transition-colors group shrink-0"
          >
            View all templates
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        {/* Category pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex gap-2 flex-wrap mb-10"
        >
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
        </motion.div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.6, ease: "easeOut" as const }}
              layout
            >
              <Link href={`/portraits/${template.id}`} className="group block">
                <div className="relative rounded-2xl overflow-hidden bg-white border border-[#E4D8CC] hover:shadow-xl hover:shadow-[#C4622D]/8 hover:-translate-y-1 transition-all duration-400">
                  {/* Portrait image area */}
                  <div
                    className={`relative h-64 bg-gradient-to-br ${template.gradient} flex items-center justify-center overflow-hidden`}
                  >
                    {/* Emoji placeholder for template preview */}
                    <span className="text-6xl opacity-40 group-hover:scale-110 transition-transform duration-500">
                      {template.emoji}
                    </span>

                    {/* Bestseller badge */}
                    {template.bestseller && (
                      <div className="absolute top-3 left-3 bg-[#C4622D] text-white text-xs font-medium px-2.5 py-1 rounded-full">
                        Bestseller
                      </div>
                    )}

                    {/* Style badge */}
                    <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm text-[#8C7B6B] text-xs font-medium px-2.5 py-1 rounded-full border border-[#E4D8CC]">
                      {template.style}
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-[#C4622D]/0 group-hover:bg-[#C4622D]/5 transition-colors duration-300 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 bg-[#C4622D] text-white text-sm font-medium px-5 py-2.5 rounded-full">
                        Choose this style
                      </span>
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-[#1A1714] text-sm leading-tight">
                        {template.name}
                      </h3>
                      <p className="text-xs text-[#8C7B6B] mt-0.5">{template.category}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#C4622D]">{template.price}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
