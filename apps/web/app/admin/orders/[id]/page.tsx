"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft, Mail, Package, MapPin, CreditCard, RefreshCw,
  CheckCircle, AlertCircle, Clock, XCircle, Loader2, Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getOrder, resendOrderEmail, storagePreviewUrl, type OrderDetail, type OrderDetailItem } from "@/lib/admin-api";

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  Pending:    { color: "bg-amber-50 text-amber-700 border-amber-200",   icon: <Clock size={13} />,        label: "Pending" },
  Paid:       { color: "bg-blue-50 text-blue-700 border-blue-200",      icon: <CreditCard size={13} />,   label: "Paid" },
  Processing: { color: "bg-violet-50 text-violet-700 border-violet-200",icon: <RefreshCw size={13} />,    label: "Processing" },
  Completed:  { color: "bg-green-50 text-green-700 border-green-200",   icon: <CheckCircle size={13} />,  label: "Completed" },
  Cancelled:  { color: "bg-red-50 text-red-700 border-red-200",         icon: <XCircle size={13} />,      label: "Cancelled" },
  Refunded:   { color: "bg-gray-50 text-gray-600 border-gray-200",      icon: <AlertCircle size={13} />,  label: "Refunded" },
};

const PRODUCT_TYPE_LABEL: Record<string, string> = {
  Digital:    "Digital Download",
  Poster:     "Poster Print",
  FramedPrint:"Framed Print",
  Canvas:     "Canvas Print",
};

// ── Portrait thumbnail ────────────────────────────────────────────────────────

function PortraitThumb({ previewKey, alt }: { previewKey?: string; alt: string }) {
  if (!previewKey) {
    return (
      <div className="w-16 h-[85px] rounded-lg bg-[#F2EAE0] flex items-center justify-center flex-shrink-0">
        <ImageIcon size={18} className="text-[#C8BAB0]" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={storagePreviewUrl(previewKey)}
      alt={alt}
      className="w-16 h-[85px] rounded-lg object-cover flex-shrink-0 border border-[#E4D8CC]"
    />
  );
}

// ── Order item row ────────────────────────────────────────────────────────────

function OrderItemRow({ item, currency }: { item: OrderDetailItem; currency: string }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-[#F2EAE0] last:border-0">
      <PortraitThumb previewKey={item.portraitPreviewKey} alt={item.productName} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1A1714] truncate">{item.productName}</p>
        {item.templateName && (
          <p className="text-xs text-[#8C7B6B] mt-0.5 truncate">Template: {item.templateName}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-1.5">
          {item.productType && (
            <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-[#F5F0EA] text-[#8C7B6B] border border-[#E4D8CC]">
              {PRODUCT_TYPE_LABEL[item.productType] ?? item.productType}
            </span>
          )}
          <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-[#F5F0EA] text-[#8C7B6B] border border-[#E4D8CC]">
            {item.size}
          </span>
          {item.quantity > 1 && (
            <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-[#F5F0EA] text-[#8C7B6B] border border-[#E4D8CC]">
              ×{item.quantity}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm font-semibold text-[#1A1714] shrink-0">
        {currency} {(item.unitPrice * item.quantity).toFixed(2)}
      </p>
    </div>
  );
}

// ── Shipping address display ──────────────────────────────────────────────────

function ShippingAddress({ json }: { json: string }) {
  try {
    const addr = JSON.parse(json);
    const lines = [
      addr.line1,
      addr.line2,
      [addr.city, addr.state, addr.postalCode].filter(Boolean).join(", "),
      addr.country,
    ].filter(Boolean);
    return (
      <address className="not-italic text-sm text-[#1A1714] space-y-0.5">
        {lines.map((l, i) => <p key={i}>{l}</p>)}
      </address>
    );
  } catch {
    return <pre className="text-xs text-[#8C7B6B] whitespace-pre-wrap">{json}</pre>;
  }
}

// ── Main content ──────────────────────────────────────────────────────────────

function OrderDetailContent({ id }: { id: string }) {
  const [order, setOrder]       = useState<OrderDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [sending, setSending]   = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    getOrder(id)
      .then(setOrder)
      .catch(() => setError("Could not load order."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleResend = async () => {
    if (!order) return;
    setSending(true);
    setEmailError("");
    setEmailSent(false);
    try {
      await resendOrderEmail(id);
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 4000);
    } catch (e: unknown) {
      setEmailError(e instanceof Error ? e.message : "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  const statusCfg = order ? (STATUS_CONFIG[order.status] ?? STATUS_CONFIG["Pending"]) : null;

  return (
    <div className="lg:pl-60">
      <div className="pt-16 lg:pt-0">
        <div className="max-w-4xl mx-auto px-6 py-8">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-[#8C7B6B] mb-8">
            <Link href="/admin/orders" className="hover:text-[#C4622D] transition-colors flex items-center gap-1">
              <ChevronLeft size={12} /> Orders
            </Link>
            <span>/</span>
            <span className="text-[#1A1714] font-mono font-medium">
              {order?.orderNumber ?? id.slice(0, 12) + "…"}
            </span>
          </nav>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-7 h-7 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">{error}</div>
          )}

          {order && (
            <div className="space-y-5">

              {/* ── Order header ──────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl border border-[#E4D8CC] overflow-hidden">
                <div className="px-6 py-5 flex items-start justify-between gap-4 border-b border-[#F2EAE0]">
                  <div>
                    <p className="text-[11px] text-[#8C7B6B] uppercase tracking-widest font-medium mb-1">Order number</p>
                    <h1 className="text-2xl font-mono font-semibold text-[#1A1714]">{order.orderNumber}</h1>
                  </div>
                  {statusCfg && (
                    <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${statusCfg.color}`}>
                      {statusCfg.icon} {statusCfg.label}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-[#F2EAE0]">
                  <div className="px-6 py-4">
                    <p className="text-[11px] text-[#8C7B6B] uppercase tracking-wider mb-1">Total</p>
                    <p className="text-lg font-semibold text-[#1A1714]">
                      {order.currency} {order.totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="px-6 py-4">
                    <p className="text-[11px] text-[#8C7B6B] uppercase tracking-wider mb-1">Placed</p>
                    <p className="text-sm text-[#1A1714]">{new Date(order.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-[#8C7B6B]">{new Date(order.createdAt).toLocaleTimeString()}</p>
                  </div>
                  <div className="px-6 py-4">
                    <p className="text-[11px] text-[#8C7B6B] uppercase tracking-wider mb-1">Items</p>
                    <p className="text-sm text-[#1A1714]">{order.items?.length ?? 0} item{order.items?.length !== 1 ? "s" : ""}</p>
                  </div>
                  {order.discountCode && (
                    <div className="px-6 py-4">
                      <p className="text-[11px] text-[#8C7B6B] uppercase tracking-wider mb-1">Discount</p>
                      <p className="text-sm font-mono text-[#C4622D]">{order.discountCode}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* ── Left column (2/3) ────────────────────────────────────── */}
                <div className="lg:col-span-2 space-y-5">

                  {/* Order items */}
                  {order.items && order.items.length > 0 && (
                    <div className="bg-white rounded-2xl border border-[#E4D8CC] overflow-hidden">
                      <div className="flex items-center gap-2 px-6 py-4 border-b border-[#E4D8CC]">
                        <Package size={15} className="text-[#8C7B6B]" />
                        <h2 className="font-medium text-[#1A1714] text-sm">Order Items</h2>
                      </div>
                      <div className="px-6">
                        {order.items.map((item) => (
                          <OrderItemRow key={item.id} item={item} currency={order.currency} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shipping address */}
                  {order.shippingAddressJson && (
                    <div className="bg-white rounded-2xl border border-[#E4D8CC] p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin size={15} className="text-[#8C7B6B]" />
                        <h2 className="font-medium text-[#1A1714] text-sm">Shipping Address</h2>
                      </div>
                      <ShippingAddress json={order.shippingAddressJson} />
                    </div>
                  )}

                  {/* Admin notes */}
                  {order.adminNotes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                      <p className="text-xs text-amber-700 uppercase tracking-wider font-medium mb-2">Admin Notes</p>
                      <p className="text-sm text-amber-900 whitespace-pre-wrap">{order.adminNotes}</p>
                    </div>
                  )}
                </div>

                {/* ── Right column (1/3) ───────────────────────────────────── */}
                <div className="space-y-5">

                  {/* Customer */}
                  <div className="bg-white rounded-2xl border border-[#E4D8CC] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Mail size={15} className="text-[#8C7B6B]" />
                      <h2 className="font-medium text-[#1A1714] text-sm">Customer</h2>
                    </div>
                    {order.customerName && (
                      <p className="text-sm font-medium text-[#1A1714] mb-1">{order.customerName}</p>
                    )}
                    <a
                      href={`mailto:${order.customerEmail}`}
                      className="text-sm text-[#C4622D] hover:underline break-all"
                    >
                      {order.customerEmail}
                    </a>

                    {/* Resend email */}
                    <div className="mt-5 pt-5 border-t border-[#F2EAE0]">
                      <button
                        onClick={handleResend}
                        disabled={sending}
                        className="w-full flex items-center justify-center gap-2 bg-[#1A1714] hover:bg-[#2D2520] disabled:opacity-60 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition-colors"
                      >
                        {sending ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : emailSent ? (
                          <CheckCircle size={13} className="text-green-400" />
                        ) : (
                          <Mail size={13} />
                        )}
                        {emailSent ? "Email sent!" : "Resend confirmation email"}
                      </button>
                      {emailError && (
                        <p className="text-xs text-red-600 mt-2 text-center">{emailError}</p>
                      )}
                    </div>
                  </div>

                  {/* Payment */}
                  <div className="bg-white rounded-2xl border border-[#E4D8CC] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CreditCard size={15} className="text-[#8C7B6B]" />
                      <h2 className="font-medium text-[#1A1714] text-sm">Payment</h2>
                    </div>
                    <div className="space-y-3">
                      {order.stripePaymentIntentId && (
                        <div>
                          <p className="text-[11px] text-[#8C7B6B] uppercase tracking-wider mb-0.5">Payment Intent</p>
                          <p className="text-xs font-mono text-[#1A1714] break-all">{order.stripePaymentIntentId}</p>
                        </div>
                      )}
                      {order.stripeSessionId && (
                        <div>
                          <p className="text-[11px] text-[#8C7B6B] uppercase tracking-wider mb-0.5">Checkout Session</p>
                          <p className="text-xs font-mono text-[#1A1714] break-all">{order.stripeSessionId}</p>
                        </div>
                      )}
                      {!order.stripePaymentIntentId && !order.stripeSessionId && (
                        <p className="text-xs text-[#8C7B6B] italic">No payment data yet</p>
                      )}
                    </div>
                  </div>

                  {/* Download link */}
                  {order.accessToken && (
                    <div className="bg-white rounded-2xl border border-[#E4D8CC] p-6">
                      <p className="text-[11px] text-[#8C7B6B] uppercase tracking-wider mb-3">Customer Download Link</p>
                      <p className="text-xs font-mono text-[#8C7B6B] break-all mb-3">
                        /order/{order.accessToken}
                      </p>
                      <a
                        href={`/order/${order.accessToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#C4622D] hover:underline"
                      >
                        Open order page ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#F5F0EA]">
        <AdminSidebar />
        <OrderDetailContent id={id} />
      </div>
    </AdminGuard>
  );
}
