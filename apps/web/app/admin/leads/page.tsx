"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, Users, Mail, ShoppingCart, TrendingUp, Calendar, X,
  RefreshCw, CheckCircle, Send, AlertCircle, Clock, ImageOff,
  Trash2, Eye, ChevronDown, ChevronRight, Zap, Link2,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  getLeadsStats, getLeadSessions, getLeadSession, deleteLeadSession,
  sendLeadEmail, sendLeadCampaign, adminRegenerateSession, adminRegenerateApply,
  getAbandonedCarts, sendAbandonmentEmail, sendAbandonmentCampaign, deleteAbandonedCart,
  type LeadsStats, type LeadSession, type LeadSessionsPage, type LeadSessionDetail,
  type AbandonedCartItem, type AbandonedCartsPage,
} from "@/lib/admin-api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
// Fixed per page-load so thumbnails always re-fetch on refresh but don't flicker on re-render
const pageLoadTime = Date.now();

// ── Step label helpers ────────────────────────────────────────────────────────

function getStep(session: LeadSession): { label: string; color: string } {
  if (session.hasPendingOrder) return { label: "Added to Cart", color: "bg-orange-100 text-orange-800" };
  switch (session.status) {
    case "PreviewReady":      return { label: "Got Preview",      color: "bg-blue-100 text-blue-800" };
    case "Generating":        return { label: "Generating",       color: "bg-purple-100 text-purple-800" };
    case "SafetyRefused":     return { label: "Safety Refused",   color: "bg-red-100 text-red-800" };
    case "Failed":            return { label: "Failed",           color: "bg-red-100 text-red-800" };
    default:                  return { label: "Started",          color: "bg-gray-100 text-gray-700" };
  }
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent }: {
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

// ── Funnel bar ────────────────────────────────────────────────────────────────

function FunnelBar({ stats }: { stats: LeadsStats }) {
  const steps = [
    { label: "Started generation", count: stats.totalSessions,  color: "bg-[#E4D8CC]" },
    { label: "Got a preview",      count: stats.gotPreview,      color: "bg-blue-200" },
    { label: "Gave email",         count: stats.capturedEmail,   color: "bg-purple-200" },
    { label: "Added to cart",      count: stats.addedToCart,     color: "bg-orange-200" },
    { label: "Paid",               count: stats.converted,       color: "bg-green-300" },
  ];
  const max = stats.totalSessions || 1;

  return (
    <div className="bg-white rounded-2xl border border-[#E4D8CC] p-6 mb-7">
      <p className="text-[10px] font-bold tracking-[3px] uppercase text-[#A89080] mb-5">Conversion Funnel</p>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <p className="text-xs text-[#8C7B6B] w-36 shrink-0">{step.label}</p>
            <div className="flex-1 bg-[#F5F0EA] rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${step.color} transition-all duration-500`}
                style={{ width: `${(step.count / max) * 100}%` }}
              />
            </div>
            <p className="text-sm font-semibold text-[#1A1714] w-12 text-right">{step.count.toLocaleString()}</p>
            {i > 0 && steps[i - 1].count > 0 && (
              <p className="text-[10px] text-[#A89080] w-10 text-right">
                {Math.round((step.count / steps[i - 1].count) * 100)}%
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Session Detail Drawer ────────────────────────────────────────────────────

function SessionDetailDrawer({
  sessionId, onClose,
}: { sessionId: string; onClose: () => void }) {
  const [detail,  setDetail]  = useState<LeadSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [logsOpen, setLogsOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    getLeadSession(sessionId)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white z-50 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#E4D8CC] px-6 py-4 flex items-center justify-between">
          <p className="font-semibold text-[#1A1714]">Session Detail</p>
          <button onClick={onClose} className="text-[#8C7B6B] hover:text-[#1A1714] transition-colors">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !detail ? (
          <p className="text-center text-[#8C7B6B] py-16">Could not load session.</p>
        ) : (
          <div className="p-6 space-y-6">
            {/* Info */}
            <div>
              <p className="text-[10px] font-bold tracking-[3px] uppercase text-[#A89080] mb-3">Info</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#8C7B6B]">Email</span>
                  <span className="font-medium text-[#1A1714]">{detail.customerEmail}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#8C7B6B]">Template</span>
                  <span className="text-[#1A1714]">{detail.templateName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#8C7B6B]">Status</span>
                  <span className="text-[#1A1714]">{detail.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#8C7B6B]">Regenerations</span>
                  <span className="text-[#1A1714]">{detail.regenerationCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#8C7B6B]">Created</span>
                  <span className="text-[#1A1714]">{new Date(detail.createdAt).toLocaleString()}</span>
                </div>
                {detail.sourceRef && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8C7B6B]">Source</span>
                    <span className="text-[#1A1714] text-right max-w-[60%] break-all">{detail.sourceRef}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Portrait preview */}
            {detail.hasPreview && (
              <div>
                <p className="text-[10px] font-bold tracking-[3px] uppercase text-[#A89080] mb-3">Generated Portrait</p>
                <div className="rounded-xl overflow-hidden bg-[#F0E8DC]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${API_BASE}/api/portraits/${detail.id}/preview?v=${Date.now()}`}
                    alt="Portrait preview"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}

            {/* Uploaded photos */}
            {Object.keys(detail.uploadedFiles).length > 0 && (
              <div>
                <p className="text-[10px] font-bold tracking-[3px] uppercase text-[#A89080] mb-3">Uploaded Photos</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(detail.uploadedFiles).map(([slot, url]) => (
                    <div key={slot} className="space-y-1">
                      <p className="text-xs text-[#8C7B6B] capitalize">{slot}</p>
                      {url ? (
                        <div className="rounded-xl overflow-hidden bg-[#F0E8DC] aspect-square">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={slot} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="rounded-xl bg-[#F0E8DC] aspect-square flex items-center justify-center">
                          <ImageOff size={20} className="text-[#C8BAB0]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generation logs */}
            {detail.generationLogs.length > 0 && (
              <div>
                <button
                  onClick={() => setLogsOpen(v => !v)}
                  className="flex items-center gap-2 text-[10px] font-bold tracking-[3px] uppercase text-[#A89080] mb-3 hover:text-[#1A1714] transition-colors"
                >
                  {logsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  AI Generation Logs ({detail.generationLogs.length})
                </button>
                {logsOpen && (
                  <div className="space-y-2">
                    {detail.generationLogs.map((log) => (
                      <div key={log.id} className="bg-[#FAF6F0] rounded-xl p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-[#1A1714]">{log.provider} · {log.model}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            log.status === "Success"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {log.status}
                          </span>
                        </div>
                        <div className="flex gap-4 text-[#8C7B6B]">
                          {log.durationMs && <span>{(log.durationMs / 1000).toFixed(1)}s</span>}
                          {log.costUsd && <span>${log.costUsd.toFixed(4)}</span>}
                          {log.isHighRes && <span className="text-purple-600 font-medium">High-res</span>}
                        </div>
                        {log.errorMessage && (
                          <p className="text-red-600 break-words">{log.errorMessage}</p>
                        )}
                        <p className="text-[#C8BAB0]">{new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Regen Confirm Modal ───────────────────────────────────────────────────────

function RegenConfirmModal({
  sessionId,
  newPreviewUrl,
  currentPreviewUrl,
  onApply,
  onDiscard,
}: {
  sessionId: string;
  newPreviewUrl: string;
  currentPreviewUrl: string | null;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    setApplying(true);
    setError(null);
    try {
      await adminRegenerateApply(sessionId);
      onApply();
    } catch {
      setError("Failed to apply. Please try again.");
      setApplying(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onDiscard} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#E4D8CC] flex items-center justify-between">
            <div>
              <p className="font-semibold text-[#1A1714]">Review New Portrait</p>
              <p className="text-xs text-[#8C7B6B] mt-0.5">Apply to replace the user&apos;s current portrait, or discard.</p>
            </div>
            <button onClick={onDiscard} className="text-[#8C7B6B] hover:text-[#1A1714] transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Images */}
          <div className="grid grid-cols-2 gap-4 p-6">
            {/* Current */}
            <div>
              <p className="text-[10px] font-bold tracking-[3px] uppercase text-[#A89080] mb-2">Current (user sees this)</p>
              <div className="rounded-xl overflow-hidden bg-[#F0E8DC] aspect-square">
                {currentPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentPreviewUrl} alt="Current portrait" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff size={24} className="text-[#C8BAB0]" />
                  </div>
                )}
              </div>
            </div>

            {/* New */}
            <div>
              <p className="text-[10px] font-bold tracking-[3px] uppercase text-purple-500 mb-2">New (generated now)</p>
              <div className="rounded-xl overflow-hidden bg-[#F0E8DC] aspect-square ring-2 ring-purple-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={newPreviewUrl} alt="New portrait" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {error && (
            <p className="mx-6 mb-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="px-6 pb-6 flex items-center justify-end gap-3">
            <button
              onClick={onDiscard}
              disabled={applying}
              className="px-5 py-2.5 rounded-xl border border-[#E4D8CC] text-sm font-semibold text-[#5A4E46] hover:bg-[#FAF6F0] transition-colors disabled:opacity-50"
            >
              Discard
            </button>
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-60"
            >
              {applying
                ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Applying…</>
                : <><CheckCircle size={14} /> Apply to user</>
              }
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Lead Sessions view ────────────────────────────────────────────────────────

function LeadSessionsView() {
  const [data,          setData]          = useState<LeadSessionsPage | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [page,          setPage]          = useState(1);
  const [search,        setSearch]        = useState("");
  const [searchInput,   setSearchInput]   = useState("");
  const [from,          setFrom]          = useState("");
  const [to,            setTo]            = useState("");
  const [sending,       setSending]       = useState<string | null>(null);
  const [sentIds,       setSentIds]       = useState<Set<string>>(new Set());
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [regenerating,  setRegenerating]  = useState<string | null>(null);
  const [regenConfirm,  setRegenConfirm]  = useState<{ id: string; newUrl: string } | null>(null);
  const [regenDoneIds,  setRegenDoneIds]  = useState<Set<string>>(new Set());
  // Maps sessionId → cache-bust timestamp so the browser re-fetches after apply
  const [previewBust,   setPreviewBust]   = useState<Record<string, number>>({});
  const [detailId,      setDetailId]      = useState<string | null>(null);
  const [campaignState, setCampaignState] = useState<"idle" | "confirm" | "sending" | "done">("idle");
  const [campaignResult, setCampaignResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getLeadSessions(
      page, 20, search,
      from ? new Date(from).toISOString() : undefined,
      to   ? new Date(to).toISOString()   : undefined,
    )
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, from, to]);

  useEffect(() => { load(); }, [load]);

  const handleSendEmail = async (id: string) => {
    setSending(id);
    try {
      await sendLeadEmail(id);
      setSentIds(prev => new Set(prev).add(id));
    } catch { /* silent */ }
    finally { setSending(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead session? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteLeadSession(id);
      setData(prev => prev ? {
        ...prev,
        items: prev.items.filter(s => s.id !== id),
        total: prev.total - 1,
      } : prev);
    } catch { /* silent */ }
    finally { setDeleting(null); }
  };

  const handleRegenerate = async (id: string) => {
    setRegenerating(id);
    try {
      const { previewUrl } = await adminRegenerateSession(id);
      setRegenConfirm({ id, newUrl: previewUrl });
    } catch { /* silent */ }
    finally { setRegenerating(null); }
  };

  const handleRegenApply = (id: string) => {
    setRegenConfirm(null);
    setRegenDoneIds(prev => new Set(prev).add(id));
    // Bust the browser's cached preview image for this session
    setPreviewBust(prev => ({ ...prev, [id]: Date.now() }));
    load();
  };

  const handleRegenDiscard = () => {
    setRegenConfirm(null);
  };

  const handleCampaign = async () => {
    if (campaignState === "idle") { setCampaignState("confirm"); return; }
    if (campaignState === "confirm") {
      setCampaignState("sending");
      try {
        const result = await sendLeadCampaign();
        setCampaignResult(result);
        setCampaignState("done");
        if (data) setSentIds(new Set(data.items.map(i => i.id)));
      } catch { setCampaignState("idle"); }
    }
  };

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <div>
      {/* Filters + campaign button */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          className="bg-white border border-[#E4D8CC] rounded-xl px-3 py-2.5 text-sm text-[#1A1714] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
          className="bg-white border border-[#E4D8CC] rounded-xl px-3 py-2.5 text-sm text-[#1A1714] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30" />
        {(search || from || to) && (
          <button onClick={() => { setSearch(""); setSearchInput(""); setFrom(""); setTo(""); setPage(1); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E4D8CC] bg-white text-sm text-[#8C7B6B] hover:text-[#C4622D] transition-colors">
            <X size={13} /> Clear
          </button>
        )}
        <button onClick={load}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E4D8CC] bg-white text-sm text-[#5A4E46] hover:border-[#1A1714] hover:text-[#1A1714] transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Summary + bulk email campaign */}
      <div className="flex items-center justify-between mb-4 px-1">
        {data && !loading ? (
          <p className="text-sm text-[#8C7B6B]">
            {data.total} lead{data.total !== 1 ? "s" : ""} — gave email but didn&apos;t complete purchase
          </p>
        ) : <span />}

        {campaignState === "done" && campaignResult ? (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
            <CheckCircle size={14} />
            Sent {campaignResult.sent}/{campaignResult.total}
            {campaignResult.failed > 0 && ` · ${campaignResult.failed} failed`}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {campaignState === "confirm" && (
              <button onClick={() => setCampaignState("idle")} className="text-xs text-[#8C7B6B] hover:text-[#1A1714] px-3 py-2 transition-colors">
                Cancel
              </button>
            )}
            <button
              onClick={handleCampaign}
              disabled={campaignState === "sending"}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60 ${
                campaignState === "confirm"
                  ? "bg-[#C4622D] text-white hover:bg-[#9E4A1E]"
                  : "bg-[#1A1714] text-white hover:bg-[#2A2420]"
              }`}
            >
              {campaignState === "sending" ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending…</>
              ) : campaignState === "confirm" ? (
                <><Send size={13} /> Confirm — email all leads</>
              ) : (
                <><Send size={13} /> Email all leads</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E4D8CC] overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-3 px-6 py-3 bg-[#FAF6F0] border-b border-[#E4D8CC] text-xs font-semibold text-[#8C7B6B] uppercase tracking-wider">
          <span>Preview</span>
          <span>Customer</span>
          <span>Template</span>
          <span>Step Reached</span>
          <span>Source</span>
          <span>Date</span>
          <span>Actions</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && data?.items.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle size={28} className="text-green-500 mx-auto mb-2" />
            <p className="text-sm text-[#8C7B6B]">No leads found.</p>
          </div>
        )}

        {!loading && data?.items.map((session: LeadSession) => {
          const step         = getStep(session);
          const isSent       = sentIds.has(session.id);
          const isSending    = sending === session.id;
          const isDeleting   = deleting === session.id;
          const isRegenerating = regenerating === session.id;
          const isRegenDone  = regenDoneIds.has(session.id);

          return (
            <div
              key={session.id}
              className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-3 items-center px-6 py-4 border-b border-[#F2EAE0] last:border-0 hover:bg-[#FAF6F0] transition-colors"
            >
              {/* Preview thumbnail */}
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#F0E8DC] flex items-center justify-center shrink-0">
                {session.hasPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${API_BASE}/api/portraits/${session.id}/preview?v=${previewBust[session.id] ?? pageLoadTime}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageOff size={14} className="text-[#C8BAB0]" />
                )}
              </div>

              {/* Email + regen count */}
              <div className="min-w-0">
                <p className="text-sm text-[#1A1714] truncate">{session.customerEmail}</p>
                {session.regenerationCount > 0 && (
                  <p className="text-xs text-[#A89080] mt-0.5">
                    {session.regenerationCount} regen{session.regenerationCount !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* Template */}
              <span className="text-sm text-[#5A4E46] whitespace-nowrap">{session.templateName}</span>

              {/* Step reached */}
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${step.color}`}>
                {step.label}
              </span>

              {/* Source */}
              <div className="max-w-[120px]">
                {session.sourceRef ? (
                  <span title={session.sourceRef} className="flex items-center gap-1 text-[10px] text-[#8C7B6B] bg-[#F5F0EA] rounded-md px-1.5 py-0.5 truncate max-w-full">
                    <Link2 size={9} className="shrink-0" />
                    <span className="truncate">{session.sourceRef}</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-[#C8BAB0]">—</span>
                )}
              </div>

              {/* Date */}
              <span className="text-xs text-[#8C7B6B] flex items-center gap-1 whitespace-nowrap">
                <Clock size={11} />
                {new Date(session.createdAt).toLocaleDateString()}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                {/* View detail */}
                <button
                  onClick={() => setDetailId(session.id)}
                  title="View detail"
                  className="p-1.5 rounded-lg text-[#8C7B6B] hover:bg-[#F0E8DC] hover:text-[#1A1714] transition-colors"
                >
                  <Eye size={14} />
                </button>

                {/* Regenerate portrait */}
                <button
                  onClick={() => handleRegenerate(session.id)}
                  disabled={isRegenerating || isRegenDone}
                  title={isRegenDone ? "Regeneration queued" : "Regenerate portrait (admin, bypasses limit)"}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isRegenDone
                      ? "text-purple-600 bg-purple-50 cursor-default"
                      : "text-[#8C7B6B] hover:bg-purple-50 hover:text-purple-600 disabled:opacity-50"
                  }`}
                >
                  {isRegenerating
                    ? <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                    : isRegenDone ? <CheckCircle size={14} /> : <Zap size={14} />}
                </button>

                {/* Send email */}
                <button
                  onClick={() => handleSendEmail(session.id)}
                  disabled={isSending || isSent}
                  title={isSent ? "Email sent" : "Send recovery email"}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isSent
                      ? "text-green-600 bg-green-50 cursor-default"
                      : "text-[#8C7B6B] hover:bg-[#F0E8DC] hover:text-[#C4622D] disabled:opacity-50"
                  }`}
                >
                  {isSending
                    ? <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                    : isSent ? <CheckCircle size={14} /> : <Mail size={14} />}
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(session.id)}
                  disabled={isDeleting}
                  title="Delete lead"
                  className="p-1.5 rounded-lg text-[#8C7B6B] hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  {isDeleting
                    ? <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                    : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-[#8C7B6B]">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E4D8CC] rounded-lg disabled:opacity-50 hover:bg-[#FAF6F0] transition-colors">
              Previous
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E4D8CC] rounded-lg disabled:opacity-50 hover:bg-[#FAF6F0] transition-colors">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {detailId && (
        <SessionDetailDrawer sessionId={detailId} onClose={() => setDetailId(null)} />
      )}

      {/* Regen confirm modal */}
      {regenConfirm && (() => {
        const session = data?.items.find(s => s.id === regenConfirm.id);
        const currentUrl = session?.hasPreview
          ? `${API_BASE}/api/portraits/${regenConfirm.id}/preview?v=${Date.now()}`
          : null;
        return (
          <RegenConfirmModal
            sessionId={regenConfirm.id}
            newPreviewUrl={regenConfirm.newUrl}
            currentPreviewUrl={currentUrl}
            onApply={() => handleRegenApply(regenConfirm.id)}
            onDiscard={handleRegenDiscard}
          />
        );
      })()}
    </div>
  );
}

// ── Abandoned Carts view ──────────────────────────────────────────────────────

function AbandonedCartsView() {
  const [data,          setData]          = useState<AbandonedCartsPage | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState<string | null>(null);
  const [sentIds,       setSentIds]       = useState<Set<string>>(new Set());
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [campaignState, setCampaignState] = useState<"idle" | "confirm" | "sending" | "done">("idle");
  const [campaignResult, setCampaignResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  useEffect(() => {
    getAbandonedCarts().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSendOne = async (id: string) => {
    setSending(id);
    try {
      await sendAbandonmentEmail(id);
      setSentIds(prev => new Set(prev).add(id));
    } catch { /* silent */ }
    finally { setSending(null); }
  };

  const handleDeleteCart = async (id: string) => {
    if (!confirm("Delete this abandoned cart? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteAbandonedCart(id);
      setData(prev => prev ? {
        ...prev,
        items: prev.items.filter(c => c.id !== id),
        total: prev.total - 1,
      } : prev);
    } catch { /* silent */ }
    finally { setDeleting(null); }
  };

  const handleCampaign = async () => {
    if (campaignState === "idle") { setCampaignState("confirm"); return; }
    if (campaignState === "confirm") {
      setCampaignState("sending");
      try {
        const result = await sendAbandonmentCampaign();
        setCampaignResult(result);
        setCampaignState("done");
        if (data) setSentIds(new Set(data.items.map(i => i.id)));
      } catch { setCampaignState("idle"); }
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data || data.items.length === 0) return (
    <div className="bg-white rounded-2xl border border-[#E4D8CC] p-12 text-center">
      <CheckCircle size={32} className="text-green-500 mx-auto mb-3" />
      <p className="font-medium text-[#1A1714] mb-1">No abandoned carts</p>
      <p className="text-sm text-[#8C7B6B]">All pending orders are fresh or already paid.</p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#8C7B6B]">
          <span className="font-semibold text-[#1A1714]">{data.total}</span> abandoned cart{data.total !== 1 ? "s" : ""} — highest intent leads (reached checkout)
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
              <button onClick={() => setCampaignState("idle")} className="text-xs text-[#8C7B6B] hover:text-[#1A1714] px-3 py-2 transition-colors">
                Cancel
              </button>
            )}
            <button
              onClick={handleCampaign}
              disabled={campaignState === "sending"}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60 ${
                campaignState === "confirm"
                  ? "bg-[#C4622D] text-white hover:bg-[#9E4A1E]"
                  : "bg-[#1A1714] text-white hover:bg-[#2A2420]"
              }`}
            >
              {campaignState === "sending" ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending…</>
              ) : campaignState === "confirm" ? (
                <><Send size={13} /> Confirm — email all {data.total}</>
              ) : (
                <><Send size={13} /> Email all</>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E4D8CC] overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-6 py-3 bg-[#FAF6F0] border-b border-[#E4D8CC] text-xs font-semibold text-[#8C7B6B] uppercase tracking-wider">
          <span>Preview</span>
          <span>Customer</span>
          <span>Amount</span>
          <span>Abandoned</span>
          <span>Action</span>
          <span></span>
        </div>

        {data.items.map((cart: AbandonedCartItem) => {
          const isSent      = sentIds.has(cart.id);
          const isSending   = sending === cart.id;
          const isDeleting  = deleting === cart.id;

          return (
            <div key={cart.id} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-6 py-4 border-b border-[#F2EAE0] last:border-0">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#F0E8DC] flex items-center justify-center shrink-0">
                {cart.hasPreview && cart.sessionId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${API_BASE}/api/portraits/${cart.sessionId}/preview`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <AlertCircle size={14} className="text-[#C8BAB0]" />
                )}
              </div>

              <div>
                {cart.customerName && <p className="text-sm font-medium text-[#1A1714]">{cart.customerName}</p>}
                <p className="text-sm text-[#8C7B6B]">{cart.customerEmail}</p>
                <p className="text-xs text-[#A89080] font-mono mt-0.5">{cart.orderNumber}</p>
              </div>

              <span className="text-sm font-semibold text-[#1A1714]">{cart.currency} {cart.totalAmount.toFixed(2)}</span>

              <span className="text-xs text-[#8C7B6B] flex items-center gap-1">
                <Clock size={11} />
                {new Date(cart.createdAt).toLocaleDateString()}
              </span>

              <button
                onClick={() => handleSendOne(cart.id)}
                disabled={isSending || isSent}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isSent
                    ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                    : "bg-[#F5F0EA] text-[#5A4E46] hover:bg-[#C4622D] hover:text-white border border-[#E4D8CC] hover:border-[#C4622D]"
                } disabled:opacity-60`}
              >
                {isSending ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : isSent ? <CheckCircle size={11} /> : <Mail size={11} />}
                {isSent ? "Sent" : "Send email"}
              </button>

              {/* Delete cart */}
              <button
                onClick={() => handleDeleteCart(cart.id)}
                disabled={isDeleting}
                title="Delete abandoned cart"
                className="p-1.5 rounded-lg text-[#8C7B6B] hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting
                  ? <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                  : <Trash2 size={14} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function LeadsContent() {
  const [view,  setView]  = useState<"sessions" | "carts">("sessions");
  const [stats, setStats] = useState<LeadsStats | null>(null);

  useEffect(() => {
    getLeadsStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="lg:pl-60">
      <div className="pt-16 lg:pt-0">
        <div className="max-w-6xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="mb-7">
            <h1 className="text-3xl font-display font-light text-[#1A1714]">Leads</h1>
            <p className="text-[#8C7B6B] text-sm mt-1">Track every user and the step they reached before leaving.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Email leads" value={stats?.capturedEmail ?? "—"} sub="gave email, not converted" icon={Mail} accent="bg-purple-100 text-purple-700" />
            <StatCard label="Today's leads" value={stats?.todayLeads ?? "—"} sub="new emails today" icon={Calendar} accent="bg-[#C4622D]/10 text-[#C4622D]" />
            <StatCard label="Abandoned carts" value={stats?.abandonedCarts ?? "—"} sub="highest intent" icon={ShoppingCart} accent="bg-orange-100 text-orange-700" />
            <StatCard label="Conversion rate" value={stats != null ? `${stats.conversionRate}%` : "—"} sub="email → paid" icon={TrendingUp} accent="bg-green-100 text-green-700" />
          </div>

          {/* Funnel */}
          {stats && <FunnelBar stats={stats} />}

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-[#E4D8CC]">
            {(["sessions", "carts"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-all duration-200 ${
                  view === v ? "border-[#C4622D] text-[#C4622D]" : "border-transparent text-[#8C7B6B] hover:text-[#1A1714]"
                }`}
              >
                {v === "sessions" ? (
                  <>
                    Portrait Generators
                    {stats?.capturedEmail ? (
                      <span className="ml-2 bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {stats.capturedEmail}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <>
                    Abandoned Carts
                    {stats?.abandonedCarts ? (
                      <span className="ml-2 bg-orange-100 text-orange-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {stats.abandonedCarts}
                      </span>
                    ) : null}
                  </>
                )}
              </button>
            ))}
          </div>

          {view === "sessions" ? <LeadSessionsView /> : <AbandonedCartsView />}
        </div>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#F5F0EA]">
        <AdminSidebar />
        <LeadsContent />
      </div>
    </AdminGuard>
  );
}
