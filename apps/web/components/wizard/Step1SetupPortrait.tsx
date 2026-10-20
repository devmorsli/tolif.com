"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizardStore, type Template } from "@/store/wizardStore";
import {
  getPublicTemplates,
  parseUploadSlots,
  templateImageUrl,
  categoryGradient,
  type PublicTemplate,
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

const ALL_CATEGORIES = ["All", "Families", "Couples", "Pets", "Solo", "Groups"];

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
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-[#2D4A3E] flex items-center justify-center shrink-0">
          <Check size={13} className="text-white" />
        </div>
        <p className="text-sm font-semibold text-[#1A1714]">Portrait style selected</p>
      </div>

      {/* Card — same frame style as portraits page */}
      <div className="flex gap-4 bg-white border border-[#E4D8CC] rounded-2xl p-4">
        {/* Framed portrait thumbnail */}
        <div
          className="shrink-0"
          style={{
            width: 80,
            aspectRatio: "3/4",
            background: "linear-gradient(160deg,#D8BC96 0%,#C4A47C 30%,#B08858 55%,#CAA87A 80%,#D4B488 100%)",
            padding: "5px",
            boxShadow: "0 4px 12px rgba(26,23,20,0.22)",
          }}
        >
          <div style={{ width: "100%", height: "100%", background: "#F7F2EA", padding: "5px" }}>
            <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
              <TemplateImg imgUrl={imgUrl} name={template.name} category={template.category} />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <p className="font-semibold text-[#1A1714] text-sm leading-tight">{template.name}</p>
            <p className="text-xs text-[#8C7B6B] mt-0.5">{template.category}{template.style ? ` · ${template.style}` : ""}</p>
          </div>
          <button
            onClick={onChangeTemplate}
            className="mt-3 self-start flex items-center gap-1.5 text-xs font-semibold text-[#C4622D] hover:text-[#9E4A1E] transition-colors border border-[#C4622D]/30 hover:border-[#C4622D]/60 px-3 py-1.5 rounded-full"
          >
            <RefreshCw size={11} />
            Select another template
          </button>
        </div>
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
}: {
  templates: PublicTemplate[];
  selected: Template | null;
  onPick: (t: PublicTemplate) => void;
  initialCategory?: string | null;
}) {
  const [activeCategory, setCategory] = useState(initialCategory && ALL_CATEGORIES.includes(initialCategory) ? initialCategory : "All");

  const filtered = activeCategory === "All"
    ? templates
    : templates.filter((t) => t.category === activeCategory);

  const visible = filtered.slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.32, ease: "easeInOut" }}
    >
      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {ALL_CATEGORIES.map((cat) => (
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {visible.map((t, i) => {
          const isSelected = selected?.id === t.id;
          const imgUrl     = templateImageUrl(t.templateImageKey);
          const slotCount  = parseUploadSlots(t.uploadSlotsJson).length;

          return (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.28 }}
              onClick={() => onPick(t)}
              className="group text-left focus:outline-none"
            >
              {/* Frame — same style as portraits page */}
              <div
                className="relative"
                style={{
                  aspectRatio: "3/4",
                  background: "linear-gradient(160deg,#D8BC96 0%,#C4A47C 30%,#B08858 55%,#CAA87A 80%,#D4B488 100%)",
                  padding: "8px",
                  boxShadow: isSelected
                    ? "0 0 0 3px #C4622D, 0 8px 24px rgba(196,98,45,0.3)"
                    : "0 6px 20px rgba(0,0,0,0.20)",
                  transition: "box-shadow 0.2s",
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
    preferredCategory,
  } = useWizardStore();

  const [templates,        setTemplates]        = useState<PublicTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [pickerOpen,       setPickerOpen]       = useState(!selectedTemplate);

  // Keep pickerOpen in sync: if template gets cleared, re-open
  useEffect(() => {
    if (!selectedTemplate) setPickerOpen(true);
  }, [selectedTemplate]);

  useEffect(() => {
    getPublicTemplates().then((data) => { setTemplates(data); setLoadingTemplates(false); });
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
        <label className="flex items-start gap-3 mb-5 cursor-pointer">
          <input type="checkbox" checked={gdprConsent} onChange={(e) => setGdprConsent(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#C4622D] cursor-pointer shrink-0" />
          <span className="text-xs text-[#8C7B6B] leading-relaxed">
            I consent to Tolif processing my uploaded photos to generate my portrait. Photos are
            automatically deleted after 30 days and never used to train AI models.{" "}
            <a href="/privacy" className="text-[#C4622D] underline underline-offset-2">Privacy Policy</a>
          </span>
        </label>

        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-[#8C7B6B] hidden sm:block">
            {!selectedTemplate && "← Choose a portrait style to get started"}
            {selectedTemplate && !allRequired && `Upload ${uploadSlots.filter((s) => s.required && !s.file).length} more required photo${uploadSlots.filter((s) => s.required && !s.file).length !== 1 ? "s" : ""}`}
            {selectedTemplate && allRequired && !gdprConsent && "Tick the consent box to continue"}
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
