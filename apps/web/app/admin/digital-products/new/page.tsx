"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Loader2, Upload, ArrowLeft } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { createDigitalProduct, uploadDigitalProductImage } from "@/lib/admin-api";

const inputCls = "w-full bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl px-3 py-2 text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1A1714] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function NewProductContent() {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const { key } = await uploadDigitalProductImage(file);
      setForm((f) => ({ ...f, heroImageKey: key }));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { alert("Name is required."); return; }
    setSaving(true);
    try {
      const created = await createDigitalProduct({
        ...form,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      });
      router.push(`/admin/digital-products/${created.id}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Create failed.");
      setSaving(false);
    }
  };

  return (
    <div className="lg:pl-60">
      <div className="pt-16 lg:pt-0">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/admin/digital-products" className="text-[#8C7B6B] hover:text-[#1A1714] transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-2xl font-display font-light text-[#1A1714]">New Digital Product</h1>
            </div>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Create Product
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E4D8CC] p-6 space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Name *">
                <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Business Tracker Pro" className={inputCls} autoFocus />
              </Field>
              <Field label="Slug (auto-generated if empty)">
                <input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="business-tracker-pro" className={inputCls} />
              </Field>
            </div>

            <Field label="Tagline">
              <input value={form.tagline} onChange={(e) => setForm(f => ({ ...f, tagline: e.target.value }))}
                placeholder="The spreadsheet kit for serious entrepreneurs" className={inputCls} />
            </Field>

            <Field label="Description">
              <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Full description…" rows={4} className={`${inputCls} resize-y`} />
            </Field>

            {/* Hero image */}
            <div>
              <label className="block text-sm font-medium text-[#1A1714] mb-2">Hero image</label>
              <div className="flex items-center gap-4">
                {form.heroImageKey && (
                  <div className="w-24 h-16 rounded-xl overflow-hidden border border-[#E4D8CC] bg-[#FAF6F0]">
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL}/api/storage/preview?key=${encodeURIComponent(form.heroImageKey)}`}
                      alt="Hero" className="w-full h-full object-cover"
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
                  Upload image
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActiveNew" checked={form.isActive}
                onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 accent-[#C4622D]" />
              <label htmlFor="isActiveNew" className="text-sm text-[#1A1714]">Active in store immediately</label>
            </div>
          </div>

          <p className="text-xs text-[#8C7B6B] mt-4 px-1">
            After creating the product you can add pricing tiers (Basic, Pro, Bundle) and upload files.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function NewDigitalProductPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#F5F0EA]">
        <AdminSidebar />
        <NewProductContent />
      </div>
    </AdminGuard>
  );
}
