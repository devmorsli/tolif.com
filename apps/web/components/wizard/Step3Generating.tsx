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
    setGenerationStatus,
    setPreviewUrl,
    setSessionId,
    setRegenerationsLeft,
    next,
    goTo,
    regenerationsLeft,
  } = useWizardStore();

  const [msgIndex, setMsgIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Cycle through reassurance messages while generating
    const msgTimer = setInterval(
      () => setMsgIndex((i) => (i + 1) % messages.length),
      2200
    );
    return () => clearInterval(msgTimer);
  }, []);

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
          // Sync remaining count from the server (source of truth)
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
            // No Content-Type header — browser sets it with boundary for multipart
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message ?? body.detail ?? `Server error ${res.status}`);
          }

          const data = await res.json();
          sessionId  = data.sessionId;
          previewKey = data.previewKey;
          // Server tells us how many regens this session is entitled to
          if (typeof data.regenLimit === "number") {
            setRegenerationsLeft(data.regenLimit);
          }
        }

        setSessionId(sessionId);
        setPreviewUrl(`${API_BASE}/api/portraits/${sessionId}/preview`);
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
    <div className="flex flex-col items-center justify-center min-h-[420px] gap-10 text-center">
      <div className="flex flex-col items-center gap-8">
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

      <div className="flex items-center gap-6 text-xs text-[#8C7B6B]">
        <span>🔒 Photos processed securely</span>
        <span>👁 Free watermarked preview</span>
        <span>🔄 {regenerationsLeft} tries remaining</span>
      </div>
    </div>
  );
}
