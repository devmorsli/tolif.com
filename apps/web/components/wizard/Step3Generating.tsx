"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizardStore } from "@/store/wizardStore";

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
          transition={{
            duration: 1.1,
            delay: i * 0.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
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

export function Step3Generating() {
  const {
    selectedTemplate,
    uploadSlots,
    sessionId: existingSessionId,
    customerEmail: storedEmail,
    setGenerationStatus,
    setPreviewUrl,
    setSessionId,
    setRegenerationsLeft,
    setCustomerEmail,
    next,
    goTo,
    regenerationsLeft,
  } = useWizardStore();

  const [msgIndex, setMsgIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  // Email capture state
  const [emailInput, setEmailInput] = useState(storedEmail ?? "");
  const [emailSubmitted, setEmailSubmitted] = useState(!!storedEmail);
  const [emailSaving, setEmailSaving] = useState(false);
  // After generation starts, we have a sessionId to PATCH
  const pendingSessionId = useRef<string | null>(existingSessionId);

  useEffect(() => {
    const msgTimer = setInterval(
      () => setMsgIndex((i) => (i + 1) % messages.length),
      2200
    );
    return () => clearInterval(msgTimer);
  }, []);

  // If user already gave email in a previous session, auto-save it when sessionId is known
  const trySaveEmail = async (sessionId: string, email: string) => {
    if (!email || !email.includes("@")) return;
    try {
      await fetch(`${API_BASE}/api/portraits/${sessionId}/email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch { /* non-critical — ignore */ }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        setGenerationStatus("generating");

        let sessionId: string;
        let previewKey: string;

        if (existingSessionId) {
          // Regeneration — use stored session, no re-upload needed
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
          if (typeof data.regenLeft === "number") {
            setRegenerationsLeft(data.regenLeft);
          }
        } else {
          // First generation — need template + photos
          if (!selectedTemplate) {
            setError("No template selected. Please go back and choose one.");
            return;
          }

          const form = new FormData();
          form.append("templateId", selectedTemplate.id);
          // Include email if already available (e.g. rehydrated from storage)
          if (storedEmail) form.append("customerEmail", storedEmail);

          let hasFiles = false;
          for (const slot of uploadSlots) {
            if (slot.file) {
              form.append(slot.name, slot.file, slot.file.name);
              hasFiles = true;
            }
          }

          if (!hasFiles) {
            setError("No photos found. Please go back and upload your photos.");
            return;
          }

          const res = await fetch(`${API_BASE}/api/portraits/start`, {
            method: "POST",
            body: form,
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message ?? body.detail ?? `Server error ${res.status}`);
          }

          const data = await res.json();
          sessionId  = data.sessionId;
          previewKey = data.previewKey;
          if (typeof data.regenLimit === "number") {
            setRegenerationsLeft(data.regenLimit);
          }

          // If user had already entered email while waiting, save it now
          pendingSessionId.current = sessionId;
          if (emailInput && emailInput.includes("@") && !storedEmail) {
            void trySaveEmail(sessionId, emailInput);
          }
        }

        // Poll until the preview image is available in storage
        const previewUrl = `${API_BASE}/api/portraits/${sessionId}/preview`;
        for (let attempt = 0; attempt < 90; attempt++) {
          try {
            const check = await fetch(previewUrl, { method: "HEAD" });
            if (check.ok) break;
          } catch { /* network glitch — retry */ }
          if (attempt < 89) await new Promise<void>(r => setTimeout(r, 2000));
        }

        setSessionId(sessionId);
        setPreviewUrl(previewUrl);
        setGenerationStatus("ready");
        next();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
        setGenerationStatus("failed");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = emailInput.trim();
    if (!trimmed || !trimmed.includes("@")) return;

    setCustomerEmail(trimmed);
    setEmailSubmitted(true);

    // If sessionId already exists, save immediately
    const sid = pendingSessionId.current;
    if (sid) {
      setEmailSaving(true);
      await trySaveEmail(sid, trimmed);
      setEmailSaving(false);
    }
    // else: will be saved when generation returns (handled in the useEffect above)
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <span className="text-3xl">⚠️</span>
        </div>
        <div>
          <h2 className="text-2xl font-display font-light text-[#1A1714] mb-2">
            Generation failed
          </h2>
          <p className="text-[#8C7B6B] text-sm max-w-sm">{error}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => goTo(1)}
            className="inline-flex items-center gap-2 text-sm font-medium px-6 py-3 rounded-full border border-[#E4D8CC] text-[#8C7B6B] hover:text-[#1A1714] transition-colors"
          >
            ← Back to photos
          </button>
          {regenerationsLeft > 0 && (
            <button
              onClick={() => {
                started.current = false;
                setError(null);
                setGenerationStatus("idle");
              }}
              className="inline-flex items-center gap-2 text-sm font-medium px-6 py-3 rounded-full bg-[#C4622D] text-white hover:bg-[#9E4A1E] transition-colors"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] gap-8 text-center">
      <div className="flex flex-col items-center gap-6">
        <PortraitLoader />

        <div>
          <h2 className="text-3xl font-display font-light text-[#1A1714] mb-2">
            Creating your portrait…
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

      {/* Indeterminate progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-1.5 bg-[#E4D8CC] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#C4622D] rounded-full"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: "50%" }}
          />
        </div>
        <p className="text-xs text-[#8C7B6B] mt-2 text-center">
          Usually takes 1–3 minutes
        </p>
      </div>

      {/* Email capture — shown while generation runs */}
      <AnimatePresence mode="wait">
        {!emailSubmitted ? (
          <motion.div
            key="email-form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm bg-[#FAF6F0] border border-[#E4D8CC] rounded-2xl p-5"
          >
            <p className="text-sm font-medium text-[#1A1714] mb-1">
              Get notified when it&apos;s ready
            </p>
            <p className="text-xs text-[#8C7B6B] mb-4">
              Enter your email and we&apos;ll send you the result — no spam, ever.
            </p>
            <form onSubmit={handleEmailSubmit} className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 min-w-0 bg-white border border-[#E4D8CC] rounded-xl px-3 py-2 text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
              />
              <button
                type="submit"
                disabled={!emailInput.includes("@")}
                className="shrink-0 bg-[#C4622D] disabled:bg-[#E4D8CC] disabled:text-[#8C7B6B] text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#9E4A1E] disabled:cursor-not-allowed transition-colors"
              >
                Notify me
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="email-saved"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-sm text-[#2D4A3E] bg-green-50 border border-green-200 rounded-xl px-4 py-2.5"
          >
            {emailSaving ? (
              <span className="text-xs text-[#8C7B6B]">Saving…</span>
            ) : (
              <>
                <span className="text-green-600">✓</span>
                <span>We&apos;ll notify you at <strong>{emailInput}</strong></span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-6 text-xs text-[#8C7B6B]">
        <span>🔒 Photos processed securely</span>
        <span>👁 Free watermarked preview</span>
        <span>🔄 {regenerationsLeft} tries remaining</span>
      </div>
    </div>
  );
}
