"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizardStore, type Template } from "@/store/wizardStore";
import {
  getPublicTemplates,
  getUiSettings,
  parseUploadSlots,
  templateImageUrl,
  categoryGradient,
  TEMPLATE_CATEGORIES,
  type PublicTemplate,
  type TemplateDefaultSort,
} from "@/lib/public-api";
import {
  Check, ImageIcon, Upload, X, User, PawPrint,
  ChevronRight, Plus, ArrowRight, RefreshCw, ExternalLink,
} from "lucide-react";

// ── Template image ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @next/next/no-img-element
function TemplateImg({ imgUrl, name, category, className }: { imgUrl: string; name: string; category: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (imgUrl && !err)
    return <img src={imgUrl} alt={name} onError={() => setErr(true)} className={className ?? "w-full h-full object-cover"} />;
  return (
    <div className={`w-full h-full bg-gradient-to-br ${categoryGradient(category)} flex items-center justify-center`}>
      <ImageIcon size={28} className="text-[#C4622D]/30" />
    </div>
  );
}

const PHOTO_TIPS = [
  "Clear, well-lit face looking toward the camera",
  "Avoid heavy filters, sunglasses, or partial faces",
  "For pets: full body or head-and-shoulders, in focus",
];

const ALL_CATEGORIES = TEMPLATE_CATEGORIES;

// ── Selected template card ─────────────────────────────────────────────────────
function SelectedTemplateCard({
  template,
  onChangeTemplate,
}: {
  template: Template;
  onChangeTemplate: () => void;
}) {
  const imgUrl = templateImageUrl(template.templateImageKey ?? "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      {/* Large framed portrait preview */}
      <div className="flex justify-center mb-4">
        <div
          style={{
            width: "min(220px, 100%)",
            aspectRatio: "3/4",
            background: "linear-gradient(160deg,#D8BC96 0%,#C4A47C 30%,#B08858 55%,#CAA87A 80%,#D4B488 100%)",
            padding: "10px",
            boxShadow: "0 12px 40px rgba(26,23,20,0.28), inset 0 1px 0 rgba(255,255,255,0.28)",
          }}
        >
          <div style={{ width: "100%", height: "100%", background: "#F7F2EA", padding: "10px" }}>
            <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
              <TemplateImg imgUrl={imgUrl} name={template.name} category={template.category} />
            </div>
          </div>
        </div>
      </div>

      {/* Name + category */}
      <div className="text-center mb-3">
        <div className="inline-flex items-center gap-1.5 bg-[#2D4A3E]/10 text-[#2D4A3E] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-2">
          <Check size={10} /> Selected
        </div>
        <p className="font-semibold text-[#1A1714] text-base">{template.name}</p>
        <p className="text-xs text-[#8C7B6B] mt-0.5">{template.category}{template.style ? ` · ${template.style}` : ""}</p>
      </div>

      {/* Change button */}
      <div className="flex justify-center">
        <button
          onClick={onChangeTemplate}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#C4622D] hover:text-[#9E4A1E] transition-colors border border-[#C4622D]/30 hover:border-[#C4622D]/60 hover:bg-[#FFF5F0] px-4 py-2 rounded-full"
        >
          <RefreshCw size={11} />
          Choose a different style
        </button>
      </div>
    </motion.div>
  );
}

// ── Template picker grid ───────────────────────────────────────────────────────
function TemplatePicker({
  templates,
  selected,
  onPick,
  initialCategory,
  pinnedSlugs,
}: {
  templates: PublicTemplate[];
  selected: Template | null;
  onPick: (t: PublicTemplate) => void;
  initialCategory?: string | null;
  pinnedSlugs?: string[];
}) {
  const [activeCategory, setCategory] = useState(initialCategory && ALL_CATEGORIES.includes(initialCategory as typeof ALL_CATEGORIES[number]) ? initialCategory : "All");

  // Only show category pills that have at least one template
  const usedCategories = ["All", ...ALL_CATEGORIES.filter(
    (cat) => cat !== "All" && templates.some((t) => t.category === cat)
  )];

  // Sort: pinned templates first (in their specified order), then the rest
  const sortedTemplates = (() => {
    if (!pinnedSlugs || pinnedSlugs.length === 0) return templates;
    const pinned = pinnedSlugs
      .map((slug) => templates.find((t) => t.slug === slug))
      .filter((t): t is PublicTemplate => !!t);
    const pinnedIds = new Set(pinned.map((t) => t.id));
    const rest = templates.filter((t) => !pinnedIds.has(t.id));
    return [...pinned, ...rest];
  })();

  const filtered = activeCategory === "All"
    ? sortedTemplates
    : sortedTemplates.filter((t) => t.category === activeCategory);

  // If currently selected category has no templates, fall back to All
  const visibleFiltered = filtered.length === 0 ? sortedTemplates : filtered;
  const visible = visibleFiltered.slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.32, ease: "easeInOut" }}
    >
      {/* Category filter pills — only categories with templates */}
      <div className="flex flex-wrap gap-2 mb-4">
        {usedCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              activeCategory === cat
                ? "bg-[#1A1714] text-white"
                : "bg-white border border-[#E4D8CC] text-[#5A4E46] hover:border-[#1A1714]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {pinnedSlugs && pinnedSlugs.length > 0 && (
        <p className="text-[11px] font-semibold text-[#C4622D] uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <span className="inline-block w-4 h-px bg-[#C4622D]" />
          Featured styles
          <span className="inline-block w-4 h-px bg-[#C4622D]" />
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {visible.map((t, i) => {
          const isSelected = selected?.id === t.id;
          const imgUrl     = templateImageUrl(t.templateImageKey);
          const slotCount  = parseUploadSlots(t.uploadSlotsJson).length;
          const isPinned   = pinnedSlugs?.includes(t.slug) ?? false;

          return (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.28 }}
              onClick={() => onPick(t)}
              className="group text-left focus:outline-none"
              style={{
                transform: isSelected ? "scale(1.08)" : "scale(1)",
                zIndex: isSelected ? 10 : 1,
                transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                position: "relative",
              }}
            >
              {/* Frame — same style as portraits page */}
              <div
                className="relative"
                style={{
                  aspectRatio: "3/4",
                  background: "linear-gradient(160deg,#D8BC96 0%,#C4A47C 30%,#B08858 55%,#CAA87A 80%,#D4B488 100%)",
                  padding: "8px",
                  boxShadow: isSelected
                    ? "0 0 0 3px #C4622D, 0 16px 40px rgba(196,98,45,0.35)"
                    : "0 6px 20px rgba(0,0,0,0.20)",
                  transition: "box-shadow 0.25s",
                }}
              >
                {/* Mat board */}
                <div style={{ width: "100%", height: "100%", background: "#F7F2EA", padding: "8px", display: "flex" }}>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <TemplateImg
                      imgUrl={imgUrl}
                      name={t.name}
                      category={t.category}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>

                {/* Selected overlay */}
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#C4622D]/20">
                    <div className="w-9 h-9 rounded-full bg-[#C4622D] flex items-center justify-center shadow-lg">
                      <Check size={16} className="text-white" />
                    </div>
                  </div>
                )}

                {/* Pinned badge */}
                {isPinned && !isSelected && (
                  <div className="absolute top-2 left-2 z-10 bg-[#C4622D] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Featured
                  </div>
                )}

                {/* Hover CTA */}
                {!isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="bg-[#C4622D] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-md translate-y-1 group-hover:translate-y-0 transition-transform duration-200">
                      Select →
                    </span>
                  </div>
                )}
              </div>

              {/* Name below */}
              <div className="mt-2 px-0.5">
                <p className={`font-semibold text-sm truncate transition-colors duration-200 ${isSelected ? "text-[#C4622D]" : "text-[#1A1714] group-hover:text-[#C4622D]"}`}>
                  {t.name}
                </p>
                <p className="text-[11px] text-[#8C7B6B] mt-0.5">
                  {slotCount} photo{slotCount !== 1 ? "s" : ""} · Free preview
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Browse all link */}
      {filtered.length > 6 && (
        <div className="mt-5">
          <a
            href="/portraits"
            className="flex items-center gap-1 text-xs font-semibold text-[#8C7B6B] hover:text-[#C4622D] transition-colors"
          >
            Browse all {filtered.length} templates <ExternalLink size={10} className="ml-0.5" />
          </a>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="py-10 text-center text-sm text-[#8C7B6B]">
          No templates in this category yet.
        </div>
      )}
    </motion.div>
  );
}

// ── Photo uploader ─────────────────────────────────────────────────────────────
function PhotoUploader() {
  const { selectedTemplate, uploadSlots, setUploadSlot, addExtraSlot, removeExtraSlot } = useWizardStore();
  const inputRefs     = useRef<Record<string, HTMLInputElement | null>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);

  const extraPersonsAdded = uploadSlots.filter((s) => s.name.startsWith("extra_person")).length;
  const extraPetsAdded    = uploadSlots.filter((s) => s.name.startsWith("extra_pet")).length;
  const extraPersonsMax   = selectedTemplate?.extraPersonsAllowed ?? 0;
  const extraPetsMax      = selectedTemplate?.extraPetsAllowed ?? 0;

  const handleFile = (slotName: string, file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadSlot(slotName, file, URL.createObjectURL(file));
  };

  if (uploadSlots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-[#8C7B6B]">
        <div className="w-14 h-14 rounded-2xl bg-[#F2EAE0] flex items-center justify-center mb-3">
          <Upload size={22} className="text-[#C4622D]/40" />
        </div>
        <p className="text-sm font-medium text-[#1A1714]">Choose a portrait style first</p>
        <p className="text-xs mt-1">Photo slots will appear here</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {uploadSlots.map((slot) => (
          <div key={slot.name} className="relative">
            <p className="text-xs font-medium text-[#1A1714] mb-1.5 flex items-center gap-1.5">
              {slot.type === "person" ? <User size={11} className="text-[#C4622D]" /> : <PawPrint size={11} className="text-[#C4622D]" />}
              {slot.label}
              {slot.required && <span className="text-[#C4622D]">*</span>}
              {!slot.required && (
                <button onClick={() => removeExtraSlot(slot.name)} className="ml-auto text-[#C0B5A8] hover:text-red-400 transition-colors">
                  <X size={10} />
                </button>
              )}
            </p>
            <div
              className={`relative rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden cursor-pointer ${
                dragOver === slot.name ? "border-[#C4622D] bg-[#C4622D]/5"
                  : slot.previewUrl ? "border-[#2D4A3E]"
                  : "border-[#E4D8CC] hover:border-[#C4622D]/50 hover:bg-[#FAF6F0]"
              }`}
              style={{ height: 130 }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(slot.name); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => { e.preventDefault(); setDragOver(null); const f = e.dataTransfer.files[0]; if (f) handleFile(slot.name, f); }}
              onClick={() => inputRefs.current[slot.name]?.click()}
            >
              <input ref={(el) => { inputRefs.current[slot.name] = el; }} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(slot.name, f); }} />
              <AnimatePresence mode="wait">
                {slot.previewUrl ? (
                  <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slot.previewUrl} alt={slot.label} className="w-full h-full object-cover" />
                    <button onClick={(e) => { e.stopPropagation(); setUploadSlot(slot.name, null as unknown as File, ""); }} className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow">
                      <X size={10} className="text-[#1A1714]" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/30 to-transparent p-1.5">
                      <p className="text-white text-[10px] font-medium text-center">✓ Ready</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
                    <div className="w-9 h-9 rounded-xl bg-[#F2EAE0] flex items-center justify-center">
                      <Upload size={16} className="text-[#C4622D]" />
                    </div>
                    <p className="text-[11px] text-[#8C7B6B] leading-tight">Tap to upload<br />or drag & drop</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {(extraPersonsMax > 0 || extraPetsMax > 0) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {extraPersonsMax > 0 && (
            <button onClick={() => addExtraSlot("person")} disabled={extraPersonsAdded >= extraPersonsMax}
              className="flex items-center gap-1.5 border border-dashed border-[#C4622D]/40 hover:border-[#C4622D] disabled:border-[#E4D8CC] disabled:opacity-40 bg-white hover:bg-[#FFF9F6] px-3 py-1.5 rounded-lg text-xs font-medium text-[#C4622D] transition-all">
              <Plus size={11} /> Add person <span className="text-[10px] text-[#C0B5A8]">({extraPersonsAdded}/{extraPersonsMax})</span>
            </button>
          )}
          {extraPetsMax > 0 && (
            <button onClick={() => addExtraSlot("pet")} disabled={extraPetsAdded >= extraPetsMax}
              className="flex items-center gap-1.5 border border-dashed border-[#C4622D]/40 hover:border-[#C4622D] disabled:border-[#E4D8CC] disabled:opacity-40 bg-white hover:bg-[#FFF9F6] px-3 py-1.5 rounded-lg text-xs font-medium text-[#C4622D] transition-all">
              <Plus size={11} /> Add pet <span className="text-[10px] text-[#C0B5A8]">({extraPetsAdded}/{extraPetsMax})</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function Step1SetupPortrait() {
  const {
    selectedTemplate, selectTemplate,
    uploadSlots, gdprConsent, setGdprConsent, next,
    preferredCategory, pinnedTemplateSlugs,
  } = useWizardStore();

  const [templates,        setTemplates]        = useState<PublicTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [pickerOpen,       setPickerOpen]       = useState(!selectedTemplate);

  // Keep pickerOpen in sync: if template gets cleared, re-open
  useEffect(() => {
    if (!selectedTemplate) setPickerOpen(true);
  }, [selectedTemplate]);

  useEffect(() => {
    Promise.all([getPublicTemplates(), getUiSettings()]).then(([data, ui]) => {
      const sort = ui.templatesDefaultSort as TemplateDefaultSort;
      let sorted = data;
      if (sort === "az")     sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
      if (sort === "za")     sorted = [...data].sort((a, b) => b.name.localeCompare(a.name));
      if (sort === "newest") sorted = [...data].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
      if (sort === "oldest") sorted = [...data].sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
      setTemplates(sorted);
      setLoadingTemplates(false);
    });
  }, []);

  const pickTemplate = (t: PublicTemplate) => {
    selectTemplate({
      id: t.id, slug: t.slug, name: t.name,
      category: t.category, style: t.style,
      templateImageKey: t.templateImageKey,
      uploadSlots: parseUploadSlots(t.uploadSlotsJson),
      extraPersonsAllowed: t.extraPersonsAllowed ?? 0,
      extraPetsAllowed:    t.extraPetsAllowed    ?? 0,
    });
    setPickerOpen(false);
  };

  const allRequired  = uploadSlots.filter((s) => s.required).every((s) => !!s.file);
  const canGenerate  = !!selectedTemplate && allRequired && gdprConsent;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-4xl font-display font-light text-[#1A1714]">
          Create your <em className="not-italic font-medium text-[#C4622D]">portrait</em>
        </h2>
        <p className="mt-3 text-[#8C7B6B] text-sm max-w-md mx-auto">
          Pick a style, upload your photos, and we&apos;ll paint your portrait with AI.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1px_1fr] gap-0">

        {/* ── Left: template selection ── */}
        <div className="lg:pr-8">
          {/* Step header */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${selectedTemplate ? "bg-[#2D4A3E] text-white" : "bg-[#C4622D] text-white"}`}>
              {selectedTemplate ? <Check size={14} /> : "1"}
            </div>
            <p className="text-sm font-semibold text-[#1A1714]">Choose your portrait style</p>
          </div>

          {loadingTemplates ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Show selected card when picker is closed */}
              <AnimatePresence mode="wait">
                {selectedTemplate && !pickerOpen && (
                  <SelectedTemplateCard
                    key="selected"
                    template={selectedTemplate}
                    onChangeTemplate={() => setPickerOpen(true)}
                  />
                )}
              </AnimatePresence>

              {/* Template grid */}
              <AnimatePresence>
                {pickerOpen && (
                  <TemplatePicker
                    templates={templates}
                    selected={selectedTemplate}
                    onPick={pickTemplate}
                    initialCategory={preferredCategory}
                    pinnedSlugs={pinnedTemplateSlugs}
                  />
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="hidden lg:block bg-[#E4D8CC] my-2" />

        {/* ── Right: upload ── */}
        <div className="lg:pl-8 mt-8 lg:mt-0">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${allRequired && uploadSlots.length > 0 ? "bg-[#2D4A3E] text-white" : "bg-[#C4622D] text-white"}`}>
              {allRequired && uploadSlots.length > 0 ? <Check size={14} /> : "2"}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1A1714]">Upload your photos</p>
              {selectedTemplate && (
                <p className="text-xs text-[#8C7B6B]">
                  {uploadSlots.filter((s) => s.required && s.file).length} of{" "}
                  {uploadSlots.filter((s) => s.required).length} required uploaded
                </p>
              )}
            </div>
          </div>

          <PhotoUploader />

          {uploadSlots.length > 0 && (
            <div className="mt-4 bg-[#F2EAE0] rounded-xl p-3.5">
              <p className="text-[10px] font-semibold text-[#C4622D] uppercase tracking-wider mb-2">Photo tips</p>
              <ul className="space-y-1">
                {PHOTO_TIPS.map((tip) => (
                  <li key={tip} className="flex items-start gap-1.5 text-[11px] text-[#8C7B6B]">
                    <span className="text-[#C4622D] mt-px">✓</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* GDPR + Generate */}
      <div className="mt-8 pt-6 border-t border-[#E4D8CC]">

        {/* Privacy consent card */}
        <label
          className={`flex items-start gap-4 mb-5 cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 ${
            gdprConsent
              ? "border-[#2D4A3E] bg-[#2D4A3E]/5"
              : "border-[#E4D8CC] bg-white hover:border-[#C4622D]/40 hover:bg-[#FFF9F6]"
          }`}
        >
          {/* Custom checkbox */}
          <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
            gdprConsent ? "bg-[#2D4A3E] border-[#2D4A3E]" : "border-[#D4C8BE] bg-white"
          }`}>
            <input
              type="checkbox"
              checked={gdprConsent}
              onChange={(e) => setGdprConsent(e.target.checked)}
              className="sr-only"
            />
            {gdprConsent && <Check size={12} className="text-white" strokeWidth={3} />}
          </div>

          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold mb-1 transition-colors ${gdprConsent ? "text-[#2D4A3E]" : "text-[#1A1714]"}`}>
              I agree to photo processing
            </p>
            <p className="text-xs text-[#8C7B6B] leading-relaxed">
              Your photos are used only to generate your portrait and{" "}
              <strong className="text-[#1A1714] font-semibold">deleted automatically after 30 days</strong>.
              They are{" "}
              <strong className="text-[#1A1714] font-semibold">never used to train AI models</strong>.{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#C4622D] underline underline-offset-2 hover:text-[#9E4A1E]">
                Privacy Policy ↗
              </a>
            </p>
            <div className="flex gap-3 mt-2">
              <span className="flex items-center gap-1 text-[10px] text-[#8C7B6B] font-medium">
                <span className="text-[#2D4A3E]">✓</span> Auto-deleted in 30 days
              </span>
              <span className="flex items-center gap-1 text-[10px] text-[#8C7B6B] font-medium">
                <span className="text-[#2D4A3E]">✓</span> Never used for AI training
              </span>
            </div>
          </div>
        </label>

        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-[#8C7B6B] hidden sm:block">
            {!selectedTemplate && "← Choose a portrait style to get started"}
            {selectedTemplate && !allRequired && `Upload ${uploadSlots.filter((s) => s.required && !s.file).length} more required photo${uploadSlots.filter((s) => s.required && !s.file).length !== 1 ? "s" : ""}`}
            {selectedTemplate && allRequired && !gdprConsent && "Tick the consent box above to continue"}
            {canGenerate && "Everything's ready — let's paint your portrait!"}
          </div>

          <button
            onClick={next}
            disabled={!canGenerate}
            className="ml-auto inline-flex items-center gap-2.5 bg-[#C4622D] disabled:bg-[#E4D8CC] disabled:text-[#8C7B6B] disabled:cursor-not-allowed text-white font-semibold px-8 py-4 rounded-full transition-all duration-200 hover:bg-[#9E4A1E] hover:shadow-lg hover:shadow-[#C4622D]/25 hover:-translate-y-0.5 whitespace-nowrap"
          >
            Generate my portrait
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
