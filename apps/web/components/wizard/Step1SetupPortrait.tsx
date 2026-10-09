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
  Check,
  ImageIcon,
  Upload,
  X,
  User,
  PawPrint,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

// eslint-disable-next-line @next/next/no-img-element
function TemplateThumb({ imgUrl, name, category }: { imgUrl: string; name: string; category: string }) {
  const [err, setErr] = useState(false);
  if (imgUrl && !err)
    return <img src={imgUrl} alt={name} onError={() => setErr(true)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />;
  return (
    <div className={`w-full h-full bg-gradient-to-br ${categoryGradient(category)} flex items-center justify-center`}>
      <ImageIcon size={24} className="text-[#C4622D]/30" />
    </div>
  );
}

const tips = [
  "Clear, well-lit face looking toward the camera",
  "Avoid heavy filters, sunglasses, or partial faces",
  "For pets: full body or head-and-shoulders, in focus",
];

// ── Template picker ───────────────────────────────────────────────────────────

function TemplatePicker({
  templates,
  selected,
  onPick,
}: {
  templates: PublicTemplate[];
  selected: Template | null;
  onPick: (t: PublicTemplate) => void;
}) {
  const [expanded, setExpanded] = useState(!selected);

  // Auto-expand when nothing selected, auto-collapse once selected
  useEffect(() => {
    if (!selected) setExpanded(true);
  }, [selected]);

  return (
    <div>
      {/* Header — shows selected summary when collapsed */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between mb-4 group"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              selected
                ? "bg-[#2D4A3E] text-white"
                : "bg-[#C4622D] text-white"
            }`}
          >
            {selected ? <Check size={14} /> : "1"}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-[#1A1714]">
              {selected ? selected.name : "Choose your portrait style"}
            </p>
            {selected && (
              <p className="text-xs text-[#8C7B6B]">{selected.category}{selected.style ? ` · ${selected.style}` : ""}</p>
            )}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-[#8C7B6B] transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-2">
              {templates.map((t, i) => {
                const isSelected = selected?.id === t.id;
                const imgUrl = templateImageUrl(t.templateImageKey);
                return (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      onPick(t);
                      setExpanded(false);
                    }}
                    className={`relative group text-left rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      isSelected
                        ? "border-[#C4622D] shadow-md shadow-[#C4622D]/15"
                        : "border-[#E4D8CC] hover:border-[#C4622D]/50"
                    }`}
                  >
                    <div className="h-28 overflow-hidden relative">
                      <TemplateThumb imgUrl={imgUrl} name={t.name} category={t.category} />
                      {isSelected && (
                        <div className="absolute inset-0 bg-[#C4622D]/10 flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full bg-[#C4622D] flex items-center justify-center">
                            <Check size={13} className="text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="bg-white px-2.5 py-2">
                      <p className="font-medium text-[#1A1714] text-xs leading-tight">{t.name}</p>
                      <p className="text-[10px] text-[#8C7B6B] mt-0.5">
                        {parseUploadSlots(t.uploadSlotsJson).length} photo
                        {parseUploadSlots(t.uploadSlotsJson).length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Photo uploader ────────────────────────────────────────────────────────────

function PhotoUploader() {
  const { uploadSlots, setUploadSlot } = useWizardStore();
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleFile = (slotName: string, file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setUploadSlot(slotName, file, url);
  };

  if (uploadSlots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-[#8C7B6B]">
        <div className="w-14 h-14 rounded-2xl bg-[#F2EAE0] flex items-center justify-center mb-3">
          <Upload size={22} className="text-[#C4622D]/40" />
        </div>
        <p className="text-sm font-medium text-[#1A1714]">Choose a portrait style first</p>
        <p className="text-xs mt-1">Photo slots will appear here based on the template</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {uploadSlots.map((slot) => (
        <div key={slot.name}>
          <p className="text-xs font-medium text-[#1A1714] mb-1.5 flex items-center gap-1.5">
            {slot.type === "person" ? (
              <User size={11} className="text-[#C4622D]" />
            ) : (
              <PawPrint size={11} className="text-[#C4622D]" />
            )}
            {slot.label}
            {slot.required && <span className="text-[#C4622D]">*</span>}
          </p>
          <div
            className={`relative rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden cursor-pointer ${
              dragOver === slot.name
                ? "border-[#C4622D] bg-[#C4622D]/5"
                : slot.previewUrl
                ? "border-[#2D4A3E]"
                : "border-[#E4D8CC] hover:border-[#C4622D]/50 hover:bg-[#FAF6F0]"
            }`}
            style={{ height: 130 }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(slot.name); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => { e.preventDefault(); setDragOver(null); const f = e.dataTransfer.files[0]; if (f) handleFile(slot.name, f); }}
            onClick={() => inputRefs.current[slot.name]?.click()}
          >
            <input
              ref={(el) => { inputRefs.current[slot.name] = el; }}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(slot.name, f); }}
            />
            <AnimatePresence mode="wait">
              {slot.previewUrl ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slot.previewUrl} alt={slot.label} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setUploadSlot(slot.name, null as unknown as File, ""); }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow"
                  >
                    <X size={10} className="text-[#1A1714]" />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/30 to-transparent p-1.5">
                    <p className="text-white text-[10px] font-medium text-center">✓ Ready</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#F2EAE0] flex items-center justify-center">
                    <Upload size={16} className="text-[#C4622D]" />
                  </div>
                  <p className="text-[11px] text-[#8C7B6B] leading-tight">
                    Tap to upload<br />or drag & drop
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Step1SetupPortrait() {
  const {
    selectedTemplate,
    selectTemplate,
    uploadSlots,
    gdprConsent,
    setGdprConsent,
    next,
  } = useWizardStore();

  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    getPublicTemplates().then((data) => {
      setTemplates(data);
      setLoadingTemplates(false);
    });
  }, []);

  const pickTemplate = (t: PublicTemplate) => {
    selectTemplate({
      id: t.id,
      slug: t.slug,
      name: t.name,
      category: t.category,
      style: t.style,
      uploadSlots: parseUploadSlots(t.uploadSlotsJson),
    });
  };

  const allRequired = uploadSlots.filter((s) => s.required).every((s) => !!s.file);
  const canGenerate = !!selectedTemplate && allRequired && gdprConsent;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-4xl font-display font-light text-[#1A1714]">
          Create your <em className="not-italic font-medium text-[#C4622D]">portrait</em>
        </h2>
        <p className="mt-3 text-[#8C7B6B] text-sm max-w-md mx-auto">
          Pick a style, upload your photos, and we'll paint your portrait with AI.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1px_1fr] gap-0">
        {/* Left — template picker */}
        <div className="lg:pr-8">
          {loadingTemplates ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <TemplatePicker
              templates={templates}
              selected={selectedTemplate}
              onPick={pickTemplate}
            />
          )}
        </div>

        {/* Divider */}
        <div className="hidden lg:block bg-[#E4D8CC] my-2" />

        {/* Right — upload */}
        <div className="lg:pl-8 mt-8 lg:mt-0">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                allRequired && uploadSlots.length > 0
                  ? "bg-[#2D4A3E] text-white"
                  : "bg-[#C4622D] text-white"
              }`}
            >
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

          {/* Tips */}
          {uploadSlots.length > 0 && (
            <div className="mt-4 bg-[#F2EAE0] rounded-xl p-3.5">
              <p className="text-[10px] font-semibold text-[#C4622D] uppercase tracking-wider mb-2">Photo tips</p>
              <ul className="space-y-1">
                {tips.map((tip) => (
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
          <input
            type="checkbox"
            checked={gdprConsent}
            onChange={(e) => setGdprConsent(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#C4622D] cursor-pointer shrink-0"
          />
          <span className="text-xs text-[#8C7B6B] leading-relaxed">
            I consent to Tolif processing my uploaded photos to generate my portrait. Photos are
            automatically deleted after 30 days and never used to train AI models.{" "}
            <a href="/privacy" className="text-[#C4622D] underline underline-offset-2">
              Privacy Policy
            </a>
          </span>
        </label>

        <div className="flex items-center justify-between gap-4">
          {/* Progress hint */}
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
