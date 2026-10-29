"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Download, Loader2 } from "lucide-react";

interface PublicTier {
  id: string;
  tierName: string;
  displayName: string;
  price: number;
  currency: string;
  featuresJson: string;
  fileCount: number;
}

interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  tiers: PublicTier[];
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-EU", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function TierCard({
  tier,
  isPopular,
}: {
  tier: PublicTier;
  isPopular: boolean;
}) {
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const features: string[] = (() => {
    try { return JSON.parse(tier.featuresJson); } catch { return []; }
  })();

  const handleBuy = async () => {
    if (!showEmail) {
      setShowEmail(true);
      return;
    }
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${base}/api/digital-checkout/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: tier.id, customerEmail: email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Checkout failed.");
      window.location.href = data.checkoutUrl;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className={`relative flex flex-col rounded-2xl border overflow-hidden ${
        isPopular
          ? "border-[#C4622D] shadow-xl shadow-[#C4622D]/10"
          : "border-[#E4D8CC]"
      } bg-white`}
    >
      {isPopular && (
        <div className="bg-[#C4622D] text-white text-xs font-semibold tracking-wider uppercase text-center py-2 px-4">
          Most Popular
        </div>
      )}

      <div className="p-7 flex-1 flex flex-col">
        {/* Tier name */}
        <div className="mb-6">
          <p className="text-xs font-medium tracking-widest uppercase text-[#8C7B6B] mb-1">
            {tier.tierName}
          </p>
          <h3 className="text-2xl font-display font-semibold text-[#1A1714]">
            {tier.displayName}
          </h3>
        </div>

        {/* Price */}
        <div className="mb-6">
          <span className="text-5xl font-display font-light text-[#1A1714]">
            {formatPrice(tier.price, tier.currency)}
          </span>
          <p className="text-xs text-[#8C7B6B] mt-1">One-time payment · No subscription</p>
        </div>

        {/* Files badge */}
        <div className="flex items-center gap-2 mb-6 bg-[#FAF6F0] rounded-xl px-4 py-2.5 border border-[#E4D8CC]">
          <Download size={14} className="text-[#C4622D]" />
          <span className="text-sm font-medium text-[#1A1714]">
            {tier.fileCount} {tier.fileCount === 1 ? "file" : "files"} included
          </span>
        </div>

        {/* Features */}
        {features.length > 0 && (
          <ul className="space-y-3 mb-8 flex-1">
            {features.map((feat, i) => (
              <li key={i} className="flex items-start gap-3">
                <Check size={15} className="text-[#C4622D] shrink-0 mt-0.5" />
                <span className="text-sm text-[#8C7B6B] leading-snug">{feat}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Email input (shown after clicking buy) */}
        {showEmail && (
          <div className="mb-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              onKeyDown={(e) => e.key === "Enter" && handleBuy()}
              className="w-full bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl px-4 py-2.5 text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
              autoFocus
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleBuy}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 font-medium text-sm px-6 py-3.5 rounded-xl transition-all ${
            isPopular
              ? "bg-[#C4622D] hover:bg-[#9E4A1E] text-white"
              : "bg-[#F2EAE0] hover:bg-[#E4D8CC] text-[#1A1714]"
          } disabled:opacity-60`}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : showEmail ? (
            "Proceed to Checkout →"
          ) : (
            `Get ${tier.displayName}`
          )}
        </button>
      </div>
    </motion.div>
  );
}

export function DigitalPricingSection() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "";
    fetch(`${base}/api/digital-products`)
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const product = products[0];

  return (
    <section id="pricing" className="py-24 bg-[#FAF6F0]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-medium tracking-widest uppercase text-[#C4622D] mb-4">Pricing</p>
          <h2 className="text-4xl lg:text-5xl font-display font-light text-[#1A1714]">
            {product ? `Simple pricing for ${product.name}` : "Simple, transparent pricing"}
          </h2>
          <p className="text-[#8C7B6B] mt-4 max-w-lg mx-auto">
            Pay once, download instantly. No subscriptions, no recurring fees.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && !product && (
          <div className="text-center py-16 text-[#8C7B6B]">
            Products coming soon.
          </div>
        )}

        {!loading && product && (
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {product.tiers.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                isPopular={tier.tierName === "pro"}
              />
            ))}
          </div>
        )}

        <p className="text-center text-xs text-[#8C7B6B] mt-10">
          Secure payment via Stripe · 14-day money-back guarantee · Instant download
        </p>
      </div>
    </section>
  );
}
