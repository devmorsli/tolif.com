"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizardStore } from "@/store/wizardStore";
import { ArrowRight, Lock, Mail, User } from "lucide-react";

const STEPS = [
  { label: "Uploading photos",      duration: 15  },
  { label: "Analysing faces",       duration: 25  },
  { label: "Painting your portrait",duration: 60  },
  { label: "Adding finishing touches", duration: 30 },
];

const messages = [
  "Studying your faces with care…",
  "Recreating the portrait style…",
  "Adding the finishing details…",
  "Blending colours like a painter…",
  "Perfecting the composition…",
  "Almost there — nearly done!",
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

function PortraitLoader() {
  return (
    <div className="flex items-end gap-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ scaleY: [0.4, 1, 0.4], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.1, delay: i * 0.2, repeat: Infinity, ease: "easeInOut" }}
          className="w-3 rounded-full bg-[#C4622D]"
          style={{ height: 36 }}
        />
      ))}
      <motion.div
        animate={{ rotate: [0, 6, -6, 0], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="ml-2 w-10 h-12 border-4 border-[#C4622D] rounded-sm flex items-center justify-center"
      >
        <div className="w-5 h-5 rounded-full bg-[#C4622D]/30" />
      </motion.div>
    </div>
  );
}

// ── Phase 1: Email + Name capture ─────────────────────────────────────────────
function EmailCapturePhase({ onContinue }: { onContinue: (name: string, email: string) => void }) {
  const { customerEmail, customerName } = useWizardStore();
  const [name,  setName]  = useState(customerName  ?? "");
  const [email, setEmail] = useState(customerEmail ?? "");

  const valid = name.trim().length >= 1 && email.includes("@") && email.includes(".");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onContinue(name.trim(), email.trim());
  };

  return (
    <motion.div
      key="email-phase"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col items-center justify-center min-h-[520px] px-4"
    >
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-[#C4622D]/10 flex items-center justify-center mb-6">
        <Mail size={28} className="text-[#C4622D]" />
      </div>

      {/* Heading */}
      <h2 className="text-3xl font-display font-light text-[#1A1714] text-center mb-2">
        Almost ready!
      </h2>
      <p className="text-[#8C7B6B] text-sm text-center max-w-sm mb-8">
        Enter your name and email — we&apos;ll send you the finished portrait and keep you updated.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
        {/* Name */}
        <div className="relative">
          <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C4622D]/60 pointer-events-none" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-[#E4D8CC] bg-white text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
          />
        </div>

        {/* Email */}
        <div className="relative">
          <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C4622D]/60 pointer-events-none" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-[#E4D8CC] bg-white text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
          />
        </div>

        {/* CTA */}
        <button
          type="submit"
          disabled={!valid}
          className="w-full flex items-center justify-center gap-2.5 bg-[#C4622D] disabled:bg-[#E4D8CC] disabled:text-[#8C7B6B] disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl hover:bg-[#9E4A1E] hover:shadow-lg hover:shadow-[#C4622D]/25 hover:-translate-y-0.5 transition-all duration-200"
        >
          Continue &amp; Generate my portrait
          <ArrowRight size={16} />
        </button>

        {/* Privacy note */}
        <p className="flex items-center justify-center gap-1.5 text-xs text-[#B0A090] text-center pt-1">
          <Lock size={10} />
          No spam, ever. Your data is safe and GDPR-compliant.
        </p>
      </form>
    </motion.div>
  );
}

// ── Phase 2: Generating spinner ────────────────────────────────────────────────
function GeneratingPhase({
  name,
  regenerationsLeft,
  error,
  onRetry,
  onBack,
}: {
  name: string;
  regenerationsLeft: number;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMsgIndex((i) => (i + 1) % messages.length), 2200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Derive current step from elapsed time
  const totalDuration = STEPS.reduce((a, s) => a + s.duration, 0);
  let stepElapsed = elapsed;
  let currentStep = STEPS.length - 1;
  let stepProgress = 1;
  let cumulativeTime = 0;
  for (let i = 0; i < STEPS.length; i++) {
    if (stepElapsed <= STEPS[i].duration) {
      currentStep = i;
      stepProgress = Math.min(stepElapsed / STEPS[i].duration, 1);
      break;
    }
    stepElapsed -= STEPS[i].duration;
    cumulativeTime += STEPS[i].duration;
  }
  void cumulativeTime;

  const overallProgress = Math.min(elapsed / totalDuration, 0.95);
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;
  const elapsedStr = elapsedMin > 0
    ? `${elapsedMin}:${String(elapsedSec).padStart(2, "0")}`
    : `${elapsedSec}s`;

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[420px] gap-6 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <span className="text-3xl">⚠️</span>
        </div>
        <div>
          <h2 className="text-2xl font-display font-light text-[#1A1714] mb-2">Generation failed</h2>
          <p className="text-[#8C7B6B] text-sm max-w-sm">{error}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium px-6 py-3 rounded-full border border-[#E4D8CC] text-[#8C7B6B] hover:text-[#1A1714] transition-colors"
          >
            ← Back to photos
          </button>
          {regenerationsLeft > 0 && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 text-sm font-medium px-6 py-3 rounded-full bg-[#C4622D] text-white hover:bg-[#9E4A1E] transition-colors"
            >
              Try again
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="generating-phase"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col items-center justify-center min-h-[520px] gap-7 text-center"
    >
      <div className="flex flex-col items-center gap-5">
        <PortraitLoader />
        <div>
          <h2 className="text-3xl font-display font-light text-[#1A1714] mb-1">
            {name ? `Creating your portrait, ${name.split(" ")[0]}…` : "Creating your portrait…"}
          </h2>
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="text-[#8C7B6B] text-sm"
            >
              {messages[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Step indicators */}
      <div className="w-full max-w-sm space-y-2">
        {STEPS.map((step, i) => {
          const isDone    = i < currentStep;
          const isActive  = i === currentStep;
          const progress  = isDone ? 1 : isActive ? stepProgress : 0;
          return (
            <div key={step.label} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 ${
                isDone ? "bg-[#2D7A4A]" : isActive ? "bg-[#C4622D]" : "bg-[#E4D8CC]"
              }`}>
                {isDone ? (
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : isActive ? (
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                ) : null}
              </div>
              <div className="flex-1 text-left">
                <p className={`text-xs font-medium ${isDone ? "text-[#2D7A4A]" : isActive ? "text-[#1A1714]" : "text-[#C8BAB0]"}`}>
                  {step.label}
                </p>
                {isActive && (
                  <div className="mt-1 h-1 bg-[#E4D8CC] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#C4622D] rounded-full"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall progress + timer */}
      <div className="w-full max-w-sm">
        <div className="flex justify-between text-xs text-[#8C7B6B] mb-1.5">
          <span>{Math.round(overallProgress * 100)}% complete</span>
          <span>{elapsedStr} elapsed</span>
        </div>
        <div className="h-1.5 bg-[#E4D8CC] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#C4622D] rounded-full"
            style={{ width: `${Math.round(overallProgress * 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="flex items-center gap-6 text-xs text-[#8C7B6B]">
        <span>🔒 Processed securely</span>
        <span>👁 Free watermarked preview</span>
        <span>🔄 {regenerationsLeft} tries remaining</span>
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function Step3Generating() {
  const {
    selectedTemplate,
    uploadSlots,
    sessionId: existingSessionId,
    customerEmail: storedEmail,
    customerName: storedName,
    setGenerationStatus,
    setPreviewUrl,
    setSessionId,
    setRegenerationsLeft,
    setCustomerEmail,
    setCustomerName,
    next,
    goTo,
    regenerationsLeft,
  } = useWizardStore();

  // If already have a sessionId (regeneration), skip email phase
  const skipEmail = !!existingSessionId && !!(storedEmail);
  const [phase, setPhase] = useState<"email" | "generating">(
    (existingSessionId || (storedEmail && storedName)) ? "generating" : "email"
  );
  const [capturedName,  setCapturedName]  = useState(storedName  ?? "");
  const [capturedEmail, setCapturedEmail] = useState(storedEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const trySaveEmail = async (sessionId: string, email: string) => {
    if (!email?.includes("@")) return;
    try {
      await fetch(`${API_BASE}/api/portraits/${sessionId}/email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch { /* non-critical */ }
  };

  const startGeneration = (name: string, email: string) => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        setGenerationStatus("generating");

        let sessionId: string;
        let previewKey: string;

        if (existingSessionId) {
          // Regeneration
          const res = await fetch(
            `${API_BASE}/api/portraits/${existingSessionId}/regenerate`,
            { method: "POST" }
          );

          if (res.status === 429) {
            setRegenerationsLeft(0);
            setGenerationStatus("refused");
            setError("You have used all your regeneration attempts.");
            return;
          }

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message ?? body.detail ?? `Server error ${res.status}`);
          }

          const data = await res.json();
          sessionId  = existingSessionId;
          previewKey = data.previewKey;
          if (typeof data.regenLeft === "number") setRegenerationsLeft(data.regenLeft);
        } else {
          // First generation
          if (!selectedTemplate) {
            setError("No template selected. Please go back and choose one.");
            return;
          }

          const form = new FormData();
          form.append("templateId", selectedTemplate.id);
          if (email) form.append("customerEmail", email);

          // Capture traffic source from URL utm params for lead attribution
          try {
            const sp = new URLSearchParams(window.location.search);
            const parts = [sp.get("utm_source"), sp.get("utm_medium"), sp.get("utm_campaign")].filter(Boolean);
            const source = parts.length > 0 ? parts.join("/") : (document.referrer || null);
            if (source) form.append("source", source.slice(0, 500));
          } catch { /* non-critical */ }

          let hasFiles = false;
          for (const slot of uploadSlots) {
            if (slot.file) { form.append(slot.name, slot.file, slot.file.name); hasFiles = true; }
          }

          if (!hasFiles) {
            setError("No photos found. Please go back and upload your photos.");
            return;
          }

          const res = await fetch(`${API_BASE}/api/portraits/start`, { method: "POST", body: form });

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message ?? body.detail ?? `Server error ${res.status}`);
          }

          const data = await res.json();
          sessionId  = data.sessionId;
          previewKey = data.previewKey;
          if (typeof data.regenLimit === "number") setRegenerationsLeft(data.regenLimit);

          // Email was included in form, but PATCH as backup if needed
          if (email && !storedEmail) void trySaveEmail(sessionId, email);
        }

        // Poll until preview is available
        const previewUrl = `${API_BASE}/api/portraits/${sessionId}/preview`;
        for (let attempt = 0; attempt < 90; attempt++) {
          try { const c = await fetch(previewUrl, { method: "HEAD" }); if (c.ok) break; } catch { /* retry */ }
          if (attempt < 89) await new Promise<void>((r) => setTimeout(r, 2000));
        }

        setSessionId(sessionId);
        setPreviewUrl(previewUrl);
        setGenerationStatus("ready");
        next();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setGenerationStatus("failed");
      }
    })();
  };

  // If skipping email phase, auto-start generation on mount
  useEffect(() => {
    if (phase === "generating") startGeneration(capturedName, capturedEmail);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleEmailContinue = (name: string, email: string) => {
    setCapturedName(name);
    setCapturedEmail(email);
    setCustomerName(name);
    setCustomerEmail(email);
    setPhase("generating");
  };

  const handleRetry = () => {
    started.current = false;
    setError(null);
    setGenerationStatus("idle");
    startGeneration(capturedName, capturedEmail);
  };

  return (
    <AnimatePresence mode="wait">
      {phase === "email" ? (
        <EmailCapturePhase key="email" onContinue={handleEmailContinue} />
      ) : (
        <GeneratingPhase
          key="generating"
          name={capturedName}
          regenerationsLeft={regenerationsLeft}
          error={error}
          onRetry={handleRetry}
          onBack={() => goTo(1)}
        />
      )}
    </AnimatePresence>
  );
}
