"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { WizardStep } from "@/store/wizardStore";

const steps = [
  { n: 1 as WizardStep, label: "Photos" },
  { n: 2 as WizardStep, label: "Creating" },
  { n: 3 as WizardStep, label: "Personalise" },
  { n: 4 as WizardStep, label: "Cart" },
];

export function WizardProgress({ current }: { current: WizardStep }) {
  return (
    <div className="w-full px-4 sm:px-6">
      <div className="flex items-center w-full max-w-sm mx-auto">
        {steps.map((step, i) => {
          const done   = current > step.n;
          const active = current === step.n;
          return (
            <div key={step.n} className="flex items-center flex-1 last:flex-none">
              {/* Circle + label */}
              <div className="flex flex-col items-center gap-1 flex-none">
                <motion.div
                  animate={
                    active
                      ? { scale: 1.1, backgroundColor: "#C4622D" }
                      : done
                      ? { scale: 1, backgroundColor: "#2D4A3E" }
                      : { scale: 1, backgroundColor: "#E4D8CC" }
                  }
                  transition={{ duration: 0.3 }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-semibold"
                  style={{ color: done || active ? "#fff" : "#8C7B6B" }}
                >
                  {done ? <Check size={12} /> : step.n}
                </motion.div>
                <span
                  className={`text-[9px] sm:text-[10px] font-medium leading-none ${
                    active ? "text-[#C4622D]" : done ? "text-[#2D4A3E]" : "text-[#8C7B6B]"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector — flex-1 so it fills remaining space evenly */}
              {i < steps.length - 1 && (
                <motion.div
                  animate={{ backgroundColor: done ? "#2D4A3E" : "#E4D8CC" }}
                  transition={{ duration: 0.4 }}
                  className="flex-1 h-px mx-1.5 mb-4"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
