"use client";

import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getOrders, type OrderListItem, type OrdersPage } from "@/lib/admin-api";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Paid: "bg-blue-100 text-blue-800",
  Processing: "bg-purple-100 text-purple-800",
  Completed: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
  Refunded: "bg-gray-100 text-gray-600",
};

const STATUSES = ["", "Pending", "Paid", "Processing", "Completed", "Cancelled", "Refunded"];

function OrdersContent() {
  const [data, setData] = useState<OrdersPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    getOrders(page, 20, status, search)
      .then(setData)
      .catch(() => setError("Could not load orders. Is the API running?"))
      .finally(() => setLoading(false));
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="lg:pl-60">
      <div className="pt-16 lg:pt-0">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-light text-[#1A1714]">Orders</h1>
            <p className="text-[#8C7B6B] text-sm mt-1">All customer orders — click to view details.</p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7B6B]" />
              <input
                type="text"
                placeholder="Search by email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
                className="w-full bg-white border border-[#E4D8CC] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#1A1714] placeholder:text-[#8C7B6B] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
              />
            </div>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="bg-white border border-[#E4D8CC] rounded-xl px-4 py-2.5 text-sm text-[#1A1714] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s || "All statuses"}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm mb-6">
              <strong>API not connected:</strong> {error}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-[#E4D8CC] overflow-hidden">
            {/* Table header */}
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
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-800"}`}>
                  {order.status}
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
