"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  Search, ArrowRight, Package, Clock, CheckCircle,
  Truck, Loader2, AlertCircle, Mail, Hash,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

const STATUS_STEPS = [
  { icon: CheckCircle, label: "Order received",       description: "We've confirmed your order and it's in the queue." },
  { icon: CheckCircle, label: "Payment confirmed",    description: "Your payment was processed successfully." },
  { icon: Clock,       label: "Creating your artwork", description: "Our artists are working on your portrait — this takes 1–3 minutes." },
  { icon: CheckCircle, label: "Artwork ready",         description: "Your portrait is complete and approved." },
  { icon: Package,     label: "In production",         description: "Your print is being produced on premium materials." },
  { icon: Truck,       label: "Shipped",               description: "Your order is on its way. Check your email for tracking info." },
];

export default function TrackPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const [email,       setEmail]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/orders/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "No order found. Please check your order number and email address.");
        return;
      }

      const { accessToken } = await res.json();
      router.push(`/order/${accessToken}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FAF6F0] pt-24 pb-24">
        <div className="max-w-xl mx-auto px-5">

          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="text-center mb-10"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#C4622D]/10 flex items-center justify-center mx-auto mb-5">
              <Package size={28} className="text-[#C4622D]" />
            </div>
            <h1 className="font-display font-light text-4xl text-[#1A1714] mb-2">
              Track your order
            </h1>
            <p className="text-[#8C7B6B] text-sm leading-relaxed">
              Enter your order number and email address to see the latest status of your portrait.
            </p>
          </motion.div>

          {/* Lookup form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="bg-white rounded-2xl border border-[#E4D8CC] p-6 mb-6"
            style={{ boxShadow: "0 4px 24px rgba(26,23,20,0.07)" }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Order number */}
              <div>
                <label className="text-xs font-semibold text-[#8C7B6B] uppercase tracking-wider block mb-1.5">
                  Order number
                </label>
                <div className="relative">
                  <Hash size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0A090] pointer-events-none" />
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="e.g. TOL-001"
                    autoFocus
                    className="w-full pl-9 pr-4 py-3 border border-[#E4D8CC] rounded-xl text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
                  />
                </div>
                <p className="text-[11px] text-[#A89080] mt-1.5 flex items-center gap-1">
                  Found in your confirmation email with subject &quot;Order Confirmed&quot;
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-[#8C7B6B] uppercase tracking-wider block mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0A090] pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="The email you used at checkout"
                    className="w-full pl-9 pr-4 py-3 border border-[#E4D8CC] rounded-xl text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
                  />
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
                  >
                    <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading || !orderNumber.trim() || !email.trim()}
                className="w-full flex items-center justify-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
              >
                {loading ? (
                  <><Loader2 size={15} className="animate-spin" /> Looking up your order…</>
                ) : (
                  <><Search size={15} /> Track my order</>
                )}
              </button>
            </form>
          </motion.div>

          {/* How it works */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-2xl border border-[#E4D8CC] p-5 mb-6"
          >
            <p className="text-[10px] font-bold tracking-[3px] text-[#A89080] uppercase mb-4">
              Order journey
            </p>
            <div className="space-y-0">
              {STATUS_STEPS.map((step, i) => {
                const Icon = step.icon;
                const isLast = i === STATUS_STEPS.length - 1;
                return (
                  <div key={step.label} className="flex gap-3">
                    {/* Vertical line + icon */}
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-[#F5F0E8] flex items-center justify-center shrink-0">
                        <Icon size={14} className="text-[#C4622D]" />
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-[#E4D8CC] my-1" />}
                    </div>
                    {/* Text */}
                    <div className={`pb-4 ${isLast ? "pb-0" : ""}`}>
                      <p className="text-sm font-semibold text-[#1A1714] leading-tight">{step.label}</p>
                      <p className="text-[11px] text-[#8C7B6B] mt-0.5 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Help note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-xs text-[#A89080] leading-relaxed"
          >
            Can&apos;t find your order?{" "}
            <a
              href="mailto:hello@tolif.com"
              className="text-[#C4622D] hover:underline font-medium"
            >
              Contact support
            </a>
            {" "}and we&apos;ll help you locate it.
            <br className="mb-2" />
            <Link href="/" className="text-[#B0A090] hover:text-[#8C7B6B] transition-colors mt-3 inline-block">
              ← Back to home
            </Link>
          </motion.p>

        </div>
      </main>
      <Footer />
    </>
  );
}
