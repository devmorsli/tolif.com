import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Shipping & Delivery",
  description: "Tolif shipping times, carriers, and international delivery information.",
};

export default function ShippingPage() {
  return (
    <LegalPage
      tag="Legal"
      headline={<>Shipping &amp; <em className="not-italic font-medium text-[#C4622D]">Delivery</em></>}
      intro="All orders include a free digital download. Physical products are printed on demand and shipped worldwide by trusted print partners."
      updated="29 September 2026"
      sections={[
        {
          title: "Digital downloads",
          body: "Your high-resolution portrait file (PNG, minimum 3000 × 4000 px) is delivered by email within 5–10 minutes of payment confirmation. If you do not receive your file within 30 minutes, please check your spam folder or contact hello@tolif.com.",
        },
        {
          title: "Physical products — production time",
          body: "All physical products (posters, framed prints, canvases) are printed on demand after your payment is confirmed. Production takes 2–5 business days before dispatch.",
        },
        {
          title: "Shipping times by region",
          body: "Europe: 3–7 business days after dispatch.\nUnited Kingdom: 3–5 business days after dispatch.\nUnited States & Canada: 7–14 business days after dispatch.\nAustralia & New Zealand: 10–18 business days after dispatch.\nRest of World: 10–21 business days after dispatch.\n\nThese are estimates and may vary due to carrier delays, public holidays, or customs processing.",
        },
        {
          title: "Carriers",
          body: "We use tracked courier services via our print partners (Printful or Printify). You will receive a tracking number by email once your order is dispatched. Tracking detail availability depends on the destination country.",
        },
        {
          title: "Customs & import duties",
          body: "For international orders outside the EU, import duties and local taxes may apply and are the responsibility of the recipient. Tolif has no control over customs charges and is not able to predict their amount. Please check with your local customs authority before ordering.",
        },
        {
          title: "Incorrect address",
          body: "Please ensure your shipping address is correct before placing your order. We are unable to redirect parcels once dispatched. If a parcel is returned to us due to an incorrect address, we can reship at your cost.",
        },
        {
          title: "Lost or damaged shipments",
          body: "If your order arrives damaged or is confirmed lost by the carrier, contact us at hello@tolif.com within 14 days of the expected delivery date. We will arrange a free replacement or a full refund — no hassle.",
        },
        {
          title: "Contact",
          body: "For any shipping question, email hello@tolif.com with your order number. We respond within 24 hours on business days.",
        },
      ]}
    />
  );
}
