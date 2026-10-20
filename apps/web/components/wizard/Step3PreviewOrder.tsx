"use client";

import { useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Download, ShoppingCart, Check, Loader2 } from "lucide-react";
import { useWizardStore } from "@/store/wizardStore";

// ── API product types (from GET /api/products) ────────────────────────────────
interface ApiVariant { id: string; size: string; price: number; currency: string; }
interface ApiProduct { id: string; name: string; type: string; variants: ApiVariant[]; }

// ── Types ──────────────────────────────────────────────────────────────────────
type Format = "digital" | "poster" | "canvas";
type Frame  = "black" | "red-oak" | "white" | "none";

function priceSym(currency: string): string {
  if (currency === "EUR") return "€";
  if (currency === "GBP") return "£";
  return "$";
}

// ── Find the right product for a given format + frame ─────────────────────────
function resolveProduct(
  fmt: Format,
  fr: Frame,
  products: ApiProduct[]
): ApiProduct | undefined {
  if (fmt === "digital") return products.find((p) => p.type === "digital");
  if (fmt === "canvas")  return products.find((p) => p.type === "canvas");
  // poster
  if (fr !== "none") {
    const keyword = fr === "red-oak" ? "oak" : fr;
    const fps = products.filter((p) => p.type === "framedprint");
    return fps.find((p) => p.name.toLowerCase().includes(keyword)) ?? fps[0];
  }
  return products.find((p) => p.type === "poster");
}

// ── Mockup size key (maps a cm size label to the matching mockup PNG name) ────
function mockupKey(sizeCm: string): "12x16" | "18x24" | "24x36" {
  const n = parseInt(sizeCm);          // parse first number (width)
  if (n >= 55) return "24x36";
  if (n >= 40) return "18x24";
  return "12x16";
}

// ── Portrait placeholder ───────────────────────────────────────────────────────
function PortraitPlaceholder({ absolute = true }: { absolute?: boolean }) {
  return (
    <div
      className={`${absolute ? "absolute inset-0" : "w-full h-full"} flex items-center justify-center`}
      style={{ background: "linear-gradient(135deg, rgba(196,98,45,0.18) 0%, rgba(232,168,56,0.1) 55%, rgba(45,74,62,0.18) 100%)" }}
    >
      <span style={{ fontSize: 40, opacity: 0.28 }}>🎨</span>
    </div>
  );
}

// ── Framed mockup ──────────────────────────────────────────────────────────────
function FramedMockup({ url, frame, sizeKey }: { url: string | null; frame: "black" | "red-oak" | "white"; sizeKey: "12x16" | "18x24" | "24x36" }) {
  const color = frame === "red-oak" ? "redoak" : frame;
  return (
    <div style={{ filter: "drop-shadow(4px 10px 28px rgba(0,0,0,0.48))" }}>
      {/* overflow-hidden on both levels: outer clips any bleed during AnimatePresence transitions,
          inner aperture div clips the portrait to the exact frame opening */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
        <div className="absolute overflow-hidden" style={{ top: "11.67%", left: "21.67%", width: "57.5%", height: "77.5%", zIndex: 0 }}>
          {url
            ? <img src={url} alt="Portrait preview" className="absolute inset-0 w-full h-full object-cover block" draggable={false} />  // eslint-disable-line @next/next/no-img-element
            : <PortraitPlaceholder absolute={false} />}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/mockups/frame-${color}-${sizeKey}.png`} alt={`${frame} frame`}
          className="absolute inset-0 w-full h-full pointer-events-none select-none block"
          style={{ objectFit: "fill", zIndex: 1 }} draggable={false} />
      </div>
    </div>
  );
}

// ── Canvas mockup ──────────────────────────────────────────────────────────────
function CanvasMockup({ url }: { url: string | null }) {
  return (
    <div style={{ filter: "drop-shadow(4px 10px 24px rgba(0,0,0,0.38))" }}>
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
        <div className="absolute overflow-hidden" style={{ top: "10.83%", left: "24.17%", width: "52.5%", height: "79.17%", zIndex: 0 }}>
          {url
            ? <img src={url} alt="Portrait preview" className="absolute inset-0 w-full h-full object-cover block" draggable={false} />  // eslint-disable-line @next/next/no-img-element
            : <PortraitPlaceholder absolute={false} />}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mockups/canvas.png" alt="Canvas"
          className="absolute inset-0 w-full h-full pointer-events-none select-none block"
          style={{ objectFit: "fill", zIndex: 1 }} draggable={false} />
      </div>
    </div>
  );
}

// ── Plain poster mockup ────────────────────────────────────────────────────────
function PlainPosterMockup({ url }: { url: string | null }) {
  return (
    <div className="bg-white" style={{ padding: "10px", boxShadow: "4px 6px 28px rgba(0,0,0,0.32), 0 1px 4px rgba(0,0,0,0.14), -1px -1px 0 rgba(255,255,255,0.5)" }}>
      <div className="relative" style={{ aspectRatio: "3 / 4" }}>
        {url
          ? <img src={url} alt="Portrait preview" className="absolute inset-0 w-full h-full object-cover" />  // eslint-disable-line @next/next/no-img-element
          : <PortraitPlaceholder />}
      </div>
    </div>
  );
}

// ── Digital mockup ─────────────────────────────────────────────────────────────
function DigitalMockup({ url }: { url: string | null }) {
  return (
    <div className="relative overflow-hidden rounded-sm"
      style={{ boxShadow: "0 0 0 1px rgba(196,98,45,0.35), 0 8px 40px rgba(196,98,45,0.3), 0 2px 10px rgba(0,0,0,0.25)" }}>
      <div className="relative" style={{ aspectRatio: "3 / 4" }}>
        {url
          ? <img src={url} alt="Portrait preview" className="absolute inset-0 w-full h-full object-cover" />  // eslint-disable-line @next/next/no-img-element
          : <PortraitPlaceholder />}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(140deg, rgba(196,98,45,0.12) 0%, transparent 55%)" }} />
      </div>
      <div className="py-2 px-3 flex items-center justify-center gap-1.5"
        style={{ background: "linear-gradient(to top, rgba(26,23,20,0.78), transparent)", position: "absolute", bottom: 0, left: 0, right: 0 }}>
        <Download size={9} className="text-white/80" />
        <span className="text-white/90 text-[9px] font-semibold tracking-widest uppercase">Digital File</span>
      </div>
    </div>
  );
}

// ── Composite product mockup ───────────────────────────────────────────────────
function ProductMockup({ url, format, frame, sizeCm, digitalOnly }: {
  url: string | null; format: "poster" | "canvas"; frame: Frame; sizeCm: string; digitalOnly: boolean;
}) {
  const mk = mockupKey(sizeCm);
  const bg = !digitalOnly && format === "canvas" ? "#F5F2EC"
    : "radial-gradient(ellipse at 50% 35%, #EAE2D6 0%, #C4B8A8 100%)";
  const key = `${format}-${frame}-${sizeCm}-${digitalOnly}`;

  return (
    <div className="w-full flex items-center justify-center rounded-2xl py-6 px-6" style={{ background: bg, minHeight: 500 }}>
      <AnimatePresence mode="wait">
        <motion.div key={key}
          initial={{ opacity: 0, scale: 0.91, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className="w-full" style={{ maxWidth: 380 }}>
          {digitalOnly ? <DigitalMockup url={url} />
            : format === "canvas" ? <CanvasMockup url={url} />
            : frame === "none" ? <PlainPosterMockup url={url} />
            : <FramedMockup url={url} frame={frame as "black" | "red-oak" | "white"} sizeKey={mk} />}
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
        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-white" style={{ background: "#1A1714" }}>
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
  const { previewUrl, regenerationsLeft, setGenerationStatus, goTo, selectVariant } = useWizardStore();

  const [format, setFormat]           = useState<Format>("poster");
  const [frame, setFrame]             = useState<Frame>("black");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");

  const [apiProducts, setApiProducts] = useState<ApiProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    fetch(`${apiBase}/api/products`)
      .then((r) => r.json())
      .then((data) => { setApiProducts(data); setLoadingProducts(false); })
      .catch(() => setLoadingProducts(false));
  }, [apiBase]);

  // ── Derived: which product + which variants are available ──────────────────
  const digitalOnly = format === "digital";
  const activeFrame: Frame = format === "canvas" ? "none" : frame;
  const printFmt = (digitalOnly ? "poster" : format) as "poster" | "canvas";

  const currentProduct = useMemo(
    () => resolveProduct(format, activeFrame, apiProducts),
    [format, activeFrame, apiProducts]
  );

  const availableSizes: ApiVariant[] = useMemo(
    () => (currentProduct?.variants ?? []).filter((v) => v.price > 0),
    [currentProduct]
  );

  // Auto-select first variant whenever the available set changes
  useEffect(() => {
    if (availableSizes.length === 0) return;
    setSelectedVariantId((prev) => {
      const still = availableSizes.find((v) => v.id === prev);
      return still ? prev : availableSizes[0].id;
    });
  }, [availableSizes]);

  const selectedVariant = availableSizes.find((v) => v.id === selectedVariantId) ?? availableSizes[0];
  const livePrice    = selectedVariant?.price    ?? 0;
  const liveCurrency = selectedVariant?.currency ?? "EUR";
  const sym          = priceSym(liveCurrency);

  // ── "From" prices for format selector cards ────────────────────────────────
  const fromPrice = (type: string, frameKw?: string): number | null => {
    let prods = apiProducts.filter((p) => p.type === type);
    if (frameKw) prods = prods.filter((p) => p.name.toLowerCase().includes(frameKw));
    const all = prods.flatMap((p) => p.variants.map((v) => v.price)).filter((x) => x > 0);
    return all.length ? Math.min(...all) : null;
  };

  const posterFrom  = fromPrice("poster");
  const canvasFrom  = fromPrice("canvas");
  const digitalLive = apiProducts.find((p) => p.type === "digital")?.variants[0]?.price ?? null;

  // ── Which frame colours have actual products ──────────────────────────────
  const framedProducts = apiProducts.filter((p) => p.type === "framedprint");
  const hasBlack  = framedProducts.some((p) => p.name.toLowerCase().includes("black"));
  const hasRedOak = framedProducts.some((p) => p.name.toLowerCase().includes("oak"));
  const hasWhite  = framedProducts.some((p) => p.name.toLowerCase().includes("white"));
  // If no framed products exist at all, show all options (might just not be set up yet)
  const showAllFrames = !hasBlack && !hasRedOak && !hasWhite;

  const FRAME_OPTS = (
    [
      { key: "black"   as Frame, label: "Black",    sub: "Matte black",  swatch: { background: "#1C1C1C" } as React.CSSProperties },
      { key: "red-oak" as Frame, label: "Red Oak",  sub: "Natural wood", swatch: { background: "linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #6B3311 100%)" } as React.CSSProperties },
      { key: "white"   as Frame, label: "White",    sub: "Gloss white",  swatch: { background: "#F5F5F5", border: "1px solid #D0C4B8" } as React.CSSProperties },
      { key: "none"    as Frame, label: "No frame", sub: "Plain poster",  swatch: null as React.CSSProperties | null },
    ] as { key: Frame; label: string; sub: string; swatch: React.CSSProperties | null }[]
  ).filter(({ key }) => {
    if (key === "none") return true;
    if (showAllFrames) return true;
    if (key === "black")   return hasBlack;
    if (key === "red-oak") return hasRedOak;
    if (key === "white")   return hasWhite;
    return false;
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRegenerate = () => {
    if (regenerationsLeft <= 0) return;
    setGenerationStatus("idle");
    goTo(2);
  };

  const handleContinue = () => {
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const productName = digitalOnly
      ? "Digital Download"
      : currentProduct
        ? `${currentProduct.name} · ${selectedVariant?.size ?? ""}`
        : `${cap(printFmt)} · ${selectedVariant?.size ?? ""}`;

    selectVariant({
      id: selectedVariant?.id ?? `${printFmt}-${activeFrame}`,
      productName,
      size: selectedVariant?.size ?? "",
      price: livePrice,
      currency: liveCurrency,
      type: digitalOnly ? "digital"
        : printFmt === "canvas" ? "canvas"
        : activeFrame !== "none" ? "framed"
        : "poster",
      format: printFmt,
      frame: activeFrame,
    });
    goTo(4);
  };

  const sizeStep = format === "poster" ? 3 : 2;

  // ── Framed price add-on label (compared to poster baseline) ───────────────
  const posterProduct   = apiProducts.find((p) => p.type === "poster");
  const basePosterPrice = posterProduct?.variants.find((v) => v.size === selectedVariant?.size)?.price;
  const frameAddon      = (activeFrame !== "none" && selectedVariant && basePosterPrice)
    ? selectedVariant.price - basePosterPrice
    : null;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-4xl font-display font-light text-[#1A1714]">
          Personalise your <em className="not-italic font-medium text-[#C4622D]">portrait</em>
        </h2>
        <p className="mt-2 text-[#8C7B6B] text-sm max-w-sm mx-auto">
          Choose your format and size. The watermark disappears in your final order.
        </p>
      </div>

      <div className="grid lg:grid-cols-[480px_1fr] gap-10 items-start">

        {/* ── LEFT: live mockup ──────────────────────────────────────── */}
        <div className="lg:sticky lg:top-24">
          <ProductMockup
            url={previewUrl}
            format={printFmt}
            frame={activeFrame}
            sizeCm={selectedVariant?.size ?? ""}
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

        {/* ── RIGHT: options ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-8">

          {/* ── 1. Format ── */}
          <Section step={1} title="Choose your format">
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { key: "poster"  as Format, label: "Poster print",  price: posterFrom,  emoji: "🖼️", highlight: false },
                  { key: "canvas"  as Format, label: "Canvas print",  price: canvasFrom,  emoji: "🎨", highlight: false },
                  { key: "digital" as Format, label: "Digital only",  price: digitalLive, emoji: "⬇️", highlight: true },
                ] as const
              ).map(({ key, label, price, emoji, highlight }) => {
                const active = format === key;
                const sub = price !== null ? `From ${priceSym(liveCurrency)}${price}` : "—";
                return (
                  <button
                    key={key}
                    onClick={() => setFormat(key)}
                    className={`relative text-left rounded-xl border-2 p-4 transition-all duration-200 ${
                      active
                        ? highlight ? "border-[#2D4A3E] bg-[#EEF6F1]" : "border-[#C4622D] bg-[#FFF5F0]"
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

            {/* Digital instant delivery note */}
            <AnimatePresence initial={false}>
              {digitalOnly && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.25 }} style={{ overflow: "hidden" }}
                >
                  <div className="flex items-start gap-3 bg-[#EEF6F1] border border-[#2D4A3E]/20 rounded-xl px-4 py-3.5">
                    <Download size={15} className="text-[#2D4A3E] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#2D4A3E] leading-tight">Instant digital delivery</p>
                      <p className="text-xs text-[#4A7A63] mt-0.5 leading-relaxed">
                        High-res PNG (min 3000 × 4000 px) delivered to your inbox right after payment.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Section>

          {/* ── 2. Frame (poster only) ── */}
          <AnimatePresence initial={false}>
            {format === "poster" && (
              <motion.div key="frame-section"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.26, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <Section step={2} title="Choose your frame">
                  <div className={`grid gap-2 grid-cols-${Math.min(FRAME_OPTS.length, 4)}`}
                    style={{ gridTemplateColumns: `repeat(${Math.min(FRAME_OPTS.length, 4)}, minmax(0, 1fr))` }}>
                    {FRAME_OPTS.map(({ key, label, sub, swatch }) => {
                      const active = frame === key;
                      const frameProd = key !== "none"
                        ? (() => {
                            const kw = key === "red-oak" ? "oak" : key;
                            return framedProducts.find((p) => p.name.toLowerCase().includes(kw));
                          })()
                        : null;
                      const addonStr = key === "none" ? "Plain"
                        : frameProd ? `+${priceSym(frameProd.variants[0]?.currency ?? "EUR")}${
                            (frameProd.variants[0]?.price ?? 0) - (posterProduct?.variants[0]?.price ?? 0)
                          }`
                        : "";
                      return (
                        <button key={key} onClick={() => setFrame(key)}
                          className={`relative text-left rounded-xl border-2 p-3 transition-all duration-200 ${
                            active ? "border-[#C4622D] bg-[#FFF5F0]" : "border-[#E4D8CC] bg-white hover:border-[#C4622D]/50"
                          }`}
                        >
                          {active && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#C4622D] flex items-center justify-center">
                              <Check size={8} className="text-white" />
                            </div>
                          )}
                          <div className="w-8 h-4 rounded mb-2" style={
                            swatch ?? { background: "repeating-conic-gradient(#E4D8CC 0% 25%, #FAF6F0 0% 50%) 0 0 / 8px 8px", border: "1px solid #E4D8CC" }
                          } />
                          <p className="font-semibold text-[#1A1714] text-[11px] leading-tight">{label}</p>
                          <p className="text-[10px] text-[#8C7B6B] mt-0.5 leading-tight">{sub}</p>
                          {addonStr && (
                            <p className={`text-[11px] font-bold mt-1 ${addonStr === "Plain" ? "text-[#2D4A3E]" : "text-[#C4622D]"}`}>
                              {addonStr}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Section>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── 3/2. Size (hidden for digital) ── */}
          {!digitalOnly && (
            <Section step={sizeStep} title="Choose your size">
              {loadingProducts ? (
                <div className="flex items-center gap-2 py-6 text-[#8C7B6B] text-sm">
                  <Loader2 size={14} className="animate-spin" /> Loading sizes…
                </div>
              ) : availableSizes.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 text-sm text-amber-700">
                  No sizes set up yet for this option. Go to Admin → Printful → Catalog Sync and click
                  &ldquo;Add size&rdquo; on the variants you want to offer.
                </div>
              ) : (
                <div className="space-y-2">
                  {availableSizes.map((v) => {
                    const active = selectedVariantId === v.id || (!selectedVariantId && v === availableSizes[0]);
                    const vsym   = priceSym(v.currency);
                    return (
                      <button key={v.id} onClick={() => setSelectedVariantId(v.id)}
                        className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 transition-all duration-200 ${
                          active ? "border-[#C4622D] bg-[#FFF5F0] shadow-sm" : "border-[#E4D8CC] bg-white hover:border-[#C4622D]/50 hover:bg-[#FFF9F6]"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          active ? "border-[#C4622D] bg-[#C4622D]" : "border-[#D0C4B8]"
                        }`}>
                          {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="font-semibold text-[#1A1714] text-sm flex-1 text-left">{v.size}</span>
                        <motion.span key={v.price}
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
                          className="font-display font-semibold text-[#1A1714] text-base"
                        >
                          {vsym}{v.price}
                        </motion.span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Section>
          )}

          {/* Digital included note */}
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
            {!digitalOnly && selectedVariant && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8C7B6B]">
                    {printFmt === "poster" ? "Rolled poster print" : "Stretched canvas print"} · {selectedVariant.size}
                  </span>
                  <span className="font-medium text-[#1A1714]">
                    {sym}{activeFrame !== "none" && basePosterPrice !== undefined ? basePosterPrice : selectedVariant.price}
                  </span>
                </div>
                {activeFrame !== "none" && frameAddon !== null && frameAddon > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#8C7B6B]">
                      {activeFrame === "red-oak" ? "Red oak" : activeFrame.charAt(0).toUpperCase() + activeFrame.slice(1)} frame
                    </span>
                    <span className="font-medium text-[#1A1714]">+{sym}{frameAddon}</span>
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
              <motion.span key={livePrice}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
                className="font-display font-semibold text-3xl text-[#1A1714]"
              >
                {livePrice > 0 ? `${sym}${livePrice}` : "—"}
              </motion.span>
            </div>

            <button
              onClick={handleContinue}
              disabled={!digitalOnly && (!selectedVariant || availableSizes.length === 0)}
              className="w-full flex items-center justify-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-full text-sm transition-all duration-200 hover:shadow-lg hover:shadow-[#C4622D]/25 hover:-translate-y-0.5"
            >
              <ShoppingCart size={15} />
              Continue to cart{livePrice > 0 ? ` — ${sym}${livePrice}` : ""}
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
