import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "No-Refund Policy", description: "Tolif's no-refund policy for AI-generated portrait products." };

export default function RefundsPage() {
  return (
    <LegalPage
      tag="Legal"
      headline={<>No-Refund <em className="not-italic font-medium text-[#C4622D]">Policy</em></>}
      intro="All sales at Tolif are final. Please read this policy carefully before placing an order."
      updated="8 October 2026"
      sections={[
        {
          title: "All sales are final",
          body: "By completing a purchase on Tolif, you acknowledge and agree that all sales are final. We do not offer refunds, exchanges, or cancellations once an order has been placed and payment has been processed. This applies to all products — digital downloads and physical prints alike.",
        },
        {
          title: "Why we have this policy",
          body: "Each portrait is created on demand, exclusively for you, using AI generation that consumes compute resources at the moment of your order. Because the work begins immediately after payment and the result is personalised to your uploaded photos, we are unable to resell or reuse it. This is why all sales are final.",
        },
        {
          title: "Digital downloads",
          body: "Digital files (high-resolution PNG and PDF) are delivered instantly after payment. Once a digital file has been made available for download, no refund will be issued under any circumstances, including dissatisfaction with the AI-generated result, change of mind, or accidental purchase.",
        },
        {
          title: "Physical products",
          body: "Physical prints, framed prints, and canvases are produced and shipped on demand. We do not accept returns or issue refunds for physical products. The only exception is if your order arrives visibly damaged in transit or contains a clear printing defect — in that case, we will reship the item at no cost. You must report the issue with photographic evidence to hello@tolif.com within 7 days of delivery.",
        },
        {
          title: "Your responsibility — photo quality",
          body: "The quality of your AI portrait depends directly on the photos you upload. We strongly recommend submitting clear, well-lit, unfiltered photos. We cannot be held responsible for results that are poor due to low-resolution, blurry, heavily filtered, or obscured source images. No refund or reship will be offered in such cases.",
        },
        {
          title: "Free preview before you buy",
          body: "To help you make an informed purchase decision, Tolif provides a free watermarked preview of your portrait before any payment is required. You are encouraged to review the preview carefully and request a regeneration (up to the allowed limit) before proceeding to checkout. Completing a purchase after seeing your preview confirms your acceptance of the result.",
        },
        {
          title: "Contact us",
          body: "If you believe your situation involves a technical failure on our end (e.g. you were charged but never received your portrait or download link), please contact us at hello@tolif.com with your order number. We will investigate and resolve genuine technical issues promptly.",
        },
      ]}
    />
  );
}
