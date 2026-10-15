"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  getPrintfulConnection,
  syncPrintfulCatalog,
  getPrintfulCatalog,
  getPrintfulMappings,
  savePrintfulMappings,
  getPrintfulWebhooks,
  registerPrintfulWebhooks,
  getPrintfulProductVariants,
  type PrintfulProduct,
  type PrintfulVariant,
  type PrintfulMapping,
  type PrintfulWebhook,
} from "@/lib/admin-api";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Wifi,
  Package,
  Link2,
  Webhook,
  Save,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Search,
  X,
} from "lucide-react";

type Tab = "catalog" | "mappings" | "webhooks";

// ── Our product IDs that need a Printful variant mapped ───────────────────────
const OUR_PRODUCTS = [
  { id: "poster-black-12x16",   label: "Poster · Black frame · 12×16\"" },
  { id: "poster-redoak-12x16",  label: "Poster · Red Oak frame · 12×16\"" },
  { id: "poster-white-12x16",   label: "Poster · White frame · 12×16\"" },
  { id: "poster-none-12x16",    label: "Poster · No frame · 12×16\"" },
  { id: "poster-black-18x24",   label: "Poster · Black frame · 18×24\"" },
  { id: "poster-redoak-18x24",  label: "Poster · Red Oak frame · 18×24\"" },
  { id: "poster-white-18x24",   label: "Poster · White frame · 18×24\"" },
  { id: "poster-none-18x24",    label: "Poster · No frame · 18×24\"" },
  { id: "poster-black-24x36",   label: "Poster · Black frame · 24×36\"" },
  { id: "poster-redoak-24x36",  label: "Poster · Red Oak frame · 24×36\"" },
  { id: "poster-white-24x36",   label: "Poster · White frame · 24×36\"" },
  { id: "poster-none-24x36",    label: "Poster · No frame · 24×36\"" },
  { id: "canvas-none-12x16",    label: "Canvas · 12×16\"" },
  { id: "canvas-none-18x24",    label: "Canvas · 18×24\"" },
  { id: "canvas-none-24x36",    label: "Canvas · 24×36\"" },
];

// ── Pill component ─────────────────────────────────────────────────────────────
function StatusPill({
  ok,
  label,
}: {
  ok: boolean | null;
  label: string;
}) {
  if (ok === null)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-white/50 bg-white/8 px-3 py-1 rounded-full">
        <Loader2 size={11} className="animate-spin" /> Checking…
      </span>
    );
  return ok ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
      <CheckCircle size={11} /> {label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-red-400 bg-red-400/10 px-3 py-1 rounded-full border border-red-400/20">
      <XCircle size={11} /> {label}
    </span>
  );
}

// ── Collapsible product card ───────────────────────────────────────────────────
function ProductCard({
  product,
  mappings,
  onAssign,
}: {
  product: PrintfulProduct;
  mappings: PrintfulMapping[];
  onAssign: (ourProductId: string, variantId: number) => void;
}) {
  const [open, setOpen]             = useState(false);
  const [variants, setVariants]     = useState<PrintfulVariant[] | null>(null);
  const [loading, setLoading]       = useState(false);
  const [assignOpen, setAssignOpen] = useState<number | null>(null);

  const handleToggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next) { setAssignOpen(null); return; }
    if (variants === null && !loading) {
      setLoading(true);
      try {
        const data = await getPrintfulProductVariants(product.productId);
        setVariants(data ?? []);
      } catch {
        setVariants([]);
      } finally {
        setLoading(false);
      }
    }
  };

  // Label of our product currently mapped to this variant (if any)
  const assignedLabel = (variantId: number) => {
    const ourId = mappings.find((m) => m.printfulVariantId === String(variantId))?.ourProductId;
    return ourId ? (OUR_PRODUCTS.find((p) => p.id === ourId)?.label ?? ourId) : null;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
        onClick={handleToggle}
      >
        {product.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded-lg shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{product.name}</p>
          <p className="text-xs text-white/40">{product.type}</p>
        </div>
        <span className="text-white/30">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {open && (
        <div className="border-t border-white/8 px-4 py-3">
          {loading ? (
            <div className="flex items-center gap-2 py-3 text-white/40 text-xs">
              <Loader2 size={12} className="animate-spin" /> Loading variants…
            </div>
          ) : (variants ?? []).length === 0 ? (
            <p className="text-xs text-white/30 py-2">No variants found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-white/40">
                    <th className="text-left pb-2 font-medium">Variant ID</th>
                    <th className="text-left pb-2 font-medium">Name</th>
                    <th className="text-left pb-2 font-medium">Size</th>
                    <th className="text-left pb-2 font-medium">Price</th>
                    <th className="text-left pb-2 font-medium">Assign to</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(variants ?? []).map((v) => {
                    const label = assignedLabel(v.variantId);
                    return (
                      <tr key={v.variantId}>
                        <td className="py-1.5 text-white/60 font-mono">{v.variantId}</td>
                        <td className="py-1.5 text-white/80">{v.name}</td>
                        <td className="py-1.5 text-white/50">{v.size ?? "—"}</td>
                        <td className="py-1.5 text-white/60">${v.price} {v.currency}</td>
                        <td className="py-1.5 relative">
                          <button
                            onClick={() => setAssignOpen(assignOpen === v.variantId ? null : v.variantId)}
                            className={`flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                              label
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25"
                                : "bg-[#C4622D]/15 text-[#C4622D] border border-[#C4622D]/20 hover:bg-[#C4622D]/25"
                            }`}
                          >
                            <Link2 size={10} />
                            {label ?? "Assign"}
                          </button>
                          {assignOpen === v.variantId && (
                            <div className="absolute left-0 top-8 z-30 w-64 bg-[#1A1714] border border-white/15 rounded-xl shadow-2xl py-1 max-h-64 overflow-y-auto">
                              <p className="px-3 py-1.5 text-[10px] text-white/30 font-medium uppercase tracking-wider border-b border-white/8">
                                Assign variant {v.variantId} to…
                              </p>
                              {OUR_PRODUCTS.map((p) => {
                                const isSelected = mappings.find((m) => m.ourProductId === p.id)?.printfulVariantId === String(v.variantId);
                                return (
                                  <button
                                    key={p.id}
                                    onClick={() => { onAssign(p.id, v.variantId); setAssignOpen(null); }}
                                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between gap-2 ${
                                      isSelected
                                        ? "text-emerald-400 bg-emerald-500/10"
                                        : "text-white/70 hover:bg-white/8 hover:text-white"
                                    }`}
                                  >
                                    <span>{p.label}</span>
                                    {isSelected && <CheckCircle size={11} />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Catalog tab (search + filter) ─────────────────────────────────────────────
function CatalogTab({
  products, syncedAt, syncing, connected, mappings, onSync, onAssign,
}: {
  products: PrintfulProduct[];
  syncedAt: string | null;
  syncing: boolean;
  connected: boolean | null;
  mappings: PrintfulMapping[];
  onSync: () => void;
  onAssign: (ourProductId: string, variantId: number) => void;
}) {
  const [search, setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const uniqueTypes = Array.from(new Set(products.map((p) => p.type))).sort();

  const visible = products.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q);
    const matchesType   = typeFilter === "all" || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* search */}
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full bg-white/6 border border-white/10 rounded-lg pl-8 pr-8 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#C4622D]/60"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C4622D]/60 shrink-0"
        >
          <option value="all">All types</option>
          {uniqueTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* sync button */}
        <button
          onClick={onSync}
          disabled={syncing || connected === false}
          className="flex items-center gap-2 bg-[#C4622D] hover:bg-[#b35527] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0"
        >
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Sync from Printful
        </button>
      </div>

      {/* meta row */}
      {products.length > 0 && (
        <p className="text-xs text-white/30">
          Showing {visible.length} of {products.length} products
          {syncedAt && <> · Last synced {new Date(syncedAt).toLocaleString()}</>}
        </p>
      )}

      {/* list */}
      {products.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-xl">
          <Wifi size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Click "Sync from Printful" to load your catalog</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
          <Search size={28} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No products match your search</p>
          <button onClick={() => { setSearch(""); setTypeFilter("all"); }} className="mt-2 text-xs text-[#C4622D] hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((p) => (
            <ProductCard key={p.productId} product={p} mappings={mappings} onAssign={onAssign} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function PrintfulPage() {
  const [tab, setTab]           = useState<Tab>("catalog");
  const [connected, setConnected]   = useState<boolean | null>(null);
  const [connError, setConnError]   = useState<string | null>(null);
  const [syncing, setSyncing]       = useState(false);
  const [products, setProducts]     = useState<PrintfulProduct[]>([]);
  const [syncedAt, setSyncedAt]     = useState<string | null>(null);
  const [mappings, setMappings]     = useState<PrintfulMapping[]>([]);
  const [mappingsDirty, setMappingsDirty] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);
  const [webhooks, setWebhooks]     = useState<PrintfulWebhook[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [registeringWh, setRegisteringWh] = useState(false);
  const [whError, setWhError]       = useState<string | null>(null);
  const [toast, setToast]           = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Connection check on mount ────────────────────────────────────────────
  useEffect(() => {
    getPrintfulConnection()
      .then((r) => {
        setConnected(r.connected);
        setConnError(r.error ?? null);
      })
      .catch(() => { setConnected(false); setConnError("Could not reach API"); });
  }, []);

  // ── Load catalog cache ────────────────────────────────────────────────────
  const loadCatalog = useCallback(async () => {
    try {
      const data = await getPrintfulCatalog();
      setProducts(data.products ?? []);
      setSyncedAt(data.syncedAt ?? null);
    } catch { /* catalog not yet synced */ }
  }, []);

  // ── Load mappings ─────────────────────────────────────────────────────────
  const loadMappings = useCallback(async () => {
    try {
      const raw = await getPrintfulMappings();
      const existing = new Map((raw ?? []).map((m: PrintfulMapping) => [m.ourProductId, m.printfulVariantId]));
      setMappings(
        OUR_PRODUCTS.map((p) => ({
          ourProductId:       p.id,
          printfulVariantId:  existing.get(p.id) ?? "",
        }))
      );
    } catch { /* mappings not yet saved */ }
  }, []);

  // ── Load webhooks ─────────────────────────────────────────────────────────
  const loadWebhooks = useCallback(async () => {
    const hooks = await getPrintfulWebhooks().catch(() => []);
    setWebhooks(hooks);
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);
  useEffect(() => { loadMappings(); }, [loadMappings]);
  useEffect(() => { loadWebhooks(); }, [loadWebhooks]);

  // ── Sync catalog ──────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      const data = await syncPrintfulCatalog();
      setProducts(data.products ?? []);
      setSyncedAt(data.syncedAt ?? null);
      showToast(`Synced ${data.products?.length ?? 0} products`);
    } catch (e: unknown) {
      showToast(`Sync failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSyncing(false);
    }
  };

  // ── Quick-assign from catalog tab ────────────────────────────────────────
  const handleAssign = async (ourProductId: string, variantId: number) => {
    const next = mappings.map((m) =>
      m.ourProductId === ourProductId
        ? { ...m, printfulVariantId: String(variantId) }
        : m
    );
    setMappings(next);
    try {
      await savePrintfulMappings(next);
      const label = OUR_PRODUCTS.find((p) => p.id === ourProductId)?.label ?? ourProductId;
      showToast(`Assigned ${variantId} → ${label}`);
    } catch {
      showToast("Failed to save mapping");
    }
  };

  // ── Save mappings ─────────────────────────────────────────────────────────
  const handleSaveMappings = async () => {
    setSavingMappings(true);
    try {
      await savePrintfulMappings(mappings);
      setMappingsDirty(false);
      showToast("Mappings saved");
    } catch (e: unknown) {
      showToast(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSavingMappings(false);
    }
  };

  // ── Register webhooks ─────────────────────────────────────────────────────
  const handleRegisterWebhooks = async () => {
    if (!webhookUrl) { setWhError("Enter your public base URL first"); return; }
    setRegisteringWh(true);
    setWhError(null);
    try {
      const hooks = await registerPrintfulWebhooks(webhookUrl);
      setWebhooks(hooks);
      showToast("Webhooks registered");
    } catch (e: unknown) {
      setWhError(e instanceof Error ? e.message : String(e));
    } finally {
      setRegisteringWh(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: "catalog",  label: "Catalog Sync",     icon: Package },
    { key: "mappings", label: "Product Mapping",  icon: Link2 },
    { key: "webhooks", label: "Webhooks",          icon: Webhook },
  ];

  return (
    <div className="flex min-h-screen bg-[#111009]">
      <AdminSidebar />
      <main className="flex-1 lg:ml-60 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-10 pt-20 lg:pt-10">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-white">Printful Integration</h1>
              <p className="text-sm text-white/40 mt-1">
                Sync your catalog, map variants, and manage webhooks
              </p>
            </div>
            <StatusPill
              ok={connected}
              label={connected ? "Connected" : connError ?? "Not connected"}
            />
          </div>

          {/* Connection error banner */}
          {connected === false && connError && (
            <div className="mb-6 flex items-start gap-3 bg-red-400/8 border border-red-400/20 rounded-xl p-4">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-300 font-medium">API key not configured or invalid</p>
                <p className="text-xs text-red-400/70 mt-0.5">
                  Go to Settings → Print Providers and enter your Printful private token.
                </p>
                <p className="text-xs text-red-400/50 mt-1 font-mono">{connError}</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-8">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === key
                    ? "bg-white/12 text-white"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* ── Tab: Catalog ──────────────────────────────────────────────── */}
          {tab === "catalog" && (
            <CatalogTab
              products={products}
              syncedAt={syncedAt}
              syncing={syncing}
              connected={connected}
              mappings={mappings}
              onSync={handleSync}
              onAssign={handleAssign}
            />
          )}

          {/* ── Tab: Mappings ──────────────────────────────────────────────── */}
          {tab === "mappings" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/50">
                  Enter the Printful variant ID for each product format. Find IDs in the Catalog tab.
                </p>
                <button
                  onClick={handleSaveMappings}
                  disabled={savingMappings || !mappingsDirty}
                  className="flex items-center gap-2 bg-[#C4622D] hover:bg-[#b35527] disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {savingMappings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save mappings
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="text-left px-4 py-3 text-white/40 font-medium text-xs">Our product</th>
                      <th className="text-left px-4 py-3 text-white/40 font-medium text-xs">Printful variant ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {mappings.map((m, i) => (
                      <tr key={m.ourProductId} className="hover:bg-white/3 transition-colors">
                        <td className="px-4 py-2.5 text-white/70 text-xs">
                          {OUR_PRODUCTS[i]?.label ?? m.ourProductId}
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={m.printfulVariantId}
                            placeholder="e.g. 12345"
                            onChange={(e) => {
                              const next = [...mappings];
                              next[i] = { ...next[i], printfulVariantId: e.target.value };
                              setMappings(next);
                              setMappingsDirty(true);
                            }}
                            className="bg-white/8 border border-white/12 text-white text-xs rounded-lg px-3 py-2 w-full max-w-[180px] focus:outline-none focus:border-[#C4622D] placeholder:text-white/25 font-mono"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab: Webhooks ──────────────────────────────────────────────── */}
          {tab === "webhooks" && (
            <div className="space-y-6">
              {/* Register form */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Register webhooks</h3>
                  <p className="text-xs text-white/40">
                    Tolif will listen for <code className="text-[#C4622D]">package_shipped</code>,{" "}
                    <code className="text-[#C4622D]">order_failed</code>, and{" "}
                    <code className="text-[#C4622D]">order_canceled</code> at{" "}
                    <code className="text-white/60">/api/webhooks/printful</code>.
                  </p>
                </div>
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://yourdomain.com"
                    className="flex-1 bg-white/8 border border-white/12 text-white text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#C4622D] placeholder:text-white/25"
                  />
                  <button
                    onClick={handleRegisterWebhooks}
                    disabled={registeringWh || connected === false}
                    className="flex items-center gap-2 bg-[#C4622D] hover:bg-[#b35527] disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {registeringWh
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Webhook size={14} />}
                    Register
                  </button>
                </div>
                {whError && (
                  <p className="text-xs text-red-400">{whError}</p>
                )}
              </div>

              {/* Current webhooks */}
              {webhooks.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
                  <Webhook size={28} className="text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No webhooks registered yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {webhooks.map((wh) => (
                    <div
                      key={wh.id}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-start gap-3"
                    >
                      <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-mono truncate">{wh.url}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {wh.types.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] font-medium bg-white/8 text-white/50 px-2 py-0.5 rounded-full"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#1A1714] border border-white/15 text-white text-sm px-4 py-3 rounded-xl shadow-xl z-50 animate-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function PrintfulAdminPage() {
  return (
    <AdminGuard>
      <PrintfulPage />
    </AdminGuard>
  );
}
