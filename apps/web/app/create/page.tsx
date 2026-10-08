"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useWizardStore } from "@/store/wizardStore";
import { getPublicTemplate, parseUploadSlots } from "@/lib/public-api";
import { WizardProgress } from "@/components/wizard/WizardProgress";
import { Step1SetupPortrait } from "@/components/wizard/Step1SetupPortrait";
import { Step3Generating } from "@/components/wizard/Step3Generating";
import { Step3PreviewOrder } from "@/components/wizard/Step3PreviewOrder";
import { Step4Cart } from "@/components/wizard/Step4Cart";

const stepComponents = {
  1: Step1SetupPortrait,
  2: Step3Generating,
  3: Step3PreviewOrder,
  4: Step4Cart,
};

// Reads ?template=slug and pre-selects the template when landing on step 1 directly
function TemplateAutoSelect() {
  const searchParams = useSearchParams();
  const { selectedTemplate, selectTemplate, step } = useWizardStore();

  useEffect(() => {
    // If we're already past step 1 (came from template detail page), don't touch state
    if (step > 1) return;
    const slug = searchParams.get("template");
    if (!slug || selectedTemplate) return;

    getPublicTemplate(slug).then((t) => {
      if (!t) return;
      selectTemplate({
        id: t.id,
        slug: t.slug,
        name: t.name,
        category: t.category,
        style: t.style,
        uploadSlots: parseUploadSlots(t.uploadSlotsJson),
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function CreatePage() {
  const step = useWizardStore((s) => s.step);
  const StepComponent = stepComponents[step as keyof typeof stepComponents];
  const isGenerating = step === 2;

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col">
      <Suspense fallback={null}>
        <TemplateAutoSelect />
      </Suspense>

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
