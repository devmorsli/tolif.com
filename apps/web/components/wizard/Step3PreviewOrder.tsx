"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Download, ShoppingCart, Check } from "lucide-react";
import { useWizardStore } from "@/store/wizardStore";

// ── API product types (from GET /api/products) ────────────────────────────────
interface ApiVariant { id: string; size: string; price: number; currency: string; }
interface ApiProduct { id: string; type: string; variants: ApiVariant[]; }

// ── Types ──────────────────────────────────────────────────────────────────────
type Format  = "digital" | "poster" | "canvas";
type Frame   = "black" | "red-oak" | "white" | "none";
type SizeKey = "12x16" | "18x24" | "24x36";
type Unit    = "in" | "cm";

// ── Pricing ────────────────────────────────────────────────────────────────────
const POSTER_BASE: Record<SizeKey, number> = { "12x16": 49, "18x24": 69, "24x36": 99 };
const CANVAS_BASE: Record<SizeKey, number> = { "12x16": 69, "18x24": 99, "24x36": 149 };
const FRAME_ADDON   = 50;
const DIGITAL_PRICE = 49;

const SIZES: { key: SizeKey; inLabel: string; cmLabel: string; badge?: string }[] = [
  { key: "12x16", inLabel: "12 × 16", cmLabel: "30 × 40" },
  { key: "18x24", inLabel: "18 × 24", cmLabel: "45 × 60", badge: "BEST SELLER" },
  { key: "24x36", inLabel: "24 × 36", cmLabel: "60 × 90" },
];

function calcPrice(format: Format, frame: Frame, size: SizeKey): number {
  const base = format === "poster" ? POSTER_BASE[size] : CANVAS_BASE[size];
  return base + (frame !== "none" ? FRAME_ADDON : 0);
}

// ── Mockup helpers ─────────────────────────────────────────────────────────────
function frameImageSrc(frame: "black" | "red-oak" | "white", size: SizeKey): string {
  const color = frame === "red-oak" ? "redoak" : frame;
  return `/mockups/frame-${color}-${size}.png`;
}

// ── Portrait placeholder (fills whatever container it sits in) ─────────────────
function PortraitPlaceholder({ absolute = true }: { absolute?: boolean }) {
  return (
    <div
      className={`${absolute ? "absolute inset-0" : "w-full h-full"} flex items-center justify-center`}
      style={{
        background:
          "linear-gradient(135deg, rgba(196,98,45,0.18) 0%, rgba(232,168,56,0.1) 55%, rgba(45,74,62,0.18) 100%)",
      }}
    >
      <span style={{ fontSize: 40, opacity: 0.28 }}>🎨</span>
    </div>
  );
}

// ── Framed mockup ──────────────────────────────────────────────────────────────
//
// Pixel analysis of the 600×600 frame PNGs:
//   • Container aspect: 1:1 (square)
//   • Frame corners are FULLY transparent (A=0) — frame floats on background
//   • Window (portrait area) is nearly transparent (A≈10–25)
//   • Window boundaries: top=70px, left=130px, right=475px, bottom=535px
//     → as % of 600: top=11.67%, left=21.67%, width=57.5%, height=77.5%
//   → Portrait sits exactly inside the window; frame PNG overlays on top (no blend mode)
//
function FramedMockup({
  url,
  frame,
  size,
}: {
  url: string | null;
  frame: "black" | "red-oak" | "white";
  size: SizeKey;
}) {
  return (
    // Outer wrapper provides the drop-shadow (must NOT have overflow:hidden
    // so the shadow isn't clipped by the container bounds)
    <div style={{ filter: "drop-shadow(4px 10px 28px rgba(0,0,0,0.48))" }}>
      {/* Square container — matches the 600×600 PNG aspect ratio */}
      <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>

        {/* ① Portrait — clipped to exactly the frame's window area */}
        <div
          className="absolute overflow-hidden"
          style={{
            top:    "11.67%",
            left:   "21.67%",
            width:  "57.5%",
            height: "77.5%",
            zIndex: 0,
          }}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Portrait preview"
              className="w-full h-full object-cover block"
              draggable={false}
            />
          ) : (
            <PortraitPlaceholder absolute={false} />
          )}
        </div>

        {/* ② Frame PNG — covers the full square on top; its alpha channel
            cuts out the window so the portrait behind shows through cleanly */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frameImageSrc(frame, size)}
          alt={`${frame} frame`}
          className="absolute inset-0 w-full h-full pointer-events-none select-none block"
          style={{ objectFit: "fill", zIndex: 1 }}
          draggable={false}
        />
      </div>
    </div>
  );
}

// ── Canvas mockup ──────────────────────────────────────────────────────────────
//
// Pixel analysis of canvas.png (600×600):
//   • White opaque background at corners/edges (A=255)
//   • Window (portrait area) is nearly transparent (A≈22–24)
//   • Window boundaries: top=65px, left=145px, right=460px, bottom=540px
//     → as % of 600: top=10.83%, left=24.17%, width=52.5%, height=79.17%
//   → Portrait sits in the window BEHIND the canvas PNG; canvas PNG overlays on top
//
function CanvasMockup({ url }: { url: string | null }) {
  return (
    <div style={{ filter: "drop-shadow(4px 10px 24px rgba(0,0,0,0.38))" }}>
      {/* Square container — matches the 600×600 canvas.png */}
      <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>

        {/* ① Portrait — clipped to the canvas window area, sits BEHIND canvas PNG */}
        <div
          className="absolute overflow-hidden"
          style={{
            top:    "10.83%",
            left:   "24.17%",
            width:  "52.5%",
            height: "79.17%",
            zIndex: 0,
          }}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Portrait preview"
              className="w-full h-full object-cover block"
              draggable={false}
            />
          ) : (
            <PortraitPlaceholder absolute={false} />
          )}
        </div>

        {/* ② Canvas PNG — on top; white opaque areas hide portrait outside the
            window; transparent window lets the portrait through cleanly */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mockups/canvas.png"
          alt="Canvas"
          className="absolute inset-0 w-full h-full pointer-events-none select-none block"
          style={{ objectFit: "fill", zIndex: 1 }}
          draggable={false}
        />
      </div>
    </div>
  );
}

// ── Plain poster mockup ────────────────────────────────────────────────────────
function PlainPosterMockup({ url }: { url: string | null }) {
  return (
    <div
      className="bg-white"
      style={{
        padding: "10px",
        boxShadow:
          "4px 6px 28px rgba(0,0,0,0.32), 0 1px 4px rgba(0,0,0,0.14), -1px -1px 0 rgba(255,255,255,0.5)",
      }}
    >
      <div className="relative" style={{ aspectRatio: "3 / 4" }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Portrait preview" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <PortraitPlaceholder />
        )}
      </div>
    </div>
  );
}

// ── Digital mockup ─────────────────────────────────────────────────────────────
function DigitalMockup({ url }: { url: string | null }) {
  return (
    <div
      className="relative overflow-hidden rounded-sm"
      style={{
        boxShadow:
          "0 0 0 1px rgba(196,98,45,0.35), 0 8px 40px rgba(196,98,45,0.3), 0 2px 10px rgba(0,0,0,0.25)",
      }}
    >
      <div className="relative" style={{ aspectRatio: "3 / 4" }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Portrait preview" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <PortraitPlaceholder />
        )}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(140deg, rgba(196,98,45,0.12) 0%, transparent 55%)",
          }}
        />
      </div>
      <div
        className="py-2 px-3 flex items-center justify-center gap-1.5"
        style={{
          background: "linear-gradient(to top, rgba(26,23,20,0.78), transparent)",
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        <Download size={9} className="text-white/80" />
        <span className="text-white/90 text-[9px] font-semibold tracking-widest uppercase">
          Digital File
        </span>
      </div>
    </div>
  );
}

// ── Composite product mockup ───────────────────────────────────────────────────
function ProductMockup({
  url,
  format,
  frame,
  size,
  digitalOnly,
}: {
  url: string | null;
  format: Format;
  frame: Frame;
  size: SizeKey;
  digitalOnly: boolean;
}) {
  const mockupKey = `${format}-${frame}-${size}-${digitalOnly ? "d" : "p"}`;

  // canvas.png has fully-opaque white corners — use a matching cream-white
  // background so they blend in. Frames have transparent corners, so the warm
  // gradient background is fine.
  const bg =
    !digitalOnly && format === "canvas"
      ? "#F5F2EC"
      : "radial-gradient(ellipse at 50% 35%, #EAE2D6 0%, #C4B8A8 100%)";

  return (
    <div
      className="w-full flex items-center justify-center rounded-2xl py-6 px-6"
      style={{ background: bg, minHeight: 500 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={mockupKey}
          initial={{ opacity: 0, scale: 0.91, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
          style={{ maxWidth: 380 }}
        >
          {digitalOnly ? (
            <DigitalMockup url={url} />
          ) : format === "canvas" ? (
            <CanvasMockup url={url} />
          ) : frame === "none" ? (
            <PlainPosterMockup url={url} />
          ) : (
            <FramedMockup url={url} frame={frame} size={size} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-white"
          style={{ background: "#1A1714" }}
        >
          {step}
        </div>
        <h3 className="font-semibold text-[#1A1714] text-[15px]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function Step3PreviewOrder() {
  const {
    previewUrl,
    regenerationsLeft,
    setGenerationStatus,
    goTo,
    selectVariant,
  } = useWizardStore();

  const [format, setFormat] = useState<Format>("poster");
  const [frame, setFrame]   = useState<Frame>("black");
  const [size, setSize]     = useState<SizeKey>("18x24");
  const [unit, setUnit]     = useState<Unit>("in");

  // Fetch real variant IDs from the API so checkout receives a valid GUID
  const [apiProducts, setApiProducts] = useState<ApiProduct[]>([]);
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
  useEffect(() => {
    fetch(`${apiBase}/api/products`)
      .then((r) => r.json())
      .then(setApiProducts)
      .catch(() => {});
  }, [apiBase]);

  const digitalOnly = format === "digital";
  const printFormat = (format === "digital" ? "poster" : format) as "poster" | "canvas";
  const activeFrame = printFormat === "canvas" ? "none" : frame;
  const printPrice  = calcPrice(printFormat, activeFrame, size);
  const totalPrice  = digitalOnly ? DIGITAL_PRICE : printPrice;
  const sizeObj     = SIZES.find((s) => s.key === size)!;
  const sizeLabel   = unit === "in" ? sizeObj.inLabel : sizeObj.cmLabel;
  const sizeStep    = format === "poster" ? 3 : 2;

  const handleRegenerate = () => {
    if (regenerationsLeft <= 0) return;
    // Don't decrement locally — backend is the source of truth.
    // Step3Generating will call /regenerate and sync the real count.
    setGenerationStatus("idle");
    goTo(2);
  };

  const handleContinue = () => {
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const productName = digitalOnly
      ? "Digital Download"
      : `${printFormat === "poster" ? "Poster" : "Canvas"} · ${sizeLabel} ${unit}${
          activeFrame !== "none" ? ` · ${cap(activeFrame.replace("-", " "))} frame` : ""
        }`;

    // Look up the real DB variant GUID
    const productType = digitalOnly
      ? "digital"
      : format === "canvas"
      ? "canvas"
      : activeFrame !== "none"
      ? "framedprint"
      : "poster";
    const targetSize = digitalOnly ? null : `${sizeObj.cmLabel} cm`; // e.g. "45 × 60 cm"
    const apiProduct = apiProducts.find((p) => p.type === productType);
    const apiVariant = apiProduct?.variants.find(
      (v) => digitalOnly || v.size === targetSize
    );

    selectVariant({
      id: apiVariant?.id ?? `${printFormat}-${activeFrame}-${size}${digitalOnly ? "-digital" : ""}`,
      productName,
      size: `${sizeLabel} ${unit}`,
      price: totalPrice,
      currency: "USD",
      type: digitalOnly
        ? "digital"
        : printFormat === "canvas"
        ? "canvas"
        : activeFrame !== "none"
        ? "framed"
        : "poster",
      format: printFormat,
      frame: activeFrame,
    });
    goTo(4);
  };

  return (
    <div>
      {/* Page header */}
      <div className="text-center mb-10">
        <h2 className="text-4xl font-display font-light text-[#1A1714]">
          Personalise your{" "}
          <em className="not-italic font-medium text-[#C4622D]">portrait</em>
        </h2>
        <p className="mt-2 text-[#8C7B6B] text-sm max-w-sm mx-auto">
          Choose your format and size. The watermark disappears in your final order.
        </p>
      </div>

      <div className="grid lg:grid-cols-[480px_1fr] gap-10 items-start">
        {/* ── LEFT: live mockup ──────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-24">
          <ProductMockup
            url={previewUrl}
            format={printFormat}
            frame={activeFrame}
            size={size}
            digitalOnly={digitalOnly}
          />
          <div className="mt-3 flex items-center justify-center">
            <button
              onClick={handleRegenerate}
              disabled={regenerationsLeft <= 0}
              className="inline-flex items-center gap-1.5 text-xs text-[#8C7B6B] hover:text-[#C4622D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={11} />
              Not happy? Retry ({regenerationsLeft} left)
            </button>
          </div>
        </div>

        {/* ── RIGHT: customisation options ───────────────────────────────── */}
        <div className="flex flex-col gap-8">

          {/* ── 1. Format ── */}
          <Section step={1} title="Choose your format">
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { key: "poster"  as Format, label: "Poster print",  sub: `From $${POSTER_BASE["12x16"]}`, emoji: "🖼️", highlight: false },
                  { key: "canvas"  as Format, label: "Canvas print",  sub: `From $${CANVAS_BASE["12x16"]}`, emoji: "🎨", highlight: false },
                  { key: "digital" as Format, label: "Digital only", sub: `$${DIGITAL_PRICE}`, emoji: "⬇️", highlight: true },
                ] as const
              ).map(({ key, label, sub, emoji, highlight }) => {
                const active = format === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFormat(key)}
                    className={`relative text-left rounded-xl border-2 p-4 transition-all duration-200 ${
                      active
                        ? highlight
                          ? "border-[#2D4A3E] bg-[#EEF6F1]"
                          : "border-[#C4622D] bg-[#FFF5F0]"
                        : "border-[#E4D8CC] bg-white hover:border-[#C4622D]/50 hover:bg-[#FFF9F6]"
                    }`}
                  >
                    {active && (
                      <div className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center ${highlight ? "bg-[#2D4A3E]" : "bg-[#C4622D]"}`}>
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                    <div className="text-2xl mb-2.5">{emoji}</div>
                    <p className="font-semibold text-[#1A1714] text-sm leading-tight">{label}</p>
                    <p className={`text-xs mt-1 font-medium ${active && highlight ? "text-[#2D4A3E]" : "text-[#8C7B6B]"}`}>{sub}</p>
                  </button>
                );
              })}
            </div>
            {/* Digital selected — instant delivery note */}
            <AnimatePresence initial={false}>
              {digitalOnly && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="flex items-start gap-3 bg-[#EEF6F1] border border-[#2D4A3E]/20 rounded-xl px-4 py-3.5">
                    <Download size={15} className="text-[#2D4A3E] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#2D4A3E] leading-tight">Instant digital delivery</p>
                      <p className="text-xs text-[#4A7A63] mt-0.5 leading-relaxed">
                        High-res PNG (min 3000 × 4000 px) delivered to your inbox right after payment. No shipping, no wait.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Section>

          {/* ── 2. Frame (poster only, not digital) ── */}
          <AnimatePresence initial={false}>
            {format === "poster" && (
              <motion.div
                key="frame-section"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.26, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <Section step={2} title="Choose your frame">
                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        {
                          key: "black" as Frame,
                          label: "Black",
                          sub: "Matte black",
                          addon: "+$50",
                          swatch: { background: "#1C1C1C" },
                        },
                        {
                          key: "red-oak" as Frame,
                          label: "Red Oak",
                          sub: "Natural wood",
                          addon: "+$50",
                          swatch: { background: "linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #6B3311 100%)" },
                        },
                        {
                          key: "white" as Frame,
                          label: "White",
                          sub: "Gloss white",
                          addon: "+$50",
                          swatch: { background: "#F5F5F5", border: "1px solid #D0C4B8" },
                        },
                        {
                          key: "none" as Frame,
                          label: "No frame",
                          sub: "Plain poster",
                          addon: "Free",
                          swatch: null,
                        },
                      ] as const
                    ).map(({ key, label, sub, addon, swatch }) => {
                      const active = frame === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setFrame(key)}
                          className={`relative text-left rounded-xl border-2 p-3 transition-all duration-200 ${
                            active
                              ? "border-[#C4622D] bg-[#FFF5F0]"
                              : "border-[#E4D8CC] bg-white hover:border-[#C4622D]/50"
                          }`}
                        >
                          {active && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#C4622D] flex items-center justify-center">
                              <Check size={8} className="text-white" />
                            </div>
                          )}
                          {/* Swatch */}
                          <div
                            className="w-8 h-4 rounded mb-2"
                            style={
                              swatch
                                ? swatch
                                : {
                                    background:
                                      "repeating-conic-gradient(#E4D8CC 0% 25%, #FAF6F0 0% 50%) 0 0 / 8px 8px",
                                    border: "1px solid #E4D8CC",
                                  }
                            }
                          />
                          <p className="font-semibold text-[#1A1714] text-[11px] leading-tight">{label}</p>
                          <p className="text-[10px] text-[#8C7B6B] mt-0.5 leading-tight">{sub}</p>
                          <p
                            className={`text-[11px] font-bold mt-1 ${
                              addon === "Free" ? "text-[#2D4A3E]" : "text-[#C4622D]"
                            }`}
                          >
                            {addon}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </Section>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── 3/2. Size (hidden for digital) ── */}
          {!digitalOnly && <Section step={sizeStep} title="Choose your size">
            <div className="flex bg-[#F0EAE0] rounded-lg p-1 w-[104px] mb-4">
              {(["in", "cm"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={`flex-1 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${
                    unit === u
                      ? "bg-white text-[#1A1714] shadow-sm"
                      : "text-[#8C7B6B] hover:text-[#1A1714]"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {SIZES.map(({ key, inLabel, cmLabel, badge }) => {
                const p      = calcPrice(format, activeFrame, key);
                const active = size === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSize(key)}
                    className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 transition-all duration-200 ${
                      active
                        ? "border-[#C4622D] bg-[#FFF5F0] shadow-sm"
                        : "border-[#E4D8CC] bg-white hover:border-[#C4622D]/50 hover:bg-[#FFF9F6]"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                        active ? "border-[#C4622D] bg-[#C4622D]" : "border-[#D0C4B8]"
                      }`}
                    >
                      {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="font-semibold text-[#1A1714] text-sm w-16 text-left tabular-nums">
                      {unit === "in" ? inLabel : cmLabel}
                    </span>
                    <span className="text-xs text-[#8C7B6B]">{unit}</span>
                    {badge && (
                      <span className="text-[9px] font-bold bg-[#D4942A] text-white px-1.5 py-0.5 rounded-full tracking-wider">
                        {badge}
                      </span>
                    )}
                    <motion.span
                      key={p}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                      className="ml-auto font-display font-semibold text-[#1A1714] text-base"
                    >
                      ${p}
                    </motion.span>
                  </button>
                );
              })}
            </div>
          </Section>}

          {/* "Digital included free with print" note — shown for poster/canvas */}
          {!digitalOnly && (
            <div className="flex items-center gap-3 bg-[#EEF6F1] border border-[#2D4A3E]/20 rounded-xl px-4 py-3">
              <Download size={14} className="text-[#2D4A3E] shrink-0" />
              <p className="text-xs text-[#4A7A63]">
                <span className="font-semibold">Digital file included free</span> with every print order — high-res PNG delivered instantly after purchase.
              </p>
            </div>
          )}

          {/* ── Summary + Checkout ── */}
          <div className="bg-white rounded-2xl border border-[#E4D8CC] p-5 space-y-4">
            {!digitalOnly && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8C7B6B]">
                    {printFormat === "poster" ? "Rolled poster print" : "Stretched canvas print"} ·{" "}
                    {sizeLabel} {unit}
                  </span>
                  <span className="font-medium text-[#1A1714]">
                    ${printFormat === "poster" ? POSTER_BASE[size] : CANVAS_BASE[size]}
                  </span>
                </div>
                {activeFrame !== "none" && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#8C7B6B]">
                      {activeFrame === "red-oak" ? "Red oak" : activeFrame.charAt(0).toUpperCase() + activeFrame.slice(1)} wood frame
                    </span>
                    <span className="font-medium text-[#1A1714]">+${FRAME_ADDON}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8C7B6B]">Digital file (high-res)</span>
                  <span className="font-semibold text-[#2D4A3E]">Free</span>
                </div>
                <div className="h-px bg-[#E4D8CC]" />
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#1A1714]">Total</span>
              <motion.span
                key={totalPrice}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="font-display font-semibold text-3xl text-[#1A1714]"
              >
                ${totalPrice}
              </motion.span>
            </div>

            <button
              onClick={handleContinue}
              className="w-full flex items-center justify-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] text-white font-semibold py-4 rounded-full text-sm transition-all duration-200 hover:shadow-lg hover:shadow-[#C4622D]/25 hover:-translate-y-0.5"
            >
              <ShoppingCart size={15} />
              Continue to cart — ${totalPrice}
            </button>

            <p className="text-center text-[10px] text-[#8C7B6B] leading-relaxed">
              🔒 Secure checkout · Prints ship in 5–7 days · 30-day satisfaction guarantee
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
