import { TEMPLATES } from "@/lib/templates";

// Server-side (SSR/RSC): use the internal Docker service name.
// Client-side (browser): use the public-facing URL.
function getApiBase(): string {
  if (typeof window === "undefined") {
    return process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
}

export interface PublicTemplate {
  id: string;
  slug: string;
  name: string;
  category: string;
  style: string;
  description: string;
  templateImageKey: string;
  uploadSlotsJson: string;
  seoTitle: string;
  seoDescription: string;
}

export interface UploadSlot {
  name: string;
  label: string;
  type: "person" | "pet";
  required: boolean;
}

export function parseUploadSlots(json: string): UploadSlot[] {
  try {
    return JSON.parse(json) as UploadSlot[];
  } catch {
    return [];
  }
}

// Category → fallback gradient (used when no template image is set)
export function categoryGradient(category: string): string {
  switch (category) {
    case "Families":  return "from-[#C4622D]/20 via-[#E8A838]/10 to-[#FAF6F0]";
    case "Couples":   return "from-[#D4942A]/25 via-[#C4622D]/10 to-[#FAF6F0]";
    case "Pets":      return "from-[#8C7B6B]/15 via-[#C4622D]/10 to-[#FAF6F0]";
    case "Groups":    return "from-[#F0D5C0]/50 via-[#C4622D]/8 to-[#FAF6F0]";
    default:          return "from-[#2D4A3E]/25 via-[#D4942A]/10 to-[#FAF6F0]";
  }
}

// Static fallback — used when the API is unreachable (local dev / before deploy)
function staticFallback(): PublicTemplate[] {
  return TEMPLATES.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    category: t.category,
    style: t.style,
    description: t.description,
    templateImageKey: "",
    uploadSlotsJson: JSON.stringify(t.uploadSlots),
    seoTitle: t.seoTitle,
    seoDescription: t.seoDescription,
  }));
}

export async function getPublicTemplates(): Promise<PublicTemplate[]> {
  try {
    const res = await fetch(`${getApiBase()}/api/templates`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return staticFallback();
    const data: PublicTemplate[] = await res.json();
    return data.length > 0 ? data : staticFallback();
  } catch {
    return staticFallback();
  }
}

// ── Shipping options ───────────────────────────────────────────────────────────

export interface ShippingOption {
  id: string;
  label: string;
  description: string;
  price: number;
  currency: string;
  days?: string;
  badge?: string;
}

const SHIPPING_FALLBACK: ShippingOption[] = [
  {
    id: "standard",
    label: "Standard delivery",
    description: "Ships in 5–7 business days",
    price: 0,
    currency: "USD",
  },
  {
    id: "express",
    label: "Express delivery",
    description: "Priority production · tracked · fastest",
    price: 15,
    currency: "USD",
    badge: "Fastest",
  },
];

export async function getShippingOptions(): Promise<ShippingOption[]> {
  try {
    const res = await fetch(`${getApiBase()}/api/shipping-options`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return SHIPPING_FALLBACK;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : SHIPPING_FALLBACK;
  } catch {
    return SHIPPING_FALLBACK;
  }
}

export async function getPublicTemplate(slug: string): Promise<PublicTemplate | null> {
  try {
    const res = await fetch(`${getApiBase()}/api/templates/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return staticFallback().find((t) => t.slug === slug) ?? null;
    return res.json();
  } catch {
    return staticFallback().find((t) => t.slug === slug) ?? null;
  }
}

export function templateImageUrl(key: string): string {
  if (!key) return "";
  // Always uses the public URL — this is called from client components
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
  return `${base}/api/storage/preview?key=${encodeURIComponent(key)}`;
}
