"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ImageIcon, ArrowRight, Search, X, SlidersHorizontal, Sparkles } from "lucide-react";
import {
  getPublicTemplates,
  templateImageUrl,
  categoryGradient,
  type PublicTemplate,
} from "@/lib/public-api";

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = ["All", "Families", "Couples", "Solo", "Pets", "Groups"];

const STYLES = [
  "All styles",
  "Classic Oil",
  "Golden Hour",
  "Impressionist",
  "Watercolour",
  "Oil Painting",
  "Studio Art",
  "Digital Art",
  "Romantic",
];

const SORT_OPTIONS = [
  { value: "default", label: "Featured" },
  { value: "az",      label: "A → Z" },
  { value: "za",      label: "Z → A" },
];

// ── Template card ──────────────────────────────────────────────────────────────

function TemplateCard({ template, index }: { template: PublicTemplate; index: number }) {
  const imgUrl = templateImageUrl(template.templateImageKey);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04, duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] }}
      layout
    >
      <Link href={`/portraits/${template.slug}`} className="group block">
        <div className="relative overflow-hidden rounded-2xl bg-[#1A1714]" style={{ aspectRatio: "3/4" }}>

          {/* Image */}
          {imgUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl}
              alt={template.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${categoryGradient(template.category)} flex items-center justify-center`}
            >
              <ImageIcon size={36} className="text-[#C4622D]/40" />
            </div>
          )}

          {/* Style badge */}
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-black/45 backdrop-blur-md text-white/90 text-[10px] font-medium tracking-wide px-2.5 py-1 rounded-full border border-white/10">
              {template.style}
            </span>
          </div>

          {/* Bottom gradient + info */}
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/35 to-transparent pt-16 pb-4 px-4">
            <p className="text-[9px] font-semibold tracking-[3px] uppercase text-white/45 mb-1">
              {template.category}
            </p>
            <h3 className="text-white font-semibold text-sm leading-snug">
              {template.name}
            </h3>
          </div>

          {/* Hover CTA */}
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-300">
            <span className="flex items-center gap-1.5 bg-[#C4622D] text-white text-xs font-bold tracking-wide px-5 py-2.5 rounded-full opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 shadow-xl shadow-black/40">
              Create yours <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-full flex flex-col items-center justify-center py-28 gap-5 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-[#F0E8DC] flex items-center justify-center">
        <Search size={22} className="text-[#C8BAB0]" />
      </div>
      <div>
        <p className="font-display font-light text-xl text-[#1A1714] mb-1.5">
          {query ? `No results for "${query}"` : "No templates here yet"}
        </p>
        <p className="text-sm text-[#8C7B6B]">
          {query ? "Try a different search or clear the filters." : "Check back soon — new styles are added regularly."}
        </p>
      </div>
    </motion.div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-[#F0E8DC] animate-pulse"
          style={{ aspectRatio: "3/4" }}
        />
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PortraitsPage() {
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [category,  setCategory]  = useState("All");
  const [style,     setStyle]     = useState("All styles");
  const [sort,      setSort]      = useState("default");
  const [search,    setSearch]    = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    getPublicTemplates().then((data) => {
      setTemplates(data);
      setLoading(false);
    });
  }, []);

  // Derived styles from actual data
  const availableStyles = useMemo(() => {
    const set = new Set(templates.map((t) => t.style).filter(Boolean));
    return ["All styles", ...Array.from(set).sort()];
  }, [templates]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = templates;

    if (category !== "All")
      result = result.filter((t) => t.category === category);

    if (style !== "All styles")
      result = result.filter((t) => t.style === style);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.style.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }

    if (sort === "az") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "za") result = [...result].sort((a, b) => b.name.localeCompare(a.name));

    return result;
  }, [templates, category, style, sort, search]);

  const hasFilters = category !== "All" || style !== "All styles" || search.trim() !== "";

  function clearAll() {
    setCategory("All");
    setStyle("All styles");
    setSearch("");
    setSort("default");
  }

  // Counts for category pills
  const countFor = (cat: string) =>
    cat === "All"
      ? templates.length
      : templates.filter((t) => t.category === cat).length;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FAF6F0] pt-24 pb-24">
        <div className="max-w-screen-xl mx-auto px-5 sm:px-8">

          {/* ── Page header ─────────────────────────────────────────────────── */}
          <div className="mb-10 max-w-2xl">
            <span className="text-[10px] font-bold tracking-[4px] uppercase text-[#C4622D] mb-4 block">
              Portrait Templates
            </span>
            <h1 className="text-5xl md:text-6xl font-display font-light text-[#1A1714] leading-[1.05] tracking-tight mb-4">
              Choose your <br />
              <em className="not-italic font-semibold">masterpiece</em>
            </h1>
            <p className="text-[#8C7B6B] text-base leading-relaxed">
              Pick a style, upload your photos, and see a free watermarked preview in minutes.
            </p>
          </div>

          {/* ── Search + filter row ─────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">

            {/* Search bar */}
            <div className="relative flex-1 max-w-md">
              <Search
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A090] pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search styles, categories…"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#E4D8CC] bg-white
                           text-sm text-[#1A1714] placeholder:text-[#C8BAB0]
                           focus:outline-none focus:ring-2 focus:ring-[#C4622D]/25 focus:border-[#C4622D]/60
                           transition-all duration-200"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full
                             text-[#B0A090] hover:text-[#1A1714] hover:bg-[#F0E8DC] transition-all"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filters toggle (mobile) + Sort (always) */}
            <div className="flex gap-2">
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium
                            transition-all duration-200
                            ${filtersOpen
                              ? "bg-[#1A1714] border-[#1A1714] text-white"
                              : "bg-white border-[#E4D8CC] text-[#5A4E46] hover:border-[#1A1714]"
                            }`}
              >
                <SlidersHorizontal size={14} />
                <span>Filters</span>
                {hasFilters && (
                  <span className="w-4 h-4 rounded-full bg-[#C4622D] text-white text-[9px] font-bold flex items-center justify-center">
                    {(category !== "All" ? 1 : 0) + (style !== "All styles" ? 1 : 0)}
                  </span>
                )}
              </button>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-4 py-3 rounded-xl border border-[#E4D8CC] bg-white
                           text-sm font-medium text-[#5A4E46]
                           focus:outline-none focus:ring-2 focus:ring-[#C4622D]/25 focus:border-[#C4622D]/60
                           transition-all duration-200 cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Expanded filters panel ───────────────────────────────────────── */}
          <AnimatePresence initial={false}>
            {filtersOpen && (
              <motion.div
                key="filters-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <div className="bg-white rounded-2xl border border-[#E4D8CC] p-5 mb-6 space-y-5">

                  {/* Category pills */}
                  <div>
                    <p className="text-[10px] font-bold tracking-[3px] uppercase text-[#A89080] mb-3">Category</p>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategory(cat)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                            category === cat
                              ? "bg-[#1A1714] text-white"
                              : "bg-[#F5F0E8] text-[#5A4E46] hover:bg-[#EDE5D8] hover:text-[#1A1714]"
                          }`}
                        >
                          {cat}
                          <span className={`ml-1.5 ${category === cat ? "text-white/50" : "text-[#C4622D]"}`}>
                            {countFor(cat)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Style pills */}
                  <div>
                    <p className="text-[10px] font-bold tracking-[3px] uppercase text-[#A89080] mb-3">Art Style</p>
                    <div className="flex flex-wrap gap-2">
                      {(availableStyles.length > 2 ? availableStyles : STYLES).map((s) => (
                        <button
                          key={s}
                          onClick={() => setStyle(s)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                            style === s
                              ? "bg-[#C4622D] text-white"
                              : "bg-[#F5F0E8] text-[#5A4E46] hover:bg-[#F0E4D6] hover:text-[#C4622D]"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear button */}
                  {hasFilters && (
                    <button
                      onClick={clearAll}
                      className="flex items-center gap-1.5 text-xs text-[#8C7B6B] hover:text-[#C4622D] transition-colors font-medium"
                    >
                      <X size={12} /> Clear all filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Active filter chips (always visible if active) ────────────────── */}
          {!filtersOpen && hasFilters && (
            <div className="flex flex-wrap gap-2 mb-5">
              {category !== "All" && (
                <Chip label={category} onRemove={() => setCategory("All")} />
              )}
              {style !== "All styles" && (
                <Chip label={style} onRemove={() => setStyle("All styles")} color="terracotta" />
              )}
              {search.trim() && (
                <Chip label={`"${search}"`} onRemove={() => setSearch("")} />
              )}
              <button
                onClick={clearAll}
                className="text-xs text-[#8C7B6B] hover:text-[#C4622D] transition-colors font-medium px-1"
              >
                Clear all
              </button>
            </div>
          )}

          {/* ── Results count ─────────────────────────────────────────────────── */}
          {!loading && (
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-[#8C7B6B]">
                {filtered.length === templates.length
                  ? `${templates.length} templates`
                  : `${filtered.length} of ${templates.length} templates`}
              </p>
              {filtered.length > 0 && (
                <Link
                  href="/create"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#C4622D] hover:underline"
                >
                  <Sparkles size={12} />
                  Start creating now
                </Link>
              )}
            </div>
          )}

          {/* ── Grid ─────────────────────────────────────────────────────────── */}
          {loading ? (
            <SkeletonGrid />
          ) : (
            <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.length === 0 ? (
                  <EmptyState key="empty" query={search} />
                ) : (
                  filtered.map((template, i) => (
                    <TemplateCard key={template.id} template={template} index={i} />
                  ))
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
          {!loading && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-4
                         bg-[#1A1714] rounded-2xl px-8 py-7"
            >
              <div>
                <p className="font-display font-light text-2xl text-[#F5E6D3] mb-1">
                  Ready to create your portrait?
                </p>
                <p className="text-sm text-[#8C7B6B]">Free watermarked preview · No account needed</p>
              </div>
              <Link
                href="/create"
                className="shrink-0 flex items-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E]
                           text-white text-sm font-bold px-7 py-3.5 rounded-full
                           transition-all duration-200 hover:shadow-lg hover:shadow-[#C4622D]/30
                           hover:-translate-y-0.5"
              >
                Start creating <ArrowRight size={14} />
              </Link>
            </motion.div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}

// ── Chip component ─────────────────────────────────────────────────────────────
function Chip({
  label,
  onRemove,
  color = "default",
}: {
  label: string;
  onRemove: () => void;
  color?: "default" | "terracotta";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-semibold ${
        color === "terracotta"
          ? "bg-[#FFF0E8] text-[#C4622D] border border-[#F0CDB8]"
          : "bg-[#F0E8DC] text-[#5A4E46] border border-[#E4D8CC]"
      }`}
    >
      {label}
      <button
        onClick={onRemove}
        className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
      >
        <X size={9} />
      </button>
    </span>
  );
}
