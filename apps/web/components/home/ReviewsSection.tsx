"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Star } from "lucide-react";

const reviews = [
  {
    id: 1,
    name: "Sophie M.",
    location: "Amsterdam, NL",
    avatar: "👩‍🦰",
    subject: "Family Portrait",
    rating: 5,
    text: "I ordered the family portrait as a birthday gift for my mum and she cried when she saw it. The likeness is incredible — it looks like an actual oil painting. Already ordering one for myself!",
    product: "Framed Print 50×70cm",
    date: "2 weeks ago",
  },
  {
    id: 2,
    name: "Marco R.",
    location: "Milan, IT",
    avatar: "🧔",
    subject: "Couple Portrait",
    rating: 5,
    text: "I was skeptical about AI portraits, but this is genuinely beautiful. The style, the colours, the way they captured our expressions — my girlfriend and I are blown away. Perfect anniversary gift.",
    product: "Canvas 30×40cm",
    date: "1 month ago",
  },
  {
    id: 3,
    name: "Emma L.",
    location: "London, UK",
    avatar: "👩",
    subject: "Best Friends",
    rating: 5,
    text: "Ordered the best friends watercolour template for me and my two sisters. The preview came back in minutes and it was already stunning. Hung it in the living room and everyone asks about it.",
    product: "Digital + Poster",
    date: "3 weeks ago",
  },
  {
    id: 4,
    name: "Lukas B.",
    location: "Berlin, DE",
    avatar: "👨‍🦱",
    subject: "Solo Studio Portrait",
    rating: 5,
    text: "The quality of the high-res file is incredible. Printed it at A1 and it's absolutely sharp. Customer support was amazing when I needed a slight regeneration — no questions asked.",
    product: "Digital Download",
    date: "5 days ago",
  },
];

export function ReviewsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-28 bg-[#2D4A3E] overflow-hidden relative">
      {/* Decorative arc */}
      <div
        aria-hidden
        className="absolute -top-1 left-0 right-0 h-16 bg-[#FAF6F0]"
        style={{ clipPath: "ellipse(55% 100% at 50% 0%)" }}
      />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-medium tracking-widest uppercase text-[#D4942A] mb-4 block">
            Customer Stories
          </span>
          <h2 className="text-5xl font-display font-light text-white leading-tight">
            People who
            <br />
            <em className="not-italic font-medium text-[#D4942A]">treasure their portraits</em>
          </h2>

          {/* Average rating */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} className="fill-[#D4942A] text-[#D4942A]" />
              ))}
            </div>
            <span className="text-white font-semibold">4.9 / 5</span>
            <span className="text-white/50 text-sm">from 2,400+ reviews</span>
          </div>
        </motion.div>

        {/* Review cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {reviews.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.7, ease: "easeOut" as const }}
              className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex flex-col gap-4 hover:bg-white/12 transition-colors"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <Star key={i} size={12} className="fill-[#D4942A] text-[#D4942A]" />
                ))}
              </div>

              {/* Review text */}
              <p className="text-white/80 text-sm leading-relaxed flex-1">"{review.text}"</p>

              {/* Product purchased */}
              <div className="text-xs text-[#D4942A]/70 font-medium">
                {review.subject} · {review.product}
              </div>

              {/* Reviewer */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-lg">
                  {review.avatar}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{review.name}</p>
                  <p className="text-white/40 text-xs">{review.location} · {review.date}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
