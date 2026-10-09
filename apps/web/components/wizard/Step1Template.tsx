"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizardStore, type Template } from "@/store/wizardStore";
import {
  getPublicTemplates,
  parseUploadSlots,
  templateImageUrl,
  categoryGradient,
  type PublicTemplate,
} from "@/lib/public-api";
import { Check, ImageIcon, Search, X, SlidersHorizontal } from "lucide-react";

// eslint-disable-next-line @next/next/no-img-element
function TemplateThumb({ imgUrl, name, category }: { imgUrl: string; name: string; category: string }) {
  const [err, setErr] = useState(false);
  if (imgUrl && !err)
    return <img src={imgUrl} alt={name} onError={() => setErr(true)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />;
  return (
    <div className={`w-full h-full bg-gradient-to-br ${categoryGradient(category)} flex items-center justify-center`}>
      <ImageIcon size={32} className="text-[#C4622D]/30" />
    </div>
  );
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = ["All", "Families", "Couples", "Solo", "Pets", "Groups"];

const SORT_OPTIONS = [
  { value: "default", label: "Featured" },
  { value: "az",      label: "A → Z" },
  { value: "za",      label: "Z → A" },
];

// ── Chip ───────────────────────────────────────────────────────────────────────

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

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-full flex flex-col items-center justify-center py-20 gap-4 text-center"
    >
      <div className="w-12 h-12 rounded-2xl bg-[#F0E8DC] flex items-center justify-center">
        <Search size={20} className="text-[#C8BAB0]" />
      </div>
      <div>
        <p className="font-display font-light text-lg text-[#1A1714] mb-1">
          {query ? `No results for "${query}"` : "No templates here yet"}
        </p>
        <p className="text-sm text-[#8C7B6B]">
          {query ? "Try a different search or clear the filters." : "Check back soon."}
        </p>
      </div>
    </motion.div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function Step1Template() {
  const { selectedTemplate, selectTemplate, next } = useWizardStore();

  const [templates,    setTemplates]    = useState<PublicTemplate[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [category,     setCategory]     = useState("All");
  const [style,        setStyle]        = useState("All styles");
  const [sort,         setSort]         = useState("default");
  const [filtersOpen,  setFiltersOpen]  = useState(false);

  useEffect(() => {
    getPublicTemplates().then((data) => {
      setTemplates(data);
      setLoading(false);
    });
  }, []);

  const pick = (t: PublicTemplate) => {
    const wizardTemplate: Template = {
      id: t.id,
      slug: t.slug,
      name: t.name,
      category: t.category,
      style: t.style,
      uploadSlots: parseUploadSlots(t.uploadSlotsJson),
    };
    selectTemplate(wizardTemplate);
    next();
  };

  // Styles derived from real data
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
          t.style?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }

    if (sort === "az") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "za") result = [...result].sort((a, b) => b.name.localeCompare(a.name));

    return result;
  }, [templates, category, style, sort, search]);

  const hasFilters = category !== "All" || style !== "All styles" || search.trim() !== "";

  const clearAll = () => {
    setCategory("All");
    setStyle("All styles");
    setSearch("");
    setSort("default");
  };

  const countFor = (cat: string) =>
    cat === "All"
      ? templates.length
      : templates.filter((t) => t.category === cat).length;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-display font-light text-[#1A1714]">
          Choose your <em className="not-italic font-medium text-[#C4622D]">portrait style</em>
        </h2>
        <p className="mt-3 text-[#8C7B6B] text-sm max-w-md mx-auto">
          Pick the template that feels right — families, couples, solo, pets, groups.
        </p>
      </div>

      {/* ── Search + filter row ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">

        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A090] pointer-events-none" />
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

        {/* Filters toggle + Sort */}
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

      {/* ── Expanded filters panel ───────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div
            key="filters"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="bg-white rounded-2xl border border-[#E4D8CC] p-5 mb-5 space-y-5">

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
              {availableStyles.length > 1 && (
                <div>
                  <p className="text-[10px] font-bold tracking-[3px] uppercase text-[#A89080] mb-3">Art Style</p>
                  <div className="flex flex-wrap gap-2">
                    {availableStyles.map((s) => (
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
              )}

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

      {/* ── Active filter chips ──────────────────────────────────────────────── */}
      {!filtersOpen && hasFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
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

      {/* ── Results count ───────────────────────────────────────────────────── */}
      {!loading && (
        <p className="text-xs text-[#8C7B6B] mb-5">
          {filtered.length === templates.length
            ? `${templates.length} templates`
            : `${filtered.length} of ${templates.length} templates`}
        </p>
      )}

      {/* ── Loading spinner ──────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Grid ────────────────────────────────────────────────────────────── */}
      {!loading && (
        <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <EmptyState key="empty" query={search} />
            ) : (
              filtered.map((t, i) => {
                const selected = selectedTemplate?.id === t.id;
                const imgUrl = templateImageUrl(t.templateImageKey);
                return (
                  <motion.button
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04, duration: 0.42 }}
                    onClick={() => pick(t)}
                    className={`relative group text-left rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                      selected
                        ? "border-[#C4622D] shadow-lg shadow-[#C4622D]/15"
                        : "border-[#E4D8CC] hover:border-[#C4622D]/50 hover:shadow-md"
                    }`}
                  >
                    {/* Image */}
                    <div className="h-44 overflow-hidden relative">
                      <TemplateThumb imgUrl={imgUrl} name={t.name} category={t.category} />
                      {/* Style badge */}
                      {t.style && (
                        <div className="absolute top-2.5 left-2.5">
                          <span className="bg-black/45 backdrop-blur-md text-white/90 text-[10px] font-medium tracking-wide px-2.5 py-1 rounded-full border border-white/10">
                            {t.style}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="bg-white px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#1A1714] text-sm">{t.name}</p>
                        <p className="text-xs text-[#8C7B6B] mt-0.5">
                          {t.category}{t.category ? " · " : ""}
                          {parseUploadSlots(t.uploadSlotsJson).length} photo{parseUploadSlots(t.uploadSlotsJson).length !== 1 ? "s" : ""} needed
                        </p>
                      </div>
                      {selected && (
                        <div className="w-6 h-6 rounded-full bg-[#C4622D] flex items-center justify-center flex-shrink-0">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
