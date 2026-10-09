"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, TrendingUp, Clock, Camera, ArrowRight, Wrench, Zap, Loader2, Eye, EyeOff } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getDashboard, getSettings, saveSetting, type DashboardStats } from "@/lib/admin-api";
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

// ── Store Controls ─────────────────────────────────────────────────────────────

function StoreControls() {
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenancePassword, setMaintenancePassword] = useState("");
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [regenEnabled, setRegenEnabled] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [savingRegen, setSavingRegen] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    getSettings()
      .then((settings) => {
        const get = (key: string) => settings.find((s) => s.key === key)?.value ?? "";
        setMaintenanceEnabled(get("store.maintenance.enabled") === "true");
        setMaintenancePassword(get("store.maintenance.password"));
        setMaintenanceMessage(get("store.maintenance.message"));
        setRegenEnabled(get("regen.enabled") !== "false");
      })
      .catch(() => {})
      .finally(() => setLoadingSettings(false));
  }, []);

  const flash = (key: string) => {
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 2000);
  };

  const saveMaintenance = async () => {
    setSavingMaintenance(true);
    try {
      await saveSetting("store.maintenance.enabled", String(maintenanceEnabled));
      await saveSetting("store.maintenance.password", maintenancePassword);
      await saveSetting("store.maintenance.message", maintenanceMessage);
      flash("maintenance");
    } finally {
      setSavingMaintenance(false);
    }
  };

  const toggleRegen = async (value: boolean) => {
    setRegenEnabled(value);
    setSavingRegen(true);
    try {
      await saveSetting("regen.enabled", String(value));
      flash("regen");
    } finally {
      setSavingRegen(false);
    }
  };

  if (loadingSettings) {
    return (
      <div className="bg-white rounded-2xl border border-[#E4D8CC] p-6 flex items-center justify-center h-32">
        <Loader2 size={20} className="animate-spin text-[#C4622D]" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E4D8CC] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E4D8CC]">
        <h2 className="font-medium text-[#1A1714]">Store Controls</h2>
        <p className="text-xs text-[#8C7B6B] mt-0.5">Maintenance mode and AI generation</p>
      </div>

      <div className="divide-y divide-[#F2EAE0]">

        {/* ── AI Generation toggle ─────────────────────────────────────────── */}
        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${regenEnabled ? "bg-[#E6EEE9] text-[#2D4A3E]" : "bg-[#F9ECE4] text-[#C4622D]"}`}>
                <Zap size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1A1714]">AI Image Generation</p>
                <p className="text-xs text-[#8C7B6B] mt-0.5">
                  {regenEnabled ? "Customers can generate and regenerate portraits" : "Generation is disabled — customers will see an error"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {savedKey === "regen" && <span className="text-xs text-[#2D4A3E] font-medium">Saved ✓</span>}
              {savingRegen
                ? <Loader2 size={16} className="animate-spin text-[#C4622D]" />
                : (
                  <button
                    onClick={() => toggleRegen(!regenEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${regenEnabled ? "bg-[#2D4A3E]" : "bg-[#E4D8CC]"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${regenEnabled ? "left-6" : "left-0.5"}`} />
                  </button>
                )
              }
            </div>
          </div>
        </div>

        {/* ── Maintenance mode ─────────────────────────────────────────────── */}
        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${maintenanceEnabled ? "bg-amber-100 text-amber-600" : "bg-[#F2EAE0] text-[#C4622D]"}`}>
                <Wrench size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1A1714]">Maintenance Mode</p>
                <p className="text-xs text-[#8C7B6B] mt-0.5">
                  {maintenanceEnabled ? "Store is offline — only staff with the password can access it" : "Store is live and accessible to everyone"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {savedKey === "maintenance" && <span className="text-xs text-[#2D4A3E] font-medium">Saved ✓</span>}
              <button
                onClick={() => setMaintenanceEnabled((v) => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${maintenanceEnabled ? "bg-amber-400" : "bg-[#E4D8CC]"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${maintenanceEnabled ? "left-6" : "left-0.5"}`} />
              </button>
            </div>
          </div>

          {/* Password + message fields */}
          <div className="space-y-3 pl-12">
            <div>
              <label className="text-xs font-medium text-[#5A4E46] mb-1.5 block">Bypass password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={maintenancePassword}
                  onChange={(e) => setMaintenancePassword(e.target.value)}
                  placeholder="Staff-only bypass password"
                  className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-[#E4D8CC] bg-[#FAF6F0] text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/25 focus:border-[#C4622D]/60 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A090] hover:text-[#1A1714] transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[#5A4E46] mb-1.5 block">Message shown to visitors</label>
              <input
                type="text"
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="We'll be back shortly!"
                className="w-full px-3 py-2.5 rounded-xl border border-[#E4D8CC] bg-[#FAF6F0] text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/25 focus:border-[#C4622D]/60 transition-all"
              />
            </div>

            <button
              onClick={saveMaintenance}
              disabled={savingMaintenance}
              className="flex items-center gap-2 bg-[#1A1714] disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all hover:bg-[#2D2520]"
            >
              {savingMaintenance ? <Loader2 size={12} className="animate-spin" /> : null}
              {savingMaintenance ? "Saving…" : "Save maintenance settings"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Dashboard ───────────────────────────────────────────────────────────────────

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

          {/* Store controls — always visible */}
          <div className="mb-8">
            <StoreControls />
          </div>

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
