"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ImageIcon } from "lucide-react";
import {
  getPublicTemplates,
  getUiSettings,
  templateImageUrl,
  categoryGradient,
  TEMPLATE_CATEGORIES,
  type PublicTemplate,
  type TemplateDefaultSort,
} from "@/lib/public-api";

const HOME_LIMIT = 8;

function applySortOrder(templates: PublicTemplate[], sort: TemplateDefaultSort): PublicTemplate[] {
  if (sort === "az") return [...templates].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "za") return [...templates].sort((a, b) => b.name.localeCompare(a.name));
  if (sort === "newest") return [...templates].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  if (sort === "oldest") return [...templates].sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
  return templates; // "order" = API sort order (default)
}

function TemplateCard({ template }: { template: PublicTemplate }) {
  const [imgError, setImgError] = useState(false);
  const imgUrl = templateImageUrl(template.templateImageKey);

  return (
    <Link href={`/portraits/${template.slug}`} className="group block">
      {/* CSS picture frame */}
      <div style={{
        position: "relative",
        aspectRatio: "3/4",
        background: "linear-gradient(160deg, #D8BC96 0%, #C4A47C 30%, #B08858 55%, #CAA87A 80%, #D4B488 100%)",
        padding: "8px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.18)",
      }}>
        {/* Mat board */}
        <div style={{
          width: "100%",
          height: "100%",
          background: "#F7F2EA",
          padding: "12px",
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.10)",
          display: "flex",
        }}>
          <div style={{ flex: 1, overflow: "hidden" }}>
            {imgUrl && !imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgUrl}
                alt={template.name}
                loading="lazy"
                decoding="async"
                onError={() => setImgError(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                className="transition-transform duration-700 ease-out group-hover:scale-105"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${categoryGradient(template.category)} flex items-center justify-center`}>
                <ImageIcon size={28} className="text-[#C4622D]/40" />
              </div>
            )}
          </div>
        </div>

        {/* Hover CTA */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ zIndex: 20 }}>
          <span className="flex items-center gap-1.5 bg-[#C4622D] text-white text-xs font-semibold px-4 py-2 rounded-full translate-y-2 group-hover:translate-y-0 transition-transform duration-300 shadow-lg">
            Choose style <ArrowRight size={11} />
          </span>
        </div>
      </div>
      {/* Name below frame */}
      <div className="mt-2 px-0.5">
        <p className="font-semibold text-[#1A1714] text-sm truncate group-hover:text-[#C4622D] transition-colors duration-200">{template.name}</p>
        <p className="text-[11px] text-[#8C7B6B] mt-0.5">{template.category}{template.style ? ` · ${template.style}` : ""}</p>
      </div>
    </Link>
  );
}

export function TemplatesSection() {
  const [active, setActive] = useState("All");
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fading, setFading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  useEffect(() => {
    Promise.all([getPublicTemplates(), getUiSettings()]).then(([data, ui]) => {
      setTemplates(applySortOrder(data, ui.templatesDefaultSort));
      setLoading(false);
    });
  }, []);

  const filtered =
    active === "All" ? templates : templates.filter((t) => t.category === active);

  const visible = filtered.slice(0, HOME_LIMIT);

  const handleFilter = (cat: string) => {
    if (cat === active) return;
    setFading(true);
    setTimeout(() => {
      setActive(cat);
      setFading(false);
    }, 120);
  };

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
          {TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleFilter(cat)}
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
            <p className="text-sm">No templates in this category yet.</p>
          </div>
        )}

        {/* Gallery grid */}
        {!loading && visible.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.15, duration: 0.5 }}
              style={{ opacity: fading ? 0 : 1, transition: "opacity 0.12s ease" }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {visible.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </motion.div>

            {filtered.length > HOME_LIMIT && (
              <div className="flex justify-center mt-8">
                <Link
                  href={`/portraits${active !== "All" ? `?category=${active}` : ""}`}
                  className="flex items-center gap-2 px-6 py-3 rounded-full border border-[#E4D8CC] bg-white text-sm font-semibold text-[#5A4E46] hover:border-[#C4622D] hover:text-[#C4622D] transition-all duration-200"
                >
                  See all {filtered.length} templates <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
