"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizardStore } from "@/store/wizardStore";

const messages = [
  "Studying your faces with care…",
  "Recreating the portrait style…",
  "Adding the finishing details…",
  "Blending colours like a painter…",
  "Making sure your pet looks perfect…",
  "Almost there — nearly done!",
];

function PawPrintLoader() {
  return (
    <div className="flex items-end gap-2.5">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -14, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 0.9,
            delay: i * 0.15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="flex flex-col items-center gap-1"
        >
          {/* Toes */}
          <div className="flex gap-1 mb-0.5">
            <div className="w-2 h-2 rounded-full bg-[#C4622D]" />
            <div className="w-2 h-2 rounded-full bg-[#C4622D]" />
          </div>
          {/* Pad */}
          <div className="w-5 h-4 rounded-full bg-[#C4622D]" />
        </motion.div>
      ))}
    </div>
  );
}

export function Step3Generating() {
  const { setGenerationStatus, setPreviewUrl, next, regenerationsLeft, decrementRegenerations } =
    useWizardStore();
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Cycle through messages
    const msgTimer = setInterval(
      () => setMsgIndex((i) => (i + 1) % messages.length),
      2200
    );

    // Simulate progress
    const start = Date.now();
    const duration = 13000; // 13s demo
    const progTimer = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(98, (elapsed / duration) * 100);
      setProgress(p);
      if (p >= 98) {
        clearInterval(progTimer);
        // Simulate completion — in production this would come from SSE/polling
        setTimeout(() => {
          setGenerationStatus("ready");
          // Placeholder preview (in production: the real watermarked S3 URL)
          setPreviewUrl("/placeholder-preview.jpg");
          next();
        }, 800);
      }
    }, 100);

    return () => {
      clearInterval(msgTimer);
      clearInterval(progTimer);
    };
  }, [setGenerationStatus, setPreviewUrl, next]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] gap-10 text-center">
      {/* Paw animation */}
      <div className="flex flex-col items-center gap-8">
        <PawPrintLoader />

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

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-1.5 bg-[#E4D8CC] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#C4622D] rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-[#8C7B6B] mt-2 text-center">
          {Math.round(progress)}% — usually takes 2–5 minutes
        </p>
      </div>

      {/* Reassurance */}
      <div className="flex items-center gap-6 text-xs text-[#8C7B6B]">
        <span>🔒 Photos processed securely</span>
        <span>👁 Free watermarked preview</span>
        <span>🔄 {regenerationsLeft} tries remaining</span>
      </div>
    </div>
  );
}
