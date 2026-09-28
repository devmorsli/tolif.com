"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, User, PawPrint, ChevronLeft, ChevronRight } from "lucide-react";
import { useWizardStore } from "@/store/wizardStore";

const tips = [
  "Clear, well-lit face looking toward the camera works best",
  "Avoid heavy filters, sunglasses, or partial faces",
  "A recent photo gives the most accurate likeness",
  "For pets: full body or head-and-shoulders, in focus",
];

export function Step2Upload() {
  const { selectedTemplate, uploadSlots, setUploadSlot, gdprConsent, setGdprConsent, next, back } =
    useWizardStore();
  const [dragOver, setDragOver] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const allUploaded = uploadSlots.filter((s) => s.required).every((s) => !!s.file);

  const handleFile = (slotName: string, file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setUploadSlot(slotName, file, url);
  };

  const handleDrop = (slotName: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(slotName, file);
  };

  return (
    <div>
      <div className="text-center mb-10">
        <h2 className="text-4xl font-display font-light text-[#1A1714]">
          Upload your <em className="not-italic font-medium text-[#C4622D]">photos</em>
        </h2>
        <p className="mt-3 text-[#8C7B6B] text-sm max-w-md mx-auto">
          Uploading photos for{" "}
          <strong className="text-[#1A1714]">{selectedTemplate?.name}</strong>. The better your
          photos, the more stunning the result.
        </p>
      </div>

      {/* Upload slots */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {uploadSlots.map((slot, i) => (
          <motion.div
            key={slot.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <p className="text-sm font-medium text-[#1A1714] mb-2 flex items-center gap-2">
              {slot.type === "person" ? (
                <User size={14} className="text-[#C4622D]" />
              ) : (
                <PawPrint size={14} className="text-[#C4622D]" />
              )}
              {slot.label}
              {slot.required && <span className="text-[#C4622D]">*</span>}
            </p>

            <div
              className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 overflow-hidden cursor-pointer ${
                dragOver === slot.name
                  ? "border-[#C4622D] bg-[#C4622D]/5"
                  : slot.previewUrl
                  ? "border-[#2D4A3E]"
                  : "border-[#E4D8CC] hover:border-[#C4622D]/50 hover:bg-[#FAF6F0]"
              }`}
              style={{ height: 180 }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(slot.name); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(slot.name, e)}
              onClick={() => inputRefs.current[slot.name]?.click()}
            >
              <input
                ref={(el) => { inputRefs.current[slot.name] = el; }}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(slot.name, f);
                }}
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
                    <img
                      src={slot.previewUrl}
                      alt={slot.label}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadSlot(slot.name, null as unknown as File, "");
                      }}
                      className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                    >
                      <X size={12} className="text-[#1A1714]" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#F2EAE0] flex items-center justify-center">
                      <Upload size={20} className="text-[#C4622D]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1A1714]">
                        Drop photo here
                      </p>
                      <p className="text-xs text-[#8C7B6B] mt-0.5">
                        or tap to choose from your camera / library
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tips */}
      <div className="bg-[#F2EAE0] rounded-2xl p-5 mb-8">
        <p className="text-xs font-semibold text-[#C4622D] uppercase tracking-wider mb-3">
          Photo tips
        </p>
        <ul className="space-y-1.5">
          {tips.map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-xs text-[#8C7B6B]">
              <span className="text-[#C4622D] mt-px">✓</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* GDPR consent */}
      <label className="flex items-start gap-3 mb-8 cursor-pointer group">
        <input
          type="checkbox"
          checked={gdprConsent}
          onChange={(e) => setGdprConsent(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[#C4622D] cursor-pointer"
        />
        <span className="text-xs text-[#8C7B6B] leading-relaxed">
          I consent to Tolif processing my uploaded photos to generate my portrait. Photos are
          automatically deleted after 30 days and never used to train AI models.{" "}
          <a href="/privacy" className="text-[#C4622D] underline underline-offset-2">
            Privacy Policy
          </a>
        </span>
      </label>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={back}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#8C7B6B] hover:text-[#1A1714] transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={next}
          disabled={!allUploaded || !gdprConsent}
          className="inline-flex items-center gap-2 bg-[#C4622D] disabled:bg-[#E4D8CC] disabled:text-[#8C7B6B] text-white font-medium px-8 py-3.5 rounded-full transition-all duration-200 hover:bg-[#9E4A1E] disabled:cursor-not-allowed"
        >
          Generate my portrait
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
