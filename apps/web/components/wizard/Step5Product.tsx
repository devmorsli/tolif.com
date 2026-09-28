"use client";

import { motion } from "framer-motion";
import { useWizardStore, type ProductVariant } from "@/store/wizardStore";
import { Download, Frame, ImageIcon, ChevronLeft, ShoppingCart, Check } from "lucide-react";

const PRODUCTS: ProductVariant[] = [
  { id: "digital", productName: "Digital Download", size: "High-Res PNG", price: 19.99, currency: "EUR", type: "digital" },
  { id: "poster-30", productName: "Poster Print", size: "30 × 40 cm", price: 34.99, currency: "EUR", type: "poster" },
  { id: "poster-50", productName: "Poster Print", size: "50 × 70 cm", price: 44.99, currency: "EUR", type: "poster" },
  { id: "framed-30", productName: "Framed Print", size: "30 × 40 cm", price: 59.99, currency: "EUR", type: "framed" },
  { id: "framed-50", productName: "Framed Print", size: "50 × 70 cm", price: 79.99, currency: "EUR", type: "framed" },
  { id: "canvas-30", productName: "Canvas", size: "30 × 40 cm", price: 64.99, currency: "EUR", type: "canvas" },
  { id: "canvas-50", productName: "Canvas", size: "50 × 70 cm", price: 89.99, currency: "EUR", type: "canvas" },
];

const icons: Record<string, React.ElementType> = {
  digital: Download,
  poster: ImageIcon,
  framed: Frame,
  canvas: ImageIcon,
};

const descriptions: Record<string, string> = {
  digital: "Instant download. Full-resolution PNG ready to print anywhere.",
  poster: "Professionally printed on premium 200gsm matte paper.",
  framed: "Ready-to-hang framed print with white matte and black frame.",
  canvas: "Gallery-wrapped canvas, museum-quality UV-resistant inks.",
};

export function Step5Product() {
  const { selectedVariant, selectVariant, back } = useWizardStore();

  const handleCheckout = () => {
    if (!selectedVariant) return;
    // Phase 5: wire to Stripe Checkout API
    alert(`Checkout coming in Phase 5! Selected: ${selectedVariant.productName} ${selectedVariant.size}`);
  };

  return (
    <div>
      <div className="text-center mb-10">
        <h2 className="text-4xl font-display font-light text-[#1A1714]">
          Choose your <em className="not-italic font-medium text-[#C4622D]">product</em>
        </h2>
        <p className="mt-3 text-[#8C7B6B] text-sm max-w-md mx-auto">
          All products include the full high-resolution portrait without the watermark.
        </p>
      </div>

      {/* Product grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {PRODUCTS.map((product, i) => {
          const Icon = icons[product.type];
          const selected = selectedVariant?.id === product.id;
          return (
            <motion.button
              key={product.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => selectVariant(product)}
              className={`relative text-left rounded-2xl border-2 p-5 transition-all duration-200 ${
                selected
                  ? "border-[#C4622D] bg-[#FFF5F0] shadow-md shadow-[#C4622D]/10"
                  : "border-[#E4D8CC] bg-white hover:border-[#C4622D]/40 hover:shadow-sm"
              }`}
            >
              {selected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#C4622D] flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}

              <div className="w-10 h-10 rounded-xl bg-[#F2EAE0] flex items-center justify-center mb-4">
                <Icon size={18} className="text-[#C4622D]" />
              </div>

              <p className="font-semibold text-[#1A1714] text-sm">{product.productName}</p>
              <p className="text-xs text-[#8C7B6B] mt-0.5 mb-3">{product.size}</p>
              <p className="text-xs text-[#8C7B6B] leading-relaxed mb-4">
                {descriptions[product.type]}
              </p>

              <p className="text-xl font-display font-semibold text-[#C4622D]">
                €{product.price.toFixed(2)}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Delivery note */}
      {selectedVariant && selectedVariant.type !== "digital" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-[#F2EAE0] rounded-2xl p-4 mb-6 text-sm text-[#8C7B6B]"
        >
          📦 Physical products ship in 5–7 business days. Free shipping on orders over €60.
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={back}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#8C7B6B] hover:text-[#1A1714] transition-colors"
        >
          <ChevronLeft size={16} /> Back to preview
        </button>

        <button
          onClick={handleCheckout}
          disabled={!selectedVariant}
          className="inline-flex items-center gap-2.5 bg-[#C4622D] disabled:bg-[#E4D8CC] disabled:text-[#8C7B6B] disabled:cursor-not-allowed text-white font-semibold px-8 py-4 rounded-full transition-all duration-200 hover:bg-[#9E4A1E] hover:shadow-lg hover:shadow-[#C4622D]/25 hover:-translate-y-0.5"
        >
          <ShoppingCart size={16} />
          {selectedVariant
            ? `Checkout — €${selectedVariant.price.toFixed(2)}`
            : "Select a product first"}
        </button>
      </div>
    </div>
  );
}
