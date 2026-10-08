"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Save,
  Loader2, Sparkles, Upload, ImageIcon, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  getAdminTemplates, createTemplate, updateTemplate,
  toggleTemplate, deleteTemplate, aiGenerateMetadata,
  aiGenerateImage, uploadTemplateImage, type AdminTemplate,
} from "@/lib/admin-api";

const CATEGORIES = ["Families", "Couples", "Solo", "Pets", "Groups"];
const AI_PROVIDERS = ["", "gemini", "falai", "openai"];

const EMPTY: Partial<AdminTemplate> = {
  slug: "", name: "", category: "", style: "", prompt: "",
  description: "", templateImageKey: "", uploadSlotsJson: "[]",
  aiProviderOverride: "", isActive: true, sortOrder: 0,
  seoTitle: "", seoDescription: "",
};

// ── Image Upload Widget ────────────────────────────────────────────────────────

function ImageWidget({
  imageKey, imageUrl, onImageChange, prompt,
}: {
  imageKey: string;
  imageUrl: string;
  onImageChange: (key: string, url: string) => void;
  prompt: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

  const handleFile = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const { key, url } = await uploadTemplateImage(file);
      onImageChange(key, url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Enter a prompt first before generating an image.");
      return;
    }
    setError("");
    setGenerating(true);
    try {
      const { key, url } = await aiGenerateImage(prompt);
      onImageChange(key, url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Image generation failed. Check your API key in Settings → AI Providers.");
    } finally {
      setGenerating(false);
    }
  };

  // Always proxy through the API — presigned MinIO URLs use the internal
  // Docker hostname (minio:9000) which the browser cannot reach.
  const previewSrc = imageKey
    ? `${API_BASE}/api/storage/preview?key=${encodeURIComponent(imageKey)}`
    : (imageUrl || "");

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-[#8C7B6B] uppercase tracking-wider block">
        Template Preview Image
      </label>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        {/* Image preview / drop zone */}
        <div
          className={`relative rounded-xl border-2 border-dashed overflow-hidden transition-colors cursor-pointer ${
            previewSrc ? "border-[#E4D8CC]" : "border-[#E4D8CC] hover:border-[#C4622D]/50"
          }`}
          style={{ minHeight: 140 }}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {previewSrc ? (
            <img
              src={previewSrc}
              alt="Template preview"
              className="w-full h-full object-cover"
              style={{ maxHeight: 200 }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-8 text-[#8C7B6B]">
              <ImageIcon size={28} className="mb-2 opacity-40" />
              <p className="text-xs text-center">Drop image here or click to upload</p>
              <p className="text-xs text-[#C4622D] mt-1">JPG, PNG, WebP · max 10 MB</p>
            </div>
          )}

          {(uploading) && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-[#C4622D]" />
            </div>
          )}

          {previewSrc && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/40 to-transparent p-2 flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
                disabled={generating}
                className="flex items-center gap-1 text-white/90 hover:text-white text-xs bg-black/40 hover:bg-black/60 rounded px-2 py-1 transition-colors disabled:opacity-60"
              >
                {generating ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <RefreshCw size={11} />
                )}
                Regenerate
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                className="text-white/80 hover:text-white text-xs bg-black/30 rounded px-2 py-1"
              >
                Replace
              </button>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 w-36">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 border border-[#E4D8CC] bg-white hover:bg-[#FAF6F0] text-[#8C7B6B] hover:text-[#1A1714] text-xs font-medium px-3 py-2.5 rounded-xl transition-colors"
          >
            <Upload size={13} />
            Upload image
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="flex items-center gap-2 border border-[#C4622D]/40 bg-[#C4622D]/5 hover:bg-[#C4622D]/10 text-[#C4622D] disabled:opacity-50 text-xs font-medium px-3 py-2.5 rounded-xl transition-colors"
          >
            {generating ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
            {generating ? "Generating…" : "Generate with AI"}
          </button>

          {imageKey && (
            <p className="text-[10px] text-[#8C7B6B] break-all font-mono leading-tight">{imageKey}</p>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

// ── Template Modal ─────────────────────────────────────────────────────────────

function TemplateModal({
  initial, onSave, onClose,
}: {
  initial: Partial<AdminTemplate>;
  onSave: (data: Partial<AdminTemplate>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<AdminTemplate>>(initial);
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const set = <K extends keyof AdminTemplate>(k: K, v: AdminTemplate[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ── AI generate metadata + preview image in parallel ──────────────────────
  const handleGenerateAll = async () => {
    if (!form.prompt?.trim()) {
      setGenError("Enter your AI prompt first.");
      return;
    }
    setGenError("");
    setGenerating(true);
    try {
      const [metaResult, imgResult] = await Promise.allSettled([
        aiGenerateMetadata(form.prompt),
        aiGenerateImage(form.prompt),
      ]);

      if (metaResult.status === "fulfilled") {
        const meta = metaResult.value;
        setForm((f) => ({
          ...f,
          name: meta.name ?? f.name,
          slug: meta.slug ?? f.slug,
          category: meta.category ?? f.category,
          style: meta.style ?? f.style,
          description: meta.description ?? f.description,
          seoTitle: meta.seoTitle ?? f.seoTitle,
          seoDescription: meta.seoDescription ?? f.seoDescription,
          uploadSlotsJson: meta.uploadSlotsJson ?? f.uploadSlotsJson,
        }));
      } else {
        setGenError(metaResult.reason instanceof Error ? metaResult.reason.message : "Metadata generation failed. Check your Gemini API key in Settings.");
      }

      if (imgResult.status === "fulfilled") {
        set("templateImageKey", imgResult.value.key);
        setImageUrl(imgResult.value.url);
      }
      // Image failure is silent — user can regenerate manually with the Regenerate button
    } finally {
      setGenerating(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const Field = ({
    label, name, type = "text", placeholder = "", rows = 0,
  }: {
    label: string; name: keyof AdminTemplate; type?: string; placeholder?: string; rows?: number;
  }) => (
    <div>
      <label className="text-xs font-medium text-[#8C7B6B] uppercase tracking-wider block mb-1.5">{label}</label>
      {rows > 0 ? (
        <textarea
          rows={rows}
          value={(form[name] as string) ?? ""}
          onChange={(e) => set(name, e.target.value as AdminTemplate[typeof name])}
          placeholder={placeholder}
          className="w-full bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl px-4 py-2.5 text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] resize-none transition-colors"
        />
      ) : (
        <input
          type={type}
          value={(form[name] as string | number) ?? ""}
          onChange={(e) => set(name, (type === "number" ? Number(e.target.value) : e.target.value) as AdminTemplate[typeof name])}
          placeholder={placeholder}
          className="w-full bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl px-4 py-2.5 text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 px-4 pb-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E4D8CC] bg-[#FAF6F0]">
          <div>
            <h2 className="text-lg font-semibold text-[#1A1714]">
              {form.id ? "Edit Template" : "New Template"}
            </h2>
            <p className="text-xs text-[#8C7B6B] mt-0.5">Enter a prompt and let AI fill in the rest</p>
          </div>
          <button onClick={onClose} className="text-[#8C7B6B] hover:text-[#1A1714] transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="divide-y divide-[#F2EAE0]">

          {/* ── Section 1: AI Prompt ─────────────────────────────────────── */}
          <div className="px-6 py-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={15} className="text-[#C4622D]" />
              <span className="text-sm font-semibold text-[#1A1714]">AI Portrait Prompt</span>
            </div>
            <p className="text-xs text-[#8C7B6B] -mt-1">
              Describe the portrait style in detail — lighting, medium, mood, composition. The AI will generate the name, category, style, SEO, and upload slots automatically.
            </p>
            <textarea
              rows={4}
              value={form.prompt ?? ""}
              onChange={(e) => set("prompt", e.target.value)}
              placeholder="e.g. A warm oil painting portrait of a family of three in a cosy living room, soft candlelight, rich earthy tones, impressionist style, highly detailed faces, masterpiece quality..."
              className="w-full bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl px-4 py-3 text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] resize-none transition-colors"
            />

            <button
              type="button"
              onClick={handleGenerateAll}
              disabled={generating || !form.prompt?.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#C4622D] to-[#D4942A] hover:from-[#9E4A1E] hover:to-[#B37A1E] disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all"
            >
              {generating ? (
                <><Loader2 size={16} className="animate-spin" /> Generating metadata &amp; image…</>
              ) : (
                <><Sparkles size={16} /> Generate title, SEO, slots &amp; preview image with AI</>
              )}
            </button>

            {genError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{genError}</p>
            )}
          </div>

          {/* ── Section 2: Template Image ────────────────────────────────── */}
          <div className="px-6 py-5">
            <ImageWidget
              imageKey={form.templateImageKey ?? ""}
              imageUrl={imageUrl}
              prompt={form.prompt ?? ""}
              onImageChange={(key, url) => {
                set("templateImageKey", key);
                setImageUrl(url);
              }}
            />
          </div>

          {/* ── Section 3: Core Fields ────────────────────────────────────── */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-xs font-semibold text-[#8C7B6B] uppercase tracking-wider">Template Details</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" name="name" placeholder="e.g. Royal Family Portrait" />
              <Field label="Slug" name="slug" placeholder="e.g. royal-family" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#8C7B6B] uppercase tracking-wider block mb-1.5">Category</label>
                <select
                  value={form.category ?? ""}
                  onChange={(e) => set("category", e.target.value)}
                  className="w-full bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl px-4 py-2.5 text-sm text-[#1A1714] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
                >
                  <option value="">— select —</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <Field label="Style" name="style" placeholder="e.g. Oil Painting" />
            </div>

            <Field label="Short description (shown on listing card)" name="description" placeholder="A warm oil painting portrait of your whole family." />
          </div>

          {/* ── Section 4: SEO ────────────────────────────────────────────── */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-xs font-semibold text-[#8C7B6B] uppercase tracking-wider">SEO</p>
            <Field label="SEO Title (max 60 chars)" name="seoTitle" placeholder="Family AI Portrait — Oil Painting | Tolif" />
            <Field label="SEO Description (max 155 chars)" name="seoDescription" placeholder="Turn your family photos into a stunning oil painting portrait. Free preview, instant download." rows={2} />
          </div>

          {/* ── Section 5: Upload Slots ───────────────────────────────────── */}
          <div className="px-6 py-5 space-y-3">
            <p className="text-xs font-semibold text-[#8C7B6B] uppercase tracking-wider">Upload Slots (JSON)</p>
            <p className="text-xs text-[#8C7B6B]">Defines which photos the customer must upload. Generated automatically — edit if needed.</p>
            <Field
              label=""
              name="uploadSlotsJson"
              rows={3}
              placeholder='[{"name":"person","label":"Your photo","type":"person","required":true}]'
            />
          </div>

          {/* ── Section 6: Advanced (collapsed) ──────────────────────────── */}
          <div className="px-6 py-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs text-[#8C7B6B] hover:text-[#1A1714] transition-colors"
            >
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Advanced settings
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Sort Order" name="sortOrder" type="number" placeholder="0" />
                  <div>
                    <label className="text-xs font-medium text-[#8C7B6B] uppercase tracking-wider block mb-1.5">AI Provider Override</label>
                    <select
                      value={form.aiProviderOverride ?? ""}
                      onChange={(e) => set("aiProviderOverride", e.target.value)}
                      className="w-full bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl px-4 py-2.5 text-sm text-[#1A1714] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
                    >
                      {AI_PROVIDERS.map((p) => <option key={p} value={p}>{p || "— use default —"}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => set("isActive", !form.isActive)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? "bg-[#C4622D]" : "bg-[#E4D8CC]"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${form.isActive ? "translate-x-5" : ""}`} />
                  </button>
                  <span className="text-sm text-[#8C7B6B]">Active — visible to customers</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <div className="px-6 py-5 bg-[#FAF6F0]">
            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{saveError}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-[#E4D8CC] text-[#8C7B6B] font-medium py-3 rounded-xl hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-[#C4622D] hover:bg-[#9E4A1E] disabled:opacity-60 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save template
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

function TemplatesContent() {
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<Partial<AdminTemplate> | null>(null);

  const load = () =>
    getAdminTemplates()
      .then(setTemplates)
      .catch(() => setError("Could not load templates. Is the API running?"))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleSave = async (data: Partial<AdminTemplate>) => {
    if (data.id) await updateTemplate(data.id, data);
    else await createTemplate(data);
    await load();
  };

  const handleToggle = async (id: string) => {
    await toggleTemplate(id);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    await deleteTemplate(id);
    await load();
  };

  return (
    <div className="lg:pl-60">
      <div className="pt-16 lg:pt-0">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-light text-[#1A1714]">Templates</h1>
              <p className="text-[#8C7B6B] text-sm mt-1">
                Add a prompt — AI generates the title, SEO, and slots for you.
              </p>
            </div>
            <button
              onClick={() => setModal(EMPTY)}
              className="flex items-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              <Plus size={16} />
              New template
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm mb-6">
              <strong>API not connected:</strong> {error}
            </div>
          )}

          {/* How-it-works hint */}
          {!loading && templates.length === 0 && !error && (
            <div className="bg-gradient-to-br from-[#C4622D]/5 to-[#D4942A]/5 border border-[#C4622D]/20 rounded-2xl p-6 mb-6">
              <h3 className="font-semibold text-[#1A1714] mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-[#C4622D]" />
                How AI-assisted template creation works
              </h3>
              <ol className="text-sm text-[#8C7B6B] space-y-1.5 list-decimal list-inside">
                <li>Click <strong>New template</strong></li>
                <li>Write a detailed AI generation prompt (describe the portrait style, mood, lighting)</li>
                <li>Click <strong>Generate with AI</strong> — it fills in the name, category, style, SEO title, description, and upload slots</li>
                <li>Upload or generate an example image</li>
                <li>Review everything, tweak if needed, then save</li>
              </ol>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-[#E4D8CC] overflow-hidden">
            {templates.length === 0 && !loading && (
              <div className="text-center py-16 text-[#8C7B6B]">
                <p className="text-sm">No templates yet.</p>
                <button onClick={() => setModal(EMPTY)} className="mt-3 text-[#C4622D] text-sm font-medium hover:underline">
                  Create your first template
                </button>
              </div>
            )}
            {templates.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-6 py-4 border-b border-[#F2EAE0] last:border-0 hover:bg-[#FAF6F0] transition-colors">
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-xl bg-[#F2EAE0] overflow-hidden shrink-0 flex items-center justify-center">
                  {t.templateImageKey ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}/api/storage/preview?key=${encodeURIComponent(t.templateImageKey)}`}
                      alt={t.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <ImageIcon size={20} className="text-[#C8BAB0]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1A1714] text-sm truncate">{t.name}</p>
                  <p className="text-xs text-[#8C7B6B] mt-0.5">
                    {t.category}{t.style ? ` · ${t.style}` : ""} · sort: {t.sortOrder}
                  </p>
                  {t.description && (
                    <p className="text-xs text-[#8C7B6B] mt-0.5 truncate opacity-70">{t.description}</p>
                  )}
                </div>

                <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${t.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                  {t.isActive ? "Active" : "Inactive"}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleToggle(t.id)} title={t.isActive ? "Deactivate" : "Activate"}
                    className="p-2 rounded-lg text-[#8C7B6B] hover:bg-[#F2EAE0] hover:text-[#C4622D] transition-colors">
                    {t.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  <button onClick={() => setModal(t)}
                    className="p-2 rounded-lg text-[#8C7B6B] hover:bg-[#F2EAE0] hover:text-[#C4622D] transition-colors">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(t.id)}
                    className="p-2 rounded-lg text-[#8C7B6B] hover:bg-red-50 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {modal && (
          <TemplateModal
            initial={modal}
            onSave={handleSave}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#F5F0EA]">
        <AdminSidebar />
        <TemplatesContent />
      </div>
    </AdminGuard>
  );
}
