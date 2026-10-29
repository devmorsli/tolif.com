"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Save, Loader2, Plus, Trash2, Upload, X, FileDown, ArrowLeft, CheckCircle,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  getDigitalProduct, createDigitalProduct, updateDigitalProduct,
  createDigitalTier, updateDigitalTier, deleteDigitalTier,
  uploadDigitalFile, deleteDigitalFile, uploadDigitalProductImage,
  type AdminDigitalProduct, type AdminDigitalTier, type AdminDigitalFile,
} from "@/lib/admin-api";

// ── Tier editor ───────────────────────────────────────────────────────────────

function TierEditor({
  tier,
  productId,
  onUpdated,
  onDeleted,
}: {
  tier: AdminDigitalTier;
  productId: string;
  onUpdated: (t: AdminDigitalTier) => void;
  onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState({ ...tier });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateDigitalTier(tier.id, {
        tierName: form.tierName,
        displayName: form.displayName,
        price: form.price,
        currency: form.currency,
        featuresJson: form.featuresJson,
        stripePriceId: form.stripePriceId,
        isActive: form.isActive,
        sortOrder: form.sortOrder,
      });
      onUpdated({ ...updated, files: form.files });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadDigitalFile(tier.id, file);
      setForm((f) => ({ ...f, files: [...f.files, uploaded] }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Remove this file?")) return;
    try {
      await deleteDigitalFile(fileId);
      setForm((f) => ({ ...f, files: f.files.filter((x) => x.id !== fileId) }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const parsedFeatures: string[] = (() => {
    try { return JSON.parse(form.featuresJson); } catch { return []; }
  })();

  const setFeatures = (features: string[]) =>
    setForm((f) => ({ ...f, featuresJson: JSON.stringify(features) }));

  const addFeature = () => setFeatures([...parsedFeatures, ""]);
  const updateFeature = (i: number, v: string) => {
    const next = [...parsedFeatures];
    next[i] = v;
    setFeatures(next);
  };
  const removeFeature = (i: number) => setFeatures(parsedFeatures.filter((_, j) => j !== i));

  return (
    <div className="bg-white rounded-2xl border border-[#E4D8CC] overflow-hidden">
      {/* Tier header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4D8CC] bg-[#FAF6F0]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono bg-[#C4622D]/10 text-[#C4622D] px-2 py-0.5 rounded-lg">
            {form.tierName}
          </span>
          <span className="font-semibold text-[#1A1714]">{form.displayName || "Tier"}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-[#C4622D] hover:bg-[#9E4A1E] disabled:opacity-60 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <CheckCircle size={12} /> : <Save size={12} />}
            Save
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this tier and all its files?")) onDeleted(tier.id);
            }}
            className="flex items-center gap-1.5 text-red-500 hover:bg-red-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="p-6 grid md:grid-cols-2 gap-6">
        {/* Left col */}
        <div className="space-y-4">
          <Field label="Internal key (tierName)">
            <input value={form.tierName} onChange={(e) => setForm(f => ({ ...f, tierName: e.target.value }))}
              placeholder="basic" className={inputCls} />
          </Field>
          <Field label="Display name">
            <input value={form.displayName} onChange={(e) => setForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="Starter" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price">
              <input type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                placeholder="29" className={inputCls} />
            </Field>
            <Field label="Currency">
              <input value={form.currency} onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}
                placeholder="EUR" className={inputCls} />
            </Field>
          </div>
          <Field label="Stripe Price ID (optional)">
            <input value={form.stripePriceId ?? ""} onChange={(e) => setForm(f => ({ ...f, stripePriceId: e.target.value || undefined }))}
              placeholder="price_xxx" className={inputCls} />
          </Field>
          <div className="flex items-center gap-3">
            <input type="checkbox" id={`active-${tier.id}`} checked={form.isActive}
              onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4 accent-[#C4622D]" />
            <label htmlFor={`active-${tier.id}`} className="text-sm text-[#1A1714]">Active (visible in store)</label>
          </div>
        </div>

        {/* Right col: features */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-[#1A1714]">Feature bullets</label>
            <button onClick={addFeature} className="text-xs text-[#C4622D] hover:underline flex items-center gap-1">
              <Plus size={12} /> Add
            </button>
          </div>
          <div className="space-y-2">
            {parsedFeatures.map((feat, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={feat}
                  onChange={(e) => updateFeature(i, e.target.value)}
                  placeholder="Feature description…"
                  className={`${inputCls} flex-1`}
                />
                <button onClick={() => removeFeature(i)} className="text-[#8C7B6B] hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
            {parsedFeatures.length === 0 && (
              <p className="text-xs text-[#8C7B6B] italic">No features yet — click Add above.</p>
            )}
          </div>
        </div>
      </div>

      {/* Files */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-[#1A1714]">
            Files ({form.files.length})
          </h4>
          <div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs font-medium text-[#C4622D] hover:underline disabled:opacity-60"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              Upload file
            </button>
          </div>
        </div>

        {form.files.length === 0 ? (
          <div className="border-2 border-dashed border-[#E4D8CC] rounded-xl p-6 text-center">
            <FileDown size={24} className="text-[#E4D8CC] mx-auto mb-2" />
            <p className="text-xs text-[#8C7B6B]">No files yet. Upload the spreadsheet files buyers will receive.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {form.files.map((file: AdminDigitalFile) => (
              <div key={file.id} className="flex items-center justify-between bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <FileDown size={14} className="text-[#C4622D] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-[#1A1714] truncate">{file.fileName}</p>
                    <p className="text-xs text-[#8C7B6B]">{(file.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button onClick={() => handleDeleteFile(file.id)} className="text-[#8C7B6B] hover:text-red-500 ml-3 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Field helper ──────────────────────────────────────────────────────────────

const inputCls = "w-full bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl px-3 py-2 text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1A1714] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────

function DigitalProductEditorContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === "new";

  const [product, setProduct] = useState<AdminDigitalProduct | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const tierNameInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    tagline: "",
    description: "",
    heroImageKey: "",
    featuresJson: "[]",
    isActive: true,
    sortOrder: 0,
  });

  const [tiers, setTiers] = useState<AdminDigitalTier[]>([]);
  const [addingTier, setAddingTier] = useState(false);
  const [newTierName, setNewTierName] = useState("basic");
  const [newTierDisplayName, setNewTierDisplayName] = useState("Starter");
  const [newTierPrice, setNewTierPrice] = useState(29);

  const load = useCallback(async () => {
    if (isNew) return;
    try {
      const p = await getDigitalProduct(params.id);
      setProduct(p);
      setForm({
        name: p.name,
        slug: p.slug,
        tagline: p.tagline,
        description: p.description,
        heroImageKey: p.heroImageKey ?? "",
        featuresJson: p.featuresJson,
        isActive: p.isActive,
        sortOrder: p.sortOrder,
      });
      setTiers(p.tiers);
    } catch {
      alert("Could not load product.");
    } finally {
      setLoading(false);
    }
  }, [isNew, params.id]);

  useEffect(() => { load(); }, [load]);

  const handleSaveProduct = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const created = await createDigitalProduct(form);
        router.replace(`/admin/digital-products/${created.id}`);
      } else {
        const updated = await updateDigitalProduct(params.id, form);
        setProduct(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const { key } = await uploadDigitalProductImage(file);
      setForm((f) => ({ ...f, heroImageKey: key }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Image upload failed.");
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleAddTier = async () => {
    if (!product) return;
    try {
      const tier = await createDigitalTier(product.id, {
        tierName: newTierName,
        displayName: newTierDisplayName,
        price: newTierPrice,
        currency: "EUR",
        featuresJson: "[]",
        isActive: true,
        sortOrder: tiers.length,
      });
      setTiers((t) => [...t, { ...tier, files: [] }]);
      setAddingTier(false);
      setNewTierName("basic");
      setNewTierDisplayName("Starter");
      setNewTierPrice(29);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Could not create tier.");
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    try {
      await deleteDigitalTier(tierId);
      setTiers((t) => t.filter((x) => x.id !== tierId));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  if (loading) {
    return (
      <div className="lg:pl-60 pt-16 lg:pt-0 flex items-center justify-center min-h-screen">
        <Loader2 size={24} className="text-[#C4622D] animate-spin" />
      </div>
    );
  }

  return (
    <div className="lg:pl-60">
      <div className="pt-16 lg:pt-0">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/admin/digital-products" className="text-[#8C7B6B] hover:text-[#1A1714] transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-display font-light text-[#1A1714]">
                  {isNew ? "New Digital Product" : (product?.name ?? "Edit Product")}
                </h1>
                {!isNew && <p className="text-xs text-[#8C7B6B] font-mono mt-0.5">/{product?.slug}</p>}
              </div>
            </div>
            <button
              onClick={handleSaveProduct}
              disabled={saving}
              className="flex items-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <Save size={14} />}
              {isNew ? "Create Product" : "Save"}
            </button>
          </div>

          {/* Product form */}
          <div className="bg-white rounded-2xl border border-[#E4D8CC] p-6 mb-6 space-y-5">
            <h2 className="font-semibold text-[#1A1714]">Product details</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Name">
                <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Business Tracker Pro" className={inputCls} />
              </Field>
              <Field label="Slug (URL-friendly)">
                <input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="business-tracker-pro" className={inputCls} />
              </Field>
            </div>

            <Field label="Tagline (short)">
              <input value={form.tagline} onChange={(e) => setForm(f => ({ ...f, tagline: e.target.value }))}
                placeholder="The spreadsheet kit for serious entrepreneurs" className={inputCls} />
            </Field>

            <Field label="Description">
              <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Full description of the product…" rows={4}
                className={`${inputCls} resize-y`} />
            </Field>

            {/* Hero image */}
            <div>
              <label className="block text-sm font-medium text-[#1A1714] mb-2">Hero image</label>
              <div className="flex items-center gap-4">
                {form.heroImageKey && (
                  <div className="w-24 h-16 rounded-xl overflow-hidden border border-[#E4D8CC] bg-[#FAF6F0]">
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL}/api/storage/preview?key=${encodeURIComponent(form.heroImageKey)}`}
                      alt="Hero"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={imageUploading}
                  className="flex items-center gap-2 bg-[#FAF6F0] border border-[#E4D8CC] hover:bg-[#F2EAE0] text-[#8C7B6B] text-sm px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
                >
                  {imageUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {form.heroImageKey ? "Change image" : "Upload image"}
                </button>
                {form.heroImageKey && (
                  <button onClick={() => setForm(f => ({ ...f, heroImageKey: "" }))} className="text-xs text-red-500 hover:underline">
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={form.isActive}
                  onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 accent-[#C4622D]" />
                <label htmlFor="isActive" className="text-sm text-[#1A1714]">Active in store</label>
              </div>
              <Field label="Sort order">
                <input type="number" value={form.sortOrder}
                  onChange={(e) => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  className={`${inputCls} w-20`} />
              </Field>
            </div>
          </div>

          {/* Tiers — only shown after product is saved */}
          {!isNew && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-[#1A1714]">
                  Pricing tiers ({tiers.length})
                </h2>
                <button
                  onClick={() => setAddingTier(!addingTier)}
                  className="flex items-center gap-1.5 text-sm font-medium text-[#C4622D] hover:underline"
                >
                  <Plus size={14} />
                  Add tier
                </button>
              </div>

              {/* Add tier form */}
              {addingTier && (
                <div className="bg-white rounded-2xl border border-[#C4622D]/30 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-[#1A1714]">New tier</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Internal key">
                      <select value={newTierName} onChange={(e) => setNewTierName(e.target.value)} className={inputCls}>
                        <option value="basic">basic</option>
                        <option value="pro">pro</option>
                        <option value="bundle">bundle</option>
                      </select>
                    </Field>
                    <Field label="Display name">
                      <input value={newTierDisplayName} onChange={(e) => setNewTierDisplayName(e.target.value)}
                        ref={tierNameInputRef} placeholder="Starter" className={inputCls} />
                    </Field>
                    <Field label="Price (EUR)">
                      <input type="number" value={newTierPrice}
                        onChange={(e) => setNewTierPrice(parseFloat(e.target.value) || 0)}
                        className={inputCls} />
                    </Field>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddTier} className="bg-[#C4622D] hover:bg-[#9E4A1E] text-white text-sm font-medium px-4 py-2 rounded-xl">
                      Create tier
                    </button>
                    <button onClick={() => setAddingTier(false)} className="text-[#8C7B6B] text-sm px-4 py-2 rounded-xl hover:bg-[#F2EAE0]">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {tiers.map((tier) => (
                <TierEditor
                  key={tier.id}
                  tier={tier}
                  productId={product!.id}
                  onUpdated={(t) => setTiers((prev) => prev.map((x) => (x.id === t.id ? t : x)))}
                  onDeleted={handleDeleteTier}
                />
              ))}

              {tiers.length === 0 && !addingTier && (
                <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-[#E4D8CC]">
                  <p className="text-sm text-[#8C7B6B] mb-3">No tiers yet. Add Basic, Pro, and Bundle tiers.</p>
                  <button onClick={() => setAddingTier(true)} className="text-sm text-[#C4622D] font-medium hover:underline">
                    + Add first tier
                  </button>
                </div>
              )}
            </div>
          )}

          {isNew && (
            <p className="text-sm text-[#8C7B6B] bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl p-4">
              Save the product first, then you can add pricing tiers and upload files.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DigitalProductEditorPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#F5F0EA]">
        <AdminSidebar />
        <DigitalProductEditorContent />
      </div>
    </AdminGuard>
  );
}
