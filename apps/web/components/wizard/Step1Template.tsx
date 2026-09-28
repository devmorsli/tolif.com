"use client";

import { motion } from "framer-motion";
import { useWizardStore, type Template } from "@/store/wizardStore";
import { Check } from "lucide-react";

const TEMPLATES: Template[] = [
  {
    id: "1",
    slug: "woman-with-dog",
    name: "Woman with Dog",
    category: "Dogs",
    style: "Oil Painting",
    uploadSlots: [
      { name: "person", label: "Your photo", type: "person", required: true },
      { name: "pet", label: "Your dog's photo", type: "pet", required: true },
    ],
  },
  {
    id: "2",
    slug: "man-with-cat",
    name: "Man with Cat",
    category: "Cats",
    style: "Impressionist",
    uploadSlots: [
      { name: "person", label: "Your photo", type: "person", required: true },
      { name: "pet", label: "Your cat's photo", type: "pet", required: true },
    ],
  },
  {
    id: "3",
    slug: "couple-with-dog",
    name: "Couple with Dog",
    category: "Couple & Pet",
    style: "Golden Hour",
    uploadSlots: [
      { name: "person1", label: "Person 1 photo", type: "person", required: true },
      { name: "person2", label: "Person 2 photo", type: "person", required: true },
      { name: "pet", label: "Your dog's photo", type: "pet", required: true },
    ],
  },
  {
    id: "4",
    slug: "woman-with-cat",
    name: "Woman with Cat",
    category: "Cats",
    style: "Watercolour",
    uploadSlots: [
      { name: "person", label: "Your photo", type: "person", required: true },
      { name: "pet", label: "Your cat's photo", type: "pet", required: true },
    ],
  },
  {
    id: "5",
    slug: "multiple-pets",
    name: "Person & Multiple Pets",
    category: "Multiple Pets",
    style: "Digital Art",
    uploadSlots: [
      { name: "person", label: "Your photo", type: "person", required: true },
      { name: "pet1", label: "Pet 1 photo", type: "pet", required: true },
      { name: "pet2", label: "Pet 2 photo", type: "pet", required: true },
    ],
  },
  {
    id: "6",
    slug: "man-with-dog",
    name: "Man with Dog",
    category: "Dogs",
    style: "Realistic Oil",
    uploadSlots: [
      { name: "person", label: "Your photo", type: "person", required: true },
      { name: "pet", label: "Your dog's photo", type: "pet", required: true },
    ],
  },
];

const gradients: Record<string, string> = {
  "1": "from-[#C4622D]/20 via-[#E8A838]/10 to-[#FAF6F0]",
  "2": "from-[#2D4A3E]/20 via-[#D4942A]/10 to-[#FAF6F0]",
  "3": "from-[#D4942A]/20 via-[#C4622D]/10 to-[#FAF6F0]",
  "4": "from-[#F0D5C0]/50 via-[#C4622D]/8 to-[#FAF6F0]",
  "5": "from-[#2D4A3E]/15 via-[#E8A838]/15 to-[#FAF6F0]",
  "6": "from-[#8C7B6B]/15 via-[#C4622D]/10 to-[#FAF6F0]",
};

const emojis: Record<string, string> = {
  "1": "🧑‍🦰🐕", "2": "👨🐈", "3": "👫🐕",
  "4": "👩🐱", "5": "🧑🐕🐈", "6": "👨🐶",
};

export function Step1Template() {
  const { selectedTemplate, selectTemplate, next } = useWizardStore();

  const pick = (t: Template) => {
    selectTemplate(t);
    next();
  };

  return (
    <div>
      <div className="text-center mb-10">
        <h2 className="text-4xl font-display font-light text-[#1A1714]">
          Choose your <em className="not-italic font-medium text-[#C4622D]">portrait style</em>
        </h2>
        <p className="mt-3 text-[#8C7B6B] text-sm max-w-md mx-auto">
          Pick the template that feels right for you and your pet. You can always go back.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map((t, i) => {
          const selected = selectedTemplate?.id === t.id;
          return (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.45 }}
              onClick={() => pick(t)}
              className={`relative group text-left rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                selected
                  ? "border-[#C4622D] shadow-lg shadow-[#C4622D]/15"
                  : "border-[#E4D8CC] hover:border-[#C4622D]/50 hover:shadow-md"
              }`}
            >
              {/* Preview area */}
              <div
                className={`h-44 bg-gradient-to-br ${gradients[t.id]} flex items-center justify-center text-5xl`}
              >
                <span className="opacity-50 group-hover:opacity-70 group-hover:scale-110 transition-all duration-400">
                  {emojis[t.id]}
                </span>
              </div>

              {/* Info */}
              <div className="bg-white px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#1A1714] text-sm">{t.name}</p>
                  <p className="text-xs text-[#8C7B6B] mt-0.5">{t.style} · {t.uploadSlots.length} photos needed</p>
                </div>
                {selected && (
                  <div className="w-6 h-6 rounded-full bg-[#C4622D] flex items-center justify-center flex-shrink-0">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
