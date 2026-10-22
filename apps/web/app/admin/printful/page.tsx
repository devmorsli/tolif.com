"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  getPrintfulConnection,
  syncPrintfulCatalog,
  getPrintfulCatalog,
  getPrintfulWebhooks,
  registerPrintfulWebhooks,
  getPrintfulProductVariants,
  getPrintfulCategories,
  syncPrintfulCategory,
  getVariantMappings,
  setPrintfulVariantId,
  getPrintfulMappings,
  addProductSizeFromPrintful,
  deleteVariant,
  updateVariant,
  type PrintfulProduct,
  type PrintfulVariant,
  type PrintfulWebhook,
  type PrintfulCategory,
  type VariantMapping,
  type PrintfulMapping,
} from "@/lib/admin-api";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Wifi,
  Package,
  Link2,
  Webhook,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Plus,
  Trash2,
} from "lucide-react";

type Tab = "catalog" | "mappings" | "webhooks";

const CURRENCIES = ["EUR", "USD", "GBP", "CAD", "AUD"];

/** Convert a Printful size string like "12x16" or "12×16\"" to "30 × 40 cm" format */
function inchToCm(size: string): string {
  const match = size.replace(/["""]/g, "").match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (!match) return "";
  const w = Math.round(parseFloat(match[1]) * 2.54);
  const h = Math.round(parseFloat(match[2]) * 2.54);
  return `${w} × ${h} cm`;
}

// ── Pill component ─────────────────────────────────────────────────────────────
function StatusPill({ ok, label }: { ok: boolean | null; label: string }) {
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

// ── Add Size Modal ─────────────────────────────────────────────────────────────
// Opened from a Printful catalog variant. Creates a new product variant in DB.
type ProductCategory = "poster" | "canvas" | "framedprint";
type FrameColor = "black" | "red-oak" | "white";

function AddSizeModal({
  variant,
  onAdded,
  onClose,
}: {
  variant: PrintfulVariant;
  onAdded: (productName: string) => void;
  onClose: () => void;
}) {
  const cmEquiv = inchToCm(variant.size ?? variant.name);

  const [category, setCategory] = useState<ProductCategory>("poster");
  const [frameColor, setFrameColor] = useState<FrameColor>("black");
  const [sizeCm, setSizeCm] = useState(cmEquiv);
  const [sizeUnit, setSizeUnit] = useState<"cm" | "in">("cm");
  const [inchW, setInchW] = useState("");
  const [inchH, setInchH] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInchChange = (w: string, h: string) => {
    setInchW(w);
    setInchH(h);
    const wn = parseFloat(w);
    const hn = parseFloat(h);
    if (!isNaN(wn) && !isNaN(hn) && wn > 0 && hn > 0) {
      const wcm = Math.round(wn * 2.54);
      const hcm = Math.round(hn * 2.54);
      setSizeCm(`${wcm} × ${hcm} cm`);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async () => {
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) { setError("Enter a valid price."); return; }
    if (!sizeCm.trim()) { setError("Enter the size label (e.g. 30 × 40 cm)."); return; }

    setSaving(true);
    setError(null);
    try {
      const result = await addProductSizeFromPrintful({
        printfulVariantId: String(variant.variantId),
        productType: category,
        frameName: category === "framedprint" ? frameColor : null,
        sizeCm: sizeCm.trim(),
        price: p,
        currency,
      });
      onAdded(result.productName);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add.");
      setSaving(false);
    }
  };

  const CATEGORIES: { key: ProductCategory; label: string; hint: string }[] = [
    { key: "poster",      label: "Poster Print",  hint: "Wall art print, rolled or flat" },
    { key: "canvas",      label: "Canvas Print",  hint: "Gallery-wrapped canvas" },
    { key: "framedprint", label: "Framed Print",  hint: "Ready-to-hang with frame" },
  ];

  const FRAME_COLORS: { key: FrameColor; label: string; swatch: React.CSSProperties }[] = [
    { key: "black",   label: "Black",   swatch: { background: "#1C1C1C" } },
    { key: "red-oak", label: "Red Oak", swatch: { background: "linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #6B3311 100%)" } },
    { key: "white",   label: "White",   swatch: { background: "#F5F5F5", border: "1px solid #C0B5A8" } },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-[#1A1714] border border-white/15 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-white/8">
          <div>
            <p className="text-sm font-semibold text-white">Add to Products</p>
            <p className="text-xs text-white/40 mt-0.5 font-mono">
              Printful ID {variant.variantId} · {variant.name}
              {cmEquiv && <span className="text-[#C4622D] ml-1">≈ {cmEquiv}</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white ml-4 shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">

          {/* Category */}
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Category</p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(({ key, label, hint }) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`text-left rounded-xl border-2 p-3 transition-all ${
                    category === key ? "border-[#C4622D] bg-[#C4622D]/10" : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <p className={`text-xs font-semibold ${category === key ? "text-[#C4622D]" : "text-white/70"}`}>{label}</p>
                  <p className="text-[10px] text-white/30 mt-0.5 leading-tight">{hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Frame color (only for framed) */}
          {category === "framedprint" && (
            <div>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Frame color</p>
              <div className="grid grid-cols-3 gap-2">
                {FRAME_COLORS.map(({ key, label, swatch }) => (
                  <button
                    key={key}
                    onClick={() => setFrameColor(key)}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 transition-all ${
                      frameColor === key ? "border-[#C4622D] bg-[#C4622D]/10" : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="w-5 h-5 rounded shrink-0" style={swatch} />
                    <span className={`text-xs font-medium ${frameColor === key ? "text-[#C4622D]" : "text-white/60"}`}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Size label <span className="text-white/25 font-normal normal-case tracking-normal">(must match checkout format)</span>
              </label>
              <div className="flex items-center gap-0.5 bg-white/8 border border-white/12 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setSizeUnit("cm")}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-colors ${sizeUnit === "cm" ? "bg-[#C4622D] text-white" : "text-white/40 hover:text-white/70"}`}
                >cm</button>
                <button
                  type="button"
                  onClick={() => setSizeUnit("in")}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-colors ${sizeUnit === "in" ? "bg-[#C4622D] text-white" : "text-white/40 hover:text-white/70"}`}
                >in</button>
              </div>
            </div>
            {sizeUnit === "cm" ? (
              <>
                <input
                  type="text"
                  value={sizeCm}
                  onChange={(e) => setSizeCm(e.target.value)}
                  placeholder="e.g. 30 × 40 cm"
                  className="w-full bg-white/8 border border-white/12 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#C4622D] placeholder:text-white/25"
                />
                <p className="text-[10px] text-white/25 mt-1">Format: "30 × 40 cm", "45 × 60 cm", "60 × 90 cm"</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={inchW}
                    onChange={(e) => handleInchChange(e.target.value, inchH)}
                    placeholder="W"
                    className="flex-1 bg-white/8 border border-white/12 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#C4622D] placeholder:text-white/25"
                  />
                  <span className="text-white/40 text-sm font-medium">×</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={inchH}
                    onChange={(e) => handleInchChange(inchW, e.target.value)}
                    placeholder="H"
                    className="flex-1 bg-white/8 border border-white/12 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#C4622D] placeholder:text-white/25"
                  />
                  <span className="text-white/40 text-xs">in</span>
                </div>
                {sizeCm && (
                  <p className="text-[10px] text-[#C4622D]/70 mt-1">≈ {sizeCm}</p>
                )}
              </>
            )}
          </div>

          {/* Price */}
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Price</p>
            <div className="flex gap-2">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-white/8 border border-white/12 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#C4622D]"
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-white/8 border border-white/12 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#C4622D] placeholder:text-white/25"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/8 border border-red-400/15 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-[#C4622D] hover:bg-[#b35527] disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add to Products
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Collapsible product card ───────────────────────────────────────────────────
function ProductCard({
  product,
  dbVariants,
  onAdded,
}: {
  product: PrintfulProduct;
  dbVariants: VariantMapping[];
  onAdded: (productName: string) => void;
}) {
  const [open, setOpen]                   = useState(false);
  const [variants, setVariants]           = useState<PrintfulVariant[] | null>(null);
  const [loading, setLoading]             = useState(false);
  const [addVariant, setAddVariant]       = useState<PrintfulVariant | null>(null);

  const handleToggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
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

  // Check if a Printful variant is already mapped in our DB
  const mappedLabel = (variantId: number) => {
    const dv = dbVariants.find(v => v.printfulVariantId === String(variantId));
    return dv ? `${dv.productName} · ${dv.size}` : null;
  };

  return (
    <>
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
                      <th className="text-left pb-2 font-medium">ID</th>
                      <th className="text-left pb-2 font-medium">Name / Size</th>
                      <th className="text-left pb-2 font-medium">≈ cm</th>
                      <th className="text-left pb-2 font-medium">Price</th>
                      <th className="text-left pb-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(variants ?? []).map((v) => {
                      const label  = mappedLabel(v.variantId);
                      const cmSize = inchToCm(v.size ?? "");
                      return (
                        <tr key={v.variantId}>
                          <td className="py-2 text-white/50 font-mono pr-3">{v.variantId}</td>
                          <td className="py-2 text-white/80 pr-3">
                            <p>{v.name}</p>
                            {v.size && <p className="text-white/40 text-[10px]">{v.size}</p>}
                          </td>
                          <td className="py-2 text-[#C4622D]/80 text-[10px] pr-3">{cmSize || "—"}</td>
                          <td className="py-2 text-white/60 pr-3">${v.price} {v.currency}</td>
                          <td className="py-2">
                            {label ? (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg whitespace-nowrap">
                                <CheckCircle size={9} /> {label}
                              </span>
                            ) : (
                              <button
                                onClick={() => setAddVariant(v)}
                                className="flex items-center gap-1.5 text-[10px] font-medium bg-[#C4622D]/15 text-[#C4622D] border border-[#C4622D]/20 hover:bg-[#C4622D]/25 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                              >
                                <Plus size={10} />
                                Add size
                              </button>
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

      {addVariant && (
        <AddSizeModal
          variant={addVariant}
          onAdded={(productName) => {
            setAddVariant(null);
            onAdded(productName);
          }}
          onClose={() => setAddVariant(null)}
        />
      )}
    </>
  );
}

// ── Catalog tab ───────────────────────────────────────────────────────────────
function CatalogTab({
  products, syncedAt, syncing, connected, dbVariants, onSync, onAdded, onLoadCatalog,
}: {
  products: PrintfulProduct[];
  syncedAt: string | null;
  syncing: boolean;
  connected: boolean | null;
  dbVariants: VariantMapping[];
  onSync: () => void;
  onAdded: (productName: string) => void;
  onLoadCatalog: () => Promise<void>;
}) {
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Category browser state
  const [catOpen, setCatOpen]         = useState(false);
  const [categories, setCategories]   = useState<PrintfulCategory[] | null>(null);
  const [loadingCats, setLoadingCats] = useState(false);
  const [syncingCat, setSyncingCat]   = useState<number | null>(null);
  const [catToast, setCatToast]       = useState<string | null>(null);

  const showCatToast = (msg: string) => {
    setCatToast(msg);
    setTimeout(() => setCatToast(null), 3000);
  };

  const handleLoadCategories = async () => {
    setLoadingCats(true);
    try { setCategories(await getPrintfulCategories()); }
    catch { setCategories([]); }
    finally { setLoadingCats(false); }
  };

  const handleSyncCategory = async (cat: PrintfulCategory) => {
    setSyncingCat(cat.id);
    try {
      const result = await syncPrintfulCategory(cat.id);
      await onLoadCatalog();
      showCatToast(`Added ${result.added} product${result.added !== 1 ? "s" : ""} from "${cat.title}" (${result.total} total)`);
    } catch (e: unknown) {
      showCatToast(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setSyncingCat(null); }
  };

  const uniqueTypes = Array.from(new Set(products.map((p) => p.type))).sort();
  const visible = products.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q);
    const matchesType   = typeFilter === "all" || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full bg-white/6 border border-white/10 rounded-lg pl-8 pr-8 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#C4622D]/60"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              <X size={13} />
            </button>
          )}
        </div>
        <select
          value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C4622D]/60 shrink-0"
        >
          <option value="all">All types</option>
          {uniqueTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          onClick={onSync} disabled={syncing || connected === false}
          className="flex items-center gap-2 bg-[#C4622D] hover:bg-[#b35527] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0"
        >
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Sync from Printful
        </button>
      </div>

      {/* Hint */}
      <div className="flex items-start gap-2.5 bg-white/4 border border-white/8 rounded-xl px-4 py-3">
        <Plus size={13} className="text-[#C4622D] shrink-0 mt-0.5" />
        <p className="text-xs text-white/50">
          Expand a product, find the size you want, and click <strong className="text-white/70">Add size</strong> to create it in your product list with a price.
          Printful variant IDs are linked automatically.
        </p>
      </div>

      {/* Category browser */}
      <div className="border border-white/10 rounded-xl overflow-hidden">
        <button
          onClick={() => {
            const next = !catOpen;
            setCatOpen(next);
            if (next && categories === null && !loadingCats) handleLoadCategories();
          }}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Package size={13} className="text-white/40" />
            <span className="text-sm text-white/70 font-medium">Sync by Printful category</span>
            <span className="text-[10px] text-white/30 bg-white/6 px-2 py-0.5 rounded-full">find wall art, posters, canvas…</span>
          </div>
          <span className="text-white/30">{catOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        </button>

        {catOpen && (
          <div className="border-t border-white/8 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/40">Pick a category and click Sync to merge its products into your catalog.</p>
              <button onClick={handleLoadCategories} disabled={loadingCats}
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors disabled:opacity-40">
                {loadingCats ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Reload
              </button>
            </div>
            {loadingCats && categories === null ? (
              <div className="flex items-center gap-2 py-4 text-white/40 text-xs justify-center">
                <Loader2 size={14} className="animate-spin" /> Loading categories…
              </div>
            ) : (categories ?? []).length === 0 ? (
              <p className="text-xs text-white/30 py-3 text-center">No categories found</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-80 overflow-y-auto pr-1">
                {(categories ?? []).map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between gap-3 bg-white/4 hover:bg-white/7 border border-white/8 rounded-lg px-3 py-2 transition-colors">
                    <span className="text-xs text-white/70 truncate">{cat.title}</span>
                    <button
                      onClick={() => handleSyncCategory(cat)}
                      disabled={syncingCat === cat.id || connected === false}
                      className="flex items-center gap-1 text-[10px] font-medium text-[#C4622D] bg-[#C4622D]/12 border border-[#C4622D]/20 hover:bg-[#C4622D]/22 disabled:opacity-40 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      {syncingCat === cat.id ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                      Sync
                    </button>
                  </div>
                ))}
              </div>
            )}
            {catToast && (
              <p className="text-xs text-emerald-400 bg-emerald-400/8 border border-emerald-400/15 rounded-lg px-3 py-2">{catToast}</p>
            )}
          </div>
        )}
      </div>

      {/* Meta row */}
      {products.length > 0 && (
        <p className="text-xs text-white/30">
          Showing {visible.length} of {products.length} products
          {syncedAt && <> · Last synced {new Date(syncedAt).toLocaleString()}</>}
        </p>
      )}

      {/* Product list */}
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
            <ProductCard key={p.productId} product={p} dbVariants={dbVariants} onAdded={onAdded} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function PrintfulPage() {
  const [tab, setTab]                     = useState<Tab>("catalog");
  const [connected, setConnected]         = useState<boolean | null>(null);
  const [connError, setConnError]         = useState<string | null>(null);
  const [syncing, setSyncing]             = useState(false);
  const [products, setProducts]           = useState<PrintfulProduct[]>([]);
  const [syncedAt, setSyncedAt]           = useState<string | null>(null);
  const [dbVariants, setDbVariants]       = useState<VariantMapping[]>([]);
  const [savingVariant, setSavingVariant] = useState<string | null>(null);
  const [deletingVariant, setDeletingVariant] = useState<string | null>(null);
  const [webhooks, setWebhooks]           = useState<PrintfulWebhook[]>([]);
  const [webhookUrl, setWebhookUrl]       = useState("");
  const [registeringWh, setRegisteringWh] = useState(false);
  const [whError, setWhError]             = useState<string | null>(null);
  const [toast, setToast]                 = useState<string | null>(null);
  const [oldMappings, setOldMappings]     = useState<PrintfulMapping[]>([]);
  const [oldMappingsOpen, setOldMappingsOpen] = useState(true);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    getPrintfulConnection()
      .then((r) => { setConnected(r.connected); setConnError(r.error ?? null); })
      .catch(() => { setConnected(false); setConnError("Could not reach API"); });
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      const data = await getPrintfulCatalog();
      setProducts(data.products ?? []);
      setSyncedAt(data.syncedAt ?? null);
    } catch { /* not yet synced */ }
  }, []);

  const loadDbVariants = useCallback(async () => {
    try { setDbVariants((await getVariantMappings()) ?? []); }
    catch { /* ignore */ }
  }, []);

  const loadWebhooks = useCallback(async () => {
    setWebhooks(await getPrintfulWebhooks().catch(() => []));
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);
  useEffect(() => { loadDbVariants(); }, [loadDbVariants]);
  useEffect(() => { loadWebhooks(); }, [loadWebhooks]);
  useEffect(() => {
    getPrintfulMappings().then((raw) => setOldMappings(raw ?? [])).catch(() => {});
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const data = await syncPrintfulCatalog();
      setProducts(data.products ?? []);
      setSyncedAt(data.syncedAt ?? null);
      showToast(`Synced ${data.products?.length ?? 0} products`);
    } catch (e: unknown) {
      showToast(`Sync failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setSyncing(false); }
  };

  const handleAdded = async (productName: string) => {
    showToast(`✓ Added to "${productName}"`);
    await loadDbVariants();
  };

  const handleRegisterWebhooks = async () => {
    if (!webhookUrl) { setWhError("Enter your public base URL first"); return; }
    setRegisteringWh(true); setWhError(null);
    try {
      setWebhooks(await registerPrintfulWebhooks(webhookUrl));
      showToast("Webhooks registered");
    } catch (e: unknown) {
      setWhError(e instanceof Error ? e.message : String(e));
    } finally { setRegisteringWh(false); }
  };

  const tabs: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: "catalog",  label: "Catalog Sync",    icon: Package },
    { key: "mappings", label: "Product Mapping", icon: Link2 },
    { key: "webhooks", label: "Webhooks",         icon: Webhook },
  ];

  // Non-digital variants for mappings tab
  const physicalVariants = dbVariants.filter(
    (dv) => dv.productType?.toLowerCase() !== "digital"
  );

  return (
    <div className="flex min-h-screen bg-[#111009]">
      <AdminSidebar />
      <main className="flex-1 lg:ml-60 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-10 pt-20 lg:pt-10">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-white">Printful Integration</h1>
              <p className="text-sm text-white/40 mt-1">Sync your catalog, map variants, and manage webhooks</p>
            </div>
            <StatusPill ok={connected} label={connected ? "Connected" : connError ?? "Not connected"} />
          </div>

          {/* Connection error banner */}
          {connected === false && connError && (
            <div className="mb-6 flex items-start gap-3 bg-red-400/8 border border-red-400/20 rounded-xl p-4">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-300 font-medium">API key not configured or invalid</p>
                <p className="text-xs text-red-400/70 mt-0.5">Go to Settings → Print Providers and enter your Printful private token.</p>
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
                  tab === key ? "bg-white/12 text-white" : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* ── Tab: Catalog ──────────────────────────────────────────────────── */}
          {tab === "catalog" && (
            <CatalogTab
              products={products}
              syncedAt={syncedAt}
              syncing={syncing}
              connected={connected}
              dbVariants={dbVariants}
              onSync={handleSync}
              onAdded={handleAdded}
              onLoadCatalog={loadCatalog}
            />
          )}

          {/* ── Tab: Mappings ──────────────────────────────────────────────────── */}
          {tab === "mappings" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70 font-medium">Your physical product variants</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    Add sizes from the Catalog tab, or type Printful IDs directly here.
                    Digital products are hidden — they don&apos;t need Printful IDs.
                  </p>
                </div>
                <button onClick={loadDbVariants} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors">
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>

              {/* Previous mappings reference */}
              {oldMappings.length > 0 && (
                <div className="border border-amber-400/20 rounded-xl overflow-hidden bg-amber-400/5">
                  <button
                    onClick={() => setOldMappingsOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle size={13} className="text-amber-400 shrink-0" />
                      <span className="text-sm text-amber-300 font-medium">Previous mappings (reference)</span>
                      <span className="text-[10px] text-amber-400/60 bg-amber-400/10 px-2 py-0.5 rounded-full">
                        {oldMappings.length} entries · copy IDs into the table below
                      </span>
                    </div>
                    <span className="text-white/30">
                      {oldMappingsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  </button>
                  {oldMappingsOpen && (
                    <div className="border-t border-amber-400/15 px-4 py-3">
                      <p className="text-xs text-amber-400/60 mb-3">
                        These are the IDs from your old mapping setup. Copy each Printful variant ID and paste it into the matching row below, or use the Catalog tab to add sizes with a single click.
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-white/40">
                              <th className="text-left pb-2 font-medium">Old product key</th>
                              <th className="text-left pb-2 font-medium">Printful variant ID</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {oldMappings.map((m) => (
                              <tr key={m.ourProductId}>
                                <td className="py-1.5 text-white/60 font-mono">{m.ourProductId}</td>
                                <td className="py-1.5">
                                  {m.printfulVariantId ? (
                                    <span className="font-mono text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded select-all cursor-text">
                                      {m.printfulVariantId}
                                    </span>
                                  ) : (
                                    <span className="text-white/25 italic text-[10px]">not set</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Physical variants table */}
              {physicalVariants.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
                  <Package size={28} className="text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No physical product variants yet</p>
                  <p className="text-white/25 text-xs mt-1">Use the Catalog tab to add sizes from Printful</p>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/8">
                        <th className="text-left px-4 py-3 text-white/40 font-medium text-xs">Product &amp; size</th>
                        <th className="text-left px-4 py-3 text-white/40 font-medium text-xs">Printful variant ID</th>
                        <th className="text-left px-4 py-3 text-white/40 font-medium text-xs">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {physicalVariants.map((dv) => (
                        <tr key={dv.id} className="hover:bg-white/3 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-white/80 text-xs font-medium">{dv.productName}</p>
                            <p className="text-white/40 text-xs">{dv.size} · {dv.currency} {dv.price.toFixed(2)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={dv.printfulVariantId ?? ""}
                              placeholder="e.g. 12345"
                              onChange={(e) => {
                                setDbVariants(prev => prev.map(v => v.id === dv.id
                                  ? { ...v, printfulVariantId: e.target.value || undefined }
                                  : v));
                              }}
                              onBlur={async (e) => {
                                const val = e.target.value.trim() || null;
                                const current = dbVariants.find(v => v.id === dv.id)?.printfulVariantId ?? null;
                                if ((val ?? "") === (current ?? "")) return;
                                setSavingVariant(dv.id);
                                try {
                                  await setPrintfulVariantId(dv.id, val);
                                  setDbVariants(prev => prev.map(v => v.id === dv.id
                                    ? { ...v, printfulVariantId: val ?? undefined }
                                    : v));
                                  showToast(`Saved: ${dv.productName} · ${dv.size}`);
                                } catch (err: unknown) {
                                  showToast(`Failed: ${err instanceof Error ? err.message : String(err)}`);
                                } finally { setSavingVariant(null); }
                              }}
                              className="bg-white/8 border border-white/12 text-white text-xs rounded-lg px-3 py-2 w-full max-w-[160px] focus:outline-none focus:border-[#C4622D] placeholder:text-white/25 font-mono"
                            />
                          </td>
                          <td className="px-4 py-3">
                            {savingVariant === dv.id ? (
                              <Loader2 size={12} className="animate-spin text-white/40" />
                            ) : dv.printfulVariantId ? (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full w-fit">
                                <CheckCircle size={9} /> Mapped
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-400/70 bg-amber-400/8 border border-amber-400/15 px-2 py-0.5 rounded-full">
                                Not mapped
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={async () => {
                                if (!confirm(`Delete "${dv.productName} · ${dv.size}"?`)) return;
                                setDeletingVariant(dv.id);
                                try {
                                  await deleteVariant(dv.id);
                                  setDbVariants(prev => prev.filter(v => v.id !== dv.id));
                                  showToast(`Deleted: ${dv.productName} · ${dv.size}`);
                                  setDeletingVariant(null);
                                } catch (err: unknown) {
                                  const msg = err instanceof Error ? err.message : String(err);
                                  setDeletingVariant(null);
                                  if (msg.toLowerCase().includes("cannot delete") || msg.toLowerCase().includes("used in existing orders")) {
                                    if (confirm(`This variant is used in existing orders and cannot be deleted.\n\nDeactivate it instead? (hides it from the store)`)) {
                                      setDeletingVariant(dv.id);
                                      try {
                                        await updateVariant(dv.id, dv.size, dv.price, dv.currency, false);
                                        showToast(`Deactivated: ${dv.productName} · ${dv.size}`);
                                        await loadDbVariants();
                                      } catch (e2: unknown) {
                                        showToast(`Failed: ${e2 instanceof Error ? e2.message : String(e2)}`);
                                      } finally { setDeletingVariant(null); }
                                    }
                                  } else {
                                    showToast(`Failed: ${msg}`);
                                  }
                                }
                              }}
                              disabled={deletingVariant === dv.id}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-40 transition-colors"
                              title="Delete variant"
                            >
                              {deletingVariant === dv.id
                                ? <Loader2 size={12} className="animate-spin" />
                                : <Trash2 size={12} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-xs text-white/25">
                IDs save automatically on blur. Use the Catalog tab → "Add size" to add new variants with one click.
              </p>
            </div>
          )}

          {/* ── Tab: Webhooks ──────────────────────────────────────────────────── */}
          {tab === "webhooks" && (
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Register webhooks</h3>
                  <p className="text-xs text-white/40">
                    Tolif listens for <code className="text-[#C4622D]">shipment_sent</code>,{" "}
                    <code className="text-[#C4622D]">order_failed</code>, and{" "}
                    <code className="text-[#C4622D]">order_canceled</code> at{" "}
                    <code className="text-white/60">/api/webhooks/printful</code>.
                  </p>
                </div>
                <div className="flex gap-3">
                  <input
                    type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://yourdomain.com"
                    className="flex-1 bg-white/8 border border-white/12 text-white text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#C4622D] placeholder:text-white/25"
                  />
                  <button
                    onClick={handleRegisterWebhooks}
                    disabled={registeringWh || connected === false}
                    className="flex items-center gap-2 bg-[#C4622D] hover:bg-[#b35527] disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {registeringWh ? <Loader2 size={14} className="animate-spin" /> : <Webhook size={14} />}
                    Register
                  </button>
                </div>
                {whError && <p className="text-xs text-red-400">{whError}</p>}
              </div>

              {webhooks.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
                  <Webhook size={28} className="text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No webhooks registered yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {webhooks.map((wh) => (
                    <div key={wh.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-start gap-3">
                      <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-mono truncate">{wh.url}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {wh.types.map((t) => (
                            <span key={t} className="text-[10px] font-medium bg-white/8 text-white/50 px-2 py-0.5 rounded-full">{t}</span>
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
