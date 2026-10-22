/**
 * Facebook Pixel — typed event helpers
 *
 * Call these from client components. They are no-ops when fbq is not loaded
 * (e.g. the pixel ID is blank in admin, or the user has an ad-blocker).
 */

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq?: (...args: any[]) => void;
  }
}

function fbq(...args: Parameters<NonNullable<typeof window.fbq>>) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq(...args);
  }
}

/** Fire when a user views a meaningful content page (template detail, create page). */
export function trackViewContent(params: {
  content_name: string;
  content_category?: string;
  content_ids?: string[];
  value?: number;
  currency?: string;
}) {
  fbq("track", "ViewContent", params);
}

/** Fire when a product variant is selected / added to cart. */
export function trackAddToCart(params: {
  content_name: string;
  content_ids?: string[];
  value: number;
  currency: string;
}) {
  fbq("track", "AddToCart", params);
}

/** Fire when the user clicks "Proceed to checkout". */
export function trackInitiateCheckout(params: {
  num_items: number;
  value: number;
  currency: string;
}) {
  fbq("track", "InitiateCheckout", params);
}

/**
 * Fire once when the order confirmation page loads with a paid status.
 * Guard against double-firing with sessionStorage.
 */
export function trackPurchase(params: {
  order_id: string;
  value: number;
  currency: string;
  num_items: number;
}) {
  const key = `fb_purchase_fired_${params.order_id}`;
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) return;
  fbq("track", "Purchase", {
    order_id: params.order_id,
    value: params.value,
    currency: params.currency,
    num_items: params.num_items,
    content_type: "product",
  });
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(key, "1");
  }
}
