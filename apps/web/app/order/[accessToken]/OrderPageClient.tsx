"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useWizardStore } from "@/store/wizardStore";
import { trackPurchase } from "@/lib/fbpixel";
import { Download, Package, CheckCircle, Clock, Truck, Star, ArrowLeft, Copy, Check, ExternalLink } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface OrderItem {
  id: string;
  productName: string;
  productType: string;
  size: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  sessionId: string | null;
  hasPreview: boolean;
  hasFinalImage: boolean;
}

interface Order {
  orderNumber: string;
  createdAt: string;
  status: string;
  customerName: string | null;
  customerEmail: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  shippingAddress: Record<string, string> | null;
  hasDigital: boolean;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}

// ── Status timeline config ─────────────────────────────────────────────────────
const STATUSES = [
  { key: "Pending",              label: "Received",    icon: CheckCircle },
  { key: "Paid",                 label: "Confirmed",   icon: CheckCircle },
  { key: "GeneratingHighRes",    label: "Artwork",     icon: Clock },
  { key: "Ready",                label: "Ready",       icon: Star },
  { key: "SubmittedToPrinter",   label: "Production",  icon: Package },
  { key: "Shipped",              label: "Shipped",     icon: Truck },
] as const;

const STATUS_ORDER = STATUSES.map(s => s.key);

function getStatusIndex(status: string): number {
  const idx = STATUS_ORDER.indexOf(status as (typeof STATUS_ORDER)[number]);
  return idx === -1 ? 1 : idx;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PortraitThumb({
  item,
  apiBase,
  accessToken,
  isPaid,
}: {
  item: OrderItem;
  apiBase: string;
  accessToken: string;
  isPaid: boolean;
}) {
  if (!item.sessionId) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg,rgba(196,98,45,0.15) 0%,rgba(45,74,62,0.12) 100%)",
        }}
      >
        <span style={{ fontSize: 36, opacity: 0.3 }}>🎨</span>
      </div>
    );
  }

  // Show the clean final image for paid orders that have it ready
  if (isPaid && item.hasFinalImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`${apiBase}/api/orders/${accessToken}/download/${item.sessionId}`}
        alt="Your portrait"
        className="w-full h-full object-cover"
      />
    );
  }

  if (!item.hasPreview) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg,rgba(196,98,45,0.15) 0%,rgba(45,74,62,0.12) 100%)",
        }}
      >
        <span style={{ fontSize: 36, opacity: 0.3 }}>🎨</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${apiBase}/api/portraits/${item.sessionId}/preview`}
      alt="Your portrait"
      className="w-full h-full object-cover"
    />
  );
}

function StatusTimeline({ status }: { status: string }) {
  const currentIdx = getStatusIndex(status);
  // For digital orders, skip print-specific steps
  const steps = STATUSES.filter(
    (s) => !["SubmittedToPrinter", "Shipped"].includes(s.key) || currentIdx >= STATUS_ORDER.indexOf(s.key)
  ).slice(0, 5);

  return (
    <div className="flex items-center justify-between w-full gap-1">
      {steps.map((step, i) => {
        const stepIdx  = STATUS_ORDER.indexOf(step.key);
        const done     = currentIdx >= stepIdx;
        const active   = currentIdx === stepIdx;
        const Icon     = step.icon;
        const isLast   = i === steps.length - 1;

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            {/* Node */}
            <div className="flex flex-col items-center shrink-0">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  done
                    ? "bg-[#2D4A3E] text-white"
                    : "bg-[#F0EAE0] text-[#C8BAB0]"
                } ${active ? "ring-4 ring-[#2D4A3E]/20" : ""}`}
              >
                <Icon size={16} />
              </motion.div>
              <p
                className={`mt-1.5 text-[10px] font-semibold tracking-wide text-center leading-tight ${
                  done ? "text-[#2D4A3E]" : "text-[#C8BAB0]"
                }`}
              >
                {step.label}
              </p>
            </div>
            {/* Connector line */}
            {!isLast && (
              <div className="flex-1 h-px mx-1 mb-5" style={{ background: done ? "#2D4A3E" : "#E4D8CC" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function OrderPageClient({
  order: initialOrder,
  apiBase,
  accessToken,
}: {
  order: Order;
  apiBase: string;
  accessToken: string;
}) {
  const reset = useWizardStore((s) => s.reset);
  const [order, setOrder] = useState<Order>(initialOrder);

  // Clear the wizard + multi-portrait cart once the customer lands on the
  // success page so the next portrait starts fresh.
  useEffect(() => { reset(); }, [reset]);

  // Fire Purchase event once for paid orders
  useEffect(() => {
    const isPaid = ["Paid", "GeneratingHighRes", "Ready", "SubmittedToPrinter", "Shipped"].includes(initialOrder.status);
    if (!isPaid) return;
    trackPurchase({
      order_id: initialOrder.orderNumber,
      value: initialOrder.totalAmount,
      currency: initialOrder.currency,
      num_items: initialOrder.items.length,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll every 5 s while the order is paid but the high-res image isn't ready.
  // Stops automatically once any item has a final image.
  const isPaidForPoll = ["Paid", "GeneratingHighRes", "Ready", "SubmittedToPrinter", "Shipped"]
    .includes(order.status);
  const needsPolling = isPaidForPoll && !order.items.some(i => i.hasFinalImage);

  useEffect(() => {
    if (!needsPolling) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`${apiBase}/api/orders/${accessToken}`);
        if (res.ok) setOrder(await res.json());
      } catch { /* ignore network errors */ }
    }, 5000);
    return () => clearInterval(id);
  }, [needsPolling, apiBase, accessToken]);

  const date = new Date(order.createdAt);
  const formattedDate = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const [copied,          setCopied]          = useState(false);
  const [resumeLoading,   setResumeLoading]   = useState(false);
  const [resumeError,     setResumeError]     = useState<string | null>(null);
  const copyTracking = () => {
    if (!order.trackingNumber) return;
    navigator.clipboard.writeText(order.trackingNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isPending = order.status === "Pending";
  const isPaid    = ["Paid", "GeneratingHighRes", "Ready", "SubmittedToPrinter", "Shipped"].includes(order.status);
  const isShipped = order.status === "Shipped";

  const handleResumeCheckout = async () => {
    setResumeLoading(true);
    setResumeError(null);
    try {
      const res = await fetch(`${apiBase}/api/checkout/resume-order/${accessToken}`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).message ?? "Failed");
      const { checkoutUrl } = await res.json();
      window.location.href = checkoutUrl;
    } catch (e: unknown) {
      setResumeError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setResumeLoading(false);
    }
  };

  // Find the first item that has a final (watermark-free) image ready
  const downloadItem = order.items.find(i => i.hasFinalImage && i.sessionId);
  const downloadUrl  = downloadItem
    ? `${apiBase}/api/orders/${accessToken}/download/${downloadItem.sessionId}`
    : null;

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #F5F0EA 0%, #EDE4D8 100%)" }}
    >
      {/* ── Minimal header ──────────────────────────────────────────────────── */}
      <header className="w-full py-5 px-6 flex items-center justify-between border-b border-[#E4D8CC]/60">
        <Link href="/" className="font-display font-light text-xl tracking-[5px] text-[#1A1714] uppercase">
          Tolif
        </Link>
        <p className="text-xs text-[#8C7B6B] tracking-widest uppercase">Portrait Studio</p>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12 pb-20">

        {/* ── Pending: complete payment UI ─────────────────────────────────── */}
        {isPending && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Portrait preview */}
            {order.items[0]?.hasPreview && order.items[0]?.sessionId && (
              <div className="rounded-2xl overflow-hidden mb-8 shadow-lg"
                   style={{ maxHeight: 360, background: "#1A1714" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${apiBase}/api/portraits/${order.items[0].sessionId}/preview`}
                  alt="Your portrait"
                  className="w-full object-cover"
                  style={{ maxHeight: 360 }}
                />
              </div>
            )}

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-[#C4622D]/10 flex items-center justify-center mx-auto mb-5">
                <Clock size={28} className="text-[#C4622D]" />
              </div>
              <p className="text-xs font-semibold tracking-[4px] text-[#C4622D] uppercase mb-2">
                Payment not completed
              </p>
              <h1 className="font-display font-light text-3xl md:text-4xl text-[#1A1714] mb-3">
                Your portrait is ready &amp; waiting
              </h1>
              <p className="text-[#5A4E46] text-sm leading-relaxed max-w-md mx-auto">
                You created a beautiful portrait but didn&apos;t complete the payment.
                Your order is still saved — click below to complete your purchase.
              </p>
            </div>

            {/* Order summary */}
            <div className="bg-white rounded-2xl border border-[#E4D8CC] p-6 mb-6">
              <p className="text-[10px] font-bold tracking-[3px] uppercase text-[#A89080] mb-4">Your order</p>
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-[#F0E8DF] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#1A1714]">{item.productName}</p>
                    {item.size && <p className="text-xs text-[#A89080]">{item.size}</p>}
                  </div>
                  <p className="text-sm font-semibold text-[#1A1714]">
                    {item.currency} {(item.unitPrice * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 mt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-[#1A1714]">Total</p>
                <p className="text-xl font-bold text-[#C4622D]">{order.currency} {order.totalAmount.toFixed(2)}</p>
              </div>
            </div>

            {resumeError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-center">
                {resumeError}
              </p>
            )}

            <button
              onClick={handleResumeCheckout}
              disabled={resumeLoading}
              className="w-full py-4 rounded-2xl bg-[#C4622D] text-white text-base font-semibold hover:bg-[#9E4A1E] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {resumeLoading ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Preparing checkout…</>
              ) : (
                <>Complete my order →</>
              )}
            </button>

            <p className="text-center text-xs text-[#A89080] mt-4">
              Changed your mind?{" "}
              <Link href="/create" className="underline hover:text-[#1A1714] transition-colors">
                Start a new portrait instead
              </Link>
            </p>
          </motion.div>
        )}

        {/* ── Paid: hero confirmation ──────────────────────────────────────── */}
        {!isPending && (
        <>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10"
        >
          {/* Animated check */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
            className="w-20 h-20 rounded-full bg-[#2D4A3E] flex items-center justify-center mx-auto mb-6"
            style={{ boxShadow: "0 12px 40px rgba(45,74,62,0.3)" }}
          >
            <CheckCircle size={38} className="text-white" strokeWidth={1.5} />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xs font-semibold tracking-[4px] text-[#8C7B6B] uppercase mb-2"
          >
            Order Confirmed
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="font-display font-light text-4xl md:text-5xl text-[#1A1714] mb-2"
          >
            {order.orderNumber}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-sm text-[#8C7B6B]"
          >
            {formattedDate}
            {order.customerName && (
              <span className="text-[#1A1714] font-medium"> · {order.customerName}</span>
            )}
          </motion.p>
        </motion.div>

        {/* ── Status timeline ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="bg-white rounded-2xl border border-[#E4D8CC] p-6 mb-5"
          style={{ boxShadow: "0 2px 20px rgba(26,23,20,0.06)" }}
        >
          <p className="text-[10px] font-bold tracking-[3px] text-[#A89080] uppercase mb-5">
            Order Status
          </p>
          <StatusTimeline status={order.status} />
        </motion.div>

        {/* ── Tracking number (when shipped) ──────────────────────────────── */}
        {isShipped && order.trackingNumber && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="bg-[#2D4A3E] rounded-2xl p-5 mb-5 flex items-center gap-4"
            style={{ boxShadow: "0 4px 20px rgba(45,74,62,0.25)" }}
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Truck size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-0.5">Tracking number</p>
              <p className="font-mono text-white font-semibold text-sm truncate">{order.trackingNumber}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={copyTracking}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                title="Copy tracking number"
              >
                {copied ? <Check size={14} className="text-white" /> : <Copy size={14} className="text-white" />}
              </button>
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-white text-[#2D4A3E] hover:bg-white/90 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Track shipment <ExternalLink size={11} />
                </a>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Portrait + order items ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="bg-white rounded-2xl border border-[#E4D8CC] overflow-hidden mb-5"
          style={{ boxShadow: "0 2px 20px rgba(26,23,20,0.06)" }}
        >
          {/* Portrait preview strip */}
          {(order.items[0]?.hasPreview || order.items[0]?.hasFinalImage) && (
            <div
              className="relative w-full overflow-hidden"
              style={{ height: 220, background: "#1A1714" }}
            >
              <PortraitThumb
                item={order.items[0]}
                apiBase={apiBase}
                accessToken={accessToken}
                isPaid={isPaid}
              />
              {/* Show watermark notice only when showing the watermarked preview */}
              {!(isPaid && order.items[0]?.hasFinalImage) && (
                <div
                  className="absolute inset-0 flex items-end p-4"
                  style={{
                    background:
                      "linear-gradient(to top,rgba(26,23,20,0.7) 0%,transparent 55%)",
                  }}
                >
                  <p className="text-white/70 text-xs">
                    Watermarked preview · Full resolution available after download
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Items list */}
          <div className="p-5">
            <p className="text-[10px] font-bold tracking-[3px] text-[#A89080] uppercase mb-4">
              Your Order
            </p>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-2 border-b border-[#F0E8DF] last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1A1714]">{item.productName}</p>
                    {item.size && (
                      <p className="text-xs text-[#8C7B6B] mt-0.5">{item.size}</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#1A1714] shrink-0">
                    {item.unitPrice === 0
                      ? <span className="text-[#2D7A4A]">Free</span>
                      : `${item.currency} ${(item.unitPrice * item.quantity).toFixed(2)}`}
                  </p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-[#1A1714]">
              <p className="text-xs font-bold tracking-[2px] text-[#1A1714] uppercase">Total</p>
              <p className="font-display font-semibold text-3xl text-[#C4622D]">
                {order.currency} {order.totalAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── What happens next ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="bg-white rounded-2xl border border-[#E4D8CC] p-5 mb-5"
          style={{ boxShadow: "0 2px 20px rgba(26,23,20,0.06)" }}
        >
          <p className="text-[10px] font-bold tracking-[3px] text-[#A89080] uppercase mb-4">
            What Happens Next
          </p>
          <div className="space-y-4">
            {isPaid && downloadUrl && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#C4622D]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Download size={14} className="text-[#C4622D]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1714]">Digital file — available now</p>
                  <p className="text-xs text-[#8C7B6B] mt-0.5 leading-relaxed">
                    Download your high-resolution portrait (without watermark) using the button below.
                    Your secure link stays active for 30 days.
                  </p>
                </div>
              </div>
            )}
            {isPaid && !downloadUrl && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#C4622D]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock size={14} className="text-[#C4622D]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1714]">Preparing your digital file</p>
                  <p className="text-xs text-[#8C7B6B] mt-0.5 leading-relaxed">
                    Your high-resolution portrait is being generated. The download button will appear in about 30 seconds — the page updates automatically.
                  </p>
                </div>
              </div>
            )}
            {!isPaid && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#C4622D]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock size={14} className="text-[#C4622D]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1714]">Awaiting payment</p>
                  <p className="text-xs text-[#8C7B6B] mt-0.5 leading-relaxed">
                    Your digital file will be available here once payment is confirmed.
                  </p>
                </div>
              </div>
            )}
            {!isShipped && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#2D4A3E]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Package size={14} className="text-[#2D4A3E]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1714]">
                    {isPaid ? "Your print is being prepared" : "Print production"}
                  </p>
                  <p className="text-xs text-[#8C7B6B] mt-0.5 leading-relaxed">
                    Your portrait will be carefully printed on premium archival materials.
                    Production takes 2–5 business days, followed by tracked delivery.
                    You&apos;ll receive your tracking number by email once it ships.
                  </p>
                </div>
              </div>
            )}
            {isShipped && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#2D4A3E]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Truck size={14} className="text-[#2D4A3E]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1714]">On its way to you</p>
                  <p className="text-xs text-[#8C7B6B] mt-0.5 leading-relaxed">
                    Your print is on its way. Check your email for the tracking number.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── CTA buttons ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="space-y-3"
        >
          {isPaid && downloadUrl && (
            <a
              href={downloadUrl}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-full
                         bg-[#C4622D] hover:bg-[#9E4A1E] text-white font-semibold text-sm
                         transition-all duration-200 hover:shadow-lg hover:shadow-[#C4622D]/25
                         hover:-translate-y-0.5"
            >
              <Download size={15} />
              Download Your Portrait
            </a>
          )}
          {isPaid && !downloadUrl && (
            <div className="w-full flex items-center justify-center gap-2 py-4 rounded-full
                            bg-[#F5F0EA] text-[#8C7B6B] text-sm border border-[#E4D8CC]">
              <Clock size={15} />
              Preparing your portrait… this takes about 30 seconds
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <a
              href={`mailto:hello@tolif.com?subject=Order ${order.orderNumber}`}
              className="flex items-center justify-center gap-2 py-3 rounded-full
                         border border-[#E4D8CC] text-[#8C7B6B] hover:text-[#1A1714]
                         hover:border-[#C4622D]/50 text-sm font-medium transition-all duration-200"
            >
              Need help?
            </a>
            <Link
              href="/create"
              className="flex items-center justify-center gap-2 py-3 rounded-full
                         border border-[#E4D8CC] text-[#8C7B6B] hover:text-[#1A1714]
                         hover:border-[#C4622D]/50 text-sm font-medium transition-all duration-200"
            >
              <ArrowLeft size={13} />
              New portrait
            </Link>
          </div>
        </motion.div>

        {/* ── Confirmation note ─────────────────────────────────────────────── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.95 }}
          className="text-center text-xs text-[#A89080] mt-8 leading-relaxed"
        >
          A confirmation email has been sent to <strong className="text-[#8C7B6B]">{order.customerEmail}</strong>
          <br />
          Order reference: <span className="font-mono text-[#8C7B6B]">{order.orderNumber}</span>
        </motion.p>
        </>
        )}

      </main>
    </div>
  );
}
