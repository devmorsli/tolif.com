"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizardStore, type ProductVariant } from "@/store/wizardStore";
import {
  Download, Frame, ImageIcon, ChevronLeft, ShoppingCart,
  Check, Smartphone, Loader2, Zap, Shield, Package,
  Star, Printer, ArrowRight,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

type WizardType = ProductVariant["type"];

const TYPE_MAP: Record<string, WizardType> = {
  digital:     "digital",
  poster:      "poster",
  framedprint: "framed",
  canvas:      "canvas",
};

const FORMAT_TABS: {
  type: WizardType;
  label: string;
  sublabel: string;
  icon: React.ElementType;
}[] = [
  { type: "digital", label: "Digital",      sublabel: "Instant download",  icon: Download  },
  { type: "poster",  label: "Poster",        sublabel: "Premium print",     icon: Printer   },
  { type: "framed",  label: "Framed Print",  sublabel: "Ready to hang",     icon: Frame     },
  { type: "canvas",  label: "Canvas",        sublabel: "Gallery-wrapped",   icon: ImageIcon },
];

const PHYSICAL_DESCS: Record<WizardType, string> = {
  digital: "",
  poster:  "200gsm matte paper · museum-quality inks",
  framed:  "White matte & black frame · wall-ready",
  canvas:  "Gallery-wrap · UV-resistant inks",
};

function PriceTag({
  price, currency, large = false,
}: {
  price: number; currency: string; large?: boolean;
}) {
  const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  const [whole, cents] = price.toFixed(2).split(".");
  return (
    <span className={`flex items-baseline gap-0.5 leading-none tabular-nums ${large ? "" : ""}`}>
      <span className={`font-medium text-[#C4622D] ${large ? "text-lg" : "text-sm"}`}>{symbol}</span>
      <span className={`font-bold text-[#1A1714] ${large ? "text-4xl" : "text-xl"}`}>{whole}</span>
      <span className={`font-medium text-[#8C7B6B] ${large ? "text-base" : "text-xs"}`}>.{cents}</span>
    </span>
  );
}

export function Step5Product() {
  const { selectedVariant, selectVariant, back } = useWizardStore();
  const [products, setProducts]     = useState<ProductVariant[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeFormat, setFormat]   = useState<WizardType>("digital");

  useEffect(() => {
    fetch(`${API_BASE}/api/products`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: Array<{
        id: string; name: string; type: string;
        variants: Array<{ id: string; size: string; price: number; currency: string }>;
      }>) => {
        const variants: ProductVariant[] = [];
        for (const product of data) {
          const wType = TYPE_MAP[product.type] ?? "poster";
          for (const v of product.variants) {
            variants.push({ id: v.id, productName: product.name, size: v.size, price: v.price, currency: v.currency, type: wType });
          }
        }
        setProducts(variants);
      })
      .catch(() => {
        setProducts([
          { id: "digital",   productName: "Digital Download", size: "High-Res PNG", price: 9.99,  currency: "USD", type: "digital" },
          { id: "poster-30", productName: "Poster Print",     size: "30 × 40 cm",  price: 34.99, currency: "EUR", type: "poster"  },
          { id: "poster-50", productName: "Poster Print",     size: "50 × 70 cm",  price: 44.99, currency: "EUR", type: "poster"  },
          { id: "framed-30", productName: "Framed Print",     size: "30 × 40 cm",  price: 59.99, currency: "EUR", type: "framed"  },
          { id: "framed-50", productName: "Framed Print",     size: "50 × 70 cm",  price: 79.99, currency: "EUR", type: "framed"  },
          { id: "canvas-30", productName: "Canvas",           size: "30 × 40 cm",  price: 64.99, currency: "EUR", type: "canvas"  },
          { id: "canvas-50", productName: "Canvas",           size: "50 × 70 cm",  price: 89.99, currency: "EUR", type: "canvas"  },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const digitalProduct = products.find(p => p.type === "digital");
  const sizeOptions    = products.filter(p => p.type === activeFormat);
  const isDigital      = activeFormat === "digital";

  /* Switch format tab */
  const handleFormat = (type: WizardType) => {
    setFormat(type);
    // Auto-select digital when switching to digital tab
    if (type === "digital" && digitalProduct) {
      selectVariant(digitalProduct);
    } else if (type !== "digital" && selectedVariant?.type === "digital") {
      // Clear digital selection when switching away
      selectVariant(sizeOptions[0] ?? products.find(p => p.type === type) ?? selectedVariant);
    }
  };

  // Sync auto-select when products load
  useEffect(() => {
    if (!loading && activeFormat === "digital" && digitalProduct && !selectedVariant) {
      selectVariant(digitalProduct);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleCheckout = () => {
    if (!selectedVariant) return;
    alert(`Checkout coming soon! Selected: ${selectedVariant.productName} ${selectedVariant.size}`);
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl sm:text-4xl font-display font-light text-[#1A1714]">
          Choose your <em className="not-italic font-medium text-[#C4622D]">format</em>
        </h2>
        <p className="mt-2.5 text-[#8C7B6B] text-sm max-w-xs mx-auto leading-relaxed">
          All options unlock the full watermark-free portrait.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-[#C4622D]" />
        </div>
      ) : (
        <>
          {/* ── Format tab strip ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            {FORMAT_TABS.map(({ type, label, sublabel, icon: Icon }) => {
              const active = activeFormat === type;
              const isDigTab = type === "digital";
              return (
                <motion.button
                  key={type}
                  onClick={() => handleFormat(type)}
                  whileTap={{ scale: 0.97 }}
                  className={`relative flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 text-center transition-all duration-200 outline-none ${
                    active
                      ? isDigTab
                        ? "border-[#2D4A3E] bg-[#2D4A3E] shadow-lg shadow-[#2D4A3E]/20"
                        : "border-[#C4622D] bg-[#FFF5F0] shadow-md shadow-[#C4622D]/10"
                      : "border-[#E4D8CC] bg-white hover:border-[#D4C4B4] hover:bg-[#FAF6F0]"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200 ${
                    active
                      ? isDigTab ? "bg-white/15" : "bg-[#C4622D]"
                      : "bg-[#F2EAE0]"
                  }`}>
                    <Icon size={17} className={active ? (isDigTab ? "text-white" : "text-white") : "text-[#C4622D]"} />
                  </div>

                  <div>
                    <p className={`text-xs font-semibold leading-tight transition-colors duration-200 ${
                      active ? (isDigTab ? "text-white" : "text-[#C4622D]") : "text-[#1A1714]"
                    }`}>
                      {label}
                    </p>
                    <p className={`text-[10px] mt-0.5 transition-colors duration-200 ${
                      active ? (isDigTab ? "text-white/60" : "text-[#8C7B6B]") : "text-[#B0A090]"
                    }`}>
                      {sublabel}
                    </p>
                  </div>

                  {active && (
                    <motion.div
                      layoutId="format-active-dot"
                      className={`absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center ${isDigTab ? "bg-white/20" : "bg-[#C4622D]"}`}
                      transition={{ type: "spring", bounce: 0.4, duration: 0.35 }}
                    >
                      <Check size={8} className="text-white" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* ── Format panel ─────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">

            {/* ── DIGITAL panel ── */}
            {isDigital && (
              <motion.div
                key="digital"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="mb-6"
              >
                {/* Main card */}
                <div className="relative overflow-hidden rounded-3xl bg-[#1A2E27] border border-[#2D4A3E]">
                  {/* Subtle blob decorations */}
                  <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#C4622D]/8 blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-[#D4942A]/6 blur-2xl" />

                  <div className="relative p-6 sm:p-8">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                          <Download size={22} className="text-white" />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-base leading-tight">Digital Download</p>
                          <p className="text-white/50 text-xs mt-0.5">High-Resolution PNG · Min 3000 × 4000 px</p>
                        </div>
                      </div>

                      {/* "Best value" chip */}
                      <div className="flex-shrink-0 flex items-center gap-1 bg-[#D4942A]/20 border border-[#D4942A]/35 rounded-full px-3 py-1.5">
                        <Star size={9} className="fill-[#D4942A] text-[#D4942A]" />
                        <span className="text-[#D4942A] text-[10px] font-semibold tracking-wide whitespace-nowrap">Best value</span>
                      </div>
                    </div>

                    {/* Features grid */}
                    <div className="grid grid-cols-2 gap-2.5 mb-7">
                      {[
                        { icon: Zap,        text: "Delivered instantly to your inbox" },
                        { icon: Shield,     text: "Print-ready at any lab worldwide"  },
                        { icon: Smartphone, text: "Share on social or use as wallpaper" },
                        { icon: Download,   text: "Download as many times as you need" },
                      ].map(({ icon: Icon, text }) => (
                        <div key={text} className="flex items-start gap-2.5">
                          <div className="mt-0.5 w-5 h-5 rounded-full bg-[#D4942A]/20 flex items-center justify-center flex-shrink-0">
                            <Icon size={10} className="text-[#D4942A]" />
                          </div>
                          <span className="text-white/65 text-xs leading-snug">{text}</span>
                        </div>
                      ))}
                    </div>

                    {/* Price + CTA row */}
                    <div className="flex items-center justify-between gap-4 pt-5 border-t border-white/10">
                      <div>
                        {digitalProduct && (
                          <>
                            <div className="flex items-baseline gap-1 leading-none">
                              <span className="text-white/40 text-sm">$</span>
                              <span className="text-4xl font-bold text-white tabular-nums">
                                {Math.floor(digitalProduct.price)}
                              </span>
                              <span className="text-white/40 text-base">
                                .{digitalProduct.price.toFixed(2).split(".")[1]}
                              </span>
                            </div>
                            <p className="text-white/30 text-[10px] mt-1">No shipping · No wait</p>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 bg-white/8 border border-white/12 rounded-2xl px-4 py-3">
                        <Check size={14} className="text-[#D4942A] flex-shrink-0" />
                        <span className="text-white text-xs font-medium">Selected</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Soft note below */}
                <p className="text-center text-[11px] text-[#B0A090] mt-3">
                  No physical item will be shipped with this option
                </p>
              </motion.div>
            )}

            {/* ── PHYSICAL size panel ── */}
            {!isDigital && (
              <motion.div
                key={activeFormat}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="mb-6"
              >
                <p className="text-[11px] font-semibold text-[#8C7B6B] uppercase tracking-widest mb-3 px-0.5">
                  Pick a size
                </p>

                {sizeOptions.length === 0 ? (
                  <div className="text-center py-10 text-sm text-[#8C7B6B] bg-white rounded-2xl border border-[#E4D8CC]">
                    No sizes available yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {sizeOptions.map((product, i) => {
                      const selected = selectedVariant?.id === product.id;
                      // Compute a visual ratio preview
                      const parts = product.size.includes("×")
                        ? product.size.split("×").map(s => parseInt(s.trim()))
                        : [30, 40];
                      const [pw, ph] = parts.length === 2 ? parts : [30, 40];
                      const scale = Math.min(28 / pw, 36 / ph);
                      const rw = Math.round(pw * scale);
                      const rh = Math.round(ph * scale);

                      return (
                        <motion.button
                          key={product.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06, duration: 0.25 }}
                          onClick={() => selectVariant(product)}
                          className={`group relative w-full text-left rounded-2xl border-2 px-5 py-4 flex items-center gap-4 transition-all duration-200 outline-none ${
                            selected
                              ? "border-[#C4622D] bg-[#FFF5F0] shadow-md shadow-[#C4622D]/10"
                              : "border-[#E4D8CC] bg-white hover:border-[#C4622D]/40 hover:bg-[#FAF6F0] hover:shadow-sm"
                          }`}
                        >
                          {/* Aspect ratio thumbnail */}
                          <div className={`flex-shrink-0 w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-colors duration-200 ${
                            selected ? "border-[#C4622D]/25 bg-[#FFF5F0]" : "border-[#EDE8E0] bg-[#F8F4F0]"
                          }`}>
                            <div
                              className={`rounded-sm border-2 transition-colors duration-200 ${
                                selected ? "border-[#C4622D] bg-[#C4622D]/10" : "border-[#C4622D]/30 bg-[#F2EAE0]"
                              }`}
                              style={{ width: rw, height: rh }}
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm leading-tight transition-colors ${selected ? "text-[#C4622D]" : "text-[#1A1714]"}`}>
                              {product.size}
                            </p>
                            <p className="text-[11px] text-[#8C7B6B] mt-0.5 leading-snug">
                              {PHYSICAL_DESCS[product.type]}
                            </p>
                          </div>

                          {/* Price + check */}
                          <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                            <PriceTag price={product.price} currency={product.currency} />
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                              selected
                                ? "border-[#C4622D] bg-[#C4622D]"
                                : "border-[#E4D8CC] group-hover:border-[#C4622D]/50"
                            }`}>
                              {selected && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
                                  <Check size={9} className="text-white" />
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* Shipping strip */}
                <div className="mt-4 flex items-center gap-2.5 bg-[#F2EAE0] rounded-2xl px-4 py-3">
                  <Package size={14} className="text-[#C4622D] flex-shrink-0" />
                  <p className="text-xs text-[#8C7B6B]">
                    Ships in 5–7 business days · Free shipping on orders over €60
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Switch-to-digital nudge (only when physical and nothing selected) ── */}
          <AnimatePresence>
            {!isDigital && !selectedVariant && (
              <motion.button
                key="digital-nudge"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleFormat("digital")}
                className="w-full mb-5 overflow-hidden flex items-center justify-between gap-3 px-5 py-3 rounded-2xl border border-[#E4D8CC] bg-white hover:border-[#2D4A3E]/40 hover:bg-[#F0F7F4] transition-all duration-200 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#2D4A3E]/10 flex items-center justify-center">
                    <Download size={13} className="text-[#2D4A3E]" />
                  </div>
                  <span className="text-xs text-[#8C7B6B]">
                    Just want the file?{" "}
                    <span className="text-[#2D4A3E] font-semibold">Digital download from $9.99</span>
                  </span>
                </div>
                <ArrowRight size={13} className="text-[#2D4A3E] flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={back}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#8C7B6B] hover:text-[#1A1714] transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <motion.button
          onClick={handleCheckout}
          disabled={!selectedVariant}
          whileHover={selectedVariant ? { scale: 1.02, y: -1 } : {}}
          whileTap={selectedVariant ? { scale: 0.98 } : {}}
          className="inline-flex items-center gap-2.5 bg-[#C4622D] disabled:bg-[#E4D8CC] disabled:text-[#B0A090] disabled:cursor-not-allowed text-white font-semibold px-7 py-3.5 rounded-full text-sm transition-colors duration-200 hover:bg-[#9E4A1E] shadow-lg shadow-[#C4622D]/20 disabled:shadow-none"
        >
          {isDigital ? <Download size={14} /> : <ShoppingCart size={14} />}
          {selectedVariant
            ? isDigital
              ? `Download — $${selectedVariant.price.toFixed(2)}`
              : `Order — €${selectedVariant.price.toFixed(2)}`
            : "Select a format first"}
        </motion.button>
      </div>
    </div>
  );
}
