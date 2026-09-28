"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Shield, Eye, RefreshCw, Truck, Lock, Zap } from "lucide-react";

const badges = [
  {
    icon: Eye,
    title: "Free preview",
    desc: "See your portrait before you pay",
  },
  {
    icon: RefreshCw,
    title: "5 free regenerations",
    desc: "Not happy? Try again, on us",
  },
  {
    icon: Shield,
    title: "Satisfaction guarantee",
    desc: "Full refund if you're not thrilled",
  },
  {
    icon: Truck,
    title: "Worldwide shipping",
    desc: "Prints delivered in 5–7 business days",
  },
  {
    icon: Lock,
    title: "Your photos stay private",
    desc: "Deleted after 30 days, GDPR compliant",
  },
  {
    icon: Zap,
    title: "Ready in minutes",
    desc: "AI generates your preview instantly",
  },
];

export function TrustBadges() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <section ref={ref} className="py-20 bg-white border-t border-[#E4D8CC]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {badges.map((badge, i) => (
            <motion.div
              key={badge.title}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.07, duration: 0.5 }}
              className="flex flex-col items-center text-center gap-3"
            >
              <div className="w-11 h-11 rounded-xl bg-[#F2EAE0] flex items-center justify-center">
                <badge.icon size={18} className="text-[#C4622D]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1A1714] leading-tight">{badge.title}</p>
                <p className="text-xs text-[#8C7B6B] mt-1 leading-snug">{badge.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
