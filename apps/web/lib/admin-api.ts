const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

export function setToken(token: string) {
  localStorage.setItem("admin_token", token);
}

export function clearToken() {
  localStorage.removeItem("admin_token");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export async function adminLogin(email: string, password: string) {
  const data = await apiFetch<{ token: string; email: string; displayName: string }>(
    "/api/admin/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) }
  );
  setToken(data.token);
  return data;
}

export async function adminLogout() {
  await apiFetch("/api/admin/auth/logout", { method: "POST" }).catch(() => {});
  clearToken();
}

export async function adminMe() {
  return apiFetch<{ email: string; displayName: string }>("/api/admin/auth/me");
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  totalSessions: number;
  recentOrders: RecentOrder[];
}

export interface RecentOrder {
  id: string;
  customerEmail: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
}

export async function getDashboard() {
  return apiFetch<DashboardStats>("/api/admin/dashboard");
}

// ── Templates ─────────────────────────────────────────────────────────────────

export interface AdminTemplate {
  id: string;
  slug: string;
  name: string;
  category: string;
  style?: string;
  description?: string;
  prompt: string;
  templateImageKey: string;
  uploadSlotsJson: string;
  aiProviderOverride?: string;
  isActive: boolean;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
}

export interface GeneratedMetadata {
  name: string;
  slug: string;
  category: string;
  style: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  uploadSlotsJson: string;
}

export async function getAdminTemplates() {
  return apiFetch<AdminTemplate[]>("/api/admin/templates");
}

export async function getAdminTemplate(id: string) {
  return apiFetch<AdminTemplate>(`/api/admin/templates/${id}`);
}

export async function createTemplate(data: Partial<AdminTemplate>) {
  return apiFetch<AdminTemplate>("/api/admin/templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTemplate(id: string, data: Partial<AdminTemplate>) {
  return apiFetch<AdminTemplate>(`/api/admin/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function toggleTemplate(id: string) {
  return apiFetch<AdminTemplate>(`/api/admin/templates/${id}/toggle-active`, {
    method: "PATCH",
  });
}

export async function deleteTemplate(id: string) {
  return apiFetch(`/api/admin/templates/${id}`, { method: "DELETE" });
}

export async function aiGenerateMetadata(prompt: string) {
  return apiFetch<GeneratedMetadata>("/api/admin/templates/ai-generate-metadata", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export async function aiGenerateImage(prompt: string) {
  return apiFetch<{ key: string; url: string }>("/api/admin/templates/ai-generate-image", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export async function uploadTemplateImage(file: File) {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  const formData = new FormData();
  formData.append("file", file);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
  const res = await fetch(`${API_BASE}/api/admin/templates/upload-image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ key: string; url: string }>;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export interface OrderListItem {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName?: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
}

export interface OrderDetailItem {
  id: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  portraitSessionId?: string;
  portraitPreviewKey?: string;
  templateName?: string;
  productName: string;
  productType?: string;
  size: string;
  productVariantId: string;
}

export interface OrderDetail extends OrderListItem {
  orderNumber: string;
  customerName?: string;
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  shippingAddressJson?: string;
  adminNotes?: string;
  accessToken?: string;
  updatedAt?: string;
  discountCode?: string;
  items: OrderDetailItem[];
}

export async function resendOrderEmail(id: string) {
  return apiFetch<{ success: boolean }>(`/api/admin/orders/${id}/resend-email`, {
    method: "POST",
  });
}

export interface OrdersPage {
  items: OrderListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getOrders(page = 1, pageSize = 20, status = "", search = "") {
  const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize), status, search });
  return apiFetch<OrdersPage>(`/api/admin/orders?${q}`);
}

export async function getOrder(id: string) {
  return apiFetch<OrderDetail>(`/api/admin/orders/${id}`);
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface Setting {
  key: string;
  value: string;
  isSensitive: boolean;
}

export async function getSettings() {
  return apiFetch<Setting[]>("/api/admin/settings");
}

export async function saveSetting(key: string, value: string) {
  return apiFetch("/api/admin/settings", {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
}

// ── Printful ──────────────────────────────────────────────────────────────────

export interface PrintfulVariant {
  variantId: number;
  name: string;
  size?: string;
  color?: string;
  price: number;
  currency: string;
}

export interface PrintfulProduct {
  productId: number;
  name: string;
  type: string;
  image?: string;
  variants: PrintfulVariant[];
}

export interface PrintfulMapping {
  ourProductId: string;
  printfulVariantId: string;
}

export interface PrintfulWebhook {
  id: number;
  url: string;
  types: string[];
}

export async function getPrintfulConnection() {
  return apiFetch<{ connected: boolean; error?: string }>("/api/admin/printful/connection");
}

export async function getPrintfulCatalog() {
  return apiFetch<{ products: PrintfulProduct[]; syncedAt: string | null }>("/api/admin/printful/catalog");
}

export async function syncPrintfulCatalog() {
  return apiFetch<{ products: PrintfulProduct[]; syncedAt: string }>("/api/admin/printful/catalog/sync", {
    method: "POST",
  });
}

export async function getPrintfulMappings() {
  return apiFetch<PrintfulMapping[]>("/api/admin/printful/mappings");
}

export async function savePrintfulMappings(mappings: PrintfulMapping[]) {
  return apiFetch("/api/admin/printful/mappings", {
    method: "POST",
    body: JSON.stringify(mappings),
  });
}

export async function getPrintfulWebhooks() {
  return apiFetch<PrintfulWebhook[]>("/api/admin/printful/webhooks");
}

export async function registerPrintfulWebhooks(baseUrl: string) {
  return apiFetch<PrintfulWebhook[]>("/api/admin/printful/webhooks/register", {
    method: "POST",
    body: JSON.stringify({ baseUrl }),
  });
}

// ── Storage ───────────────────────────────────────────────────────────────────

/** Returns the URL that will redirect to a short-lived presigned download URL. */
export function storagePreviewUrl(key: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
  return `${base}/api/storage/preview?key=${encodeURIComponent(key)}`;
}

// ── Products & Pricing ────────────────────────────────────────────────────────

export interface AdminProductVariant {
  id: string;
  size: string;
  price: number;
  currency: string;
  isActive: boolean;
  printfulVariantId?: string;
  printifyVariantId?: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  sortOrder: number;
  variants: AdminProductVariant[];
}

export async function getAdminProducts() {
  return apiFetch<AdminProduct[]>("/api/admin/products");
}

export async function toggleProduct(id: string) {
  return apiFetch<AdminProduct>(`/api/admin/products/${id}/toggle`, { method: "PUT" });
}

export async function updateVariant(id: string, price: number, currency: string, isActive: boolean) {
  return apiFetch<AdminProductVariant>(`/api/admin/products/variants/${id}`, {
    method: "PUT",
    body: JSON.stringify({ price, currency, isActive }),
  });
}

export async function addVariant(productId: string, size: string, price: number, currency: string) {
  return apiFetch<AdminProductVariant>(`/api/admin/products/${productId}/variants`, {
    method: "POST",
    body: JSON.stringify({ size, price, currency }),
  });
}

export async function deleteVariant(id: string) {
  return apiFetch<void>(`/api/admin/products/variants/${id}`, { method: "DELETE" });
}
