"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { WizardStep } from "@/store/wizardStore";

const steps = [
  { n: 1 as WizardStep, label: "Template" },
  { n: 2 as WizardStep, label: "Photos" },
  { n: 3 as WizardStep, label: "Generating" },
  { n: 4 as WizardStep, label: "Preview" },
  { n: 5 as WizardStep, label: "Order" },
];

export function WizardProgress({ current }: { current: WizardStep }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, i) => {
        const done = current > step.n;
        const active = current === step.n;
        return (
          <div key={step.n} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={
                  active
                    ? { scale: 1.1, backgroundColor: "#C4622D" }
                    : done
                    ? { scale: 1, backgroundColor: "#2D4A3E" }
                    : { scale: 1, backgroundColor: "#E4D8CC" }
                }
                transition={{ duration: 0.3 }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{
                  color: done || active ? "#fff" : "#8C7B6B",
                }}
              >
                {done ? <Check size={14} /> : step.n}
              </motion.div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  active
                    ? "text-[#C4622D]"
                    : done
                    ? "text-[#2D4A3E]"
                    : "text-[#8C7B6B]"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {i < steps.length - 1 && (
              <motion.div
                animate={{ backgroundColor: done ? "#2D4A3E" : "#E4D8CC" }}
                transition={{ duration: 0.4 }}
                className="w-10 sm:w-16 h-px mx-1 mb-5"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
