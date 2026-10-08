"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { getPublicReviews, type PublicReview } from "@/lib/public-api";

// ── Avatar ─────────────────────────────────────────────────────────────────────

const AVATAR_BG = ["#C4622D", "#D4942A", "#2D4A3E", "#8C7B6B", "#6B5B4E"];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const bg = AVATAR_BG[name.charCodeAt(0) % AVATAR_BG.length];
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-9 h-9 rounded-full object-cover shrink-0"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ backgroundColor: bg }}
    >
      {initials(name)}
    </div>
  );
}

// ── Review Card ────────────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: PublicReview }) {
  return (
    <div
      className="inline-flex flex-col gap-3 w-72 shrink-0 bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/14 transition-colors duration-300 cursor-default"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
      style={{ transition: "transform 0.25s ease, background 0.3s" }}
    >
      {/* Optional media thumbnail */}
      {review.mediaUrl && (
        <div className="w-full h-32 rounded-xl overflow-hidden bg-white/5">
          <img
            src={review.mediaUrl}
            alt="Review media"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget.parentElement as HTMLDivElement).style.display =
                "none";
            }}
          />
        </div>
      )}

      {/* Stars */}
      <div className="flex gap-0.5">
        {Array.from({ length: review.rating }).map((_, i) => (
          <Star key={i} size={12} className="fill-[#D4942A] text-[#D4942A]" />
        ))}
      </div>

      {/* Text */}
      <p className="text-white/80 text-sm leading-relaxed flex-1 line-clamp-4">
        &ldquo;{review.text}&rdquo;
      </p>

      {/* Subject · Product */}
      <div className="text-xs text-[#D4942A]/80 font-medium">
        {review.subject}
        {review.product ? ` · ${review.product}` : ""}
      </div>

      {/* Reviewer */}
      <div className="flex items-center gap-2.5 pt-2 border-t border-white/10">
        <Avatar name={review.name} url={review.profilePhotoUrl} />
        <div>
          <p className="text-white text-sm font-medium leading-tight">
            {review.name}
          </p>
          <p className="text-white/40 text-xs">{review.location}</p>
        </div>
      </div>
    </div>
  );
}

// ── Marquee Row ────────────────────────────────────────────────────────────────

function MarqueeRow({
  reviews,
  direction = "left",
  duration = 40,
}: {
  reviews: PublicReview[];
  direction?: "left" | "right";
  duration?: number;
}) {
  // Duplicate enough times to always overflow the viewport for a seamless loop
  const copies = reviews.length < 4 ? 6 : 3;
  const items = Array.from({ length: copies }, () => reviews).flat();
  const [paused, setPaused] = useState(false);

  // Each "segment" is 1/copies of the total width — animate by exactly one segment
  const pct = (100 / copies).toFixed(4);
  const animName = `marquee-${direction}-${copies}`;

  return (
    <div
      className="overflow-hidden w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{`
        @keyframes ${animName}-fwd {
          from { transform: translateX(0); }
          to   { transform: translateX(-${pct}%); }
        }
        @keyframes ${animName}-rev {
          from { transform: translateX(-${pct}%); }
          to   { transform: translateX(0); }
        }
      `}</style>
      <div
        className="flex gap-5"
        style={{
          width: "max-content",
          animation: `${animName}-${direction === "left" ? "fwd" : "rev"} ${duration}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {items.map((r, i) => (
          <ReviewCard key={`${r.id}-${i}`} review={r} />
        ))}
      </div>
    </div>
  );
}

// ── Section ────────────────────────────────────────────────────────────────────

export function ReviewsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [reviews, setReviews] = useState<PublicReview[]>([]);

  useEffect(() => {
    getPublicReviews().then(setReviews);
  }, []);

  const showTwoRows = reviews.length >= 6;

  return (
    <section ref={ref} className="py-28 bg-[#2D4A3E] overflow-hidden relative">
      {/* Decorative arc */}
      <div
        aria-hidden
        className="absolute -top-1 left-0 right-0 h-16 bg-[#FAF6F0]"
        style={{ clipPath: "ellipse(55% 100% at 50% 0%)" }}
      />

      <div className="relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-16 px-6"
        >
          <span className="text-xs font-medium tracking-widest uppercase text-[#D4942A] mb-4 block">
            Customer Stories
          </span>
          <h2 className="text-5xl font-display font-light text-white leading-tight">
            People who
            <br />
            <em className="not-italic font-medium text-[#D4942A]">
              treasure their portraits
            </em>
          </h2>

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

        {/* Marquee rows */}
        {reviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
            className="space-y-5"
          >
            <MarqueeRow reviews={reviews} direction="left" duration={45} />
            {showTwoRows && (
              <MarqueeRow reviews={reviews} direction="right" duration={55} />
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}
