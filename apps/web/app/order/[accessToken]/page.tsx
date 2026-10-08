import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { OrderPageClient } from "./OrderPageClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false },
};

interface Params {
  params: Promise<{ accessToken: string }>;
}

export default async function OrderPage({ params }: Params) {
  const { accessToken } = await params;

  const res = await fetch(`${API_BASE}/api/orders/${accessToken}`, {
    cache: "no-store",
  });

  if (!res.ok) notFound();

  const order = await res.json();

  return <OrderPageClient order={order} apiBase={API_BASE} accessToken={accessToken} />;
}
