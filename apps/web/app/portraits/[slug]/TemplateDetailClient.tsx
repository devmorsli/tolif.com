"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useInView } from "framer-motion";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  ChevronLeft, User, PawPrint, ImageIcon, Upload, X, ArrowRight, Check,
  ChevronDown, Sparkles, ShieldCheck, Star, Clock, RefreshCcw, Package,
  Zap, Heart, Plus, Minus,
} from "lucide-react";
import {
  parseUploadSlots, templateImageUrl, categoryGradient,
  getPublicReviews, type PublicTemplate, type PublicReview,
} from "@/lib/public-api";
import { useWizardStore } from "@/store/wizardStore";

// ── Small component to handle image load errors gracefully ────────────────────
// eslint-disable-next-line @next/next/no-img-element
function TemplateImg({ imgUrl, name, category, className }: { imgUrl: string; name: string; category: string; className?: string; iconSize?: number }) {
  const [err, setErr] = useState(false);
  if (imgUrl && !err)
    return <img src={imgUrl} alt={name} onError={() => setErr(true)} className={className ?? "w-full h-full object-cover"} />;
  return (
    <div className={`w-full h-full bg-gradient-to-br ${categoryGradient(category)} flex items-center justify-center`}>
      <ImageIcon size={40} className="text-[#C4622D]/20" />
    </div>
  );
}

// ── Static data ───────────────────────────────────────────────────────────────


const FAQS = [
  {
    q: "What photos should I upload?",
    a: "Use clear, well-lit photos where faces are visible and looking roughly toward the camera. Avoid sunglasses, heavy filters, or blurry shots. The better your photo, the more detailed your portrait.",
  },
  {
    q: "How long does generation take?",
    a: "Your free watermarked preview is ready in about 60 seconds. The high-resolution file (delivered after purchase) takes a few minutes more to ensure maximum quality.",
  },
  {
    q: "Can I try it for free?",
    a: "Yes — the watermarked preview is completely free. You only pay if you love it and want the high-resolution file or a physical print. No card required upfront.",
  },
  {
    q: "What if I'm not happy with the result?",
    a: "You get up to 5 free regenerations before you decide to purchase. If you still aren't satisfied after purchase, we offer a full refund or a free redo — no questions asked.",
  },
  {
    q: "Are my photos kept private?",
    a: "Absolutely. Your photos are stored on encrypted servers, never shared with anyone, never used to train AI models, and automatically deleted after 30 days. We are fully GDPR-compliant.",
  },
  {
    q: "What formats and sizes are available?",
    a: "Every order includes a high-resolution digital PNG (min. 3000×4000 px). You can also order premium poster prints (30×40, 50×70 cm), framed prints ready to hang, and gallery-wrapped canvases — shipped worldwide.",
  },
];

const STEPS = [
  { n: "1", icon: ImageIcon,   label: "Pick a style",  desc: "Choose the template that fits your story" },
  { n: "2", icon: Upload,      label: "Upload photos", desc: "Drop in your best shot — takes 30 seconds" },
  { n: "3", icon: Sparkles,    label: "Get your portrait", desc: "Free preview in ~60 s, pay only if you love it" },
];

const tips = [
  "Clear, well-lit face looking toward camera",
  "Avoid heavy filters or sunglasses",
  "For pets: head & shoulders, in focus",
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SlotCard({
  slot, dragOver, onDragOver, onDragLeave, onDrop, onClick, onRemove,
}: {
  slot: { name: string; label: string; type: "person" | "pet"; required: boolean; file?: File; previewUrl?: string };
  dragOver: boolean;
  onDragOver: () => void; onDragLeave: () => void;
  onDrop: (f: File) => void; onClick: () => void; onRemove: () => void;
}) {
  const isDone = !!slot.previewUrl;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${isDone ? "bg-[#2D4A3E]" : "bg-[#E4D8CC]"}`}>
          {isDone ? <Check size={9} className="text-white" /> : slot.type === "person" ? <User size={8} className="text-[#8C7B6B]" /> : <PawPrint size={8} className="text-[#8C7B6B]" />}
        </div>
        <p className="text-[11px] font-medium text-[#1A1714] leading-none">
          {slot.label}{slot.required && <span className="text-[#C4622D] ml-0.5">*</span>}
        </p>
      </div>
      <motion.div
        whileHover={!isDone ? { scale: 1.02 } : {}}
        whileTap={!isDone ? { scale: 0.98 } : {}}
        className={`relative rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-200 ${
          dragOver ? "border-[#C4622D] bg-[#C4622D]/5 shadow-md"
            : isDone ? "border-[#2D4A3E] shadow-sm"
            : "border-dashed border-[#D4C4B4] hover:border-[#C4622D]/60 hover:bg-[#FAF6F0]"
        }`}
        style={{ height: 120 }}
        onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
        onDragLeave={onDragLeave}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onDrop(f); }}
        onClick={onClick}
      >
        <AnimatePresence mode="wait">
          {isDone ? (
            <motion.div key="preview" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slot.previewUrl} alt={slot.label} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute top-2 right-2 w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors">
                <X size={10} className="text-[#1A1714]" />
              </button>
              <div className="absolute bottom-2 inset-x-2 flex items-center justify-center">
                <div className="bg-[#2D4A3E]/90 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check size={8} /> Ready
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
              <motion.div animate={dragOver ? { scale: 1.15, rotate: -5 } : { scale: 1, rotate: 0 }} className="w-10 h-10 rounded-2xl bg-[#F2EAE0] flex items-center justify-center">
                <Upload size={16} className="text-[#C4622D]" />
              </motion.div>
              <p className="text-[10px] text-[#8C7B6B] leading-snug">{dragOver ? "Drop it!" : "Tap to upload"}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function StarRow({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <Star key={i} size={11} className="fill-[#D4942A] text-[#D4942A]" />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TemplateDetailClient({
  template,
  related,
}: {
  template: PublicTemplate;
  related: PublicTemplate[];
}) {
  const router = useRouter();
  const { selectTemplate, uploadSlots, setUploadSlot, gdprConsent, setGdprConsent, goTo } = useWizardStore();
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);

  const trustRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const relatedRef = useRef<HTMLDivElement>(null);

  const trustInView   = useInView(trustRef,   { once: true, margin: "-40px" });
  const stepsInView   = useInView(stepsRef,   { once: true, margin: "-40px" });
  const reviewsInView = useInView(reviewsRef, { once: true, margin: "-40px" });
  const faqInView     = useInView(faqRef,     { once: true, margin: "-40px" });
  const relatedInView = useInView(relatedRef, { once: true, margin: "-40px" });

  const imgUrl = templateImageUrl(template.templateImageKey);

  useEffect(() => {
    getPublicReviews().then(setReviews);
  }, []);

  useEffect(() => {
    const cur = useWizardStore.getState().selectedTemplate;
    if (cur?.id !== template.id) {
      selectTemplate({
        id: template.id, slug: template.slug, name: template.name,
        category: template.category, style: template.style,
        uploadSlots: parseUploadSlots(template.uploadSlotsJson),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id]);

  const handleFile = (slotName: string, file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadSlot(slotName, file, URL.createObjectURL(file));
  };

  const requiredSlots     = uploadSlots.filter((s) => s.required);
  const uploadedRequired  = requiredSlots.filter((s) => !!s.file).length;
  const allRequiredDone   = requiredSlots.length > 0 && uploadedRequired === requiredSlots.length;
  const canGenerate       = allRequiredDone && gdprConsent;

  const handleGenerate = () => {
    if (!canGenerate) return;
    setLaunching(true);
    goTo(2);
    router.push("/create");
  };

  // Progress ring
  const radius       = 16;
  const circumference = 2 * Math.PI * radius;
  const dash         = circumference * (requiredSlots.length > 0 ? uploadedRequired / requiredSlots.length : 0);

  const displayReviews = reviews.slice(0, 3);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FAF6F0]">

        {/* ── Hero section ──────────────────────────────────────────────────── */}
        <section className="pt-24 pb-16 px-5 lg:px-8">
          <div className="max-w-6xl mx-auto">

            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-[#8C7B6B] mb-8">
              <Link href="/portraits" className="hover:text-[#C4622D] transition-colors flex items-center gap-1 group">
                <ChevronLeft size={12} className="transition-transform group-hover:-translate-x-0.5" /> All templates
              </Link>
              <span className="text-[#D4C4B4]">/</span>
              <span className="text-[#1A1714] font-medium">{template.name}</span>
            </nav>

            <div className="grid lg:grid-cols-[minmax(0,480px)_1fr] gap-10 xl:gap-16 items-start">

              {/* Left: Portrait preview */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="lg:sticky lg:top-28"
              >
                <div className="relative rounded-3xl overflow-hidden aspect-[3/4] shadow-xl shadow-[#1A1714]/10">
                  <TemplateImg imgUrl={imgUrl} name={template.name} category={template.category} />
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
                  {template.style && (
                    <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-sm text-[#8C7B6B] text-xs font-medium px-3 py-1.5 rounded-full border border-white/60">
                      {template.style}
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black/50 to-transparent px-5 pb-5 pt-10">
                    <p className="text-white/60 text-[10px] text-center tracking-wide">
                      Free watermarked preview · Unlock after purchase
                    </p>
                  </div>
                </div>

                {/* Inline social proof */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 bg-white border border-[#E4D8CC] rounded-2xl px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5">
                    <StarRow n={5} />
                    <span className="text-xs font-semibold text-[#1A1714]">4.9</span>
                    <span className="text-xs text-[#8C7B6B]">· 2,400+ portraits</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#8C7B6B]">
                    <Clock size={11} className="text-[#C4622D]" />
                    ~60 s
                  </div>
                </motion.div>

              </motion.div>

              {/* Right: Upload form */}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.55, ease: "easeOut" }}
              >
                <span className="text-xs font-semibold tracking-widest uppercase text-[#C4622D] mb-2 block">
                  {template.category}
                </span>
                <h1 className="text-4xl lg:text-5xl font-display font-light text-[#1A1714] leading-tight mb-3">
                  {template.name}
                </h1>
                {template.description && (
                  <p className="text-[#8C7B6B] leading-relaxed mb-6 text-sm">{template.description}</p>
                )}

                <div className="w-12 h-px bg-[#E4D8CC] mb-6" />

                {/* Upload section */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      {/* Progress ring */}
                      <div className="relative w-9 h-9 flex-shrink-0">
                        <svg className="w-9 h-9 -rotate-90" viewBox="0 0 40 40">
                          <circle cx="20" cy="20" r={radius} fill="none" stroke="#E4D8CC" strokeWidth="2.5" />
                          <motion.circle cx="20" cy="20" r={radius} fill="none"
                            stroke={allRequiredDone ? "#2D4A3E" : "#C4622D"}
                            strokeWidth="2.5" strokeLinecap="round"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: circumference - dash }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {allRequiredDone ? <Check size={13} className="text-[#2D4A3E]" /> : <span className="text-[10px] font-bold text-[#C4622D]">{uploadedRequired}</span>}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1A1714] leading-none">Upload your photos</p>
                        <p className="text-[11px] text-[#8C7B6B] mt-0.5">
                          {allRequiredDone ? "All photos ready!" : `${uploadedRequired} of ${requiredSlots.length} required`}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setTipsOpen((v) => !v)} className="flex items-center gap-1 text-[11px] text-[#8C7B6B] hover:text-[#C4622D] transition-colors">
                      Tips <ChevronDown size={12} className={`transition-transform duration-200 ${tipsOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {tipsOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                        <div className="bg-[#F2EAE0] rounded-2xl p-3.5 mb-4 flex flex-col gap-1.5">
                          {tips.map((tip) => (
                            <div key={tip} className="flex items-start gap-2 text-[11px] text-[#8C7B6B]">
                              <Check size={10} className="text-[#C4622D] mt-0.5 flex-shrink-0" /> {tip}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className={`grid gap-3 ${uploadSlots.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
                    {uploadSlots.map((slot) => (
                      <div key={slot.name}>
                        <input ref={(el) => { inputRefs.current[slot.name] = el; }} type="file" accept="image/*" capture="user" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(slot.name, f); }} />
                        <SlotCard slot={slot} dragOver={dragOver === slot.name}
                          onDragOver={() => setDragOver(slot.name)} onDragLeave={() => setDragOver(null)}
                          onDrop={(f) => { setDragOver(null); handleFile(slot.name, f); }}
                          onClick={() => inputRefs.current[slot.name]?.click()}
                          onRemove={() => setUploadSlot(slot.name, null as unknown as File, "")} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* GDPR consent */}
                <label className="flex items-start gap-2.5 mb-5 cursor-pointer group">
                  <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all duration-200 ${gdprConsent ? "bg-[#C4622D] border-[#C4622D]" : "border-[#D4C4B4] group-hover:border-[#C4622D]/50"}`}>
                    {gdprConsent && <Check size={9} className="text-white" />}
                  </div>
                  <input type="checkbox" checked={gdprConsent} onChange={(e) => setGdprConsent(e.target.checked)} className="sr-only" />
                  <span className="text-[11px] text-[#8C7B6B] leading-relaxed">
                    I consent to Tolif processing my photos to generate my portrait. Photos deleted after 30 days, never used to train AI.{" "}
                    <a href="/privacy" className="text-[#C4622D] underline underline-offset-2 hover:text-[#9E4A1E]">Privacy Policy</a>
                  </span>
                </label>

                {/* Generate CTA */}
                <motion.button
                  onClick={handleGenerate}
                  disabled={!canGenerate || launching}
                  whileHover={canGenerate && !launching ? { scale: 1.02, y: -1 } : {}}
                  whileTap={canGenerate && !launching ? { scale: 0.98 } : {}}
                  className={`w-full flex items-center justify-center gap-2.5 font-semibold px-8 py-4 rounded-full transition-all duration-300 text-base ${canGenerate && !launching ? "bg-[#C4622D] text-white shadow-lg shadow-[#C4622D]/25 hover:bg-[#9E4A1E] hover:shadow-xl hover:shadow-[#C4622D]/30" : "bg-[#E4D8CC] text-[#B0A090] cursor-not-allowed"}`}
                >
                  {launching ? (
                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Starting…</>
                  ) : (
                    <>{canGenerate && <Sparkles size={16} />} Generate my portrait {canGenerate && <ArrowRight size={16} />}</>
                  )}
                </motion.button>

                <AnimatePresence mode="wait">
                  <motion.p key={canGenerate ? "ready" : allRequiredDone ? "consent" : "upload"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="text-center text-[11px] text-[#8C7B6B] mt-3">
                    {!allRequiredDone && requiredSlots.length > 0
                      ? `${requiredSlots.length - uploadedRequired} more photo${requiredSlots.length - uploadedRequired !== 1 ? "s" : ""} needed`
                      : !gdprConsent ? "Check the privacy box above to continue"
                      : "Free watermarked preview · No card required"}
                  </motion.p>
                </AnimatePresence>

                {/* Trust badges */}
                <div className="mt-5 flex items-center justify-center gap-4 flex-wrap text-[10px] text-[#B0A090]">
                  <span className="flex items-center gap-1"><ShieldCheck size={10} className="text-[#2D4A3E]" /> GDPR compliant</span>
                  <span className="flex items-center gap-1"><ShieldCheck size={10} className="text-[#2D4A3E]" /> Photos deleted in 30 days</span>
                  <span className="flex items-center gap-1"><Sparkles size={10} className="text-[#C4622D]" /> ~60 s generation</span>
                </div>

                {/* Products */}
                <div className="w-full h-px bg-[#E4D8CC] mt-6 mb-5" />
                <p className="text-[10px] font-semibold text-[#1A1714] uppercase tracking-widest mb-3">Available after generation</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Poster Print", hint: "30×40 / 50×70 cm" },
                    { label: "Framed Print", hint: "Ready to hang" },
                    { label: "Canvas", hint: "Gallery-wrapped" },
                  ].map((p) => (
                    <div key={p.label} className="bg-white border border-[#E4D8CC] rounded-xl px-3 py-2.5 text-center">
                      <p className="text-[11px] font-medium text-[#1A1714]">{p.label}</p>
                      <p className="text-[10px] text-[#8C7B6B] mt-0.5">{p.hint}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Try a different style ──────────────────────────────────────────── */}
        {related.length > 0 && (
          <section ref={relatedRef} className="py-16 px-5 lg:px-8 bg-white border-t border-[#E4D8CC]">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={relatedInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5 }}
                className="flex items-end justify-between mb-10"
              >
                <div>
                  <span className="text-xs font-semibold tracking-widest uppercase text-[#C4622D] mb-2 block">
                    Not quite right?
                  </span>
                  <h2 className="text-3xl font-display font-light text-[#1A1714]">
                    Try a <em className="not-italic font-medium text-[#C4622D]">different style</em>
                  </h2>
                  <p className="text-sm text-[#8C7B6B] mt-1.5">
                    Same free preview — no commitment until you love it.
                  </p>
                </div>
                <Link
                  href="/portraits"
                  className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-[#8C7B6B] hover:text-[#C4622D] transition-colors group shrink-0"
                >
                  All styles <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {related.map((t, i) => {
                  const rImgUrl = templateImageUrl(t.templateImageKey);
                  const slotCount = parseUploadSlots(t.uploadSlotsJson).length;
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={relatedInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ delay: i * 0.08, duration: 0.5 }}
                    >
                      <Link
                        href={`/portraits/${t.slug}`}
                        className="group block rounded-2xl overflow-hidden border border-[#E4D8CC] hover:border-[#C4622D]/50 hover:shadow-xl hover:shadow-[#C4622D]/10 hover:-translate-y-1.5 transition-all duration-300"
                      >
                        {/* Portrait-ratio image */}
                        <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                          <TemplateImg imgUrl={rImgUrl} name={t.name} category={t.category} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

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
                          {t.style && (
                            <div className="absolute top-2.5 left-2.5 z-10 bg-white/85 backdrop-blur-sm text-[#8C7B6B] text-[10px] font-medium px-2 py-1 rounded-full">
                              {t.style}
                            </div>
                          )}

                          {/* Hover overlay CTA */}
                          <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#1A1714]/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-5">
                            <span className="bg-[#C4622D] text-white text-xs font-semibold px-5 py-2 rounded-full shadow-lg">
                              Try this style →
                            </span>
                          </div>
                        </div>

                        {/* Card footer */}
                        <div className="bg-white px-3.5 py-3">
                          <p className="font-semibold text-[#1A1714] text-sm truncate">{t.name}</p>
                          <p className="text-[11px] text-[#8C7B6B] mt-0.5">
                            {slotCount} photo{slotCount !== 1 ? "s" : ""} · Free preview
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}

                {/* "Browse all" tile */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={relatedInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: related.length * 0.08, duration: 0.5 }}
                >
                  <Link
                    href="/portraits"
                    className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E4D8CC] hover:border-[#C4622D]/50 bg-[#FAF6F0] hover:bg-[#F5EEE6] transition-all duration-300 h-full min-h-[200px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#C4622D]/10 flex items-center justify-center mb-3 group-hover:bg-[#C4622D]/20 transition-colors">
                      <ArrowRight size={20} className="text-[#C4622D] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-sm font-semibold text-[#1A1714]">View all styles</p>
                    <p className="text-xs text-[#8C7B6B] mt-1">Browse every template</p>
                  </Link>
                </motion.div>
              </div>
            </div>
          </section>
        )}

        {/* ── Trust bar ─────────────────────────────────────────────────────── */}
        <section ref={trustRef} className="bg-white border-y border-[#E4D8CC] py-5 px-5 overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {[
                { icon: Star,        color: "#D4942A", label: "4.9 / 5 rating",          sub: "from 2,400+ reviews" },
                { icon: Zap,         color: "#C4622D", label: "~60 second preview",       sub: "free, no card needed" },
                { icon: RefreshCcw,  color: "#2D4A3E", label: "5 free regenerations",     sub: "until you love it" },
                { icon: ShieldCheck, color: "#2D4A3E", label: "Photos auto-deleted",       sub: "after 30 days" },
                { icon: Package,     color: "#C4622D", label: "Worldwide shipping",        sub: "100+ countries" },
                { icon: Heart,       color: "#C4622D", label: "Money-back guarantee",      sub: "14-day no-hassle" },
              ].map(({ icon: Icon, color, label, sub }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={trustInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.07, duration: 0.4 }}
                  className="flex items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
                    <Icon size={15} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1A1714] leading-none">{label}</p>
                    <p className="text-[10px] text-[#8C7B6B] mt-0.5">{sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────────── */}
        <section ref={stepsRef} className="py-20 px-5 lg:px-8 bg-[#FAF6F0]">
          <div className="max-w-6xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={stepsInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="text-center mb-12">
              <span className="text-xs font-semibold tracking-widest uppercase text-[#C4622D] mb-3 block">The process</span>
              <h2 className="text-4xl font-display font-light text-[#1A1714]">
                From photo to portrait in <em className="not-italic font-medium text-[#C4622D]">minutes</em>
              </h2>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-6 relative">
              {/* Connector line */}
              <div className="hidden sm:block absolute top-10 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-[#E4D8CC]" aria-hidden />

              {STEPS.map(({ n, icon: Icon, label, desc }, i) => (
                <motion.div
                  key={n}
                  initial={{ opacity: 0, y: 24 }}
                  animate={stepsInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.12, duration: 0.55 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="relative mb-5">
                    <div className="w-20 h-20 rounded-3xl bg-white border-2 border-[#E4D8CC] flex items-center justify-center shadow-sm">
                      <Icon size={28} className="text-[#C4622D]" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#C4622D] text-white text-[11px] font-bold flex items-center justify-center">
                      {n}
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-[#1A1714] mb-1.5">{label}</h3>
                  <p className="text-sm text-[#8C7B6B] leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Reviews ───────────────────────────────────────────────────────── */}
        <section ref={reviewsRef} className="py-20 px-5 lg:px-8 bg-[#2D4A3E] relative overflow-hidden">
          {/* Decorative arc top */}
          <div aria-hidden className="absolute -top-1 left-0 right-0 h-14 bg-[#FAF6F0]" style={{ clipPath: "ellipse(55% 100% at 50% 0%)" }} />

          <div className="relative max-w-6xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={reviewsInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="text-center mb-12">
              <span className="text-xs font-semibold tracking-widest uppercase text-[#D4942A] mb-3 block">Customer Stories</span>
              <h2 className="text-4xl font-display font-light text-white">
                People who <em className="not-italic font-medium text-[#D4942A]">love their portraits</em>
              </h2>
              <div className="flex items-center justify-center gap-2 mt-5">
                <StarRow n={5} />
                <span className="text-white text-sm font-semibold">4.9 / 5</span>
                <span className="text-white/50 text-sm">· 2,400+ verified reviews</span>
              </div>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-5">
              {displayReviews.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={reviewsInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex flex-col gap-4 hover:bg-white/12 transition-colors"
                >
                  {r.mediaUrl && (
                    <div className="w-full h-28 rounded-xl overflow-hidden bg-white/5">
                      <img src={r.mediaUrl} alt="Review media" className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget.parentElement as HTMLDivElement).style.display = "none"; }} />
                    </div>
                  )}
                  <StarRow n={r.rating} />
                  <p className="text-white/80 text-sm leading-relaxed flex-1">&ldquo;{r.text}&rdquo;</p>
                  <div className="text-xs text-[#D4942A]/70 font-medium">
                    {r.subject}{r.product ? ` · ${r.product}` : ""}
                  </div>
                  <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                    {r.profilePhotoUrl ? (
                      <img src={r.profilePhotoUrl} alt={r.name}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {r.name.split(" ").map((p) => p[0] ?? "").join("").toUpperCase().slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">{r.name}</p>
                      <p className="text-white/40 text-xs">{r.location}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA inside reviews section */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={reviewsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-10 text-center"
            >
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="inline-flex items-center gap-2.5 bg-[#C4622D] hover:bg-[#9E4A1E] text-white font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-[#C4622D]/30 hover:-translate-y-0.5 group"
              >
                <Sparkles size={16} />
                Create your portrait now
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
              <p className="text-white/40 text-xs mt-3">Free preview · No card required</p>
            </motion.div>
          </div>

          {/* Decorative arc bottom */}
          <div aria-hidden className="absolute -bottom-1 left-0 right-0 h-14 bg-[#FAF6F0]" style={{ clipPath: "ellipse(55% 100% at 50% 100%)" }} />
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <section ref={faqRef} className="py-20 px-5 lg:px-8 bg-[#FAF6F0]">
          <div className="max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={faqInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }} className="text-center mb-12">
              <span className="text-xs font-semibold tracking-widest uppercase text-[#C4622D] mb-3 block">Questions</span>
              <h2 className="text-4xl font-display font-light text-[#1A1714]">
                Everything you need to <em className="not-italic font-medium text-[#C4622D]">know</em>
              </h2>
            </motion.div>

            <div className="space-y-2">
              {FAQS.map((faq, i) => (
                <motion.div
                  key={faq.q}
                  initial={{ opacity: 0, y: 12 }}
                  animate={faqInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  className="bg-white border border-[#E4D8CC] rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left group"
                  >
                    <span className="text-sm font-semibold text-[#1A1714] pr-4">{faq.q}</span>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${openFaq === i ? "bg-[#C4622D] text-white" : "bg-[#F2EAE0] text-[#C4622D] group-hover:bg-[#C4622D]/10"}`}>
                      {openFaq === i ? <Minus size={13} /> : <Plus size={13} />}
                    </div>
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm text-[#8C7B6B] leading-relaxed">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            <motion.p initial={{ opacity: 0 }} animate={faqInView ? { opacity: 1 } : {}} transition={{ delay: 0.5 }} className="text-center text-sm text-[#8C7B6B] mt-8">
              Still have questions?{" "}
              <Link href="/contact" className="text-[#C4622D] hover:underline font-medium">
                Contact us
              </Link>{" "}
              — we reply within 24 hours.
            </motion.p>
          </div>
        </section>


      </main>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: template.name,
          description: template.seoDescription,
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            reviewCount: "2400",
            bestRating: "5",
          },
        }),
      }} />

      <Footer />
    </>
  );
}
