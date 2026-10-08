"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Download, Package, CheckCircle, Clock, Truck, Star, ArrowLeft } from "lucide-react";

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
}

// ── Status timeline config ─────────────────────────────────────────────────────
const STATUSES = [
  { key: "Pending",              label: "Confirmed",  icon: CheckCircle },
  { key: "Paid",                 label: "Paid",        icon: CheckCircle },
  { key: "GeneratingHighRes",    label: "Processing",  icon: Clock },
  { key: "Ready",                label: "Ready",       icon: Star },
  { key: "SubmittedToPrinter",   label: "Printing",    icon: Package },
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
}: {
  item: OrderItem;
  apiBase: string;
}) {
  if (!item.hasPreview || !item.sessionId) {
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
  order,
  apiBase,
  accessToken,
}: {
  order: Order;
  apiBase: string;
  accessToken: string;
}) {
  const date = new Date(order.createdAt);
  const formattedDate = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const isPaid   = ["Paid", "GeneratingHighRes", "Ready", "SubmittedToPrinter", "Shipped"].includes(order.status);
  const isShipped = order.status === "Shipped";
  const downloadUrl = `/order/${accessToken}`;

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

        {/* ── Hero confirmation ────────────────────────────────────────────── */}
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

        {/* ── Portrait + order items ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="bg-white rounded-2xl border border-[#E4D8CC] overflow-hidden mb-5"
          style={{ boxShadow: "0 2px 20px rgba(26,23,20,0.06)" }}
        >
          {/* Portrait preview strip */}
          {order.items[0]?.hasPreview && (
            <div
              className="relative w-full overflow-hidden"
              style={{ height: 220, background: "#1A1714" }}
            >
              <PortraitThumb item={order.items[0]} apiBase={apiBase} />
              {/* Watermark notice overlay */}
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
            {order.hasDigital && (
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
                    Your portrait will be printed on premium materials and shipped within
                    5–7 business days. You'll receive a tracking number by email.
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
          {order.hasDigital && (
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

      </main>
    </div>
  );
}
