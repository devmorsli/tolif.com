"use client";

import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "How realistic will my portrait look?",
    a: "Our AI is trained specifically for portrait recreation. It captures facial features, expressions, and your pet's unique markings with impressive accuracy. The quality depends on the reference photos — clear, well-lit images give the best results.",
  },
  {
    q: "What kind of photos should I upload?",
    a: "Use clear, recent photos with good lighting where both the person and pet face the camera. Avoid heavy filters, sunglasses, or partial faces. The clearer the photo, the better the AI can recreate your likeness.",
  },
  {
    q: "How long does the preview take?",
    a: "Your watermarked preview is generated in 2–5 minutes. During busy periods it may take slightly longer. You can watch its progress in real time on the creation page.",
  },
  {
    q: "Can I try again if I don't like the result?",
    a: "Yes — each session includes 5 free regenerations. If the AI misses something, click 'Try again' and it'll generate a fresh version. After purchase you can also request a regeneration from your order page.",
  },
  {
    q: "What happens to my photos after purchase?",
    a: "Your uploaded photos are stored securely and automatically deleted after 30 days. We never use them for training AI models or share them with third parties. Full GDPR compliance.",
  },
  {
    q: "What print sizes and products are available?",
    a: "We offer digital PNG downloads (high-resolution, ready to print anywhere), poster prints (30×40cm, 50×70cm), framed prints (30×40cm, 50×70cm), and canvas prints. All physical products are museum-quality and shipped worldwide.",
  },
  {
    q: "What if I'm not satisfied with my purchase?",
    a: "We offer a full refund if you're not happy with the final result. Just contact us within 14 days of purchase and we'll make it right — no questions asked.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-28 bg-[#FAF6F0]">
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="text-xs font-medium tracking-widest uppercase text-[#C4622D] mb-4 block">
            FAQ
          </span>
          <h2 className="text-5xl font-display font-light text-[#1A1714] leading-tight">
            Questions?
            <br />
            <em className="not-italic font-medium">We've got answers.</em>
          </h2>
        </motion.div>

        {/* Accordion */}
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className="bg-white border border-[#E4D8CC] rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left group"
              >
                <span className="font-medium text-[#1A1714] group-hover:text-[#C4622D] transition-colors leading-snug">
                  {faq.q}
                </span>
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#F2EAE0] flex items-center justify-center text-[#C4622D]">
                  {open === i ? <Minus size={14} /> : <Plus size={14} />}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" as const }}
                  >
                    <div className="px-6 pb-5">
                      <p className="text-[#8C7B6B] text-sm leading-relaxed border-t border-[#E4D8CC] pt-4">
                        {faq.a}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
