"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "What format are the files in?",
    a: "All templates are delivered in .xlsx format, fully compatible with Microsoft Excel, Google Sheets, and Apple Numbers.",
  },
  {
    q: "Can I use these for my clients?",
    a: "Yes — your purchase includes a lifetime personal and commercial license. Use the templates for your own business or for client work.",
  },
  {
    q: "What if I need a refund?",
    a: "We offer a 14-day money-back guarantee, no questions asked. Just reach out to our support and we'll process it immediately.",
  },
  {
    q: "Do I get updates?",
    a: "Yes, all future updates to the templates you purchased are included for free. We regularly improve our templates based on customer feedback.",
  },
  {
    q: "How do I access my files?",
    a: "Immediately after payment, you'll be redirected to a download page with all your files. You'll also receive an email with your personal download links, valid for 7 days.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#E4D8CC] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="font-medium text-[#1A1714] group-hover:text-[#C4622D] transition-colors pr-4">
          {q}
        </span>
        <span className="shrink-0 w-6 h-6 rounded-full bg-[#F2EAE0] flex items-center justify-center">
          {open ? (
            <Minus size={12} className="text-[#C4622D]" />
          ) : (
            <Plus size={12} className="text-[#8C7B6B]" />
          )}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-[#8C7B6B] text-sm leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DigitalFaqSection() {
  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-xs font-medium tracking-widest uppercase text-[#C4622D] mb-4">FAQ</p>
          <h2 className="text-4xl font-display font-light text-[#1A1714]">
            Questions &amp; answers
          </h2>
        </div>

        <div className="bg-[#FAF6F0] rounded-2xl border border-[#E4D8CC] px-6">
          {faqs.map((item) => (
            <FaqItem key={item.q} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
