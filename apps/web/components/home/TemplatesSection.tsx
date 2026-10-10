"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ImageIcon } from "lucide-react";
import {
  getPublicTemplates,
  templateImageUrl,
  categoryGradient,
  type PublicTemplate,
} from "@/lib/public-api";

const categories = ["All", "Families", "Couples", "Solo", "Pets", "Groups"];

function TemplateCard({
  template,
  index,
  inView,
}: {
  template: PublicTemplate;
  index: number;
  inView: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const imgUrl = templateImageUrl(template.templateImageKey);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: 0.05 + index * 0.07, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
      layout
    >
      <Link href={`/portraits/${template.slug}`} className="group block">
        <div
          className="relative overflow-hidden rounded-xl bg-[#1A1714]"
          style={{ aspectRatio: "3/4" }}
        >
          {/* Image or gradient placeholder */}
          {imgUrl && !imgError ? (
            <img
              src={imgUrl}
              alt={template.name}
              onError={() => setImgError(true)}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${categoryGradient(template.category)} flex items-center justify-center`}
            >
              <ImageIcon size={32} className="text-[#C4622D]/40" />
            </div>
          )}

          {/* Portrait frame overlay */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mockups/frame-black-12x16.png"
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full pointer-events-none select-none z-[2]"
            style={{ objectFit: "fill" }}
            draggable={false}
          />

          {/* Style badge */}
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-black/40 backdrop-blur-md text-white/90 text-[10px] font-medium tracking-wide px-2.5 py-1 rounded-full border border-white/10">
              {template.style}
            </span>
          </div>

          {/* Bottom gradient + name */}
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/75 via-black/25 to-transparent pt-12 pb-3.5 px-3.5">
            <p className="text-[9px] font-semibold tracking-widest uppercase text-white/50 mb-0.5">
              {template.category}
            </p>
            <h3 className="text-white font-medium text-[13px] leading-snug">{template.name}</h3>
          </div>

          {/* Hover CTA */}
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-300">
            <span className="flex items-center gap-1.5 bg-[#C4622D] text-white text-xs font-semibold px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 shadow-lg shadow-black/30">
              Choose style <ArrowRight size={11} />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function TemplatesSection() {
  const [active, setActive] = useState("All");
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  useEffect(() => {
    getPublicTemplates().then((data) => {
      setTemplates(data);
      setLoading(false);
    });
  }, []);

  const filtered =
    active === "All" ? templates : templates.filter((t) => t.category === active);

  return (
    <section ref={ref} className="py-28 bg-[#FAF6F0]">
      <div className="max-w-screen-xl mx-auto px-6">

        {/* Header row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12"
        >
          <div>
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#C4622D] mb-3 block">
              Portrait Templates
            </span>
            <h2 className="text-5xl font-display font-light text-[#1A1714] leading-tight">
              Choose your
              <br />
              <em className="not-italic font-semibold">masterpiece</em>
            </h2>
          </div>
          <Link
            href="/portraits"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#8C7B6B] hover:text-[#C4622D] transition-colors group shrink-0"
          >
            View all templates
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
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
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                active === cat
                  ? "bg-[#1A1714] text-white"
                  : "bg-white border border-[#E4D8CC] text-[#8C7B6B] hover:border-[#1A1714] hover:text-[#1A1714]"
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-28">
            <div className="w-7 h-7 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 text-[#8C7B6B]">
            <p className="text-sm">No templates available yet. Check back soon.</p>
          </div>
        )}

        {/* Gallery grid — 4 columns */}
        {!loading && filtered.length > 0 && (
          <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((template, i) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  index={i}
                  inView={inView}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
}
