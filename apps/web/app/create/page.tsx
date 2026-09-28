"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useWizardStore } from "@/store/wizardStore";
import { WizardProgress } from "@/components/wizard/WizardProgress";
import { Step1Template } from "@/components/wizard/Step1Template";
import { Step2Upload } from "@/components/wizard/Step2Upload";
import { Step3Generating } from "@/components/wizard/Step3Generating";
import { Step4Preview } from "@/components/wizard/Step4Preview";
import { Step5Product } from "@/components/wizard/Step5Product";

const stepComponents = {
  1: Step1Template,
  2: Step2Upload,
  3: Step3Generating,
  4: Step4Preview,
  5: Step5Product,
};

export default function CreatePage() {
  const step = useWizardStore((s) => s.step);
  const StepComponent = stepComponents[step];
  const isGenerating = step === 3;

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-[#E4D8CC] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-[#8C7B6B] hover:text-[#1A1714] transition-colors"
          >
            <ArrowLeft size={14} />
            <span className="font-display text-lg font-semibold text-[#1A1714] ml-1">tolif</span>
          </Link>

          <WizardProgress current={step} />

          {/* Spacer to balance layout */}
          <div className="w-24" />
        </div>
      </header>

      {/* Step content */}
      <main className="flex-1 flex flex-col">
        <div className="max-w-5xl mx-auto w-full px-6 py-10 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: isGenerating ? 0 : 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isGenerating ? 0 : -24 }}
              transition={{ duration: 0.3, ease: "easeOut" as const }}
            >
              <StepComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer strip */}
      <footer className="border-t border-[#E4D8CC] py-4 px-6 text-center">
        <p className="text-xs text-[#8C7B6B]">
          🔒 Secure · 🛡 GDPR compliant · Photos deleted after 30 days
        </p>
      </footer>
    </div>
  );
}
