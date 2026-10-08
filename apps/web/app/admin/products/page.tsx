"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Pencil, Plus, Trash2, Check, X, Loader2,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  getAdminProducts, toggleProduct, updateVariant,
  addVariant, deleteVariant,
  type AdminProduct, type AdminProductVariant,
} from "@/lib/admin-api";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

const TYPE_LABELS: Record<string, string> = {
  digital: "Digital",
  poster:  "Poster",
  framedprint: "Framed Print",
  canvas:  "Canvas",
};

// ── Variant row ────────────────────────────────────────────────────────────────

function VariantRow({
  variant,
  onSave,
  onDelete,
}: {
  variant: AdminProductVariant;
  onSave: (id: string, price: number, currency: string, isActive: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing]   = useState(false);
  const [price, setPrice]       = useState(String(variant.price));
  const [currency, setCurrency] = useState(variant.currency);
  const [active, setActive]     = useState(variant.isActive);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState("");

  const handleSave = async () => {
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) { setError("Enter a valid price."); return; }
    setSaving(true); setError("");
    try {
      await onSave(variant.id, p, currency, active);
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this variant? This cannot be undone.")) return;
    setDeleting(true);
    try { await onDelete(variant.id); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : "Delete failed."); setDeleting(false); }
  };

  const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";

  return (
    <div className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-colors ${active ? "bg-white" : "bg-[#F8F4F0] opacity-60"} border border-[#EDE8E0]`}>
      {editing ? (
        <>
          <div className="flex-1 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#1A1714] w-28 shrink-0">{variant.size}</span>
            <div className="flex items-center gap-1.5">
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="text-sm border border-[#E4D8CC] rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30"
              >
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-24 text-sm border border-[#E4D8CC] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-[#8C7B6B] cursor-pointer select-none">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="accent-[#C4622D]" />
              Active
            </label>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={handleSave} disabled={saving}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#2D4A3E] text-white hover:bg-[#1E3329] disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            </button>
            <button onClick={() => setEditing(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#EDE8E0] text-[#8C7B6B] hover:bg-[#E4D8CC] transition-colors">
              <X size={13} />
            </button>
          </div>
        </>
      ) : (
        <>
          <span className="text-sm font-medium text-[#1A1714] flex-1">{variant.size}</span>
          <span className="text-sm font-bold text-[#C4622D] tabular-nums">
            {symbol}{variant.price.toFixed(2)} <span className="text-xs font-normal text-[#8C7B6B]">{variant.currency}</span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setEditing(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2EAE0] text-[#8C7B6B] hover:text-[#C4622D] transition-colors">
              <Pencil size={13} />
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#8C7B6B] hover:text-red-500 transition-colors disabled:opacity-50">
              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Add variant form ───────────────────────────────────────────────────────────

function AddVariantForm({ productId, onAdded }: { productId: string; onAdded: () => void }) {
  const [open, setOpen]         = useState(false);
  const [size, setSize]         = useState("");
  const [price, setPrice]       = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const handleAdd = async () => {
    if (!size.trim()) { setError("Enter a size label."); return; }
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) { setError("Enter a valid price."); return; }
    setSaving(true); setError("");
    try {
      await addVariant(productId, size.trim(), p, currency);
      setSize(""); setPrice(""); setOpen(false);
      onAdded();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add.");
    } finally { setSaving(false); }
  };

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#C4622D] hover:text-[#9E4A1E] transition-colors mt-2">
          <Plus size={13} /> Add size
        </button>
      ) : (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <input placeholder="e.g. 60×80 cm" value={size} onChange={e => setSize(e.target.value)}
            className="text-sm border border-[#E4D8CC] rounded-lg px-2.5 py-1.5 w-36 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30" />
          <select value={currency} onChange={e => setCurrency(e.target.value)}
            className="text-sm border border-[#E4D8CC] rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30">
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <input type="number" step="0.01" min="0.01" placeholder="Price" value={price}
            onChange={e => setPrice(e.target.value)}
            className="text-sm border border-[#E4D8CC] rounded-lg px-2.5 py-1.5 w-24 focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30" />
          {error && <p className="text-xs text-red-500 w-full">{error}</p>}
          <button onClick={handleAdd} disabled={saving}
            className="inline-flex items-center gap-1.5 bg-[#C4622D] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#9E4A1E] disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Add
          </button>
          <button onClick={() => setOpen(false)}
            className="text-xs text-[#8C7B6B] hover:text-[#1A1714] transition-colors">Cancel</button>
        </div>
      )}
    </div>
  );
}

// ── Product card ───────────────────────────────────────────────────────────────

function ProductCard({ product, onRefresh }: { product: AdminProduct; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try { await toggleProduct(product.id); onRefresh(); }
    finally { setToggling(false); }
  };

  const handleVariantSave = async (id: string, price: number, currency: string, isActive: boolean) => {
    await updateVariant(id, price, currency, isActive);
    onRefresh();
  };

  const handleVariantDelete = async (id: string) => {
    await deleteVariant(id);
    onRefresh();
  };

  return (
    <div className={`rounded-2xl border-2 transition-colors ${product.isActive ? "border-[#E4D8CC] bg-white" : "border-[#EDE8E0] bg-[#F8F4F0]"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[#1A1714]">{product.name}</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F2EAE0] text-[#8C7B6B]">
              {TYPE_LABELS[product.type] ?? product.type}
            </span>
            {!product.isActive && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-400">
                Hidden
              </span>
            )}
          </div>
          <p className="text-xs text-[#8C7B6B] mt-0.5">{product.variants.length} size{product.variants.length !== 1 ? "s" : ""}</p>
        </div>

        <button onClick={handleToggle} disabled={toggling}
          className="text-[#8C7B6B] hover:text-[#1A1714] disabled:opacity-50 transition-colors" title={product.isActive ? "Hide from store" : "Show in store"}>
          {toggling ? <Loader2 size={20} className="animate-spin" /> : product.isActive ? <ToggleRight size={22} className="text-[#2D4A3E]" /> : <ToggleLeft size={22} />}
        </button>

        <button onClick={() => setExpanded(v => !v)} className="text-[#8C7B6B] hover:text-[#1A1714] transition-colors">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Variants */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-2 border-t border-[#EDE8E0] pt-4">
              {product.variants.map(v => (
                <VariantRow
                  key={v.id}
                  variant={v}
                  onSave={handleVariantSave}
                  onDelete={handleVariantDelete}
                />
              ))}
              <AddVariantForm productId={product.id} onAdded={onRefresh} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setProducts(await getAdminProducts());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-[#F5F0EA]">
        <AdminSidebar />
        <main className="flex-1 lg:pl-60">
          <div className="p-6 sm:p-8 max-w-3xl">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-1">
                <Package size={22} className="text-[#C4622D]" />
                <h1 className="text-2xl font-display font-semibold text-[#1A1714]">Products & Pricing</h1>
              </div>
              <p className="text-sm text-[#8C7B6B]">
                Edit prices here — the storefront picks them up instantly. Changes apply to new orders only.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 size={28} className="animate-spin text-[#C4622D]" />
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-600">{error}</div>
            ) : (
              <div className="space-y-4">
                {products.map(p => (
                  <ProductCard key={p.id} product={p} onRefresh={load} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}
