"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Loader2, Pencil, Trash2, ToggleLeft, ToggleRight, Package,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  getDigitalProducts, deleteDigitalProduct, updateDigitalProduct,
  type AdminDigitalProduct,
} from "@/lib/admin-api";

function ProductCard({
  product,
  onDelete,
  onToggle,
}: {
  product: AdminDigitalProduct;
  onDelete: (id: string) => void;
  onToggle: (product: AdminDigitalProduct) => void;
}) {
  const lowestPrice = product.tiers.length
    ? Math.min(...product.tiers.map((t) => t.price))
    : null;
  const currency = product.tiers[0]?.currency ?? "EUR";

  return (
    <div className="bg-white rounded-2xl border border-[#E4D8CC] overflow-hidden">
      {/* Hero image */}
      <div className="h-36 bg-gradient-to-br from-[#F2EAE0] to-[#E4D8CC] flex items-center justify-center">
        {product.heroImageKey ? (
          <img
            src={`${process.env.NEXT_PUBLIC_API_URL}/api/storage/preview?key=${encodeURIComponent(product.heroImageKey)}`}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package size={32} className="text-[#C4622D]/40" />
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 className="font-semibold text-[#1A1714]">{product.name}</h3>
            <p className="text-xs text-[#8C7B6B] mt-0.5">{product.tagline}</p>
          </div>
          <span
            className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
              product.isActive
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-[#F2EAE0] text-[#8C7B6B] border border-[#E4D8CC]"
            }`}
          >
            {product.isActive ? "Active" : "Hidden"}
          </span>
        </div>

        {/* Tiers summary */}
        <div className="flex items-center gap-2 mb-4 mt-3 flex-wrap">
          {product.tiers.map((t) => (
            <span
              key={t.id}
              className="text-xs bg-[#FAF6F0] border border-[#E4D8CC] rounded-lg px-2 py-0.5 text-[#8C7B6B]"
            >
              {t.displayName} · {t.currency} {t.price}
            </span>
          ))}
          {product.tiers.length === 0 && (
            <span className="text-xs text-[#8C7B6B]">No tiers yet</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/digital-products/${product.id}`}
            className="flex-1 flex items-center justify-center gap-2 bg-[#FAF6F0] hover:bg-[#F2EAE0] text-[#1A1714] text-xs font-medium px-3 py-2 rounded-xl transition-colors"
          >
            <Pencil size={13} />
            Edit
          </Link>
          <button
            onClick={() => onToggle(product)}
            className="flex items-center justify-center gap-1.5 bg-[#FAF6F0] hover:bg-[#F2EAE0] text-[#8C7B6B] text-xs font-medium px-3 py-2 rounded-xl transition-colors"
            title={product.isActive ? "Hide from store" : "Show in store"}
          >
            {product.isActive ? <ToggleRight size={14} className="text-[#C4622D]" /> : <ToggleLeft size={14} />}
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium px-3 py-2 rounded-xl transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function DigitalProductsContent() {
  const [products, setProducts] = useState<AdminDigitalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    getDigitalProducts()
      .then(setProducts)
      .catch(() => setError("Could not load products."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product and all its files? This cannot be undone.")) return;
    try {
      await deleteDigitalProduct(id);
      setProducts((p) => p.filter((x) => x.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const handleToggle = async (product: AdminDigitalProduct) => {
    try {
      const updated = await updateDigitalProduct(product.id, {
        name: product.name,
        tagline: product.tagline,
        description: product.description,
        heroImageKey: product.heroImageKey,
        featuresJson: product.featuresJson,
        isActive: !product.isActive,
        sortOrder: product.sortOrder,
      });
      setProducts((p) => p.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Update failed.");
    }
  };

  return (
    <div className="lg:pl-60">
      <div className="pt-16 lg:pt-0">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-light text-[#1A1714]">Digital Products</h1>
              <p className="text-[#8C7B6B] text-sm mt-1">
                Manage spreadsheets and digital downloads for the digital store.
              </p>
            </div>
            <Link
              href="/admin/digital-products/new"
              className="flex items-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              <Plus size={15} />
              New Product
            </Link>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="text-[#C4622D] animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="text-center py-20">
              <Package size={40} className="text-[#E4D8CC] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#1A1714] mb-2">No digital products yet</h3>
              <p className="text-[#8C7B6B] text-sm mb-6">
                Create your first product to start selling digital downloads.
              </p>
              <Link
                href="/admin/digital-products/new"
                className="inline-flex items-center gap-2 bg-[#C4622D] hover:bg-[#9E4A1E] text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
              >
                <Plus size={15} />
                Create First Product
              </Link>
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DigitalProductsPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#F5F0EA]">
        <AdminSidebar />
        <DigitalProductsContent />
      </div>
    </AdminGuard>
  );
}
