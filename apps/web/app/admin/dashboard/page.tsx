"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, TrendingUp, Clock, Camera, ArrowRight } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getDashboard, type DashboardStats } from "@/lib/admin-api";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Paid: "bg-blue-100 text-blue-800",
  Processing: "bg-purple-100 text-purple-800",
  Completed: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
  Refunded: "bg-gray-100 text-gray-800",
};

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-[#E4D8CC] p-6"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-semibold text-[#1A1714]">{value}</p>
      <p className="text-sm text-[#8C7B6B] mt-1">{label}</p>
    </motion.div>
  );
}

function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboard()
      .then(setStats)
      .catch(() => setError("Could not load dashboard. Is the API running?"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="lg:pl-60">
      <div className="pt-16 lg:pt-0">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-light text-[#1A1714]">Dashboard</h1>
            <p className="text-[#8C7B6B] text-sm mt-1">Welcome back — here's what's happening.</p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm mb-6">
              <strong>API not connected:</strong> {error}
              <br />
              <span className="text-amber-600">The admin UI is ready — start the API server to connect live data.</span>
            </div>
          )}

          {stats && (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard icon={ShoppingBag} label="Total Orders" value={stats.totalOrders} color="bg-[#F9ECE4] text-[#C4622D]" />
                <StatCard icon={TrendingUp} label="Total Revenue" value={`€${stats.totalRevenue.toFixed(2)}`} color="bg-[#E6EEE9] text-[#2D4A3E]" />
                <StatCard icon={Clock} label="Pending Orders" value={stats.pendingOrders} color="bg-[#FDF4E3] text-[#D4942A]" />
                <StatCard icon={Camera} label="AI Sessions" value={stats.totalSessions} color="bg-[#F0EEF8] text-[#6B5FA0]" />
              </div>

              {/* Recent orders */}
              <div className="bg-white rounded-2xl border border-[#E4D8CC] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E4D8CC] flex items-center justify-between">
                  <h2 className="font-medium text-[#1A1714]">Recent Orders</h2>
                  <Link href="/admin/orders" className="text-xs text-[#C4622D] hover:underline flex items-center gap-1">
                    View all <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="divide-y divide-[#F2EAE0]">
                  {stats.recentOrders.length === 0 && (
                    <p className="text-sm text-[#8C7B6B] px-6 py-8 text-center">No orders yet.</p>
                  )}
                  {stats.recentOrders.map((order) => (
                    <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-[#FAF6F0] transition-colors">
                      <div>
                        <p className="text-sm font-medium text-[#1A1714]">{order.customerEmail}</p>
                        <p className="text-xs text-[#8C7B6B] mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-800"}`}>
                          {order.status}
                        </span>
                        <span className="text-sm font-semibold text-[#1A1714]">
                          {order.currency} {order.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Quick links when no API */}
          {!loading && !stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              {[
                { href: "/admin/templates", label: "Manage Templates", desc: "Add, edit, or disable portrait templates" },
                { href: "/admin/orders", label: "View Orders", desc: "Browse and manage customer orders" },
                { href: "/admin/settings", label: "Configure Settings", desc: "AI keys, Stripe, email, and more" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="bg-white border border-[#E4D8CC] rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group">
                  <p className="font-medium text-[#1A1714] group-hover:text-[#C4622D] transition-colors">{item.label}</p>
                  <p className="text-xs text-[#8C7B6B] mt-1">{item.desc}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#F5F0EA]">
        <AdminSidebar />
        <DashboardContent />
      </div>
    </AdminGuard>
  );
}
