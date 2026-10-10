"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, TrendingUp, ShoppingBag, AlertCircle, Mail,
  Clock, Calendar, X, RefreshCw, Send, CheckCircle,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  getOrders, getOrderStats, getAbandonedCarts,
  sendAbandonmentEmail, sendAbandonmentCampaign,
  type OrderListItem, type OrdersPage,
  type OrderStats, type AbandonedCartItem, type AbandonedCartsPage,
} from "@/lib/admin-api";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Pending:            "bg-yellow-100 text-yellow-800",
  Paid:               "bg-blue-100 text-blue-800",
  GeneratingHighRes:  "bg-purple-100 text-purple-800",
  Ready:              "bg-green-100 text-green-800",
  SubmittedToPrinter: "bg-indigo-100 text-indigo-800",
  Shipped:            "bg-teal-100 text-teal-800",
  Refunded:           "bg-gray-100 text-gray-600",
  Cancelled:          "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  "":                 "All statuses",
  Pending:            "Pending",
  Paid:               "Paid",
  GeneratingHighRes:  "Generating",
  Ready:              "Ready",
  SubmittedToPrinter: "At Printer",
  Shipped:            "Shipped",
  Refunded:           "Refunded",
  Cancelled:          "Cancelled",
};

const STATUSES = Object.keys(STATUS_LABELS);

// ── Period helpers ────────────────────────────────────────────────────────────

type Period = "today" | "week" | "month" | "all" | "custom";

function periodToRange(period: Period): { from?: string; to?: string } {
  if (period === "all" || period === "custom") return {};
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "today") {
    return { from: today.toISOString() };
  }
  if (period === "week") {
    const mon = new Date(today);
    mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return { from: mon.toISOString() };
  }
  if (period === "month") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
  }
  return {};
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E4D8CC] p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-bold tracking-[3px] uppercase text-[#A89080]">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon size={15} />
        </div>
      </div>
      <p className="text-2xl font-display font-light text-[#1A1714]">{value}</p>
      {sub && <p className="text-xs text-[#A89080] mt-1">{sub}</p>}
    </div>
  );
}

// ── Orders view ───────────────────────────────────────────────────────────────

function OrdersView() {
  const [data,        setData]        = useState<OrdersPage | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [page,        setPage]        = useState(1);
  const [status,      setStatus]      = useState("");
  const [search,      setSearch]      = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [period,      setPeriod]      = useState<Period>("all");
  const [customFrom,  setCustomFrom]  = useState("");
  const [customTo,    setCustomTo]    = useState("");

  const getDateRange = useCallback(() => {
    if (period === "custom") {
      return {
        from: customFrom ? new Date(customFrom).toISOString() : undefined,
        to:   customTo   ? new Date(customTo).toISOString()   : undefined,
      };
    }
    return periodToRange(period);
  }, [period, customFrom, customTo]);

  const load = useCallback(() => {
    setLoading(true);
    const { from, to } = getDateRange();
    getOrders(page, 20, status, search, from, to)
      .then(setData)
      .catch(() => setError("Could not load orders. Is the API running?"))
      .finally(() => setLoading(false));
  }, [page, status, search, getDateRange]);

  useEffect(() => { load(); }, [load]);

  const handlePeriod = (p: Period) => { setPeriod(p); setPage(1); };
  const handleStatus = (s: string) => { setStatus(s); setPage(1); };
  const handleSearch = () => { setSearch(searchInput); setPage(1); };

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  const PERIOD_LABELS: Record<Period, string> = {
    today: "Today", week: "This week", month: "This month", all: "All time", custom: "Custom",
  };

  return (
    <div>
      {/* Period quick-filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["today", "week", "month", "all", "custom"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => handlePeriod(p)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              period === p
                ? "bg-[#1A1714] text-white"
                : "bg-white border border-[#E4D8CC] text-[#5A4E46] hover:border-[#1A1714]"
            }`}
          >
            {p === "custom" ? <><Calendar size={10} className="inline mr-1" />Custom</> : PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {period === "custom" && (
        <div className="flex gap-3 mb-4">
          <div>
            <label className="text-[10px] font-semibold text-[#A89080] uppercase tracking-wider block mb-1">From</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
              className="bg-white border border-[#E4D8CC] rounded-xl px-3 py-2 text-sm text-[#1A1714] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#A89080] uppercase tracking-wider block mb-1">To</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
              className="bg-white border border-[#E4D8CC] rounded-xl px-3 py-2 text-sm text-[#1A1714] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30"
            />
          </div>
          {(customFrom || customTo) && (
            <button
              onClick={() => { setCustomFrom(""); setCustomTo(""); setPage(1); }}
              className="self-end mb-0.5 p-2 rounded-lg text-[#8C7B6B] hover:text-[#C4622D] hover:bg-[#F5F0EA] transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Search + status */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7B6B]" />
          <input
            type="text"
            placeholder="Search by email or name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            className="w-full bg-white border border-[#E4D8CC] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#1A1714] placeholder:text-[#8C7B6B] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
          />
        </div>
        <select
          value={status}
          onChange={(e) => handleStatus(e.target.value)}
          className="bg-white border border-[#E4D8CC] rounded-xl px-4 py-2.5 text-sm text-[#1A1714] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E4D8CC] bg-white text-sm text-[#5A4E46] hover:border-[#1A1714] hover:text-[#1A1714] transition-colors"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Revenue summary */}
      {data && !loading && (
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-sm text-[#8C7B6B]">
            {data.total} order{data.total !== 1 ? "s" : ""}
            {(period !== "all" || status || search) && (
              <span className="ml-1 text-[#C4622D] font-medium">
                · {(data.revenue ?? 0).toLocaleString("en-EU", { style: "currency", currency: "EUR" })} revenue
              </span>
            )}
          </p>
          {(status || search || period !== "all") && (
            <button
              onClick={() => { setStatus(""); setSearch(""); setSearchInput(""); setPeriod("all"); setPage(1); }}
              className="text-xs text-[#8C7B6B] hover:text-[#C4622D] flex items-center gap-1 transition-colors"
            >
              <X size={11} /> Clear filters
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm mb-4">
          <strong>API error:</strong> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E4D8CC] overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 bg-[#FAF6F0] border-b border-[#E4D8CC] text-xs font-semibold text-[#8C7B6B] uppercase tracking-wider">
          <span>Customer</span>
          <span>Status</span>
          <span>Amount</span>
          <span>Date</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && data?.items.length === 0 && (
          <p className="text-sm text-[#8C7B6B] text-center py-12">No orders found.</p>
        )}

        {data?.items.map((order: OrderListItem) => (
          <Link
            key={order.id}
            href={`/admin/orders/${order.id}`}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-6 py-4 border-b border-[#F2EAE0] last:border-0 hover:bg-[#FAF6F0] transition-colors"
          >
            <div>
              {order.customerName && (
                <p className="text-sm font-medium text-[#1A1714]">{order.customerName}</p>
              )}
              <p className={`text-sm text-[#${order.customerName ? "8C7B6B" : "1A1714"}]`}>{order.customerEmail}</p>
              <p className="text-xs text-[#8C7B6B] mt-0.5 font-mono">{order.orderNumber ?? order.id.slice(0, 12) + "…"}</p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-800"}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
            <span className="text-sm font-semibold text-[#1A1714]">
              {order.currency} {order.totalAmount.toFixed(2)}
            </span>
            <span className="text-xs text-[#8C7B6B]">
              {new Date(order.createdAt).toLocaleDateString()}
            </span>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-[#8C7B6B]">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E4D8CC] rounded-lg disabled:opacity-50 hover:bg-[#FAF6F0] transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E4D8CC] rounded-lg disabled:opacity-50 hover:bg-[#FAF6F0] transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Abandoned carts view ──────────────────────────────────────────────────────

function AbandonedCartsView() {
  const [data,       setData]       = useState<AbandonedCartsPage | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [sending,    setSending]    = useState<string | null>(null);    // id being emailed
  const [sentIds,    setSentIds]    = useState<Set<string>>(new Set());
  const [campaignState, setCampaignState] = useState<"idle" | "confirm" | "sending" | "done">("idle");
  const [campaignResult, setCampaignResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  useEffect(() => {
    getAbandonedCarts()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSendOne = async (id: string) => {
    setSending(id);
    try {
      await sendAbandonmentEmail(id);
      setSentIds(prev => new Set(prev).add(id));
    } catch { /* silent — button reverts */ }
    finally { setSending(null); }
  };

  const handleCampaign = async () => {
    if (campaignState === "idle") { setCampaignState("confirm"); return; }
    if (campaignState === "confirm") {
      setCampaignState("sending");
      try {
        const result = await sendAbandonmentCampaign();
        setCampaignResult(result);
        setCampaignState("done");
        // Mark all as sent
        if (data) setSentIds(new Set(data.items.map(i => i.id)));
      } catch {
        setCampaignState("idle");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E4D8CC] p-12 text-center">
        <CheckCircle size={32} className="text-green-500 mx-auto mb-3" />
        <p className="font-medium text-[#1A1714] mb-1">No abandoned carts</p>
        <p className="text-sm text-[#8C7B6B]">All pending orders are fresh or already paid.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Campaign header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#8C7B6B]">
          <span className="font-semibold text-[#1A1714]">{data.total}</span> abandoned cart{data.total !== 1 ? "s" : ""} — orders left at checkout without payment
        </p>

        {campaignState === "done" && campaignResult ? (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
            <CheckCircle size={14} />
            Sent {campaignResult.sent}/{campaignResult.total}
            {campaignResult.failed > 0 && ` · ${campaignResult.failed} failed`}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {campaignState === "confirm" && (
              <button
                onClick={() => setCampaignState("idle")}
                className="text-xs text-[#8C7B6B] hover:text-[#1A1714] px-3 py-2 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleCampaign}
              disabled={campaignState === "sending"}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                campaignState === "confirm"
                  ? "bg-[#C4622D] text-white hover:bg-[#9E4A1E]"
                  : "bg-[#1A1714] text-white hover:bg-[#2A2420]"
              } disabled:opacity-60`}
            >
              {campaignState === "sending" ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending…</>
              ) : campaignState === "confirm" ? (
                <><Send size={13} /> Confirm — send to all {data.total}</>
              ) : (
                <><Send size={13} /> Email all abandoned carts</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E4D8CC] overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 bg-[#FAF6F0] border-b border-[#E4D8CC] text-xs font-semibold text-[#8C7B6B] uppercase tracking-wider">
          <span>Preview</span>
          <span>Customer</span>
          <span>Amount</span>
          <span>Abandoned</span>
          <span>Action</span>
        </div>

        {data.items.map((cart: AbandonedCartItem) => {
          const isSent    = sentIds.has(cart.id);
          const isSending = sending === cart.id;

          return (
            <div
              key={cart.id}
              className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-6 py-4 border-b border-[#F2EAE0] last:border-0"
            >
              {/* Portrait thumbnail */}
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#F0E8DC] flex items-center justify-center shrink-0">
                {cart.hasPreview && cart.sessionId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${API_BASE}/api/portraits/${cart.sessionId}/preview`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <AlertCircle size={14} className="text-[#C8BAB0]" />
                )}
              </div>

              {/* Customer info */}
              <div>
                {cart.customerName && (
                  <p className="text-sm font-medium text-[#1A1714]">{cart.customerName}</p>
                )}
                <p className="text-sm text-[#8C7B6B]">{cart.customerEmail}</p>
                <p className="text-xs text-[#A89080] font-mono mt-0.5">{cart.orderNumber}</p>
              </div>

              {/* Amount */}
              <span className="text-sm font-semibold text-[#1A1714]">
                {cart.currency} {cart.totalAmount.toFixed(2)}
              </span>

              {/* Date */}
              <span className="text-xs text-[#8C7B6B] flex items-center gap-1">
                <Clock size={11} />
                {new Date(cart.createdAt).toLocaleDateString()}
              </span>

              {/* Send button */}
              <button
                onClick={() => handleSendOne(cart.id)}
                disabled={isSending || isSent}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isSent
                    ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                    : "bg-[#F5F0EA] text-[#5A4E46] hover:bg-[#C4622D] hover:text-white border border-[#E4D8CC] hover:border-[#C4622D]"
                } disabled:opacity-60`}
              >
                {isSending ? (
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isSent ? (
                  <CheckCircle size={11} />
                ) : (
                  <Mail size={11} />
                )}
                {isSent ? "Sent" : "Send email"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main content ──────────────────────────────────────────────────────────────

function OrdersContent() {
  const [view,  setView]  = useState<"orders" | "abandoned">("orders");
  const [stats, setStats] = useState<OrderStats | null>(null);

  useEffect(() => {
    getOrderStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="lg:pl-60">
      <div className="pt-16 lg:pt-0">
        <div className="max-w-6xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="mb-7">
            <h1 className="text-3xl font-display font-light text-[#1A1714]">Orders</h1>
            <p className="text-[#8C7B6B] text-sm mt-1">All customer orders and abandoned carts.</p>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
            <StatCard
              label="Today's orders"
              value={stats?.todayOrders ?? "—"}
              icon={ShoppingBag}
              accent="bg-[#C4622D]/10 text-[#C4622D]"
            />
            <StatCard
              label="Today's revenue"
              value={stats != null ? `€${stats.todayRevenue.toFixed(2)}` : "—"}
              icon={TrendingUp}
              accent="bg-green-100 text-green-700"
            />
            <StatCard
              label="This week"
              value={stats != null ? `€${stats.weekRevenue.toFixed(2)}` : "—"}
              sub="revenue"
              icon={TrendingUp}
              accent="bg-blue-100 text-blue-700"
            />
            <StatCard
              label="Abandoned carts"
              value={stats?.abandonedCount ?? "—"}
              sub="awaiting payment"
              icon={AlertCircle}
              accent="bg-yellow-100 text-yellow-700"
            />
          </div>

          {/* View tabs */}
          <div className="flex gap-2 mb-6 border-b border-[#E4D8CC] pb-0">
            {(["orders", "abandoned"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-all duration-200 ${
                  view === v
                    ? "border-[#C4622D] text-[#C4622D]"
                    : "border-transparent text-[#8C7B6B] hover:text-[#1A1714]"
                }`}
              >
                {v === "orders" ? "All Orders" : (
                  <>
                    Abandoned Carts
                    {stats?.abandonedCount ? (
                      <span className="ml-2 bg-yellow-100 text-yellow-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {stats.abandonedCount}
                      </span>
                    ) : null}
                  </>
                )}
              </button>
            ))}
          </div>

          {view === "orders" ? <OrdersView /> : <AbandonedCartsView />}
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#F5F0EA]">
        <AdminSidebar />
        <OrdersContent />
      </div>
    </AdminGuard>
  );
}
