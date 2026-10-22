"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Link2, Plus, Copy, Check, Trash2, ExternalLink, X,
  Loader2, Search, ImageIcon, Tag,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getAdminTemplates, getSettings, saveSetting, type AdminTemplate } from "@/lib/admin-api";

const SETTINGS_KEY = "admin_campaign_links";

interface CampaignLink {
  id: string;
  name: string;
  templateSlug: string;
  templateName: string;
  templateImageKey?: string;
  createdAt: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function buildUrl(base: string, link: CampaignLink): string {
  const params = new URLSearchParams();
  params.set("template", link.templateSlug);
  if (link.utmSource)   params.set("utm_source",   link.utmSource);
  if (link.utmMedium)   params.set("utm_medium",   link.utmMedium);
  if (link.utmCampaign) params.set("utm_campaign", link.utmCampaign);
  return `${base}/create?${params.toString()}`;
}

// ── Create Link Modal ──────────────────────────────────────────────────────────
function CreateLinkModal({
  templates,
  onSave,
  onClose,
}: {
  templates: AdminTemplate[];
  onSave: (link: CampaignLink) => void;
  onClose: () => void;
}) {
  const [name,        setName]        = useState("");
  const [templateId,  setTemplateId]  = useState("");
  const [utmSource,   setUtmSource]   = useState("");
  const [utmMedium,   setUtmMedium]   = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [search,      setSearch]      = useState("");

  const activeTemplates = templates.filter((t) => t.isActive);
  const filtered = activeTemplates.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );
  const selected = templates.find((t) => t.id === templateId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const canSave = name.trim() && templateId;

  const handleSave = () => {
    if (!canSave || !selected) return;
    onSave({
      id: generateId(),
      name: name.trim(),
      templateSlug: selected.slug,
      templateName: selected.name,
      templateImageKey: selected.templateImageKey,
      createdAt: new Date().toISOString(),
      utmSource:   utmSource.trim()   || undefined,
      utmMedium:   utmMedium.trim()   || undefined,
      utmCampaign: utmCampaign.trim() || undefined,
    });
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E4D8CC] bg-[#FAF6F0]">
          <div>
            <h2 className="text-base font-semibold text-[#1A1714]">Create Campaign Link</h2>
            <p className="text-xs text-[#8C7B6B] mt-0.5">A shareable link that opens the create page with a pre-selected template</p>
          </div>
          <button onClick={onClose} className="text-[#8C7B6B] hover:text-[#1A1714]"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

          {/* Link name */}
          <div>
            <label className="text-xs font-semibold text-[#8C7B6B] uppercase tracking-wider block mb-1.5">
              Link name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Facebook — Summer Families 2024"
              autoFocus
              className="w-full border border-[#E4D8CC] rounded-xl px-4 py-2.5 text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D]"
            />
          </div>

          {/* Template selector */}
          <div>
            <label className="text-xs font-semibold text-[#8C7B6B] uppercase tracking-wider block mb-1.5">
              Template <span className="text-red-400">*</span>
            </label>

            {/* Search */}
            <div className="relative mb-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0A090] pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-[#E4D8CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] placeholder:text-[#C8BAB0]"
              />
            </div>

            <div className="max-h-52 overflow-y-auto border border-[#E4D8CC] rounded-xl divide-y divide-[#F2EAE0]">
              {filtered.length === 0 ? (
                <p className="text-xs text-[#8C7B6B] text-center py-6">No templates found</p>
              ) : filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateId(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    templateId === t.id
                      ? "bg-[#FFF5F0] border-l-2 border-l-[#C4622D]"
                      : "hover:bg-[#FAF6F0]"
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#F2EAE0] shrink-0">
                    {t.templateImageKey ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${API_BASE}/api/storage/preview?key=${encodeURIComponent(t.templateImageKey)}`}
                        alt={t.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon size={14} className="text-[#C8BAB0]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#1A1714] truncate">{t.name}</p>
                    <p className="text-[10px] text-[#8C7B6B]">{t.category}{t.style ? ` · ${t.style}` : ""}</p>
                  </div>
                  {templateId === t.id && (
                    <Check size={14} className="text-[#C4622D] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* UTM params */}
          <div>
            <p className="text-xs font-semibold text-[#8C7B6B] uppercase tracking-wider mb-2">UTM tracking (optional)</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Source", value: utmSource, set: setUtmSource, placeholder: "facebook" },
                { label: "Medium", value: utmMedium, set: setUtmMedium, placeholder: "cpc" },
                { label: "Campaign", value: utmCampaign, set: setUtmCampaign, placeholder: "summer24" },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <label className="text-[10px] text-[#8C7B6B] font-medium block mb-1">{label}</label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                    className="w-full border border-[#E4D8CC] rounded-lg px-2.5 py-2 text-xs text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#E4D8CC] bg-[#FAF6F0] flex gap-3">
          <button onClick={onClose} className="flex-1 border border-[#E4D8CC] text-[#8C7B6B] text-sm font-medium py-2.5 rounded-xl hover:bg-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 bg-[#C4622D] hover:bg-[#9E4A1E] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Link2 size={14} /> Create link
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
function LinksContent() {
  const [links,     setLinks]     = useState<CampaignLink[]>([]);
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copied,    setCopied]    = useState<string | null>(null);
  const [siteUrl,   setSiteUrl]   = useState("");
  const [search,    setSearch]    = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setSiteUrl(window.location.origin);
  }, []);

  const persistLinks = useCallback(async (updated: CampaignLink[]) => {
    setSaving(true);
    try {
      await saveSetting(SETTINGS_KEY, JSON.stringify(updated));
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([getAdminTemplates(), getSettings()])
      .then(([tmpl, settings]) => {
        setTemplates(tmpl);
        const stored = settings.find((s) => s.key === SETTINGS_KEY);
        if (stored?.value) {
          try { setLinks(JSON.parse(stored.value)); } catch { /* ignore */ }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (link: CampaignLink) => {
    const updated = [link, ...links];
    setLinks(updated);
    setShowModal(false);
    await persistLinks(updated);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this link?")) return;
    const updated = links.filter((l) => l.id !== id);
    setLinks(updated);
    await persistLinks(updated);
  };

  const copyUrl = (link: CampaignLink) => {
    const url = buildUrl(siteUrl, link);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(link.id);
      setTimeout(() => setCopied(null), 1800);
    });
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

  const filtered = search.trim()
    ? links.filter((l) =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.templateName.toLowerCase().includes(search.toLowerCase())
      )
    : links;

  // Group by template for the "templates with links" overview
  const templateLinkCount = links.reduce<Record<string, number>>((acc, l) => {
    acc[l.templateSlug] = (acc[l.templateSlug] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="lg:pl-60">
      <div className="pt-16 lg:pt-0">
        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-display font-light text-[#1A1714]">Campaign Links</h1>
              <p className="text-sm text-[#8C7B6B] mt-1">
                Create shareable links that open the create page with a specific template pre-selected.
                Perfect for Facebook/Instagram ads.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] text-white font-medium px-5 py-2.5 rounded-xl transition-colors shrink-0"
            >
              <Plus size={16} /> New link
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-[#C4622D]" />
            </div>
          ) : (
            <>
              {/* Template coverage overview */}
              {templates.filter((t) => t.isActive).length > 0 && (
                <div className="bg-white border border-[#E4D8CC] rounded-2xl p-5 mb-6">
                  <p className="text-xs font-semibold text-[#8C7B6B] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Tag size={12} className="text-[#C4622D]" />
                    Templates &amp; their assigned links
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {templates.filter((t) => t.isActive).map((t) => {
                      const count = templateLinkCount[t.slug] ?? 0;
                      return (
                        <div key={t.id} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${count > 0 ? "border-[#C4622D]/30 bg-[#FFF5F0]" : "border-[#E4D8CC] bg-[#FAF6F0]"}`}>
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#F2EAE0] shrink-0">
                            {t.templateImageKey ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`${API_BASE}/api/storage/preview?key=${encodeURIComponent(t.templateImageKey)}`}
                                alt={t.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={12} className="text-[#C8BAB0]" /></div>}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-[#1A1714] truncate">{t.name}</p>
                            <p className={`text-[10px] ${count > 0 ? "text-[#C4622D] font-medium" : "text-[#C8BAB0]"}`}>
                              {count} link{count !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search */}
              {links.length > 0 && (
                <div className="relative mb-4 max-w-xs">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0A090] pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search links…"
                    className="w-full pl-8 pr-8 py-2.5 border border-[#E4D8CC] rounded-xl text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D]"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#B0A090] hover:text-[#1A1714]">
                      <X size={13} />
                    </button>
                  )}
                </div>
              )}

              {/* Links table */}
              {links.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-[#E4D8CC] rounded-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-[#C4622D]/10 flex items-center justify-center mx-auto mb-4">
                    <Link2 size={22} className="text-[#C4622D]" />
                  </div>
                  <p className="text-[#1A1714] font-medium mb-1">No campaign links yet</p>
                  <p className="text-sm text-[#8C7B6B] mb-5">Create a link to share on Facebook, Instagram, or anywhere else.</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
                  >
                    <Plus size={14} /> Create your first link
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-sm text-[#8C7B6B]">No links match your search.</div>
              ) : (
                <div className="bg-white border border-[#E4D8CC] rounded-2xl overflow-hidden">
                  <div className="divide-y divide-[#F2EAE0]">
                    {filtered.map((link) => {
                      const url  = buildUrl(siteUrl, link);
                      const done = copied === link.id;
                      return (
                        <div key={link.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAF6F0] transition-colors">
                          {/* Template thumbnail */}
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#F2EAE0] shrink-0">
                            {link.templateImageKey ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`${API_BASE}/api/storage/preview?key=${encodeURIComponent(link.templateImageKey)}`}
                                alt={link.templateName}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={14} className="text-[#C8BAB0]" /></div>}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-[#1A1714] truncate">{link.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[11px] text-[#C4622D] bg-[#FFF5F0] border border-[#F0CDB8] px-2 py-0.5 rounded-full font-medium">
                                {link.templateName}
                              </span>
                              {link.utmSource && (
                                <span className="text-[10px] text-[#8C7B6B] bg-[#F5F0E8] px-1.5 py-0.5 rounded-full">
                                  {link.utmSource}{link.utmMedium ? `/${link.utmMedium}` : ""}
                                </span>
                              )}
                              <span className="text-[10px] text-[#C8BAB0]">
                                {new Date(link.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#B0A090] font-mono truncate mt-0.5">{url}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg text-[#8C7B6B] hover:text-[#C4622D] hover:bg-[#F2EAE0] transition-colors"
                              title="Open link"
                            >
                              <ExternalLink size={15} />
                            </a>
                            <button
                              onClick={() => copyUrl(link)}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                                done
                                  ? "bg-green-100 text-green-700"
                                  : "bg-[#C4622D]/10 text-[#C4622D] hover:bg-[#C4622D]/20"
                              }`}
                            >
                              {done ? <Check size={13} /> : <Copy size={13} />}
                              {done ? "Copied!" : "Copy"}
                            </button>
                            <button
                              onClick={() => handleDelete(link.id)}
                              className="p-2 rounded-lg text-[#8C7B6B] hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete link"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {saving && (
                <p className="text-xs text-[#8C7B6B] mt-3 flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin" /> Saving…
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {showModal && (
        <CreateLinkModal
          templates={templates}
          onSave={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

export default function LinksPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#F5F0EA]">
        <AdminSidebar />
        <LinksContent />
      </div>
    </AdminGuard>
  );
}
