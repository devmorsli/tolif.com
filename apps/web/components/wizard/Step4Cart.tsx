"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Lock,
  Truck,
  Zap,
  Check,
  ShoppingBag,
  ImageIcon,
  ChevronRight,
  Download,
  Mail,
  Trash2,
  Clock,
  AlertCircle,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useWizardStore, type CartItem } from "@/store/wizardStore";
import { getShippingOptions, type ShippingOption } from "@/lib/public-api";

function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
}

// ── Portrait thumbnail ─────────────────────────────────────────────────────────
function PortraitThumb({ url, frameColor }: { url: string | null; frameColor: string }) {
  const frameBorder: Record<string, string> = {
    black:    "#1C1C1C",
    "red-oak": "#8B4513",
    white:    "#F0EEE9",
  };
  const border = frameBorder[frameColor];

  return (
    <div
      className="shrink-0 overflow-hidden rounded-lg"
      style={{
        width: 80,
        height: 107,
        border:   border ? `6px solid ${border}` : undefined,
        outline:  border ? "1px solid rgba(0,0,0,0.08)" : undefined,
        background: "#E4D8CC",
        boxShadow: "0 4px 16px rgba(0,0,0,0.16)",
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Your portrait" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon size={22} className="text-[#C4622D]/40" />
        </div>
      )}
    </div>
  );
}

// ── Shipping option card ───────────────────────────────────────────────────────
function ShippingCard({
  option,
  selected,
  onSelect,
}: {
  option: ShippingOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const isExpress = option.id === "express";
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 ${
        selected
          ? "border-[#C4622D] bg-[#FFF5F0]"
          : "border-[#E4D8CC] bg-white hover:border-[#C4622D]/40 hover:bg-[#FFF9F6]"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Radio */}
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
            selected ? "border-[#C4622D] bg-[#C4622D]" : "border-[#D0C4B8]"
          }`}
        >
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>

        {/* Icon */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isExpress ? "bg-[#C4622D]/10" : "bg-[#F0EAE0]"
          }`}
        >
          {isExpress
            ? <Zap size={16} className="text-[#C4622D]" />
            : <Truck size={16} className="text-[#8C7B6B]" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#1A1714] text-sm">{option.label}</span>
            {option.badge && (
              <span className="text-[9px] font-bold bg-[#C4622D] text-white px-2 py-0.5 rounded-full tracking-wider uppercase">
                {option.badge}
              </span>
            )}
          </div>
          <p className="text-xs text-[#8C7B6B] mt-0.5 leading-relaxed">{option.description}</p>
        </div>

        {/* Price */}
        <div className="text-right shrink-0 ml-2">
          {option.price === 0
            ? <span className="text-sm font-bold text-[#2D4A3E]">Free</span>
            : <span className="text-sm font-bold text-[#1A1714]">${option.price}</span>}
        </div>
      </div>
    </button>
  );
}

// ── Digital delivery info card ─────────────────────────────────────────────────
function DigitalDeliveryCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#E4D8CC] p-5">
      <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#8C7B6B] mb-4">
        Delivery
      </p>
      <div className="bg-[#F5F0E8] rounded-xl p-4 space-y-3">
        {[
          {
            icon: Download,
            title: "Instant digital download",
            sub: "High-resolution PNG & PDF delivered immediately after payment",
          },
          {
            icon: Mail,
            title: "Email confirmation",
            sub: "Your download link is also sent to your email for safekeeping",
          },
          {
            icon: Clock,
            title: "Ready within minutes",
            sub: "No waiting — your portrait is generated and ready right away",
          },
        ].map(({ icon: Icon, title, sub }) => (
          <div key={title} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#C4622D]/10 flex items-center justify-center shrink-0 mt-0.5">
              <Icon size={14} className="text-[#C4622D]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1A1714] leading-tight">{title}</p>
              <p className="text-xs text-[#8C7B6B] mt-0.5 leading-relaxed">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Line item row ──────────────────────────────────────────────────────────────
function LineItem({
  label,
  value,
  green,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#8C7B6B]">{label}</span>
      <span className={`font-medium ${green ? "text-[#2D4A3E] font-semibold" : "text-[#1A1714]"}`}>
        {value}
      </span>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function Step4Cart() {
  const router = useRouter();
  const {
    previewUrl,
    sessionId,
    selectedVariant,
    selectedShipping,
    cartItems,
    setShipping,
    addCartItem,
    removeCartItem,
    clearCart,
    goTo,
    back,
  } = useWizardStore();

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(true);
  const [email, setEmail] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // true only if EVERY item in the whole order is digital
  const allItems = [
    ...cartItems,
    ...(selectedVariant && sessionId ? [{ id: "__current__", sessionId, previewUrl, variant: selectedVariant } as CartItem] : []),
  ];
  const isDigital = allItems.length > 0 && allItems.every((i) => i.variant.type === "digital");

  // Only fetch shipping when it's actually needed
  useEffect(() => {
    if (isDigital) { setLoadingShipping(false); return; }
    getShippingOptions().then((opts) => {
      setShippingOptions(opts);
      if (!selectedShipping && opts.length > 0) setShipping(opts[0]);
      setLoadingShipping(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDigital]);

  // ── Empty cart ───────────────────────────────────────────────────────────────
  if (allItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24">
        <div className="w-16 h-16 rounded-full bg-[#F0EAE0] flex items-center justify-center mx-auto mb-4">
          <ShoppingBag size={24} className="text-[#C4622D]/60" />
        </div>
        <p className="text-[#1A1714] font-semibold mb-1">Your cart is empty</p>
        <p className="text-[#8C7B6B] text-sm mb-6">Go back and personalise your portrait first.</p>
        <button
          onClick={() => goTo(3)}
          className="text-[#C4622D] text-sm font-medium hover:underline"
        >
          ← Back to personalise
        </button>
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  const shippingCost = isDigital ? 0 : (selectedShipping?.price ?? 0);
  const productTotal = allItems.reduce((sum, i) => sum + i.variant.price, 0);
  const orderTotal   = productTotal + shippingCost;

  const frameLabelFor = (item: CartItem) => {
    if (item.variant.type === "digital") return "Digital file";
    if (item.variant.type === "canvas")  return "Canvas print";
    const f = item.variant.frame ?? "";
    if (f === "black")   return "Black frame";
    if (f === "red-oak") return "Red oak frame";
    if (f === "white")   return "White frame";
    return "No frame";
  };

  // Remove the current (non-saved) item — go back to step 3 to re-customise
  const handleRemoveCurrent = () => {
    clearCart();
    goTo(3);
  };

  // Save current item to the persistent cart and start a fresh wizard flow
  const handleAddAnother = () => {
    if (selectedVariant && sessionId) {
      addCartItem({
        id: `${sessionId}-${selectedVariant.id}`,
        sessionId,
        previewUrl,
        variant: selectedVariant,
      });
      clearCart();
    }
    router.push("/portraits");
  };

  const handleCheckout = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCheckoutError("Please enter a valid email address.");
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const checkoutItems = allItems.map((i) => ({
        sessionId: i.sessionId,
        variantId: i.variant.id,
        quantity: 1,
      }));

      const res = await fetch(`${getApiBase()}/api/checkout/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: checkoutItems,
          customerEmail: email,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? `Server error ${res.status}`);
      }

      const { checkoutUrl } = (await res.json()) as { checkoutUrl: string };
      window.location.href = checkoutUrl;
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-4xl font-display font-light text-[#1A1714]">
          Your <em className="not-italic font-semibold text-[#C4622D]">order</em>
        </h2>
        <p className="mt-2 text-[#8C7B6B] text-sm">
          Review everything before you pay — no surprises.
        </p>
      </div>

      <div className="flex flex-col gap-5">

        {/* ── Order items ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#E4D8CC] p-5">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#8C7B6B] mb-4">
            Order {allItems.length > 1 ? `items (${allItems.length})` : "item"}
          </p>
          <div className="flex flex-col gap-5">
            {allItems.map((item, idx) => {
              const isCurrent = item.id === "__current__";
              const label = frameLabelFor(item);
              const itemIsPhysical = item.variant.type !== "digital";
              return (
                <div key={item.id} className={`flex items-center gap-4 ${idx > 0 ? "pt-5 border-t border-[#F0E8DC]" : ""}`}>
                  <PortraitThumb
                    url={item.previewUrl}
                    frameColor={item.variant.frame ?? item.variant.type}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1A1714] leading-snug">{item.variant.productName}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="text-[10px] bg-[#F0EAE0] text-[#8C7B6B] px-2 py-0.5 rounded-full font-medium">
                        {item.variant.size}
                      </span>
                      <span className="text-[10px] bg-[#F0EAE0] text-[#8C7B6B] px-2 py-0.5 rounded-full font-medium">
                        {label}
                      </span>
                      {itemIsPhysical && (
                        <span className="text-[10px] bg-[#EAF2EE] text-[#2D4A3E] px-2 py-0.5 rounded-full font-medium">
                          + Digital file included
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-lg font-display font-semibold text-[#1A1714]">
                      ${item.variant.price}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {isCurrent && (
                      <button
                        onClick={back}
                        className="flex items-center gap-1 text-xs text-[#8C7B6B] hover:text-[#C4622D] transition-colors"
                      >
                        Edit <ChevronRight size={11} />
                      </button>
                    )}
                    <button
                      onClick={isCurrent ? handleRemoveCurrent : () => removeCartItem(item.id)}
                      className="flex items-center gap-1 text-xs text-[#8C7B6B] hover:text-red-500 transition-colors"
                      title="Remove from cart"
                    >
                      <Trash2 size={11} />
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Add another portrait ──────────────────────────────────────────── */}
        <button
          onClick={handleAddAnother}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#E4D8CC] hover:border-[#C4622D]/50 bg-white hover:bg-[#FFF9F6] py-4 text-sm font-medium text-[#8C7B6B] hover:text-[#C4622D] transition-all duration-200"
        >
          <Plus size={15} />
          Add another portrait
        </button>

        {/* ── Shipping OR Digital delivery ─────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {isDigital ? (
            <motion.div
              key="digital-delivery"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <DigitalDeliveryCard />
            </motion.div>
          ) : (
            <motion.div
              key="shipping"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-2xl border border-[#E4D8CC] p-5"
            >
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#8C7B6B] mb-4">
                Shipping
              </p>
              {loadingShipping ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {shippingOptions.map((opt) => (
                    <ShippingCard
                      key={opt.id}
                      option={opt}
                      selected={selectedShipping?.id === opt.id}
                      onSelect={() => setShipping(opt)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Order summary ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#E4D8CC] p-5 space-y-3">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#8C7B6B]">
            Order summary
          </p>

          <div className="space-y-2.5">
            {allItems.map((item) => (
              <LineItem
                key={item.id}
                label={item.variant.productName}
                value={`$${item.variant.price}`}
              />
            ))}
            {allItems.some((i) => i.variant.type !== "digital") && (
              <LineItem label="Digital files (high-res)" value="Free" green />
            )}
            {!isDigital && (
              <LineItem
                label={selectedShipping?.label ?? "Shipping"}
                value={shippingCost === 0 ? "Free" : `$${shippingCost}`}
                green={shippingCost === 0}
              />
            )}
          </div>

          <div className="pt-2 border-t border-[#E4D8CC] flex items-center justify-between">
            <span className="font-semibold text-[#1A1714]">Total</span>
            <motion.span
              key={orderTotal}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="font-display font-semibold text-3xl text-[#1A1714]"
            >
              ${orderTotal}
            </motion.span>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
            {[
              { icon: Lock,        text: "Secure checkout" },
              { icon: Check,       text: "All sales final" },
              { icon: ShoppingBag, text: "No refunds" },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-1 text-[10px] text-[#8C7B6B]">
                <Icon size={10} /> {text}
              </span>
            ))}
          </div>
        </div>

        {/* ── Email + CTA ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#E4D8CC] p-5 space-y-4">
          <div>
            <label className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#8C7B6B] block mb-2">
              Email for receipt & {isDigital ? "download link" : "order updates"}
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setCheckoutError(null); }}
              className="w-full rounded-xl border border-[#E4D8CC] bg-[#FAF6F0] px-4 py-3 text-sm text-[#1A1714] placeholder:text-[#C0B5A8] focus:outline-none focus:border-[#C4622D] focus:ring-2 focus:ring-[#C4622D]/15 transition-all"
            />
          </div>

          {checkoutError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
            >
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-600">{checkoutError}</p>
            </motion.div>
          )}

          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="w-full flex items-center justify-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-full text-sm transition-all duration-200 hover:shadow-lg hover:shadow-[#C4622D]/25 hover:-translate-y-0.5"
          >
            {checkoutLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Redirecting to Stripe…
              </>
            ) : (
              <>
                <Lock size={14} />
                Proceed to checkout — ${orderTotal}
              </>
            )}
          </button>

          {/* Policy notice */}
          <p className="text-[10px] text-center text-[#B0A090] leading-relaxed">
            By completing this purchase you agree to our{" "}
            <Link href="/refunds" target="_blank" className="underline hover:text-[#C4622D] transition-colors">
              No-Refund Policy
            </Link>
            . All sales are final. A free preview was provided before checkout.
          </p>
        </div>

        {/* ── Back ──────────────────────────────────────────────────────────── */}
        {selectedVariant && (
          <button
            onClick={back}
            className="flex items-center justify-center gap-1.5 text-sm text-[#8C7B6B] hover:text-[#1A1714] transition-colors mx-auto pb-2"
          >
            <ArrowLeft size={13} />
            Edit personalisation
          </button>
        )}
      </div>
    </div>
  );
}
