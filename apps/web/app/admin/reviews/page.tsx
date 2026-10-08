"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, X, Save, Loader2,
  Star, Eye, EyeOff, ImageIcon, User,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  getAdminReviews, createAdminReview, updateAdminReview,
  deleteAdminReview, storagePreviewUrl, type AdminReview,
} from "@/lib/admin-api";

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-[#C4622D]", "bg-[#D4942A]", "bg-[#2D4A3E]", "bg-[#8C7B6B]",
];

function avatarColor(name: string) {
  const i = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

// ── Review Modal ───────────────────────────────────────────────────────────────

interface ModalProps {
  review: AdminReview | null; // null = new
  onSave: (form: FormData) => Promise<void>;
  onClose: () => void;
}

function ReviewModal({ review, onSave, onClose }: ModalProps) {
  const [name, setName] = useState(review?.name ?? "");
  const [location, setLocation] = useState(review?.location ?? "");
  const [subject, setSubject] = useState(review?.subject ?? "");
  const [rating, setRating] = useState(review?.rating ?? 5);
  const [text, setText] = useState(review?.text ?? "");
  const [product, setProduct] = useState(review?.product ?? "");
  const [isVisible, setIsVisible] = useState(review?.isVisible ?? true);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const profileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("location", location);
      fd.append("subject", subject);
      fd.append("rating", String(rating));
      fd.append("text", text);
      fd.append("product", product);
      fd.append("isVisible", String(isVisible));
      if (profileFile) fd.append("profilePhoto", profileFile);
      if (mediaFile) fd.append("media", mediaFile);
      await onSave(fd);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const profilePreview = profileFile
    ? URL.createObjectURL(profileFile)
    : review?.profilePhotoKey
    ? `${API_BASE}/api/storage/preview?key=${encodeURIComponent(review.profilePhotoKey)}`
    : null;

  const mediaPreview = mediaFile
    ? URL.createObjectURL(mediaFile)
    : review?.mediaKey
    ? `${API_BASE}/api/storage/preview?key=${encodeURIComponent(review.mediaKey)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 px-4 pb-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E4D8CC] bg-[#FAF6F0]">
          <h2 className="text-lg font-semibold text-[#1A1714]">
            {review ? "Edit Review" : "New Review"}
          </h2>
          <button onClick={onClose} className="text-[#8C7B6B] hover:text-[#1A1714] transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="divide-y divide-[#F2EAE0]">
          {/* Core fields */}
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#8C7B6B] uppercase tracking-wider block mb-1.5">Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sophie M."
                  className="w-full bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl px-4 py-2.5 text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#8C7B6B] uppercase tracking-wider block mb-1.5">Location</label>
                <input
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Amsterdam, NL"
                  className="w-full bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl px-4 py-2.5 text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#8C7B6B] uppercase tracking-wider block mb-1.5">Subject</label>
                <input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Family Portrait"
                  className="w-full bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl px-4 py-2.5 text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#8C7B6B] uppercase tracking-wider block mb-1.5">Rating</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl px-4 py-2.5 text-sm text-[#1A1714] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
                >
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>{r} star{r !== 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[#8C7B6B] uppercase tracking-wider block mb-1.5">Review Text</label>
              <textarea
                required
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What the customer said..."
                className="w-full bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl px-4 py-2.5 text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] resize-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#8C7B6B] uppercase tracking-wider block mb-1.5">Product (optional)</label>
              <input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Framed Print 50×70cm"
                className="w-full bg-[#FAF6F0] border border-[#E4D8CC] rounded-xl px-4 py-2.5 text-sm text-[#1A1714] placeholder:text-[#C8BAB0] focus:outline-none focus:ring-2 focus:ring-[#C4622D]/30 focus:border-[#C4622D] transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                className={`relative w-11 h-6 rounded-full transition-colors ${isVisible ? "bg-[#C4622D]" : "bg-[#E4D8CC]"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isVisible ? "translate-x-5" : ""}`} />
              </button>
              <span className="text-sm text-[#8C7B6B]">Visible on website</span>
            </div>
          </div>

          {/* File uploads */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-xs font-semibold text-[#8C7B6B] uppercase tracking-wider">Media</p>

            <div className="grid grid-cols-2 gap-4">
              {/* Profile Photo */}
              <div>
                <label className="text-xs font-medium text-[#8C7B6B] uppercase tracking-wider block mb-1.5">Profile Photo</label>
                <div
                  className="relative w-full h-24 rounded-xl border-2 border-dashed border-[#E4D8CC] overflow-hidden cursor-pointer hover:border-[#C4622D]/50 transition-colors flex items-center justify-center bg-[#FAF6F0]"
                  onClick={() => profileRef.current?.click()}
                >
                  {profilePreview ? (
                    <img src={profilePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-[#8C7B6B]">
                      <User size={20} className="opacity-40 mb-1" />
                      <p className="text-xs">Upload photo</p>
                    </div>
                  )}
                </div>
                <input
                  ref={profileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setProfileFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {/* Media */}
              <div>
                <label className="text-xs font-medium text-[#8C7B6B] uppercase tracking-wider block mb-1.5">Media (image/video)</label>
                <div
                  className="relative w-full h-24 rounded-xl border-2 border-dashed border-[#E4D8CC] overflow-hidden cursor-pointer hover:border-[#C4622D]/50 transition-colors flex items-center justify-center bg-[#FAF6F0]"
                  onClick={() => mediaRef.current?.click()}
                >
                  {mediaPreview ? (
                    mediaFile?.type.startsWith("video/") || review?.mediaKey?.match(/\.(mp4|webm|mov)$/i) ? (
                      <video src={mediaPreview} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={mediaPreview} alt="Media" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="flex flex-col items-center text-[#8C7B6B]">
                      <ImageIcon size={20} className="opacity-40 mb-1" />
                      <p className="text-xs">Upload media</p>
                    </div>
                  )}
                </div>
                <input
                  ref={mediaRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 bg-[#FAF6F0]">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
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
                Save review
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

function ReviewsContent() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<AdminReview | null | "new">(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

  const load = () =>
    getAdminReviews()
      .then(setReviews)
      .catch(() => setError("Could not load reviews. Is the API running?"))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleSave = async (form: FormData) => {
    if (modal === "new") {
      await createAdminReview(form);
    } else if (modal) {
      await updateAdminReview(modal.id, form);
    }
    await load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteAdminReview(id);
      await load();
    } catch {
      alert("Delete failed.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="lg:pl-60">
      <div className="pt-16 lg:pt-0">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-light text-[#1A1714]">Reviews</h1>
              <p className="text-[#8C7B6B] text-sm mt-1">
                Manage customer reviews shown on the homepage.
              </p>
            </div>
            <button
              onClick={() => setModal("new")}
              className="flex items-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              <Plus size={16} />
              Add Review
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

          <div className="bg-white rounded-2xl border border-[#E4D8CC] overflow-hidden">
            {!loading && reviews.length === 0 && !error && (
              <div className="text-center py-16 text-[#8C7B6B]">
                <p className="text-sm">No reviews yet.</p>
                <button onClick={() => setModal("new")} className="mt-3 text-[#C4622D] text-sm font-medium hover:underline">
                  Add the first review
                </button>
              </div>
            )}

            {reviews.map((r) => (
              <div key={r.id} className="flex items-start gap-4 px-6 py-4 border-b border-[#F2EAE0] last:border-0 hover:bg-[#FAF6F0] transition-colors">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center">
                  {r.profilePhotoKey ? (
                    <img
                      src={`${API_BASE}/api/storage/preview?key=${encodeURIComponent(r.profilePhotoKey)}`}
                      alt={r.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-white text-xs font-bold ${avatarColor(r.name)}`}>
                      {initials(r.name)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-[#1A1714] text-sm">{r.name}</p>
                    <span className="text-[#8C7B6B] text-xs">·</span>
                    <p className="text-xs text-[#8C7B6B]">{r.location}</p>
                  </div>

                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} size={11} className="fill-[#D4942A] text-[#D4942A]" />
                    ))}
                  </div>

                  <p className="text-sm text-[#4A3F36] line-clamp-2 mb-1">"{r.text}"</p>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#D4942A] font-medium">{r.subject}</span>
                    {r.product && (
                      <>
                        <span className="text-[#8C7B6B] text-xs">·</span>
                        <span className="text-xs text-[#8C7B6B]">{r.product}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Visibility badge */}
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 ${r.isVisible ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                  {r.isVisible ? <Eye size={11} /> : <EyeOff size={11} />}
                  {r.isVisible ? "Visible" : "Hidden"}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setModal(r)}
                    className="p-2 rounded-lg text-[#8C7B6B] hover:bg-[#F2EAE0] hover:text-[#C4622D] transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deleting === r.id}
                    className="p-2 rounded-lg text-[#8C7B6B] hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deleting === r.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {modal !== null && (
          <ReviewModal
            review={modal === "new" ? null : modal}
            onSave={handleSave}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#F5F0EA]">
        <AdminSidebar />
        <ReviewsContent />
      </div>
    </AdminGuard>
  );
}
